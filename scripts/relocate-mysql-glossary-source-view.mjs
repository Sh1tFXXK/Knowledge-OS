import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dataDir = path.join(root, 'data');
const treePath = path.join(dataDir, 'tree-data.json');
const governancePath = path.join(dataDir, 'knowledge-governance.json');
const apply = process.argv.includes('--apply');
const dryRun = process.argv.includes('--dry-run');
if (!apply && !dryRun) throw new Error('Use --dry-run or --apply');
const read = (file) => JSON.parse(fs.readFileSync(file, 'utf8'));
const write = (file, value) => fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
const tree = read(treePath);
const governance = read(governancePath);
function find(node, id) {
  if (node.id === id) return node;
  for (const child of node.children ?? []) { const hit = find(child, id); if (hit) return hit; }
  return null;
}
function detach(node, id) {
  const index = (node.children ?? []).findIndex((child) => child.id === id);
  if (index >= 0) return node.children.splice(index, 1)[0];
  for (const child of node.children ?? []) { const hit = detach(child, id); if (hit) return hit; }
  return null;
}
const sourceViewId = 'governance:mysql-glossary-source-view';
const targetId = 'mysql_topic_uncategorized';
const target = find(tree, targetId);
if (!target) throw new Error(`Missing target tree container: ${targetId}`);
let sourceView = find(tree, sourceViewId);
let moved = false;
if (!sourceView) throw new Error(`Missing source view tree container: ${sourceViewId}`);
const alreadyMounted = (target.children ?? []).some((child) => child.id === sourceViewId);
if (!alreadyMounted) {
  sourceView = detach(tree, sourceViewId);
  target.children ??= [];
  target.children.push(sourceView);
  moved = true;
}
governance.audit = { ...governance.audit, sourceViewMount: { treeEntryId: sourceViewId, parentTreeEntryId: targetId, movedAt: new Date().toISOString(), purpose: 'retain-source-view-without-expanding-canonical-topic-root' } };
if (apply) { write(treePath, tree); write(governancePath, governance); }
process.stdout.write(`${JSON.stringify({ mode: apply ? 'apply' : 'dry-run', moved, sourceViewId, targetId, entryCount: sourceView.children?.length ?? 0 }, null, 2)}\n`);
