import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { writeFileAtomically } from './import/web-link-importer.mjs';
import {
  ensureMysqlUncategorized,
  normalizeKnowledgeNodeRoles,
  repairKnowledgeEdges,
  repairQuestions,
  repairTreeBindingEdges,
  repairTimeline,
  validateDataIntegrity,
} from './data-integrity.mjs';
import {
  normalizeExplanationContentOwnership,
  normalizeTimelineExplanationContent,
} from './explanation-content-ownership.mjs';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dataDir = path.join(projectRoot, 'data');
const manifestPath = path.join(projectRoot, 'output', 'java-interview-import-manifest.json');
const dryRun = process.argv.includes('--dry-run');
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

const [tree, nodePool, originalEdges, originalQuestions, originalTimeline] = await Promise.all([
  readJson(dataPaths.tree),
  readJson(dataPaths.nodePool),
  readJson(dataPaths.edges),
  readJson(dataPaths.questions),
  readJson(dataPaths.timeline),
]);
const manifest = await readJson(manifestPath).catch(() => ({ newQuestionIds: [] }));
const javaInterviewQuestionIds = new Set(manifest.newQuestionIds ?? []);

const mysqlStats = ensureMysqlUncategorized(tree, nodePool, originalEdges);
const roleStats = normalizeKnowledgeNodeRoles(nodePool);
const contentOwnershipResult = normalizeExplanationContentOwnership({ tree, nodePool });
const normalizedTree = contentOwnershipResult.tree;
const normalizedNodePool = contentOwnershipResult.nodePool;
const questionResult = repairQuestions(originalQuestions, javaInterviewQuestionIds);
const initialEdgeResult = repairKnowledgeEdges(originalEdges);
const bindingResult = repairTreeBindingEdges(initialEdgeResult.edges, normalizedTree, normalizedNodePool);
const finalEdgeResult = repairKnowledgeEdges(bindingResult.edges);
const edgeStats = Object.fromEntries(
  Object.keys(initialEdgeResult.stats).map((key) => [
    key,
    initialEdgeResult.stats[key] + finalEdgeResult.stats[key],
  ]),
);
const timelineResult = repairTimeline(originalTimeline, normalizedNodePool);
const timelineContentResult = normalizeTimelineExplanationContent(timelineResult.timeline);
const repaired = {
  tree: normalizedTree,
  nodePool: normalizedNodePool,
  edges: finalEdgeResult.edges,
  questions: questionResult.questions,
  timeline: timelineContentResult.timeline,
};
const issues = validateDataIntegrity(repaired);
if (issues.length > 0) {
  throw new Error(`Integrity repair left ${issues.length} issue(s):\n${issues.slice(0, 20).join('\n')}`);
}

const report = {
  dryRun,
  mysql: mysqlStats,
  roles: roleStats,
  questions: questionResult.stats,
  treeBindings: bindingResult.stats,
  edges: edgeStats,
  timeline: timelineResult.stats,
  timelineContentOwnership: timelineContentResult.stats,
  contentOwnership: contentOwnershipResult.stats,
  totals: {
    nodes: Object.keys(normalizedNodePool).length,
    edges: repaired.edges.length,
    questions: repaired.questions.length,
    timeline: repaired.timeline.length,
  },
};

if (!dryRun) {
  const timestamp = Date.now();
  const backupDir = path.join(dataDir, 'backups', `integrity-${timestamp}`);
  await fs.mkdir(backupDir, { recursive: true });
  await Promise.all(Object.values(dataPaths).map((filePath) => (
    fs.copyFile(filePath, path.join(backupDir, path.basename(filePath)))
  )));
  await Promise.all([
    writeFileAtomically(dataPaths.tree, `${JSON.stringify(repaired.tree, null, 2)}\n`),
    writeFileAtomically(dataPaths.nodePool, `${JSON.stringify(repaired.nodePool, null, 2)}\n`),
    writeFileAtomically(dataPaths.edges, `${JSON.stringify(repaired.edges, null, 2)}\n`),
    writeFileAtomically(dataPaths.questions, `${JSON.stringify(repaired.questions, null, 2)}\n`),
    writeFileAtomically(dataPaths.timeline, `${JSON.stringify(repaired.timeline, null, 2)}\n`),
  ]);
  report.backupDir = backupDir;
}

console.log(JSON.stringify(report, null, 2));
