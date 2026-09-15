import assert from 'node:assert/strict';
import test from 'node:test';
import {
  isValidVersionDate,
  normalizeVersionChainsWithDiagnostics,
  orderVersions,
} from '../src/knowledge/versionChains.ts';

/**
 * versions-v1 回归（2026-09-15 用户裁决）：
 * version-chains.json 是版本链唯一事实源，normalize 必须严格丢弃无法立足的条目：
 * id 含冒号（treebind 18 条坏债根因）、previous 悬空/跨链、环成员、id 全局重复、
 * releasedAt 非法。requires 依赖不存本文件（进 knowledge-edges.json）。
 */

const javaChain = {
  entityId: 'k_1782746457581_30q8ao',
  versions: [
    { id: 'java-v8', label: 'Java 8', releasedAt: '2014-03', eolAt: null, previous: null, tags: ['LTS'], changes: ['Lambda 表达式'] },
    { id: 'java-v11', label: 'Java 11', releasedAt: '2018-09', eolAt: null, previous: 'java-v8', tags: ['LTS'] },
    { id: 'java-v17', label: 'Java 17', releasedAt: '2021-09', eolAt: null, previous: 'java-v11', tags: ['LTS'] },
  ],
};

test('V1 合法种子数据零丢弃，链结构原样保留', () => {
  const { chains, dropped } = normalizeVersionChainsWithDiagnostics([javaChain]);
  assert.equal(dropped.length, 0);
  assert.equal(chains.length, 1);
  assert.equal(chains[0].entityId, javaChain.entityId);
  assert.equal(chains[0].versions.length, 3);
});

test('V2 负对照：id 含冒号的版本被丢弃（treebind 坏债根因防线）', () => {
  const bad = {
    entityId: 'e1',
    versions: [
      { id: 'good-v1', label: 'V1', releasedAt: '2020-01', previous: null },
      { id: 'bad:with:colon', label: 'Bad', releasedAt: '2021-01', previous: null },
    ],
  };
  const { chains, dropped } = normalizeVersionChainsWithDiagnostics([bad]);
  assert.equal(chains[0].versions.length, 1);
  assert.equal(chains[0].versions[0].id, 'good-v1');
  assert.ok(dropped.some((reason) => reason.includes('bad:with:colon')));
});

test('V3 负对照：previous 悬空（跨链引用）整节点丢弃', () => {
  const a = { entityId: 'ea', versions: [{ id: 'a-v1', label: 'A1', releasedAt: '2020-01', previous: null }] };
  const b = { entityId: 'eb', versions: [{ id: 'b-v1', label: 'B1', releasedAt: '2020-02', previous: 'a-v1' }] };
  const { chains, dropped } = normalizeVersionChainsWithDiagnostics([a, b]);
  assert.equal(chains.length, 1);
  assert.equal(chains[0].entityId, 'ea');
  assert.ok(dropped.some((reason) => reason.includes('b-v1') && reason.includes('a-v1')));
});

test('V4 负对照：环成员不可达，从链头丢弃', () => {
  const bad = {
    entityId: 'e1',
    versions: [
      { id: 'head-v1', label: 'H', releasedAt: '2020-01', previous: null },
      { id: 'cyc-a', label: 'A', releasedAt: '2020-02', previous: 'cyc-b' },
      { id: 'cyc-b', label: 'B', releasedAt: '2020-03', previous: 'cyc-a' },
    ],
  };
  const { chains, dropped } = normalizeVersionChainsWithDiagnostics([bad]);
  assert.equal(chains[0].versions.length, 1);
  assert.equal(chains[0].versions[0].id, 'head-v1');
  assert.ok(dropped.filter((reason) => reason.includes('环')).length === 2);
});

test('V5 负对照：id 全局重复（跨链也算）后出现者丢弃', () => {
  const a = { entityId: 'ea', versions: [{ id: 'dup-v1', label: 'A', releasedAt: '2020-01', previous: null }] };
  const b = { entityId: 'eb', versions: [{ id: 'dup-v1', label: 'B', releasedAt: '2021-01', previous: null }] };
  const { chains, dropped } = normalizeVersionChainsWithDiagnostics([a, b]);
  assert.equal(chains.length, 1);
  assert.ok(dropped.some((reason) => reason.includes('全局重复')));
});

test('V6 releasedAt 必须是 ISO 月精度且为真实日历日期', () => {
  assert.equal(isValidVersionDate('2014-03'), true);
  assert.equal(isValidVersionDate('2014'), true);
  assert.equal(isValidVersionDate('2014-03-25'), true);
  assert.equal(isValidVersionDate('2014-13'), false);
  assert.equal(isValidVersionDate('2014-02-30'), false);
  assert.equal(isValidVersionDate('2021-9'), false);
  assert.equal(isValidVersionDate(''), false);
  assert.equal(isValidVersionDate(1506556800000), false);
  const bad = { entityId: 'e1', versions: [{ id: 'x-v1', label: 'X', releasedAt: 'Sept 2021', previous: null }] };
  const { chains } = normalizeVersionChainsWithDiagnostics([bad]);
  assert.equal(chains.length, 0);
});

test('V7 orderVersions 沿 previous 单指针线性排序，链头在前', () => {
  const ordered = orderVersions(javaChain.versions);
  assert.deepEqual(ordered.map((v) => v.id), ['java-v8', 'java-v11', 'java-v17']);
});

test('V8 orderVersions 输入乱序仍稳定输出；余量节点不丢', () => {
  const shuffled = [javaChain.versions[2], javaChain.versions[0], javaChain.versions[1]];
  assert.deepEqual(orderVersions(shuffled).map((v) => v.id), ['java-v8', 'java-v11', 'java-v17']);
});

test('V9 链级残缺：缺 entityId / versions 非数组 / 顶层非数组，整链丢弃', () => {
  const { chains, dropped } = normalizeVersionChainsWithDiagnostics([
    { versions: [] },
    { entityId: 'e2', versions: 'nope' },
    'not-an-object',
    javaChain,
  ]);
  assert.equal(chains.length, 1);
  assert.equal(chains[0].entityId, javaChain.entityId);
  assert.ok(dropped.length >= 3);
});

test('V10 种子自检：真实落盘数据（若存在）必须零丢弃零警告', async () => {
  const fs = await import('node:fs');
  const file = new URL('../data/version-chains.json', import.meta.url);
  if (!fs.existsSync(file)) return;
  const raw = JSON.parse(fs.readFileSync(file, 'utf8'));
  const { chains, dropped } = normalizeVersionChainsWithDiagnostics(raw);
  assert.equal(dropped.length, 0);
  assert.equal(chains.length, 2);
  const ids = chains.flatMap((chain) => chain.versions.map((v) => v.id));
  assert.equal(new Set(ids).size, ids.length);
  for (const id of ids) assert.ok(!id.includes(':'));
});
