#!/usr/bin/env node
/**
 * EVOLUTION-V2 · 独立验证（不 import apply 脚本，由批前快照 ↔ 工作树逐结构比对反推）
 *
 * 用法：node --experimental-transform-types scripts/verify-evolution-v2.mjs [snapshotDir]
 * 退出码 0 = 全过；1 = 存在 FAIL。
 */
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { execFileSync } from 'node:child_process';
import { normalizeEvolutionEvents } from '../src/knowledge/timelineEvolution.ts';
import { eventsForIndexScope } from '../src/knowledge/indexEvolution.ts';

const ROOT = process.cwd();
const DATA_DIR = process.env.KNOWLEDGE_OS_DATA_DIR
  ? path.resolve(process.env.KNOWLEDGE_OS_DATA_DIR)
  : path.join(ROOT, 'data');
const SNAP = process.argv[2]
  ?? fs.readdirSync(path.join(ROOT, 'data', 'backups'))
    .filter((d) => d.startsWith('evolution-v2-'))
    .sort()
    .at(-1);
const SNAP_DIR = path.join(ROOT, 'data', 'backups', SNAP);

const FILES = ['tree-data.json', 'node-pool.json', 'knowledge-edges.json', 'questions.json'];
const REMOVE_IDS = [
  'event:tree-refactor:phase1:1789371446647',
  'event:tree-refactor:t3-p0:1789391683976',
  'event:tree-refactor:t3-p0.1:1789393855508',
  'event:tree-refactor:t3-p1:1789396485052',
  'event:tree-refactor:t3-p2:1789399635504',
  'event:tree-refactor:p-web-http-scope:1789403714212',
];

const gates = [];
const gate = (id, name, ok, detail = '') => gates.push({ id, name, ok, detail });

const snapEvoRaw = fs.readFileSync(path.join(SNAP_DIR, 'evolution-events.json'));
const workEvoRaw = fs.readFileSync(path.join(DATA_DIR, 'evolution-events.json'));
const snapEvo = JSON.parse(snapEvoRaw);
const workEvo = JSON.parse(workEvoRaw);

// V1 快照真实性：快照 ↔ git HEAD 逐字节（单进程 execFileSync，无管道解析）
const headEvo = execFileSync('git', ['show', 'HEAD:data/evolution-events.json'], { cwd: ROOT, maxBuffer: 64 * 1024 * 1024 });
gate('V1-snapshot-is-head', '快照 evolution-events.json 与 HEAD 逐字节一致（祖先证据成立）',
  Buffer.compare(snapEvoRaw, headEvo) === 0, `快照 ${snapEvoRaw.length}B · HEAD ${headEvo.length}B`);

// V2 计数反推
gate('V2-counts', '事件数 8 → 2', snapEvo.length === 8 && workEvo.length === 2,
  `${snapEvo.length} → ${workEvo.length}`);

// V3 删除集合恰为声明的 6 条
const snapIds = snapEvo.map((e) => e.id);
const workIds = workEvo.map((e) => e.id);
const removed = snapIds.filter((id) => !workIds.includes(id));
gate('V3-removed-exact', '被删 id 集合恰为本批声明的 6 条，无夹带',
  removed.length === 6 && REMOVE_IDS.every((id) => removed.includes(id)) && removed.every((id) => REMOVE_IDS.includes(id)),
  removed.join(' · '));

// V4 保留事件除新增 type 外逐字段一致（deep-equal minus type）
const untouched = workEvo.every((e) => {
  const src = snapEvo.find((o) => o.id === e.id);
  const { type: _t, ...rest } = e;
  return src && JSON.stringify(rest) === JSON.stringify(src);
});
gate('V4-kept-untouched', '保留事件除新增 type:"release" 外逐字段与快照一致',
  untouched);

// V5 tree-refactor 残留为 0
gate('V5-residue', '工作树 tree-refactor 残留为 0',
  workIds.filter((id) => String(id).startsWith('event:tree-refactor:')).length === 0);

// V6 操作日志判别器：现存事件都带真实历史时间（防批次时刻混入）
gate('V6-historical-time', '现存事件 occurredAt 均为真实历史时间（非 2026 批次时刻）',
  workEvo.every((e) => typeof e.occurredAt === 'number' && e.occurredAt < 1600000000000),
  workEvo.map((e) => new Date(e.occurredAt).toISOString().slice(0, 10)).join(' · '));

// V7 与批无关的 data 文件零改动（快照 ↔ 工作树逐字节）
const untouchedFiles = FILES.filter((f) => Buffer.compare(
  fs.readFileSync(path.join(SNAP_DIR, f)),
  fs.readFileSync(path.join(DATA_DIR, f)),
) === 0);
gate('V7-other-data-untouched', `tree/pool/edges/questions 逐字节零改动（${untouchedFiles.length}/4）`,
  untouchedFiles.length === 4);

// V8 负对照：旧数据（快照）在新 normalize 下产出 0 条 —— 无 type 条目全部被拒，
// 操作日志不可能以「无类型」形态复活进演化图。
gate('V8-negative-old-dropped', '负对照：旧快照数据经新 normalize 产出 0 条',
  normalizeEvolutionEvents(snapEvo).length === 0,
  `snapEvo.length=${snapEvo.length}`);

// V9 正向：新数据经 normalize 产出恰 2 条，且均 type=release、可按 Spring 作用域取到
const normalized = normalizeEvolutionEvents(workEvo);
const scoped = eventsForIndexScope(new Set(['k_java_fw_spring']), normalized);
gate('V9-normalize-projection', '新数据 normalize → 2 条 · type=release · Spring 作用域可取 2 条',
  normalized.length === 2
    && normalized.every((e) => e.type === 'release')
    && scoped.length === 2);

// V10 事件文件末尾换行与缩进口径未漂移（与既有 writeJsonAtomic 约定一致；顶层行是 `  {`，不能断言 `  "`）
gate('V10-format', '落盘文件以换行结尾、2 空格缩进',
  workEvoRaw.toString().endsWith('\n') && /^ {2}\{/m.test(workEvoRaw.toString()));

for (const g of gates) console.log(`${g.ok ? 'PASS' : 'FAIL'}  ${g.id.padEnd(26)} ${g.name}${g.detail ? `  [${g.detail}]` : ''}`);
const verdict = gates.every((g) => g.ok) ? 'INDEPENDENT_VERIFY_PASS' : 'INDEPENDENT_VERIFY_FAIL';
console.log(`\n裁决：${verdict}  ${gates.filter((g) => g.ok).length}/${gates.length}`);
process.exit(gates.every((g) => g.ok) ? 0 : 1);
