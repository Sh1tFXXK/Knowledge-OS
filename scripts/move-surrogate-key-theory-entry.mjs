import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { writeFileAtomically } from './import/web-link-importer.mjs';

const SURROGATE_KEY_MOVE = Object.freeze({
  label: 'surrogate-key',
  oldDomainId: 'theory_domain_set_theory',
  newDomainId: 'theory_domain_normalization_theory',
  oldTreeId: 'mysql_term_set_theory_surrogate_key_7ltqej',
  newTreeId: 'mysql_term_normalization_theory_surrogate_key_7ltqej',
  nodeRef: 'k_dict_xb5t6pmm',
});

const MERGE_MOVE = Object.freeze({
  label: 'merge/change-buffer',
  oldDomainId: 'theory_domain_relational_algebra',
  newDomainId: 'theory_domain_storage_systems',
  oldTreeId: 'mysql_term_relational_algebra_merge_1tg3an',
  newTreeId: 'mysql_term_storage_systems_merge_1tg3an',
  nodeRef: 'k_dict_s1u2tlxt',
});

function findTreeNode(root, id) {
  if (root.id === id) return root;
  for (const child of root.children ?? []) {
    const found = findTreeNode(child, id);
    if (found) return found;
  }
  return null;
}

function collectTreeNodes(root) {
  return [root, ...(root.children ?? []).flatMap(collectTreeNodes)];
}

function cloneTreeEntry(entry, move) {
  return {
    ...entry,
    id: move.newTreeId,
    nodeRef: move.nodeRef,
    children: entry.children ? entry.children.map((child) => ({ ...child })) : [],
  };
}

export function moveTheoryEntry({ tree, edges, move }) {
  const oldDomain = findTreeNode(tree, move.oldDomainId);
  const newDomain = findTreeNode(tree, move.newDomainId);
  if (!oldDomain || !newDomain) throw new Error(`${move.label} theory domains are missing.`);

  const allNodes = collectTreeNodes(tree);
  const oldEntry = allNodes.find((node) => node.id === move.oldTreeId);
  const newEntry = allNodes.find((node) => node.id === move.newTreeId);
  if (oldEntry && newEntry) throw new Error(`Both old and new ${move.label} theory entries exist.`);

  const oldRefEntries = allNodes.filter(
    (node) => node.nodeRef === move.nodeRef && node.id !== move.oldTreeId && node.id !== move.newTreeId,
  );
  const duplicateTheoryEntries = oldRefEntries.filter((node) => node.id.startsWith('mysql_term_'));
  if (duplicateTheoryEntries.length > 0) {
    throw new Error(`${move.label} theory reference is duplicated: ${duplicateTheoryEntries.map((node) => node.id).join(', ')}`);
  }

  const oldEdgeId = `treebind:${move.oldDomainId}:${move.oldTreeId}`;
  const newEdgeId = `treebind:${move.newDomainId}:${move.newTreeId}`;
  const oldEdge = edges.find((edge) => edge.id === oldEdgeId);
  const existingNewEdge = edges.find((edge) => edge.id === newEdgeId);

  if (!oldEntry && newEntry) {
    if (!existingNewEdge) throw new Error(`New ${move.label} entry exists without its tree binding.`);
    return { moved: false, oldTreeId: move.oldTreeId, newTreeId: move.newTreeId };
  }
  if (!oldEntry) throw new Error(`Old ${move.label} theory entry is missing.`);
  if (!oldEdge) throw new Error(`Missing binding edge ${oldEdgeId}.`);
  if (existingNewEdge) throw new Error(`Binding edge ${newEdgeId} already exists.`);

  const oldIndex = (oldDomain.children ?? []).findIndex((child) => child.id === move.oldTreeId);
  if (oldIndex < 0) throw new Error(`Entry ${move.oldTreeId} is not owned by ${move.oldDomainId}.`);
  oldDomain.children = oldDomain.children.filter((child) => child.id !== move.oldTreeId);
  newDomain.children = [...(newDomain.children ?? []), cloneTreeEntry(oldEntry, move)];

  const retainedEdges = edges.filter((edge) => edge.id !== oldEdgeId);
  retainedEdges.push({
    ...oldEdge,
    id: newEdgeId,
    source: move.newDomainId,
    target: move.nodeRef,
  });

  return {
    moved: true,
    oldTreeId: move.oldTreeId,
    newTreeId: move.newTreeId,
    oldEdgeId,
    newEdgeId,
    edges: retainedEdges,
  };
}

export function moveSurrogateKeyTheoryEntry({ tree, edges }) {
  return moveTheoryEntry({ tree, edges, move: SURROGATE_KEY_MOVE });
}

async function main() {
  const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
  const apply = process.argv.includes('--apply');
  const treePath = path.join(projectRoot, 'data', 'tree-data.json');
  const edgesPath = path.join(projectRoot, 'data', 'knowledge-edges.json');
  const tree = JSON.parse(await fs.readFile(treePath, 'utf8'));
  const edges = JSON.parse(await fs.readFile(edgesPath, 'utf8'));
  const results = [];
  let nextEdges = edges;
  for (const move of [SURROGATE_KEY_MOVE, MERGE_MOVE]) {
    const result = moveTheoryEntry({ tree, edges: nextEdges, move });
    results.push({ label: move.label, ...result, edges: undefined });
    if (result.edges) nextEdges = result.edges;
  }

  let backupDir = null;
  if (apply && results.some((result) => result.moved)) {
    backupDir = path.join(projectRoot, 'data', 'backups', `misclassified-theory-taxonomy-${Date.now()}`);
    await fs.mkdir(backupDir, { recursive: true });
    await Promise.all([
      fs.copyFile(treePath, path.join(backupDir, 'tree-data.json')),
      fs.copyFile(edgesPath, path.join(backupDir, 'knowledge-edges.json')),
    ]);
    await Promise.all([
      writeFileAtomically(treePath, `${JSON.stringify(tree, null, 2)}\n`),
      writeFileAtomically(edgesPath, `${JSON.stringify(nextEdges, null, 2)}\n`),
    ]);
  }

  console.log(JSON.stringify({ apply, backupDir, results }, null, 2));
}

const isMain = process.argv[1]
  && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) await main();
