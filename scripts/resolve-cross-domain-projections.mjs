import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dataDir = path.join(root, 'data');
const governancePath = path.join(dataDir, 'knowledge-governance.json');
const treePath = path.join(dataDir, 'tree-data.json');
const nodePoolPath = path.join(dataDir, 'node-pool.json');
const apply = process.argv.includes('--apply');
const dryRun = process.argv.includes('--dry-run');
if (!apply && !dryRun) throw new Error('Use --dry-run or --apply');
const read = (file) => JSON.parse(fs.readFileSync(file, 'utf8'));
const write = (file, value) => fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
const tree = read(treePath);
const nodePool = read(nodePoolPath);
const governance = read(governancePath);
const occurrences = new Map();
const visit = (node, parents = [], parentTreeNodeId = null) => {
  const pathNames = [...parents, node.name ?? node.id];
  if (node.nodeRef) {
    const entries = occurrences.get(node.nodeRef) ?? [];
    entries.push({ treeNodeId: node.id, nodeRef: node.nodeRef, path: pathNames, parentTreeNodeId });
    occurrences.set(node.nodeRef, entries);
  }
  for (const child of node.children ?? []) visit(child, pathNames, node.id);
};
visit(tree);
function score(entry, nodeId, node) {
  const text = entry.path.join(' / ');
  const tags = new Set(node.tags ?? []);
  let value = 0;
  if (nodeId.startsWith('theory_domain_') && /数学/.test(text)) value += 100;
  if ((nodeId.startsWith('mysql_') || tags.has('mysql') || tags.has('mysql-glossary')) && (/MySQL/.test(text) || /计算机科学/.test(text))) value += 100;
  if (node.dimensions?.includes('storage') && /计算机科学|数据库|MySQL/.test(text)) value += 20;
  if (node.dimensions?.includes('transaction') && /计算机科学|数据库|MySQL/.test(text)) value += 20;
  value -= entry.path.length / 100;
  return value;
}
const groups = new Map();
for (const projection of governance.projections ?? []) {
  if (projection.kind !== 'domain-view') continue;
  const group = groups.get(projection.nodeId) ?? [];
  group.push(projection);
  groups.set(projection.nodeId, group);
}
const resolutions = [];
for (const [nodeId, projections] of groups) {
  const node = nodePool[nodeId];
  const entries = occurrences.get(nodeId) ?? [];
  if (!node || entries.length < 2) throw new Error(`Cannot resolve cross-domain projection for ${nodeId}`);
  const ranked = [...entries].sort((left, right) => score(right, nodeId, node) - score(left, nodeId, node) || left.treeNodeId.localeCompare(right.treeNodeId));
  const nativeTheoryEntry = nodeId.startsWith('theory_domain_') ? entries.find((entry) => entry.treeNodeId === nodeId) : null;
  const canonical = nativeTheoryEntry ?? ranked[0];
  for (const projection of projections) {
    projection.status = 'accepted';
    projection.canonicalTreeEntryId = canonical.treeNodeId;
    projection.isCanonicalAnchor = projection.sourcePaths?.some((sourcePath) => sourcePath.join('\u0000') === canonical.path.join('\u0000')) ?? false;
    projection.acceptedAt = new Date().toISOString();
    projection.rationale = `${projection.rationale} 规范锚点确定为 ${canonical.treeNodeId}；其他领域入口保留为导航投影，不复制正文。`;
  }
  resolutions.push({ nodeId, canonicalTreeEntryId: canonical.treeNodeId, canonicalPath: canonical.path, projectionCount: projections.length, alternatives: ranked.slice(1).map((entry) => ({ treeNodeId: entry.treeNodeId, path: entry.path })) });
}
governance.crossDomainResolutions = resolutions;
governance.audit = { ...governance.audit, crossDomainResolutionSummary: { resolvedNodes: resolutions.length, acceptedProjectionEntries: [...groups.values()].reduce((sum, items) => sum + items.length, 0), strategy: 'single-canonical-anchor-plus-navigation-projections' } };
if (apply) write(governancePath, governance);
process.stdout.write(`${JSON.stringify({ mode: apply ? 'apply' : 'dry-run', resolvedNodes: resolutions.length, acceptedProjectionEntries: [...groups.values()].reduce((sum, items) => sum + items.length, 0), samples: resolutions.slice(0, 8) }, null, 2)}\n`);
