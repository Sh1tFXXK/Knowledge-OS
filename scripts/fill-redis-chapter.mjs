import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { writeFileAtomically } from './import/web-link-importer.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(__dirname, '..');
const ARTICLE_PREFIX = 'k_document_7eb59eb99538';
const ROOT_TREE_ID = 'tree_document_7eb59eb99538';

const chapterNodeIds = {
  1: `${ARTICLE_PREFIX}_s1`,
  2: `${ARTICLE_PREFIX}_s3`,
  3: `${ARTICLE_PREFIX}_s4`,
  4: `${ARTICLE_PREFIX}_s5`,
  5: `${ARTICLE_PREFIX}_s6`,
  6: `${ARTICLE_PREFIX}_s7`,
  7: `${ARTICLE_PREFIX}_s8`,
  8: `${ARTICLE_PREFIX}_s9`,
  9: `${ARTICLE_PREFIX}_s11`,
  10: `${ARTICLE_PREFIX}_s12`,
  11: `${ARTICLE_PREFIX}_s13`,
  12: `${ARTICLE_PREFIX}_s14`,
  13: `${ARTICLE_PREFIX}_s15`,
  14: `${ARTICLE_PREFIX}_s16`,
  15: `${ARTICLE_PREFIX}_s18`,
  16: `${ARTICLE_PREFIX}_s19`,
  17: `${ARTICLE_PREFIX}_s20`,
  18: `${ARTICLE_PREFIX}_s22`,
  19: `${ARTICLE_PREFIX}_s23`,
  20: `${ARTICLE_PREFIX}_s24`,
  21: `${ARTICLE_PREFIX}_s25`,
  22: `${ARTICLE_PREFIX}_s26`,
  23: `${ARTICLE_PREFIX}_s27`,
  24: `${ARTICLE_PREFIX}_s28`,
};

async function findNotesFile(projectRoot) {
  const notesDirectory = path.join(projectRoot, 'docs', 'notes');
  const files = await fs.readdir(notesDirectory);
  const match = files.find((f) => f.startsWith('document-redis') && f.includes('7eb59e') && f.endsWith('.md'));
  return match ? path.join(notesDirectory, match) : null;
}

export async function fillRedisChapter(chapterNumber, contentMarkdown, options = {}) {
  const projectRoot = options.projectRoot ?? PROJECT_ROOT;
  const nodeId = chapterNodeIds[chapterNumber];
  if (!nodeId) throw new Error(`未知章节编号：${chapterNumber}`);

  const poolPath = path.join(projectRoot, 'data', 'node-pool.json');
  const pool = JSON.parse(await fs.readFile(poolPath, 'utf8'));
  const chapterNode = pool[nodeId];
  if (!chapterNode) throw new Error(`节点 ${nodeId} 不存在，请先导入骨架`);

  chapterNode.card.rootContent = contentMarkdown;

  const rootNode = pool[ARTICLE_PREFIX];
  rootNode.card.tabs ??= [];
  const existingIndex = rootNode.card.tabs.findIndex((t) => t.id === `sec_${chapterNumber}`);
  const tab = {
    id: `sec_${chapterNumber}`,
    label: chapterNode.card.title,
    content: contentMarkdown,
  };
  if (existingIndex >= 0) rootNode.card.tabs[existingIndex] = tab;
  else rootNode.card.tabs.push(tab);

  await writeFileAtomically(poolPath, `${JSON.stringify(pool, null, 2)}\n`);

  const notesPath = await findNotesFile(projectRoot);
  if (notesPath) {
    const current = await fs.readFile(notesPath, 'utf8');
    const appendix = `\n\n---\n\n${contentMarkdown}\n`;
    await writeFileAtomically(notesPath, `${current.trim()}${appendix}`);
  }

  return {
    ok: true,
    chapterNumber,
    nodeId,
    tabId: `sec_${chapterNumber}`,
    characterCount: contentMarkdown.replace(/\s/g, '').length,
  };
}

async function main() {
  const chapterNumber = Number(process.argv[2]);
  const contentFile = process.argv[3];
  if (!chapterNumber || !contentFile) {
    console.error('用法：node scripts/fill-redis-chapter.mjs <章节编号> <内容.md>');
    process.exit(1);
  }
  const content = await fs.readFile(contentFile, 'utf8');
  const result = await fillRedisChapter(chapterNumber, content);
  console.log(JSON.stringify(result, null, 2));
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  await main();
}

import { pathToFileURL } from 'node:url';
