import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { writeFileAtomically } from './import/web-link-importer.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(__dirname, '..');

/**
 * Fill an arbitrary taxonomy/skeleton node's content by node id.
 * Mirrors fill-redis-chapter.mjs but works for any node in node-pool.json.
 */
export async function fillNodeContent(nodeId, contentMarkdown, options = {}) {
  const projectRoot = options.projectRoot ?? PROJECT_ROOT;
  const tabId = options.tabId ?? 'main';
  const tabLabel = options.tabLabel ?? '概述';
  const tags = options.tags; // optional string[]

  const poolPath = path.join(projectRoot, 'data', 'node-pool.json');
  const pool = JSON.parse(await fs.readFile(poolPath, 'utf8'));
  const node = pool[nodeId];
  if (!node) throw new Error(`节点 ${nodeId} 不存在`);

  node.card ??= {};
  node.card.nodeId ??= nodeId;
  node.card.title ??= node.label;
  node.card.rootContent = contentMarkdown;

  node.card.tabs ??= [];
  const idx = node.card.tabs.findIndex((t) => t.id === tabId);
  const tab = { id: tabId, label: tabLabel, content: contentMarkdown };
  if (idx >= 0) node.card.tabs[idx] = tab;
  else node.card.tabs.push(tab);

  if (Array.isArray(tags)) node.tags = tags;

  await writeFileAtomically(poolPath, `${JSON.stringify(pool, null, 2)}\n`);

  return {
    ok: true,
    nodeId,
    tabId,
    characterCount: contentMarkdown.replace(/\s/g, '').length,
  };
}

async function main() {
  const nodeId = process.argv[2];
  const contentFile = process.argv[3];
  if (!nodeId || !contentFile) {
    console.error('用法：node scripts/fill-node.mjs <nodeId> <内容.md> [tabLabel]');
    process.exit(1);
  }
  const content = await fs.readFile(contentFile, 'utf8');
  const result = await fillNodeContent(nodeId, content, { tabLabel: process.argv[4] || '概述' });
  console.log(JSON.stringify(result, null, 2));
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  await main();
}
