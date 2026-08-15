import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { validateDataIntegrity } from './data-integrity.mjs';
import { writeFileAtomically } from './import/web-link-importer.mjs';
import { ensureMysqlFunctionalTheoryReferences } from './mysql-functional-theory-references.mjs';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dataDir = path.join(projectRoot, 'data');
const apply = process.argv.includes('--apply');
const dataPaths = {
  tree: path.join(dataDir, 'tree-data.json'),
  nodePool: path.join(dataDir, 'node-pool.json'),
  edges: path.join(dataDir, 'knowledge-edges.json'),
  questions: path.join(dataDir, 'questions.json'),
  timeline: path.join(dataDir, 'timeline.json'),
};

const readJson = async (filePath) => JSON.parse(await fs.readFile(filePath, 'utf8'));
const [tree, nodePool, edges, questions, timeline] = await Promise.all(
  Object.values(dataPaths).map(readJson),
);

function collectTreeNodes(root) {
  return [root, ...(root.children ?? []).flatMap(collectTreeNodes)];
}

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

const theoryItems = [...new Map(
  collectTreeNodes(tree)
    .filter((node) => node.id.startsWith('mysql_term_') && node.nodeRef && nodePool[node.nodeRef])
    .map((node) => [node.nodeRef, { nodeId: node.nodeRef, node: nodePool[node.nodeRef] }]),
).values()];

const result = ensureMysqlFunctionalTheoryReferences({ tree, nodePool, theoryItems });
const edgeById = new Map(edges.map((edge) => [edge.id, edge]));
for (const placement of result.placements) {
  edgeById.set(`treebind:${placement.parentTreeId}:${placement.childTreeId}`, {
    id: `treebind:${placement.parentTreeId}:${placement.childTreeId}`,
    source: placement.parentNodeRef,
    target: placement.childNodeRef,
    type: 'belongs-to',
    label: 'contains',
    relationKind: 'structure',
    dimensions: unique([
      ...(nodePool[placement.parentNodeRef]?.dimensions ?? []),
      ...(nodePool[placement.childNodeRef]?.dimensions ?? []),
    ]),
  });
}

const dataset = {
  tree,
  nodePool,
  edges: [...edgeById.values()],
  questions,
  timeline,
};
const issues = validateDataIntegrity(dataset);
if (issues.length > 0) {
  throw new Error(`MySQL functional reference restoration left ${issues.length} issue(s):\n${issues.slice(0, 20).join('\n')}`);
}

let backupDir = null;
if (apply && result.referencesAdded > 0) {
  backupDir = path.join(dataDir, 'backups', `mysql-functional-references-${Date.now()}`);
  await fs.mkdir(backupDir, { recursive: true });
  await Promise.all(Object.values(dataPaths).map((filePath) => (
    fs.copyFile(filePath, path.join(backupDir, path.basename(filePath)))
  )));
  await Promise.all([
    writeFileAtomically(dataPaths.tree, `${JSON.stringify(dataset.tree, null, 2)}\n`),
    writeFileAtomically(dataPaths.edges, `${JSON.stringify(dataset.edges, null, 2)}\n`),
  ]);
}

console.log(JSON.stringify({
  applied: apply,
  backupDir,
  theoryItems: theoryItems.length,
  existingReferences: result.existingReferences,
  referencesAdded: result.referencesAdded,
  unmappedNodeIds: result.unmappedNodeIds,
}, null, 2));
