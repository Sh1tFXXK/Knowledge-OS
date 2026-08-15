import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { validateDataIntegrity } from './data-integrity.mjs';
import { organizeDuplicateKnowledge } from './knowledge-deduplication.mjs';
import { writeFileAtomically } from './import/web-link-importer.mjs';

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

async function readJson(filePath) {
  return JSON.parse(await fs.readFile(filePath, 'utf8'));
}

const [tree, nodePool, edges, questions, timeline] = await Promise.all(
  Object.values(dataPaths).map(readJson),
);
const organized = organizeDuplicateKnowledge({ tree, nodePool, edges, questions, timeline });
const issues = validateDataIntegrity(organized.dataset);
if (issues.length > 0) {
  throw new Error(`Duplicate organization left ${issues.length} issue(s):\n${issues.slice(0, 20).join('\n')}`);
}

await fs.mkdir(outputDir, { recursive: true });
const reportPath = path.join(outputDir, 'duplicate-knowledge-report.json');
await writeFileAtomically(reportPath, `${JSON.stringify({
  applied: apply,
  ...organized.stats,
  redirects: organized.redirects,
  candidates: organized.report,
}, null, 2)}\n`);

let backupDir = null;
if (apply) {
  backupDir = path.join(dataDir, 'backups', `dedup-${Date.now()}`);
  await fs.mkdir(backupDir, { recursive: true });
  await Promise.all(Object.values(dataPaths).map((filePath) => (
    fs.copyFile(filePath, path.join(backupDir, path.basename(filePath)))
  )));
  await Promise.all(Object.entries(dataPaths).map(([key, filePath]) => (
    writeFileAtomically(filePath, `${JSON.stringify(organized.dataset[key], null, 2)}\n`)
  )));
}

console.log(JSON.stringify({
  applied: apply,
  reportPath,
  backupDir,
  ...organized.stats,
  totals: {
    nodesBefore: Object.keys(nodePool).length,
    nodesAfter: Object.keys(organized.dataset.nodePool).length,
    edgesBefore: edges.length,
    edgesAfter: organized.dataset.edges.length,
  },
}, null, 2));
