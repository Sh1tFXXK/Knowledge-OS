import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { writeFileAtomically } from './import/web-link-importer.mjs';

export const R_SEGMENT_NODE_IDS = Object.freeze([
  'k_dict_1a3p1hdq',
  'mysql_glossary_relational_1yoaip',
  'mysql_glossary_relevance_1schdd',
  'k_dict_4zr5j9bz',
  'mysql_glossary_repertoire_jo0oic',
  'mysql_glossary_replica_7pskdj',
  'k_dict_sctomy1z',
]);

function definitionContent(node) {
  return node?.card?.tabs?.find((tab) => tab.id === 'def')?.content
    ?? node?.card?.tabs?.[0]?.content
    ?? '';
}

export function projectionDescription(node) {
  return definitionContent(node)
    .replace(
      /^\*\*[^\n]+\*\*\r?\n\u82f1\u6587\uff1a[^\n]+\r?\n\u4e2d\u6587\uff1a[^\n]+\r?\n\r?\n/,
      '',
    )
    .replace(/\r?\n\r?\n\u6765\u6e90\uff1a[^\n]*$/, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 120);
}

export function syncRSegmentProjectionDescriptions(nodePool) {
  const targetIds = new Set(R_SEGMENT_NODE_IDS);
  const expectedByNodeId = new Map();
  const missingCanonicalNodeIds = [];
  for (const nodeId of targetIds) {
    const node = nodePool[nodeId];
    if (!node) {
      missingCanonicalNodeIds.push(nodeId);
      continue;
    }
    expectedByNodeId.set(nodeId, projectionDescription(node));
  }

  let observedProjections = 0;
  let projectionsUpdated = 0;
  const updatedByNodeId = new Map();

  function visit(value) {
    if (Array.isArray(value)) {
      value.forEach(visit);
      return;
    }
    if (!value || typeof value !== 'object') return;

    const expected = expectedByNodeId.get(value.nodeId);
    if (expected !== undefined && typeof value.desc === 'string') {
      observedProjections += 1;
      if (value.desc !== expected) {
        value.desc = expected;
        projectionsUpdated += 1;
        updatedByNodeId.set(value.nodeId, (updatedByNodeId.get(value.nodeId) ?? 0) + 1);
      }
    }

    Object.values(value).forEach(visit);
  }

  visit(nodePool);
  return {
    observedProjections,
    projectionsUpdated,
    updatedByNodeId: Object.fromEntries(updatedByNodeId),
    missingCanonicalNodeIds,
  };
}

async function main() {
  const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
  const nodePoolPath = path.join(projectRoot, 'data', 'node-pool.json');
  const apply = process.argv.includes('--apply');
  const nodePool = JSON.parse(await fs.readFile(nodePoolPath, 'utf8'));
  const result = syncRSegmentProjectionDescriptions(nodePool);

  if (result.missingCanonicalNodeIds.length > 0) {
    throw new Error(`Missing R-segment nodes: ${result.missingCanonicalNodeIds.join(', ')}`);
  }

  let backupDir = null;
  if (apply && result.projectionsUpdated > 0) {
    backupDir = path.join(projectRoot, 'data', 'backups', `r-segment-projections-${Date.now()}`);
    await fs.mkdir(backupDir, { recursive: true });
    await fs.copyFile(nodePoolPath, path.join(backupDir, 'node-pool.json'));
    await writeFileAtomically(nodePoolPath, `${JSON.stringify(nodePool, null, 2)}\n`);
  }

  console.log(JSON.stringify({ apply, backupDir, ...result }, null, 2));
}

const isMain = process.argv[1]
  && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) await main();
