#!/usr/bin/env node
/**
 * 独立验证：dual-copy normalized（approx + label-prefix）
 *
 * 不 import apply 脚本；以 apply 前六文件快照和 manifest 为证据，验证：
 * 1. 除 node-pool.json 外的五个数据文件逐字节不变；
 * 2. 快照目标集合独立重算后恰为 802；
 * 3. 恰改这 802 个实体；
 * 4. tab 分支取 tab 正文，root/tie 分支逐字节保留 root，且 tabs 清空；
 * 5. 非目标实体逐对象字节等价；
 * 6. 80 张分层样本和后置归类计数均正确。
 *
 * 用法：
 *   node scripts/verify-dedup-dual-copy-normalized.mjs
 *   KNOWLEDGE_OS_DATA_DIR=<dir> node scripts/verify-dedup-dual-copy-normalized.mjs
 *   node scripts/verify-dedup-dual-copy-normalized.mjs --snapshot-dir <dir>
 */
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const ROOT = process.cwd();
const DATA_DIR = process.env.KNOWLEDGE_OS_DATA_DIR
  ? path.resolve(process.env.KNOWLEDGE_OS_DATA_DIR)
  : path.join(ROOT, 'data');
const DEFAULT_SNAPSHOT_DIR = path.join(ROOT, 'outputs', 'tree-violation-scan', 'dedup-dual-copy-normalized-snapshot');
const SNAPSHOT_DIR = optionValue('--snapshot-dir') ?? DEFAULT_SNAPSHOT_DIR;
const DATA_FILES = [
  'tree-data.json',
  'node-pool.json',
  'knowledge-edges.json',
  'questions.json',
  'evolution-events.json',
  'version-chains.json',
];
const SOURCE_GROUPS = Object.freeze({
  strict: 0,
  approx: 396,
  'label-prefix': 406,
  other: 555,
  'root-empty': 1577,
  'multi-or-none': 936,
});
const RESULT_GROUPS = Object.freeze({
  strict: 0,
  approx: 0,
  'label-prefix': 0,
  other: 555,
  'root-empty': 1577,
  'multi-or-none': 1738,
});
const DIRECTION_COUNTS = Object.freeze({ tab: 461, root: 127, tie: 214 });
const SAMPLE_SIZES = Object.freeze({ tab: 48, root: 8, tie: 24 });

function optionValue(name) {
  const index = process.argv.indexOf(name);
  if (index === -1) return null;
  const value = process.argv[index + 1];
  if (!value || value.startsWith('--')) throw new Error(`${name} requires a directory path.`);
  return path.resolve(value);
}

function normalizeContent(value) {
  return String(value ?? '').replace(/\s+/g, '');
}

function blankParagraphCount(value) {
  return (String(value ?? '').match(/\n[ \t]*\n/g) || []).length;
}

function classifyCard(card, label = '') {
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

function contentDirection(root, tabContent) {
  const rootCount = blankParagraphCount(root);
  const tabCount = blankParagraphCount(tabContent);
  if (tabCount > rootCount) return 'tab';
  if (rootCount > tabCount) return 'root';
  return 'tie';
}

function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function printCheck(ok, label, detail = '') {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}${detail ? `  [${detail}]` : ''}`);
  return ok;
}

function equalSets(left, right) {
  return left.size === right.size && [...left].every((value) => right.has(value));
}

function sameObject(left, right) {
  return JSON.stringify(left) === JSON.stringify(right);
}

function main() {
  const snapshotFiles = Object.fromEntries(DATA_FILES.map((filename) => {
    const filePath = path.join(SNAPSHOT_DIR, filename);
    return [filename, fs.readFileSync(filePath)];
  }));
  const currentFiles = Object.fromEntries(DATA_FILES.map((filename) => {
    const filePath = path.join(DATA_DIR, filename);
    return [filename, fs.readFileSync(filePath)];
  }));
  const manifest = JSON.parse(fs.readFileSync(path.join(SNAPSHOT_DIR, 'manifest.json'), 'utf8'));
  const sourcePool = JSON.parse(snapshotFiles['node-pool.json'].toString('utf8'));
  const currentPool = JSON.parse(currentFiles['node-pool.json'].toString('utf8'));
  const failures = [];
  const check = (ok, label, detail = '') => {
    if (!printCheck(ok, label, detail)) failures.push(label);
  };

  console.log('══ Snapshot integrity ══');
  check(manifest.batch === 'dedup-dual-copy-normalized', 'snapshot manifest identifies normalized dual-copy batch');
  for (const [filename, evidence] of Object.entries(manifest.sourceFiles ?? {})) {
    const source = snapshotFiles[filename];
    check(
      source?.length === evidence.bytes && sha256(source) === evidence.sha256,
      `snapshot ${filename} matches its recorded hash`,
      `${source?.length ?? 0} bytes`,
    );
  }

  console.log('\n══ Non-pool data immutability ══');
  for (const filename of DATA_FILES.filter((filename) => filename !== 'node-pool.json')) {
    check(
      Buffer.compare(snapshotFiles[filename], currentFiles[filename]) === 0,
      `${filename} is byte-identical to snapshot`,
      `${currentFiles[filename].length} bytes`,
    );
  }

  console.log('\n══ Independent source reconstruction ══');
  const sourceGroups = Object.fromEntries(Object.keys(SOURCE_GROUPS).map((group) => [group, []]));
  for (const [id, entity] of Object.entries(sourcePool)) {
    sourceGroups[classifyCard(entity.card, entity.label ?? '')].push(id);
  }
  check(Object.keys(sourcePool).length === 3870, 'source pool count = 3870', String(Object.keys(sourcePool).length));
  for (const [group, expected] of Object.entries(SOURCE_GROUPS)) {
    check(sourceGroups[group].length === expected, `source ${group} count = ${expected}`, String(sourceGroups[group].length));
  }
  const targetIds = [...sourceGroups.approx, ...sourceGroups['label-prefix']].sort();
  const targetSet = new Set(targetIds);
  check(targetIds.length === 802, 'source target set has 802 cards', String(targetIds.length));

  const manifestTargets = new Map((manifest.targets ?? []).map((target) => [target.id, target]));
  check(equalSets(targetSet, new Set(manifestTargets.keys())), 'manifest target set equals independently reconstructed target set', `manifest=${manifestTargets.size}`);

  const directions = { tab: [], root: [], tie: [] };
  for (const id of targetIds) {
    const entity = sourcePool[id];
    const tab = entity.card.tabs[0];
    const direction = contentDirection(entity.card.rootContent, tab.content);
    directions[direction].push(id);
    const evidence = manifestTargets.get(id);
    check(
      evidence?.kind === classifyCard(entity.card, entity.label ?? '')
        && evidence.direction === direction
        && evidence.rootHash === sha256(entity.card.rootContent)
        && evidence.tabHash === sha256(tab.content)
        && evidence.tabId === tab.id
        && (evidence.tabLabel === undefined || evidence.tabLabel === (tab.label ?? '')),
      `manifest evidence matches source: ${id}`,
    );
  }
  for (const [direction, expected] of Object.entries(DIRECTION_COUNTS)) {
    check(directions[direction].length === expected, `source ${direction} direction count = ${expected}`, String(directions[direction].length));
  }
  const droppedTabLabels = targetIds.filter((id) => (sourcePool[id].card.tabs[0].label ?? '') !== '');
  console.log(`INFO  tab shell labels dropped with the shell (intentional, not migrated): ${droppedTabLabels.length}/${targetIds.length}${droppedTabLabels.length ? ` e.g. ${droppedTabLabels.slice(0, 3).map((id) => `${id}=${JSON.stringify(sourcePool[id].card.tabs[0].label)}`).join(' ')}` : ''}`);

  console.log('\n══ Entity-level result verification ══');
  check(Object.keys(currentPool).length === 3870, 'current pool count = 3870', String(Object.keys(currentPool).length));
  const changed = [];
  const entityFailures = [];
  for (const id of Object.keys(sourcePool)) {
    const before = sourcePool[id];
    const after = currentPool[id];
    if (!sameObject(before, after)) changed.push(id);
    if (!targetSet.has(id)) {
      if (!sameObject(before, after)) entityFailures.push(`non-target changed: ${id}`);
      continue;
    }

    const expected = JSON.parse(JSON.stringify(before));
    const direction = contentDirection(before.card.rootContent, before.card.tabs[0].content);
    if (direction === 'tab') expected.card.rootContent = before.card.tabs[0].content;
    expected.card.tabs = [];
    if (!sameObject(expected, after)) entityFailures.push(`target result differs: ${id}`);
  }
  const changedSet = new Set(changed);
  check(equalSets(changedSet, targetSet), 'changed entity set is exactly the 802 targets', `changed=${changed.length}`);
  check(entityFailures.length === 0, 'all target mutations and non-target preservation are exact', entityFailures.slice(0, 3).join('; '));

  console.log('\n══ Stratified 80-card inspection ══');
  const samples = manifest.inspectionSample ?? {};
  let sampleChecked = 0;
  let sampleFailures = [];
  for (const [direction, size] of Object.entries(SAMPLE_SIZES)) {
    const ids = samples[direction];
    const expectedDirectionSet = new Set(directions[direction]);
    const validMembers = Array.isArray(ids) && ids.length === size && ids.every((id) => expectedDirectionSet.has(id));
    check(validMembers, `${direction} sample has ${size} valid source members`, Array.isArray(ids) ? String(ids.length) : 'missing');
    if (!validMembers) continue;
    for (const id of ids) {
      sampleChecked += 1;
      const before = sourcePool[id].card;
      const after = currentPool[id].card;
      const expectedRoot = direction === 'tab' ? before.tabs[0].content : before.rootContent;
      if (after.rootContent !== expectedRoot || after.tabs.length !== 0) sampleFailures.push(id);
    }
  }
  check(sampleChecked === 80 && sampleFailures.length === 0, 'all 80 sampled cards preserve the chosen content branch and clear tabs', sampleFailures.slice(0, 3).join(', '));

  console.log('\n══ Result classification ══');
  const resultGroups = Object.fromEntries(Object.keys(RESULT_GROUPS).map((group) => [group, 0]));
  for (const entity of Object.values(currentPool)) {
    resultGroups[classifyCard(entity.card, entity.label ?? '')] += 1;
  }
  for (const [group, expected] of Object.entries(RESULT_GROUPS)) {
    check(resultGroups[group] === expected, `result ${group} count = ${expected}`, String(resultGroups[group]));
  }

  if (failures.length) {
    console.log(`\nVerification failed: ${failures.length} check(s).`);
    process.exitCode = 1;
    return;
  }
  console.log('\nVerification passed: 802-card normalized dual-copy cleanup is exact.');
}

try {
  main();
} catch (error) {
  console.error(`\nERROR  ${error.message}`);
  process.exitCode = 1;
}
