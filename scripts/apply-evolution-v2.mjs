#!/usr/bin/env node
/**
 * EVOLUTION-V2 · 落盘脚本（默认 dry-run，--apply 才写）
 *
 * 裁决（用户 2026-09-15）：Timeline 从「知识库操作日志」改为「实体演化图」。
 *   ① 删除 6 条 event:tree-refactor:* 批次操作日志（仓库史由 git + batch-manifests 承载）；
 *   ② event:spring:4 / event:spring:5 补 type:"release"（真实历史时间，保留全部其余字段）；
 *   ③ evolution-events.json 从此只收知识演化事件（release/introduce/deprecate/replace/split/merge）。
 * 本批**不**向该文件追加任何「本批自己的事件」—— 那正是被清退的行为。
 *
 * 用法：
 *   node scripts/apply-evolution-v2.mjs            # dry-run
 *   node scripts/apply-evolution-v2.mjs --apply    # 落盘
 *   KNOWLEDGE_OS_DATA_DIR=... 重定向数据目录（测试用，不许打真数据）
 */
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const ROOT = process.cwd();
const APPLY = process.argv.includes('--apply');
const DATA_DIR = process.env.KNOWLEDGE_OS_DATA_DIR
  ? path.resolve(process.env.KNOWLEDGE_OS_DATA_DIR)
  : path.join(ROOT, 'data');
const OUT_DIR = path.join(ROOT, 'outputs', 'tree-violation-scan');

const EVO = path.join(DATA_DIR, 'evolution-events.json');

const REMOVE_IDS = [
  'event:tree-refactor:phase1:1789371446647',
  'event:tree-refactor:t3-p0:1789391683976',
  'event:tree-refactor:t3-p0.1:1789393855508',
  'event:tree-refactor:t3-p1:1789396485052',
  'event:tree-refactor:t3-p2:1789399635504',
  'event:tree-refactor:p-web-http-scope:1789403714212',
];
const KEEP_IDS = ['event:spring:4', 'event:spring:5'];
const KEEP_TYPE = 'release';

const readJson = (f) => JSON.parse(fs.readFileSync(f, 'utf8'));
const detectIndent = (text) => {
  for (const line of text.split('\n')) {
    const m = line.match(/^(\s+)\S/);
    if (m) return m[1];
  }
  return ' ';
};
const writeJsonAtomic = (file, obj) => {
  const indent = detectIndent(fs.readFileSync(file, 'utf8'));
  const body = JSON.stringify(obj, null, indent) + '\n';
  const tmp = `${file}.tmp-${process.pid}`;
  fs.writeFileSync(tmp, body);
  try {
    fs.renameSync(tmp, file);
  } catch (e) {
    if (e.code === 'EPERM' || e.code === 'EEXIST') {
      fs.writeFileSync(file, body);
      try { fs.unlinkSync(tmp); } catch { /* noop */ }
    } else throw e;
  }
};

const gates = [];
const gate = (id, name, ok, detail = '') => gates.push({ id, name, ok, detail });
const lines = [];
const log = (s) => { lines.push(s); console.log(s); };

// ─── 预检（dry-run 与 --apply 都跑）────────────────────────────────────────
const original = readJson(EVO);

gate('A1-count', '现状恰为 8 条事件', Array.isArray(original) && original.length === 8,
  `实际 ${Array.isArray(original) ? original.length : '非数组'}`);
const repoEvents = original.filter((e) => typeof e?.id === 'string' && e.id.startsWith('event:tree-refactor:'));
gate('A2-repo-ids', '6 条操作日志的 id 与声明逐一相符',
  repoEvents.length === 6
    && REMOVE_IDS.every((id) => repoEvents.some((e) => e.id === id))
    && repoEvents.every((e) => REMOVE_IDS.includes(e.id)),
  repoEvents.map((e) => e.id).join(' · '));
const keptEvents = original.filter((e) => KEEP_IDS.includes(e?.id));
gate('A3-keep-ids', '保留的 2 条知识事件恰为 Spring 4 / Spring 5', keptEvents.length === 2,
  keptEvents.map((e) => e.id).join(' · '));
gate('A4-keep-no-type', '保留事件当前均无 type 字段（补 type 才有意义）',
  keptEvents.every((e) => !('type' in e)));
gate('A5-keep-historical-time', '保留事件的 occurredAt 是真实历史时间（2013/2017），不是批次时刻',
  keptEvents.every((e) => typeof e.occurredAt === 'number' && e.occurredAt < 1600000000000),
  keptEvents.map((e) => new Date(e.occurredAt).toISOString().slice(0, 10)).join(' · '));
const fmtDay = (t) => (typeof t === 'number' && Number.isFinite(t)
  ? new Date(t).toISOString().slice(0, 10)
  : '(无 occurredAt)');
gate('A6-repo-time', '被删事件无真实历史时间（缺失或 2026 批次时刻 → 操作日志自证）',
  repoEvents.every((e) => typeof e.occurredAt !== 'number' || e.occurredAt > 1789000000000),
  repoEvents.map((e) => fmtDay(e.occurredAt)).join(' · '));

// ─── 变换 ─────────────────────────────────────────────────────────────────
const next = original
  .filter((e) => KEEP_IDS.includes(e?.id))
  .map(({ id, ...rest }) => ({ id, type: KEEP_TYPE, ...rest }));

log('');
log(`计划：8 → ${next.length} 条（删 ${REMOVE_IDS.length} 条操作日志；补 type:"${KEEP_TYPE}" × ${KEEP_IDS.length}）`);
log(`保留 id：${next.map((e) => e.id).join(' · ')}`);
const preOk = gates.every((g) => g.ok);

// ─── 落盘 ─────────────────────────────────────────────────────────────────
let wrote = false;
if (APPLY && preOk) {
  writeJsonAtomic(EVO, next);
  wrote = true;
  log('已写入（原子写 + EPERM 退化）：' + path.relative(ROOT, EVO));
}

// ─── 落盘后断言 ───────────────────────────────────────────────────────────
if (wrote) {
  const after = readJson(EVO);
  gate('P1-count', '落盘后恰为 2 条', after.length === 2, `实际 ${after.length}`);
  gate('P2-ids', '落盘后 id 集合恰为 Spring 4/5',
    after.length === 2 && after.every((e) => KEEP_IDS.includes(e.id)));
  gate('P3-type', '两条事件均带 type:"release"',
    after.every((e) => e.type === 'release'));
  gate('P4-untouched', '除新增 type 外逐字段与原文一致（deep-equal minus type）',
    after.every((e) => {
      const src = original.find((o) => o.id === e.id);
      const { type: _t, ...rest } = e;
      return JSON.stringify(rest) === JSON.stringify(src);
    }));
  gate('P5-residue', 'tree-refactor 残留为 0',
    after.filter((e) => String(e.id).startsWith('event:tree-refactor:')).length === 0);
}

// ─── 报告 ─────────────────────────────────────────────────────────────────
const verdict = gates.every((g) => g.ok)
  ? (wrote ? 'APPLY_OK' : (APPLY ? 'PRECHECK_FAILED' : 'DRY_RUN_OK'))
  : (APPLY ? (wrote ? 'APPLY_POSTCHECK_FAILED' : 'PRECHECK_FAILED') : 'DRY_RUN_BLOCKED');
log('');
for (const g of gates) log(`${g.ok ? 'PASS' : 'FAIL'}  ${g.id.padEnd(22)} ${g.name}${g.detail ? `  [${g.detail}]` : ''}`);
log(`\n裁决：${verdict}`);

const report = [
  '# EVOLUTION-V2 · apply 报告',
  '',
  `- 时间：${new Date().toISOString()}`,
  `- 模式：${APPLY ? (wrote ? '--apply（已写盘）' : '--apply（预检未过，未写）') : 'dry-run（未写盘）'}`,
  `- 数据目录：${path.relative(ROOT, DATA_DIR)}`,
  '',
  '## 事件清退',
  '',
  `- 删除 ${REMOVE_IDS.length} 条操作日志（Repository History，改由 git + batch-manifests 承载）：`,
  ...REMOVE_IDS.map((id) => `  - ${id}`),
  `- 保留 ${KEEP_IDS.length} 条知识事件并补 \`type:"release"\`：${KEEP_IDS.join(' · ')}`,
  '- 本批不向 evolution-events.json 追加任何事件（被清退行为的反面）。',
  '',
  '## 闸门',
  '',
  ...gates.map((g) => `- ${g.ok ? 'PASS' : 'FAIL'} · ${g.id} · ${g.name}${g.detail ? `（${g.detail}）` : ''}`),
  '',
  `裁决：**${verdict}**`,
  '',
].join('\n');
fs.mkdirSync(OUT_DIR, { recursive: true });
fs.writeFileSync(path.join(OUT_DIR, 'evolution-v2-apply-report.md'), report);

process.exit(gates.every((g) => g.ok) && !(APPLY && !wrote) ? 0 : 1);
