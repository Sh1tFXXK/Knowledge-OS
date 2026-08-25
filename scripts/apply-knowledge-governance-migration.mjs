import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dataDir = path.join(root, 'data');
const paths = {
  nodePool: path.join(dataDir, 'node-pool.json'),
  tree: path.join(dataDir, 'tree-data.json'),
  edges: path.join(dataDir, 'knowledge-edges.json'),
  governance: path.join(dataDir, 'knowledge-governance.json'),
};
const isDryRun = process.argv.includes('--dry-run');
const isApply = process.argv.includes('--apply');
if (!isDryRun && !isApply) throw new Error('Use --dry-run or --apply');

function read(file) { return JSON.parse(fs.readFileSync(file, 'utf8')); }
function writeAtomic(file, value) {
  const tmp = `${file}.governance-tmp`;
  fs.writeFileSync(tmp, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
  fs.renameSync(tmp, file);
}
function hash(value) { return crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex'); }
function uniqueJson(values) {
  const seen = new Set();
  return values.filter((value) => { const key = JSON.stringify(value); if (seen.has(key)) return false; seen.add(key); return true; });
}
function treeIndex(tree) {
  const byId = new Map();
  const refs = new Map();
  const visit = (node, parent = null) => {
    byId.set(node.id, { node, parent });
    if (node.nodeRef) {
      const entries = refs.get(node.nodeRef) ?? [];
      entries.push(node);
      refs.set(node.nodeRef, entries);
    }
    for (const child of node.children ?? []) visit(child, node);
  };
  visit(tree);
  return { byId, refs };
}
function appendChild(parent, child) {
  parent.children ??= [];
  const existing = parent.children.find((item) => item.id === child.id);
  if (existing) return existing;
  parent.children.push(child);
  return child;
}
function makeLeaf(id, name, nodeRef) { return { id, name, count: 0, nodeRef, children: [] }; }

const highConfidence = [
  { nodeId: 'demo_vchain_sys', parentTreeId: 'demo_tree_mvcc', canonicalParentNodeId: 'demo_mvcc' },
  { nodeId: 'demo_snapshot', parentTreeId: 'demo_tree_mvcc', canonicalParentNodeId: 'demo_mvcc' },
  { nodeId: 'demo_btree', parentTreeId: 'mysql_topic_indexes_access', canonicalParentNodeId: 'mysql_topic_indexes_access' },
  { nodeId: 'demo_composite_index', parentTreeId: 'mysql_topic_indexes_access', canonicalParentNodeId: 'mysql_topic_indexes_access' },
  { nodeId: 'mysql_runtime_files', parentTreeId: 'mysql_topic_architecture', canonicalParentNodeId: 'mysql_topic_architecture' },
  { nodeId: 'mysql_file_pid', parentTreeId: 'governance:canonical:mysql_runtime_files', canonicalParentNodeId: 'mysql_runtime_files' },
  { nodeId: 'mysql_file_socket', parentTreeId: 'governance:canonical:mysql_runtime_files', canonicalParentNodeId: 'mysql_runtime_files' },
  { nodeId: 'react_import_aliasing', parentTreeId: 'react_tree_export', canonicalParentNodeId: 'react_export_import' },
  { nodeId: 'demo_join', parentTreeId: 'mysql_topic_sql_objects', canonicalParentNodeId: 'mysql_topic_sql_objects' },
  { nodeId: 'demo_subquery', parentTreeId: 'mysql_topic_sql_objects', canonicalParentNodeId: 'mysql_topic_sql_objects' },
  { nodeId: 'demo_postgres', parentTreeId: 'tree_1783250122275_mmljuf', canonicalParentNodeId: 'k_1783250122245_2rg7bc' },
];

const nodePool = read(paths.nodePool);
const tree = read(paths.tree);
const edges = read(paths.edges);
const governance = read(paths.governance);
const before = { nodePool: hash(nodePool), tree: hash(tree), edges: hash(edges) };
const index = treeIndex(tree);
const report = {
  mode: isDryRun ? 'dry-run' : 'apply',
  highConfidencePlacementsAdded: [],
  sourceViewEntriesAdded: 0,
  acceptedSourceViewProjections: 0,
  acceptedDuplicateEdgeMerges: [],
  rejectedTreeBindingMergePlans: [],
  unchangedNodePool: null,
  edgeCount: { before: edges.length, after: null },
};

for (const mapping of highConfidence) {
  const node = nodePool[mapping.nodeId];
  if (!node) throw new Error(`Missing high-confidence node: ${mapping.nodeId}`);
  const parentEntry = index.byId.get(mapping.parentTreeId);
  if (!parentEntry) throw new Error(`Missing target tree parent: ${mapping.parentTreeId} for ${mapping.nodeId}`);
  const leafId = `governance:canonical:${mapping.nodeId}`;
  const existed = index.byId.has(leafId);
  const leaf = appendChild(parentEntry.node, makeLeaf(leafId, node.label, mapping.nodeId));
  index.byId.set(leafId, { node: leaf, parent: parentEntry.node });
  if (!existed) report.highConfidencePlacementsAdded.push({ nodeId: mapping.nodeId, treeEntryId: leafId, parentTreeId: mapping.parentTreeId });
  const placement = governance.placements.find((item) => item.nodeId === mapping.nodeId);
  if (!placement) throw new Error(`Missing governance placement candidate: ${mapping.nodeId}`);
  placement.status = 'accepted';
  placement.contentStatus = 'canonical';
  placement.canonicalParentNodeId = mapping.canonicalParentNodeId;
  placement.canonicalTreeEntryId = leafId;
  placement.acceptedAt = new Date().toISOString();
  placement.rationale = `${placement.rationale} 已挂载到现有分类树 ${mapping.parentTreeId}，并保留原正文与关系。`;
}

const sourceProjections = governance.projections.filter((projection) => projection.kind === 'source-view' && projection.view === 'mysql-glossary');
const mysqlRoot = index.byId.get('demo_mysql');
if (!mysqlRoot) throw new Error('Missing MySQL tree root demo_mysql');
const sourceContainer = appendChild(mysqlRoot.node, { id: 'governance:mysql-glossary-source-view', name: 'MySQL 术语库（来源视图）', count: 0, children: [] });
index.byId.set(sourceContainer.id, { node: sourceContainer, parent: mysqlRoot.node });
for (const projection of sourceProjections) {
  const node = nodePool[projection.nodeId];
  if (!node) throw new Error(`Missing source-view node: ${projection.nodeId}`);
  const leafId = `governance:source:mysql-glossary:${projection.nodeId}`;
  const existed = (sourceContainer.children ?? []).some((child) => child.id === leafId);
  appendChild(sourceContainer, makeLeaf(leafId, node.label, projection.nodeId));
  if (!existed) report.sourceViewEntriesAdded += 1;
  projection.status = 'accepted';
  projection.acceptedAt = new Date().toISOString();
}
report.acceptedSourceViewProjections = sourceProjections.length;

let nextEdges = [...edges];
for (const plan of governance.mergePlans ?? []) {
  const ids = [plan.canonicalId, ...(plan.redundantIds ?? [])];
  const matching = nextEdges.filter((edge) => ids.includes(edge.id));
  if (matching.length < 2) continue;
  if (matching.some((edge) => edge.id.startsWith('treebind:'))) {
    plan.status = 'rejected';
    plan.reviewedAt = new Date().toISOString();
    plan.rationale = `${plan.rationale} 这些边是不同树路径生成的绑定记录，保留以免丢失导航语义；不将其视为业务关系重复。`;
    report.rejectedTreeBindingMergePlans.push(plan.id);
    continue;
  }
  const canonical = matching.find((edge) => edge.id === plan.canonicalId);
  if (!canonical) throw new Error(`Missing canonical edge for ${plan.id}`);
  canonical.dimensions = [...new Set(matching.flatMap((edge) => edge.dimensions ?? []))];
  const provenance = uniqueJson(matching.flatMap((edge) => edge.provenance ?? []));
  if (provenance.length > 0) canonical.provenance = provenance;
  const redundant = new Set(plan.redundantIds);
  nextEdges = nextEdges.filter((edge) => !redundant.has(edge.id));
  plan.status = 'accepted';
  plan.executedAt = new Date().toISOString();
  plan.edgeRedirects = [...redundant].map((from) => ({ from, to: canonical.id, reason: 'exact-typed-edge-duplicate' }));
  plan.rationale = `${plan.rationale} 已保留 ${canonical.id}，合并维度与来源信息，并登记冗余边重定向。`;
  report.acceptedDuplicateEdgeMerges.push({ planId: plan.id, canonicalId: canonical.id, mergedIds: [...redundant] });
}

governance.migration = {
  schemaVersion: '1.0.0',
  lastAppliedAt: isApply ? new Date().toISOString() : null,
  principles: ['content-preservation', 'single-canonical-parent', 'projection-for-cross-domain', 'legacy-redirect-before-deletion'],
  report,
};
governance.audit = {
  ...governance.audit,
  generatedAt: new Date().toISOString(),
  migrationSummary: {
    acceptedHighConfidencePlacements: highConfidence.length,
    acceptedSourceViewProjections: sourceProjections.length,
    acceptedDuplicateEdgeMerges: report.acceptedDuplicateEdgeMerges.length,
    deferredCrossDomainProjections: governance.projections.filter((item) => item.kind === 'domain-view' && item.status === 'proposed').length,
  },
};
report.edgeCount.after = nextEdges.length;
report.unchangedNodePool = before.nodePool === hash(nodePool);
if (!report.unchangedNodePool) throw new Error('Node pool content changed unexpectedly');
if (report.edgeCount.after > report.edgeCount.before) throw new Error('Edge count unexpectedly increased');

if (isApply) {
  writeAtomic(paths.tree, tree);
  writeAtomic(paths.edges, nextEdges);
  writeAtomic(paths.governance, governance);
}
process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
