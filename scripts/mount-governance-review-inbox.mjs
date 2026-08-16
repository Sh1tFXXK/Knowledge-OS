import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dataDir = path.join(root, 'data');
const treePath = path.join(dataDir, 'tree-data.json');
const nodePoolPath = path.join(dataDir, 'node-pool.json');
const governancePath = path.join(dataDir, 'knowledge-governance.json');
const apply = process.argv.includes('--apply');
const dryRun = process.argv.includes('--dry-run');
if (!apply && !dryRun) throw new Error('Use --dry-run or --apply');
const read = (file) => JSON.parse(fs.readFileSync(file, 'utf8'));
const write = (file, value) => fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
const tree = read(treePath);
const nodePool = read(nodePoolPath);
const governance = read(governancePath);
const sourceViewNodeIds = new Set((governance.projections ?? []).filter((item) => item.kind === 'source-view' && item.status === 'accepted').map((item) => item.nodeId));
const candidates = (governance.placements ?? []).filter((item) => item.status === 'proposed' && !sourceViewNodeIds.has(item.nodeId));
const existing = new Set();
const find = (node) => {
  existing.add(node.id);
  for (const child of node.children ?? []) find(child);
};
find(tree);
const inboxId = 'governance:review-inbox';
let inbox = (tree.children ?? []).find((item) => item.id === inboxId);
if (!inbox) {
  inbox = { id: inboxId, name: '待审核归属（内容保全）', count: 0, children: [] };
  tree.children ??= [];
  tree.children.push(inbox);
}
let added = 0;
for (const candidate of candidates) {
  const node = nodePool[candidate.nodeId];
  if (!node) throw new Error(`Missing review candidate node: ${candidate.nodeId}`);
  const entryId = `governance:review:${candidate.nodeId}`;
  if (!existing.has(entryId)) {
    inbox.children.push({ id: entryId, name: node.label, count: 0, nodeRef: candidate.nodeId, children: [] });
    existing.add(entryId);
    added += 1;
  }
  candidate.reviewTreeEntryId = entryId;
  candidate.reviewQueue = 'governance-review-inbox';
}
inbox.count = inbox.children.length;
governance.audit = { ...governance.audit, reviewInboxSummary: { proposedPlacementEntries: candidates.length, addedEntries: added, sourceViewCandidatesExcluded: sourceViewNodeIds.size } };
if (apply) { write(treePath, tree); write(governancePath, governance); }
process.stdout.write(`${JSON.stringify({ mode: apply ? 'apply' : 'dry-run', proposedPlacementEntries: candidates.length, addedEntries: added, sourceViewCandidatesExcluded: sourceViewNodeIds.size }, null, 2)}\n`);
