import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { validateDataIntegrity } from './data-integrity.mjs';
import { writeFileAtomically } from './import/web-link-importer.mjs';
import { applySemanticDuplicateCuration } from './semantic-duplicate-curation.mjs';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dataDir = path.join(projectRoot, 'data');
const outputDir = path.join(projectRoot, 'output');
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
const result = applySemanticDuplicateCuration({ tree, nodePool, edges, questions, timeline });
const issues = validateDataIntegrity(result.dataset);
if (issues.length > 0) {
  throw new Error(
    `Semantic duplicate curation left ${issues.length} issue(s):\n${issues.slice(0, 20).join('\n')}`,
  );
}

await fs.mkdir(outputDir, { recursive: true });
const reportPath = path.join(outputDir, 'semantic-duplicate-curation-report.json');
await writeFileAtomically(reportPath, `${JSON.stringify({
  applied: apply,
  stats: result.stats,
  redirects: result.redirects,
  candidates: result.candidates,
}, null, 2)}\n`);

let backupDir = null;
const changed = Object.values(result.stats).some((value) => value > 0);
if (apply && changed) {
  backupDir = path.join(dataDir, 'backups', `semantic-curation-${Date.now()}`);
  await fs.mkdir(backupDir, { recursive: true });
  await Promise.all(Object.values(dataPaths).map((filePath) => (
    fs.copyFile(filePath, path.join(backupDir, path.basename(filePath)))
  )));
  await Promise.all(Object.entries(dataPaths).map(([key, filePath]) => (
    writeFileAtomically(filePath, `${JSON.stringify(result.dataset[key], null, 2)}\n`)
  )));
}

console.log(JSON.stringify({
  applied: apply,
  changed,
  reportPath,
  backupDir,
  stats: result.stats,
  totals: {
    nodesBefore: Object.keys(nodePool).length,
    nodesAfter: Object.keys(result.dataset.nodePool).length,
    edgesBefore: edges.length,
    edgesAfter: result.dataset.edges.length,
  },
}, null, 2));
