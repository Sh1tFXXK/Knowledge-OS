#!/usr/bin/env node
/**
 * versions-v1 独立验证脚本（2026-09-15）。
 *
 * 独立性纪律：**不 import apply 脚本**，由批前快照 ↔ 当前工作树反推 Δ。
 * 负对照（V7/V8）用坏数据喂 normalize，证明判据本身有杀伤力——
 * 没有负对照的「判据已修好」不是证据（宪法 §3.2）。
 */
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { normalizeVersionChainsWithDiagnostics, isValidVersionDate } from '../src/knowledge/versionChains.ts';

const ROOT = resolve(import.meta.dirname, '..');
const SNAPSHOT = resolve(ROOT, 'data/backups/versions-v1-2026-09-15T07-14-24-000Z');
const CHAINS_PATH = resolve(ROOT, 'data/version-chains.json');
const EDGES_PATH = resolve(ROOT, 'data/knowledge-edges.json');

const EXPECTED_EDGE_IDS = [
  'requires:spring-framework-v5.0:java-v8',
  'requires:spring-framework-v6.0:java-v17',
];
const EXPECTED_NODE_IDS = new Set([
  'java-v8', 'java-v11', 'java-v17',
  'spring-framework-v4.0', 'spring-framework-v5.0', 'spring-framework-v6.0',
]);

let failures = 0;
function gate(name, ok, detail = '') {
  const mark = ok ? '✅' : '❌';
  console.log(`${mark} ${name}${detail ? ` — ${detail}` : ''}`);
  if (!ok) failures += 1;
  return ok;
}

// ── V1 version-chains.json 形状 ──
console.log('\n== V1 version-chains.json ==');
gate('V1.1 文件存在', existsSync(CHAINS_PATH));
const chainsRaw = JSON.parse(readFileSync(CHAINS_PATH, 'utf8'));
const { chains, dropped } = normalizeVersionChainsWithDiagnostics(chainsRaw);
gate('V1.2 顶层 = 2 链', chains.length === 2, `实际 ${chains.length}`);
gate('V1.3 normalize 零丢弃', dropped.length === 0, dropped.join('；'));
const entityIds = chains.map((chain) => chain.entityId).sort();
gate(
  'V1.4 entityId 恰为 Java/Spring 锚点',
  JSON.stringify(entityIds) === JSON.stringify(['k_1782746457581_30q8ao', 'k_java_fw_spring']),
  entityIds.join(', '),
);
const allNodes = chains.flatMap((chain) => chain.versions);
gate('V1.5 版本节点 = 6', allNodes.length === 6, `实际 ${allNodes.length}`);
gate(
  'V1.6 节点 id 集合与声明一致',
  allNodes.length === EXPECTED_NODE_IDS.size && allNodes.every((node) => EXPECTED_NODE_IDS.has(node.id)),
);
gate('V1.7 全部 id 无冒号', allNodes.every((node) => !node.id.includes(':')));
gate('V1.8 releasedAt 全部合法月精度', allNodes.every((node) => isValidVersionDate(node.releasedAt)));

// V1.9 链完整性：每链恰 1 个链头，沿 previous 走完全链
function chainWalkOk(chain) {
  const ids = new Set(chain.versions.map((node) => node.id));
  const heads = chain.versions.filter((node) => node.previous === null);
  if (heads.length !== 1) return false;
  let cursor = heads[0];
  const seen = new Set([cursor.id]);
  while (true) {
    const next = chain.versions.find((node) => node.previous === cursor.id);
    if (!next) break;
    if (seen.has(next.id)) return false;
    seen.add(next.id);
    cursor = next;
  }
  return seen.size === chain.versions.length && chain.versions.every((node) => node.previous === null || ids.has(node.previous));
}
gate('V1.9 每链单链头 + previous 全链可达（线性、无环、无悬空）', chains.every(chainWalkOk));

// ── V2 knowledge-edges.json Δ ──
console.log('\n== V2 knowledge-edges.json Δ（快照反推）==');
const snapshotEdges = JSON.parse(readFileSync(resolve(SNAPSHOT, 'knowledge-edges.json'), 'utf8'));
const currentEdges = JSON.parse(readFileSync(EDGES_PATH, 'utf8'));
gate('V2.1 快照 edges = 4161', snapshotEdges.length === 4161);
gate('V2.2 当前 edges = 4163', currentEdges.length === 4163, `实际 ${currentEdges.length}`);

const currentById = new Map(currentEdges.map((edge) => [edge.id, edge]));
const snapshotIds = new Set(snapshotEdges.map((edge) => edge.id));
const added = currentEdges.filter((edge) => !snapshotIds.has(edge.id));
const removed = snapshotEdges.filter((edge) => !currentById.has(edge.id));
gate('V2.3 新增恰为 2 条且 id 精确匹配', added.length === 2 && added.every((edge) => EXPECTED_EDGE_IDS.includes(edge.id)),
  added.map((edge) => edge.id).join(', '));
gate('V2.4 零删除', removed.length === 0, removed.map((edge) => edge.id).join(', '));

const modified = snapshotEdges.filter((edge) => {
  const counterpart = currentById.get(edge.id);
  return counterpart && JSON.stringify(counterpart) !== JSON.stringify(edge);
});
gate('V2.5 零修改（reparse 深比较）', modified.length === 0, modified.map((edge) => edge.id).join(', '));

const requiresShapeOk = added.every((edge) =>
  edge.type === 'requires'
  && edge.relationKind === 'dependency'
  && typeof edge.label === 'string'
  && typeof edge.source === 'string'
  && typeof edge.target === 'string');
gate('V2.6 requires 边形状 = { id, source, target, type, relationKind, label }', requiresShapeOk);

// ── V3 其余切片逐字节零改动 ──
console.log('\n== V3 其余 data 切片逐字节零改动 ==');
for (const file of ['tree-data.json', 'node-pool.json', 'evolution-events.json', 'questions.json']) {
  const a = readFileSync(resolve(SNAPSHOT, file));
  const b = readFileSync(resolve(ROOT, 'data', file));
  gate(`V3.${file} 逐字节相等`, a.equals(b));
}

// ── V4 requires 端点闭合于版本表、且不在池 ──
console.log('\n== V4 端点闭合与索引图隔离前提 ==');
const versionIds = new Set(allNodes.map((node) => node.id));
gate('V4.1 requires 端点全部是已声明版本 id', added.every((edge) => versionIds.has(edge.source) && versionIds.has(edge.target)));
const pool = JSON.parse(readFileSync(resolve(ROOT, 'data/node-pool.json'), 'utf8'));
gate('V4.2 requires 端点均不在池中（索引图按池 id 连边 ⇒ 天然不渲染）', added.every((edge) => !pool[edge.source] && !pool[edge.target]));
gate('V4.3 版本 id 与池 id 无碰撞', [...versionIds].every((id) => !pool[id]));

// ── V5 既有边类型词表未被扩散 ──
gate('V5.1 既有边中无 requires 类型混入', snapshotEdges.every((edge) => edge.type !== 'requires'));

// ── V6 文件格式 ──
console.log('\n== V6 格式 ==');
for (const file of [CHAINS_PATH, EDGES_PATH]) {
  const text = readFileSync(file, 'utf8');
  gate(`V6 ${file.split(/[\\/]/).pop()} 2 空格缩进 + 尾换行`, text.endsWith('\n') && /^ {2}[\{\"]/m.test(text));
}

// ── V7 负对照：坏数据喂 normalize 必须被杀 ──
console.log('\n== V7 负对照（normalize 判据杀伤力）==');
{
  const colonId = normalizeVersionChainsWithDiagnostics([
    { entityId: 'e', versions: [{ id: 'bad:id', label: 'X', releasedAt: '2020-01', previous: null }] },
  ]);
  gate('V7.1 冒号 id 被丢弃', colonId.chains.length === 0 && colonId.dropped.length === 1);
}
{
  const dangling = normalizeVersionChainsWithDiagnostics([
    { entityId: 'e', versions: [{ id: 'b-v1', label: 'B', releasedAt: '2020-01', previous: 'ghost' }] },
  ]);
  gate('V7.2 悬空 previous 被丢弃', dangling.chains.length === 0);
}
{
  const cycle = normalizeVersionChainsWithDiagnostics([
    {
      entityId: 'e',
      versions: [
        { id: 'a', label: 'A', releasedAt: '2020-01', previous: 'b' },
        { id: 'b', label: 'B', releasedAt: '2020-02', previous: 'a' },
      ],
    },
  ]);
  gate('V7.3 纯环（无链头）整链清空', cycle.chains.length === 0);
}
{
  const dup = normalizeVersionChainsWithDiagnostics([
    { entityId: 'e1', versions: [{ id: 'd-v1', label: 'A', releasedAt: '2020-01', previous: null }] },
    { entityId: 'e2', versions: [{ id: 'd-v1', label: 'B', releasedAt: '2021-01', previous: null }] },
  ]);
  const alive = dup.chains.flatMap((chain) => chain.versions.map((node) => node.id));
  gate('V7.4 跨链重复 id 只存活一个', new Set(alive).size === 1 && alive.length === 1);
}
{
  const badDate = normalizeVersionChainsWithDiagnostics([
    { entityId: 'e', versions: [{ id: 'x', label: 'X', releasedAt: '2021-02-29', previous: null }] },
  ]);
  gate('V7.5 非真实日历日期被丢弃', badDate.chains.length === 0);
}

// ── V8 负对照：真实数据拷贝未被污染（防止 V7 的判据反向误杀）──
gate('V8 正对照：真实种子过 normalize 零丢弃（V7 判据不误伤）', dropped.length === 0 && chains.length === 2);

console.log(`\n== 验证结论：${failures === 0 ? 'PASS（全部通过）' : `FAIL（${failures} 项失败）`} ==`);
process.exit(failures === 0 ? 0 : 1);
