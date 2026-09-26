#!/usr/bin/env node
/**
 * README 结构与引用审计（常设脚本）
 *
 *   node scripts/readme-audit.mjs                  # 审计 README.md（对账基线默认取 git HEAD:README.md）
 *   node scripts/readme-audit.mjs --base <git-rev> # 指定对账基线（如 --base 1fac77e，用于核对一次重构前后的内容无损）
 *   node scripts/readme-audit.mjs --self-test      # 负对照自检：注入已知缺陷，验证判据未修哑
 *
 * 判据分级：P0 = 必须修（结构破坏 / 内容丢失 / 已删文件名）；P1 = 应修；P2 = 提示。
 * 退出码：有 P0 → 1。
 *
 * ⚠️ 设计要点（踩过的坑，勿"优化"掉）：
 *   1) 「已删文件名」检查**全篇任意位置生效**，不按区域豁免 —— 曾按「台账区豁免」实现，
 *      被尾部追加的注入行绕过（负对照 M1 抓到）。
 *   2) 对账判据必须覆盖 **+1 与 +2 两档降级**（单一文档重建时 ADR 子节降了两级），否则误报丢失。
 *   3) 门面节的 `## X` 会在重建中被重编号为 `## N. X`，须豁免，否则全部误报。
 *   4) 层级判据用 `^#{1,6} `（不是 `^#{1,2} `）—— H3+ 会掉进普通分支造成假丢失。
 */
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import path from 'node:path';

const ROOT = process.cwd();
const rd = (p) => readFileSync(p, 'utf8').replace(/\r\n/g, '\n');

// 已收编/删除的手册层文件名 —— 正文中不得再出现
const DELETED = ['CONSTITUTION.md', 'ARCHITECTURE.md', 'KNOWLEDGE_RULES.md', 'BATCH_MANIFEST.md',
  'DOCUMENT_IMPORT_STANDARD.md', 'KNOWLEDGE_DECOMPOSITION.md', 'PROJECT_INTRODUCTION.md',
  '0001-semantic-import-is-graph-first.md', '0002-identity-and-observation-discipline.md',
  'CONTEXT.md', 'CONTRIBUTING.md', 'STATE.md', '概念字典.md'];
const LEDGER_RE = /^## 18\. 治理状态剖面/;                       // 沉积台账起点（术语豁免区）
const REWRITTEN = /第[一二三四五六七八九十]+篇|本篇|合订本|各篇|全篇|篇头|篇目导航|口径说明|CONSTITUTION|门面|手册层已收编|手册层已并入/;
const HISTORICAL = /曾存在|整链移除|原固定写|已随 data 提交移除|历史：|已不存在|已重构为|全清|待跑|收编为|清理/;

let INDEX = null;
function fileIndex() {
  if (INDEX) return INDEX;
  const m = new Map();
  (function walk(d, dep) {
    if (dep > 6) return;
    for (const e of readdirSync(d, { withFileTypes: true })) {
      if (/^(node_modules|\.git|dist|\.venv-mineru)$/.test(e.name) || /^\.tmp-/.test(e.name)) continue;
      const p = path.join(d, e.name);
      if (e.isDirectory()) walk(p, dep + 1);
      else m.set(e.name, (m.get(e.name) || []).concat(p.replace(/\\/g, '/')));
    }
  })(ROOT, 0);
  INDEX = m;
  return m;
}

export function audit(cur, base) {
  const L = cur.split('\n');
  const F = [];
  const add = (sev, dim, msg) => F.push({ sev, dim, msg });

  // ── 结构 ────────────────────────────────────────────────────────────
  const heads = L.map((l, i) => ({ i: i + 1, level: (l.match(/^(#{1,6}) /) || [])[1]?.length || 0, text: l.replace(/^#{1,6} /, '') })).filter((h) => h.level);
  const h1 = heads.filter((h) => h.level === 1);
  if (h1.length !== 1) add('P0', '结构', 'H1 数量 = ' + h1.length + '（应 1）');
  let fences = 0, open = false;
  L.forEach((l) => { if (/^\s*```/.test(l)) { fences++; open = !open; } });
  if (open) add('P0', '结构', '代码围栏未闭合（' + fences + ' 个，奇数）');
  let prev = 0;
  for (const h of heads) { if (prev && h.level > prev + 1) add('P1', '结构', 'L' + h.i + ' 跳级 H' + prev + '→H' + h.level + '：' + h.text.slice(0, 40)); prev = h.level; }
  for (let i = 0; i < L.length; i++) {                      // 空节 = 后面既无正文也无更深子标题
    if (!/^(#{1,6}) /.test(L[i])) continue;
    const lv = L[i].match(/^(#{1,6}) /)[1].length;
    const rest = L.slice(i + 1);
    const k = rest.findIndex((x) => x.trim() !== '');
    if (k === -1) { add('P1', '结构', 'L' + (i + 1) + ' 空节（文件尾）: ' + L[i].slice(0, 40)); continue; }
    const nl = (rest[k].match(/^(#{1,6}) /) || [])[1]?.length || 0;
    if (nl && nl <= lv) add('P1', '结构', 'L' + (i + 1) + ' 空节: ' + L[i].slice(0, 40));
  }
  const nums = [...cur.matchAll(/^## (\d+)\. /gm)].map((m) => Number(m[1]));
  if (nums.join(',') !== nums.map((_, i) => i + 1).join(',')) add('P0', '结构', '节号不连续: ' + nums.join(','));

  // ── 目录锚点 ────────────────────────────────────────────────────────
  const slug = (t) => t.toLowerCase().replace(/[^\w\u4e00-\u9fa5 -]/g, '').replace(/\s+/g, '-');
  const toc = [...cur.matchAll(/^- \[([^\]]+)\]\(#([^)]+)\)/gm)].map((m) => ({ text: m[1], anchor: m[2] }));
  const anchors = new Set(heads.map((h) => slug(h.text)));
  for (const t of toc) if (!anchors.has(t.anchor)) add('P1', '锚点', '目录链接目标不存在: [' + t.text + '](#' + t.anchor + ')');
  const tocTexts = new Set(toc.map((t) => t.text));
  for (const t of [...cur.matchAll(/^## (\d+\. .+)$/gm)].map((m) => m[1])) if (!tocTexts.has(t)) add('P2', '锚点', 'H2 未进目录: ' + t);

  // ── 引用 ────────────────────────────────────────────────────────────
  const ledger = L.findIndex((l) => LEDGER_RE.test(l));
  L.forEach((l, i) => {
    if (DELETED.some((t) => l.includes(t))) add('P0', '引用', 'L' + (i + 1) + ' 已删文件名: ' + l.trim().slice(0, 90));
    if (i < ledger && /第[一二三四五六七八九十]+篇|合订本|篇目导航/.test(l)) add('P1', '术语', 'L' + (i + 1) + ' 旧形态词: ' + l.trim().slice(0, 90));
  });
  const idx = fileIndex();
  const reTok = /`([^`\n]+)`|\[[^\]\n]*\]\(([^)\n]+)\)/g;
  L.forEach((line, li) => {
    if (li >= ledger) return;                               // 台账内允许历史文件名（HISTORICAL 兜底）
    let m;
    while ((m = reTok.exec(line))) {
      const t = (m[1] || m[2] || '').trim();
      if (!t || /^(https?:|#|mailto:)/.test(t) || /[<>*?]|\s/.test(t) || /^[.\-]/.test(t)) continue;
      if (!/\.(md|json|mjs|js|ts|tsx|txt|css|html|png|jpg|yml|yaml)$/.test(t)) continue;
      if (HISTORICAL.test(line)) continue;
      const b = t.split('/').pop();
      if (!existsSync(t) && !(idx.get(b) || []).some((p) => p.endsWith(t))) add('P1', '引用', 'L' + (li + 1) + ' 不存在: ' + t);
    }
  });
  const norm = (x) => x.replace(/（[^）]*）/g, '').replace(/\s/g, '');
  const secNames = [...cur.matchAll(/^## \d+\. (.+)$/gm)].map((m) => m[1]);
  for (const m of cur.matchAll(/〈([^〉]+)〉/g)) {
    if (!secNames.some((s) => norm(s) === norm(m[1]) || norm(s).startsWith(norm(m[1])) || norm(s).includes(norm(m[1]))))
      add('P2', '引用', '〈' + m[1] + '〉 无对应节');
  }

  // ── 对账（与基线逐行比，标题允许 +1/+2 级降级）─────────────────────
  let lost = 0, skipped = 0;
  if (base) {
    const has = new Set(L);
    for (const l of base.split('\n')) {
      if (!l.trim() || l.trim() === '---') continue;
      if (has.has(l)) continue;
      if (/^#{1,6} /.test(l)) {
        if (/^# 第[一二三四五六七八九十]+篇/.test(l)) continue;              // 篇题：已废弃
        if (/^## \S/.test(l) && !/^## \d+\. /.test(l)) continue;            // 门面节：已重编号
        if (has.has('#' + l) || has.has('##' + l)) continue;                // +1 / +2 级
        if (REWRITTEN.test(l)) { skipped++; continue; }
        lost++; add('P0', '对账', '标题丢失: ' + l.slice(0, 70)); continue;
      }
      if (REWRITTEN.test(l)) { skipped++; continue; }
      lost++; add('P0', '对账', '正文行丢失: ' + l.slice(0, 100));
    }
  }
  return { findings: F, heads, toc, nums, lost, skipped, lines: L.length };
}

// ── 负对照自检：每个变体必须被抓到 ────────────────────────────────────
function selfTest() {
  const cur = rd('README.md');
  const mutants = [
    ['M1 注入已删文件名', (s) => s + '\n详见 docs/CONSTITUTION.md。\n', /P0 \[引用\].*已删文件名/],
    ['M2 节号改坏', (s) => s.replace('## 9. 知识库宪法', '## 90. 知识库宪法'), /P0 \[结构\].*节号不连续/],
    ['M3 目录锚点改坏', (s) => s.replace('#8-架构说明', '#8-架构总览'), /P1 \[锚点\].*目标不存在/],
    ['M4 删掉正文行', (s) => s.replace(/^- 目录树与知识节点分离：目录只保存引用，正文由节点池唯一持有。\n/m, ''), /P0 \[对账\].*正文行丢失/],
    ['M5 多出 H1', (s) => '# 另一个标题\n\n' + s, /P0 \[结构\].*H1 数量/],
    ['M6 旧形态词复活', (s) => s.replace('见〈文档导入标准〉。', '见第五篇。'), /P1 \[术语\].*旧形态词/],
    ['M7 制造空节', (s) => s.replace('## 1. 当前能力', '## 99. 空节测试\n\n## 1. 当前能力'), /P1 \[结构\].*空节/],
  ];
  console.log('=== 负对照自检 ===');
  let bad = 0;
  for (const [name, mut, expect] of mutants) {
    const r = audit(mut(cur), cur);
    const hit = r.findings.some((f) => expect.test(f.sev + ' [' + f.dim + '] ' + f.msg));
    console.log((hit ? '✓ ' : '❌ ') + name);
    if (!hit) bad++;
  }
  console.log(bad ? '❌ ' + bad + ' 个变体漏检（判据可能已修哑）' : '✓ 判据未修哑');
  return bad ? 1 : 0;
}

// ── CLI ───────────────────────────────────────────────────────────────
const argv = process.argv.slice(2);
if (argv.includes('--self-test')) process.exit(selfTest());

let baseRev = 'HEAD';
const bi = argv.indexOf('--base');
if (bi >= 0 && argv[bi + 1]) baseRev = argv[bi + 1];
const base = execFileSync('git', ['show', baseRev + ':README.md'], { encoding: 'utf8', maxBuffer: 8 * 1024 * 1024 }).replace(/\r\n/g, '\n');
const r = audit(rd('README.md'), base);
const by = {};
for (const f of r.findings) by[f.sev] = (by[f.sev] || 0) + 1;
console.log('=== README 审计（基线 ' + baseRev + '）===');
console.log('对账：有意改写 ' + r.skipped + ' · 丢失 ' + r.lost);
console.log('结构：H1=' + r.heads.filter((h) => h.level === 1).length + ' H2=' + r.heads.filter((h) => h.level === 2).length +
  ' H3=' + r.heads.filter((h) => h.level === 3).length + ' 标题共 ' + r.heads.length + ' · 行 ' + r.lines + ' · 目录 ' + r.toc.length + ' 项');
console.log('节号：' + r.nums.join(','));
console.log('P0 ' + (by.P0 || 0) + ' · P1 ' + (by.P1 || 0) + ' · P2 ' + (by.P2 || 0));
for (const s of ['P0', 'P1', 'P2']) for (const f of r.findings.filter((x) => x.sev === s)) console.log(s + ' [' + f.dim + '] ' + f.msg);
process.exit((by.P0 || 0) ? 1 : 0);
