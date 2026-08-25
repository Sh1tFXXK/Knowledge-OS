import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { consolidateTaxonomyProjections } from './consolidate-taxonomy-projections.mjs';
import { validateDataIntegrity } from './data-integrity.mjs';

const DATA_FILE_NAMES = Object.freeze({
  tree: 'tree-data.json',
  nodePool: 'node-pool.json',
  edges: 'knowledge-edges.json',
  questions: 'questions.json',
  timeline: 'timeline.json',
});

const MIGRATED_KEYS = Object.freeze(['tree', 'nodePool', 'edges']);

function collectTreeNodes(root) {
  return [root, ...(root.children ?? []).flatMap(collectTreeNodes)];
}

function datasetCounts({ tree, nodePool, edges }) {
  return {
    treeEntries: collectTreeNodes(tree).length,
    knowledgeNodes: Object.keys(nodePool).length,
    nonBindingEdges: edges.filter((edge) => !edge.id.startsWith('treebind:')).length,
  };
}

function serialize(value) {
  return `${JSON.stringify(value, null, 2)}\n`;
}

async function writeFileAtomically(filePath, content) {
  const tempPath = `${filePath}.${process.pid}.${Date.now()}.tmp`;
  try {
    await fs.writeFile(tempPath, content, 'utf8');
    await fs.rename(tempPath, filePath);
  } catch (error) {
    await fs.rm(tempPath, { force: true }).catch(() => {});
    throw error;
  }
}

async function loadDataset(dataDir) {
  const paths = Object.fromEntries(
    Object.entries(DATA_FILE_NAMES).map(([key, filename]) => [key, path.join(dataDir, filename)]),
  );
  const entries = await Promise.all(
    Object.entries(paths).map(async ([key, filePath]) => [
      key,
      JSON.parse(await fs.readFile(filePath, 'utf8')),
    ]),
  );
  return { paths, dataset: Object.fromEntries(entries) };
}

function changedDatasetKeys(before, after) {
  return MIGRATED_KEYS.filter((key) => JSON.stringify(before[key]) !== JSON.stringify(after[key]));
}

export async function runTaxonomyConsolidation({
  dataDir,
  apply = false,
  now = () => Date.now(),
}) {
  const { paths, dataset } = await loadDataset(dataDir);
  const before = datasetCounts(dataset);
  const migrated = consolidateTaxonomyProjections(dataset);
  const nextDataset = {
    ...dataset,
    tree: migrated.tree,
    nodePool: migrated.nodePool,
    edges: migrated.edges,
  };
  const issues = validateDataIntegrity(nextDataset);
  if (issues.length > 0) {
    throw new Error(
      `Taxonomy consolidation left ${issues.length} issue(s):\n${issues.slice(0, 20).join('\n')}`,
    );
  }

  const changedFiles = changedDatasetKeys(dataset, nextDataset);
  let backupDir = null;
  if (apply && changedFiles.length > 0) {
    backupDir = path.join(dataDir, 'backups', `taxonomy-consolidation-${now()}`);
    await fs.mkdir(backupDir, { recursive: true });
    await Promise.all(Object.values(paths).map((filePath) => (
      fs.copyFile(filePath, path.join(backupDir, path.basename(filePath)))
    )));
    await Promise.all(changedFiles.map((key) => (
      writeFileAtomically(paths[key], serialize(nextDataset[key]))
    )));
  }

  return {
    apply,
    changed: changedFiles.length > 0,
    changedFiles: changedFiles.map((key) => DATA_FILE_NAMES[key]),
    backupDir,
    before,
    after: datasetCounts(nextDataset),
    ...migrated.stats,
  };
}

async function main() {
  const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
  const apply = process.argv.includes('--apply');
  const check = process.argv.includes('--check');
  if (apply && check) throw new Error('Use either --apply or --check, not both.');

  const summary = await runTaxonomyConsolidation({
    dataDir: path.join(projectRoot, 'data'),
    apply,
  });
  console.log(JSON.stringify(summary, null, 2));
  if (check && summary.changed) process.exitCode = 1;
}

const isMain = process.argv[1]
  && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) await main();
