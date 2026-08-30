import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { writeFileAtomically } from './import/web-link-importer.mjs';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dataDir = path.join(projectRoot, 'data');

function option(name) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : null;
}

function indexTree(root) {
  const nodes = new Map();
  const parents = new Map();
  const visit = (node, parent = null) => {
    if (nodes.has(node.id)) throw new Error(`Duplicate tree id ${node.id}.`);
    nodes.set(node.id, node);
    if (parent) parents.set(node.id, parent);
    for (const child of node.children ?? []) visit(child, node);
  };
  visit(root);
  return { nodes, parents };
}

function collectSubtreeIds(nodes, output = new Set()) {
  for (const node of nodes) {
    if (output.has(node.id)) throw new Error(`Duplicate restored tree id ${node.id}.`);
    output.add(node.id);
    collectSubtreeIds(node.children ?? [], output);
  }
  return output;
}

const backupTreePath = option('--backup-tree');
const containerId = option('--container');
const targetParentId = option('--target-parent');
const apply = process.argv.includes('--apply');
if (!backupTreePath || !containerId || !targetParentId) {
  throw new Error('Required: --backup-tree <path> --container <id> --target-parent <id>.');
}

const currentTreePath = path.join(dataDir, 'tree-data.json');
const nodePoolPath = path.join(dataDir, 'node-pool.json');
const [currentTree, backupTree, nodePool] = await Promise.all([
  fs.readFile(currentTreePath, 'utf8').then(JSON.parse),
  fs.readFile(path.resolve(projectRoot, backupTreePath), 'utf8').then(JSON.parse),
  fs.readFile(nodePoolPath, 'utf8').then(JSON.parse),
]);
const currentIndex = indexTree(currentTree);
const backupIndex = indexTree(backupTree);
const container = backupIndex.nodes.get(containerId);
const targetParent = currentIndex.nodes.get(targetParentId);
if (!container) throw new Error(`Backup container ${containerId} is missing.`);
if (!targetParent) throw new Error(`Current target parent ${targetParentId} is missing.`);

const restoredChildren = structuredClone(container.children ?? []);
const restoredIds = collectSubtreeIds(restoredChildren);
const conflicts = [...restoredIds].filter((id) => currentIndex.nodes.has(id));
if (conflicts.length > 0) {
  throw new Error(`Current tree already contains restored ids: ${conflicts.join(', ')}`);
}
const missingNodeRefs = [];
for (const child of restoredChildren) {
  const stack = [child];
  while (stack.length > 0) {
    const node = stack.pop();
    if (node.nodeRef && !nodePool[node.nodeRef]) {
      missingNodeRefs.push(`${node.id}:${node.nodeRef}`);
    }
    stack.push(...(node.children ?? []));
  }
}
if (missingNodeRefs.length > 0) {
  throw new Error(`Restored entries reference missing nodes: ${missingNodeRefs.join(', ')}`);
}

const existingChildIds = new Set((targetParent.children ?? []).map((child) => child.id));
targetParent.children = [
  ...(targetParent.children ?? []),
  ...restoredChildren.filter((child) => !existingChildIds.has(child.id)),
];

let backupPath = null;
if (apply) {
  backupPath = path.join(dataDir, 'backups', `tree-container-restore-${Date.now()}`);
  await fs.mkdir(backupPath, { recursive: true });
  await fs.copyFile(currentTreePath, path.join(backupPath, 'tree-data.json'));
  await writeFileAtomically(currentTreePath, `${JSON.stringify(currentTree, null, 2)}\n`);
}

console.log(JSON.stringify({
  applied: apply,
  containerId,
  targetParentId,
  restoredRootEntries: restoredChildren.length,
  restoredTotalEntries: restoredIds.size,
  backupPath,
}, null, 2));
