import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { validateDataIntegrity } from './data-integrity.mjs';
import { applyKnownDataCuration } from './known-data-curation.mjs';
import { writeFileAtomically } from './import/web-link-importer.mjs';

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
const result = applyKnownDataCuration({ tree, nodePool, edges, questions, timeline });
const issues = validateDataIntegrity(result.dataset);
if (issues.length > 0) {
  throw new Error(`Known data curation left ${issues.length} issue(s):\n${issues.slice(0, 20).join('\n')}`);
}

let backupDir = null;
if (apply && Object.values(result.stats).some((value) => value > 0)) {
  backupDir = path.join(dataDir, 'backups', `known-curation-${Date.now()}`);
  await fs.mkdir(backupDir, { recursive: true });
  await Promise.all(Object.values(dataPaths).map((filePath) => (
    fs.copyFile(filePath, path.join(backupDir, path.basename(filePath)))
  )));
  await Promise.all(Object.entries(dataPaths).map(([key, filePath]) => (
    writeFileAtomically(filePath, `${JSON.stringify(result.dataset[key], null, 2)}\n`)
  )));
}

console.log(JSON.stringify({ applied: apply, backupDir, ...result.stats }, null, 2));
