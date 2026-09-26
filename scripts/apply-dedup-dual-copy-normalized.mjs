#!/usr/bin/env node
/**
 * 双副本归并（approx + label-prefix，默认 dry-run）
 *
 * 范围：唯一 tab 且 rootContent 与 tab 内容归一化相等的 802 张卡：
 * - tab 段落空行更多：rootContent 精确替换为 tab.content，tabs = []
 * - root 段落空行更多或相同：保留 rootContent，tabs = []
 *
 * 不处理 strict / 内容实质不同 / root 为空 / 多 tab。不会写 evolution-events.json。
 *
 * tab 外壳的 label（如「定义」）随外壳一并有意丢弃、不迁移到 entity 层；
 * 每张目标卡的 tabLabel 记入 manifest 并逐次在 INFO 行披露，便于审计与回溯。
 * 空行口径 = /\n[ \t]*\n/（只带空格的空行也算），与 verify 脚本保持一致。
 * 用法：
 *   node scripts/apply-dedup-dual-copy-normalized.mjs
 *   node scripts/apply-dedup-dual-copy-normalized.mjs --snapshot-dir <dir>
 *   node scripts/apply-dedup-dual-copy-normalized.mjs --apply
 *   KNOWLEDGE_OS_DATA_DIR=<dir> node scripts/apply-dedup-dual-copy-normalized.mjs --apply
 */
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const ROOT = process.cwd();
const DATA_DIR = process.env.KNOWLEDGE_OS_DATA_DIR
  ? path.resolve(process.env.KNOWLEDGE_OS_DATA_DIR)
  : path.join(ROOT, 'data');
const APPLY = process.argv.includes('--apply');
const SNAPSHOT_DIR = optionValue('--snapshot-dir');
const DATA_FILES = [
  'tree-data.json',
  'node-pool.json',
  'knowledge-edges.json',
  'questions.json',
  'evolution-events.json',
  'version-chains.json',
];
const EXPECTED_GROUPS = Object.freeze({
  strict: 0,
  approx: 396,
  'label-prefix': 406,
  other: 555,
  'root-empty': 1577,
  'multi-or-none': 936,
});
const EXPECTED_DIRECTIONS = Object.freeze({ tab: 461, root: 127, tie: 214 });
const SAMPLE_SIZES = Object.freeze({ tab: 48, root: 8, tie: 24 });
const RETRYABLE_FS_ERROR_CODES = new Set(['EBUSY', 'EPERM', 'EACCES', 'UNKNOWN']);

function optionValue(name) {
  const index = process.argv.indexOf(name);
  if (index === -1) return null;
  const value = process.argv[index + 1];
  if (!value || value.startsWith('--')) throw new Error(`${name} requires a directory path.`);
  return path.resolve(value);
}

export function normalizeContent(value) {
  return String(value ?? '').replace(/\s+/g, '');
}

export function blankParagraphCount(value) {
  return (String(value ?? '').match(/\n[ \t]*\n/g) || []).length;
}

export function classifyCard(card, label = '') {
  const tabs = card?.tabs;
  if (!Array.isArray(tabs) || tabs.length !== 1) return 'multi-or-none';
  const root = card.rootContent ?? '';
  const tab = tabs[0]?.content ?? '';
  if (!String(root).trim()) return 'root-empty';
  if (root === tab) return 'strict';
  if (normalizeContent(root) === normalizeContent(tab)) return 'approx';
  if (normalizeContent(root) === normalizeContent(label) + normalizeContent(tab)) return 'label-prefix';
  return 'other';
}

export function contentDirection(root, tabContent) {
  const rootBlankParagraphs = blankParagraphCount(root);
  const tabBlankParagraphs = blankParagraphCount(tabContent);
  if (tabBlankParagraphs > rootBlankParagraphs) return 'tab';
  if (rootBlankParagraphs > tabBlankParagraphs) return 'root';
  return 'tie';
}

function isPreservableTabMetadata(entity, tab) {
  const extraKeys = Object.keys(tab).filter((key) => !['id', 'label', 'content'].includes(key));
  for (const key of extraKeys) {
    if (key === 'pages' && Array.isArray(tab.pages) && tab.pages.length === 0) continue;
    if (
      key === 'tags'
      && Array.isArray(tab.tags)
      && tab.tags.every((tag) => Array.isArray(entity.tags) && entity.tags.includes(tag))
    ) continue;
    return { ok: false, extraKeys, reason: `${key} is not empty or represented by entity.tags` };
  }
  return { ok: true, extraKeys, reason: '' };
}

function detectIndent(text) {
  for (const line of text.split('\n')) {
    const match = line.match(/^(\s+)\S/);
    if (match) return match[1];
  }
  return '  ';
}

function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function withFsRetry(action, label) {
  for (let attempt = 0; attempt < 6; attempt += 1) {
    try {
      return await action();
    } catch (error) {
      if (!RETRYABLE_FS_ERROR_CODES.has(error?.code) || attempt === 5) throw error;
      console.warn(`[normalized-dedup] ${error.code} on ${label}; retry #${attempt + 1}`);
      await delay(250 * 2 ** attempt);
    }
  }
}

async function writeFileAtomic(filePath, text) {
  const tempPath = path.join(
    path.dirname(filePath),
    `.${path.basename(filePath)}.${process.pid}.${Date.now()}.${Math.random().toString(36).slice(2)}.tmp`,
  );
  try {
    await withFsRetry(() => fs.promises.writeFile(tempPath, text, 'utf8'), `${path.basename(filePath)}:write-temp`);
    await withFsRetry(() => fs.promises.rename(tempPath, filePath), `${path.basename(filePath)}:rename`);
  } catch (error) {
    await fs.promises.rm(tempPath, { force: true }).catch(() => {});
    throw error;
  }
}

function sampleEvenly(ids, size) {
  const sorted = [...ids].sort();
  if (size >= sorted.length) return sorted;
  return Array.from({ length: size }, (_, index) => sorted[Math.floor(index * sorted.length / size)]);
}

function printGate(ok, label, detail = '') {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}${detail ? `  [${detail}]` : ''}`);
  return ok;
}

function buildPlan(rawPool, treeRaw) {
  const pool = JSON.parse(rawPool);
  const groups = Object.fromEntries(Object.keys(EXPECTED_GROUPS).map((group) => [group, []]));
  for (const [id, entity] of Object.entries(pool)) {
    groups[classifyCard(entity.card, entity.label ?? '')].push(id);
  }

  const failures = [];
  const requireGate = (ok, label, detail = '') => {
    if (!printGate(ok, label, detail)) failures.push(label);
  };

  console.log('══ Source classification gates ══');
  requireGate(Object.keys(pool).length === 3870, 'pool count = 3870', String(Object.keys(pool).length));
  for (const [group, expected] of Object.entries(EXPECTED_GROUPS)) {
    requireGate(groups[group].length === expected, `${group} count = ${expected}`, String(groups[group].length));
  }

  const targetIds = [...groups.approx, ...groups['label-prefix']].sort();
  requireGate(targetIds.length === 802, 'target count = 802', String(targetIds.length));

  const directions = { tab: [], root: [], tie: [] };
  const targets = [];
  const metadataSummary = new Map();
  const treeReferences = [];
  const supplementTabs = [];
  const invalidMetadata = [];
  const invalidTarget = [];
  let rootPointerCount = 0;
  let tabPointerCount = 0;

  for (const id of targetIds) {
    const entity = pool[id];
    const card = entity.card;
    const tab = card.tabs[0];
    const kind = classifyCard(card, entity.label ?? '');
    const metadata = isPreservableTabMetadata(entity, tab);
    const direction = contentDirection(card.rootContent, tab.content);
    const tabTreeReferenced = treeRaw.includes(JSON.stringify(tab.id));
    const hasSupplementTabs = Array.isArray(entity.supplement?.tabs) && entity.supplement.tabs.length > 0;

    if (
      card.tabs.length !== 1
      || !String(card.rootContent ?? '').trim()
      || !['approx', 'label-prefix'].includes(kind)
      || typeof tab.content !== 'string'
    ) invalidTarget.push(id);
    if (tabTreeReferenced) treeReferences.push(`${id}:${tab.id}`);
    if (hasSupplementTabs) supplementTabs.push(id);
    if (!metadata.ok) invalidMetadata.push(`${id}:${metadata.reason}`);
    if (metadata.extraKeys.length) {
      const key = metadata.extraKeys.sort().join(',');
      metadataSummary.set(key, (metadataSummary.get(key) ?? 0) + 1);
    }
    if (/详见|见子节点|见「|参见|另见/.test(card.rootContent)) rootPointerCount += 1;
    if (/详见|见子节点|见「|参见|另见/.test(tab.content)) tabPointerCount += 1;

    directions[direction].push(id);
    targets.push({
      id,
      kind,
      direction,
      rootHash: sha256(card.rootContent),
      tabHash: sha256(tab.content),
      tabId: tab.id,
      tabMetadata: metadata.extraKeys.sort(),
      tabLabel: tab.label ?? '',
    });
  }
  const tabLabels = targets.filter((target) => target.tabLabel !== '');

  console.log('\n══ Per-card safety gates ══');
  requireGate(invalidTarget.length === 0, 'all 802 cards remain single-tab normalized candidates', invalidTarget.slice(0, 3).join(', '));
  requireGate(treeReferences.length === 0, 'target tab ids have no tree-data references', treeReferences.slice(0, 3).join(', '));
  requireGate(supplementTabs.length === 0, 'target cards have no supplement.tabs to synchronize', supplementTabs.slice(0, 3).join(', '));
  requireGate(invalidMetadata.length === 0, 'tab metadata is empty or redundant at entity level', invalidMetadata.slice(0, 3).join(', '));
  console.log(`INFO  redundant/empty tab metadata: ${metadataSummary.size ? [...metadataSummary.entries()].map(([keys, count]) => `${keys}=${count}`).join(' ') : 'none'}`);
  console.log(`INFO  tab shell labels intentionally dropped with the shell (recorded per card as tabLabel): total=${targets.length} nonEmpty=${tabLabels.length}${tabLabels.length ? ` e.g. ${tabLabels.slice(0, 3).map((target) => `${target.id}=${JSON.stringify(target.tabLabel)}`).join(' ')}` : ''}`);
  console.log(`INFO  cross-node pointer text preserved, not blocked: root=${rootPointerCount} tab=${tabPointerCount}`);

  console.log('\n══ Direction gates ══');
  for (const [direction, expected] of Object.entries(EXPECTED_DIRECTIONS)) {
    requireGate(directions[direction].length === expected, `${direction} direction count = ${expected}`, String(directions[direction].length));
  }
  requireGate(
    directions.tab.length + directions.root.length + directions.tie.length === targetIds.length,
    'directions account for every target',
    `${directions.tab.length + directions.root.length + directions.tie.length}/${targetIds.length}`,
  );
  console.log('INFO  477/78/194 is the historical 749-card scanner subset; 461/127/214 is the current full 802-card cohort.');

  const inspectionSample = Object.fromEntries(
    Object.entries(SAMPLE_SIZES).map(([direction, size]) => [direction, sampleEvenly(directions[direction], size)]),
  );
  requireGate(
    Object.values(inspectionSample).flat().length === 80,
    'stratified inspection sample = 80 (48 tab / 8 root / 24 tie)',
    Object.values(inspectionSample).flat().length,
  );

  if (failures.length) throw new Error(`${failures.length} source gate(s) failed; no file was written.`);
  return { pool, targetIds, targets, directions, inspectionSample };
}

async function writeSnapshot(snapshotDir, rawFiles, plan) {
  if (fs.existsSync(snapshotDir)) throw new Error(`Snapshot directory already exists: ${snapshotDir}`);
  await fs.promises.mkdir(snapshotDir, { recursive: true });
  try {
    for (const [filename, content] of Object.entries(rawFiles)) {
      await fs.promises.writeFile(path.join(snapshotDir, filename), content);
    }
    const manifest = {
      batch: 'dedup-dual-copy-normalized',
      sourcePoolCount: Object.keys(plan.pool).length,
      targetCount: plan.targetIds.length,
      directionCounts: Object.fromEntries(Object.entries(plan.directions).map(([key, ids]) => [key, ids.length])),
      inspectionSample: plan.inspectionSample,
      sourceFiles: Object.fromEntries(Object.entries(rawFiles).map(([filename, content]) => [filename, { bytes: content.length, sha256: sha256(content) }])),
      targets: plan.targets,
    };
    await fs.promises.writeFile(path.join(snapshotDir, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
  } catch (error) {
    await fs.promises.rm(snapshotDir, { recursive: true, force: true }).catch(() => {});
    throw error;
  }
  console.log(`Snapshot written: ${snapshotDir}`);
}

async function main() {
  const rawFiles = Object.fromEntries(DATA_FILES.map((filename) => {
    const filePath = path.join(DATA_DIR, filename);
    return [filename, fs.readFileSync(filePath)];
  }));
  const rawPool = rawFiles['node-pool.json'].toString('utf8');
  const treeRaw = rawFiles['tree-data.json'].toString('utf8');
  const plan = buildPlan(rawPool, treeRaw);

  if (SNAPSHOT_DIR) await writeSnapshot(SNAPSHOT_DIR, rawFiles, plan);

  const originalPool = JSON.parse(rawPool);
  for (const target of plan.targets) {
    const card = plan.pool[target.id].card;
    if (target.direction === 'tab') card.rootContent = card.tabs[0].content;
    card.tabs = [];
  }

  console.log('\n══ Planned change-set gate ══');
  const changed = Object.keys(plan.pool).filter(
    (id) => JSON.stringify(plan.pool[id]) !== JSON.stringify(originalPool[id]),
  );
  const changedSet = new Set(changed);
  const targetSet = new Set(plan.targetIds);
  const exactChangeSet = changedSet.size === targetSet.size && [...targetSet].every((id) => changedSet.has(id));
  if (!printGate(exactChangeSet, 'changed entities are exactly the 802 targets', `changed=${changed.length}`)) {
    throw new Error('Change-set gate failed; no file was written.');
  }
  if (!printGate(Object.keys(plan.pool).length === 3870, 'pool count remains 3870')) {
    throw new Error('Pool count gate failed; no file was written.');
  }

  if (!APPLY) {
    console.log('\nDry-run passed. Add --apply to write node-pool.json.');
    return;
  }

  const poolFile = path.join(DATA_DIR, 'node-pool.json');
  const indent = detectIndent(rawPool);
  await writeFileAtomic(poolFile, `${JSON.stringify(plan.pool, null, indent)}\n`);

  const reread = JSON.parse(fs.readFileSync(poolFile, 'utf8'));
  const rereadChanged = Object.keys(reread).filter(
    (id) => JSON.stringify(reread[id]) !== JSON.stringify(originalPool[id]),
  );
  const rereadChangedSet = new Set(rereadChanged);
  const rereadChangeSetExact = rereadChangedSet.size === targetSet.size && [...targetSet].every((id) => rereadChangedSet.has(id));
  const readbackOk = rereadChangeSetExact && plan.targets.every((target) => {
    const before = originalPool[target.id].card;
    const after = reread[target.id].card;
    const expectedRoot = target.direction === 'tab' ? before.tabs[0].content : before.rootContent;
    return after.rootContent === expectedRoot && Array.isArray(after.tabs) && after.tabs.length === 0;
  });
  if (!printGate(readbackOk, 'readback preserves selected root and clears every target tab', `changed=${rereadChanged.length}`)) {
    throw new Error('Readback gate failed.');
  }
  console.log(`\nApply complete: ${plan.targetIds.length} cards normalized; pool count remains 3870.`);
}

main().catch((error) => {
  console.error(`\nERROR  ${error.message}`);
  process.exitCode = 1;
});
