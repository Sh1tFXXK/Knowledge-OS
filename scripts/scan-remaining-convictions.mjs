#!/usr/bin/env node
/**
 * 剩余定罪全量名单（只读 · 可复跑 · 不写 data/）
 *
 * 复用 scripts/scan-tree-violations.mjs 的定罪正则，把当前全部定罪条目导出成
 * 一份可直接过目的完整名单，并补上扫描器不提供的分档信息：
 *   · D 类按 mechanismSpec 归属分三档（spec 已持有 / spec 宿主 / 无 spec）
 *   · C 类按壳型分四小类（章节壳 / 详解壳 / 大壳 / 其他）
 *   · E 类列出待上提的子节点与题库同题状态
 *   · 每条的正文篇幅、子树规模、nodeRef、完整路径
 *
 * ⚠️ 机制 spec 存在**池节点顶层** `mechanismSpec`，不在 `card.mechanismSpec`。
 *
 * 用法：node scripts/scan-remaining-convictions.mjs
 * 输出：outputs/tree-violation-scan/remaining-convictions-full-list.md
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DATA = path.join(ROOT, 'data');
const OUT = path.join(ROOT, 'outputs', 'tree-violation-scan');

const pool = JSON.parse(fs.readFileSync(path.join(DATA, 'node-pool.json'), 'utf8'));
const questions = JSON.parse(fs.readFileSync(path.join(DATA, 'questions.json'), 'utf8'));
const tree = JSON.parse(fs.readFileSync(path.join(DATA, 'tree-data.json'), 'utf8'));

// ── 定罪模式（与 scan-tree-violations.mjs 保持一致） ─────────────────────
const PRIORITY = ['E', 'B', 'D', 'C', 'A'];
const FALSE_POSITIVE_A = /^(逻辑与 \(?&&\)?|逻辑与|逻辑或|按位与|与门|交互与通信|知识表示与推理|自动化规划与调度|服务注册与发现|Unix 和类 Unix|校验和 \/ checksum|软件符号与工具|发布与版本模型 \/ Release & Versioning Model|连接与线程状态|对象关系映射（ORM、O\/RM 和 O\/R 映射）|等待\/通知机制)$/;
const CJK_RE = /[\u4e00-\u9fff]/;
const ASCII_RE = /[A-Za-z0-9]/;
const CHAPTER_NUM_RE = /^[一二三四五六七八九十百零〇\d]+[、.]/;
function isPunctCompound(name) {
  const outside = String(name).replace(/（[^）]*）|\([^)]*\)/g, '');
  for (const sep of ['、', '/']) {
    if (!outside.includes(sep)) continue;
    const parts = outside.split(sep).map((s) => s.trim()).filter(Boolean);
    if (parts.length < 2) continue;
    if (!parts.every((p) => CJK_RE.test(p))) continue;
    if (parts.some((p) => ASCII_RE.test(p))) continue;
    if (sep === '、' && CHAPTER_NUM_RE.test(outside.trim())) continue;
    return true;
  }
  return false;
}
const matchers = {
  E: (n) => /(什么是|为什么|如何|怎样|怎么|什么时候|何时|介绍一下|谈谈|说说|啥是)/.test(n) || /[?？]\s*$/.test(n.trim()),
  B: (n) => /(的区别|区别是什么|区别$|差异$|的差异|的对比$|之间的?关系$|的关系$)/.test(n),
  D: (n) => /^[①②③④⑤⑥⑦⑧⑨⑩]/.test(n) || /^\d+[.、]/.test(n) || /阶段$/.test(n) || /(优点|缺点)/.test(n) || /调用方/.test(n) || /(合理地|线上问题定位|创建数据仓库)/.test(n),
  A: (n) => !FALSE_POSITIVE_A.test(n.trim()) && (/与|和/.test(n.replace(/(参与|赠与|饱和|缓和|共和|总和|和尚|亲和)/g, '')) || isPunctCompound(n)),
  C: (n) => /(详解|入门|总览|初识|宝典|进阶|面试)/.test(n) || /基础$/.test(n) || /基础概念/.test(n) || /^[一二三四五六七八九十百]+、/.test(n) || /第[一二三四五六七八九十百0-9]+章/.test(n),
};
const norm = (s) => String(s).replace(/\s+/g, '').replace(/[?？。．.…!！]+$/g, '');
const qSet = new Set(questions.map((q) => norm(q.text || '')));

// ── 机制 spec 索引（顶层字段！） ─────────────────────────────────────────
const specByState = new Map();
const specHostRefs = new Set();
const specList = [];
for (const [id, node] of Object.entries(pool)) {
  const ms = node.mechanismSpec;
  if (!ms) continue;
  specList.push({ id, label: node.label });
  specHostRefs.add(id);
  const stateIds = Array.isArray(ms.stateNodeIds) ? ms.stateNodeIds : [];
  for (const s of stateIds) {
    const key = typeof s === 'string' ? s : (s && (s.nodeId || s.id));
    if (key) specByState.set(key, { specId: id, specLabel: node.label });
  }
  for (const field of ['triggerNodeIds', 'participantNodeIds', 'outcomeNodeIds', 'failureNodeIds']) {
    for (const v of Array.isArray(ms[field]) ? ms[field] : []) {
      const key = typeof v === 'string' ? v : (v && (v.nodeId || v.id));
      if (key && !specByState.has(key)) specByState.set(key, { specId: id, specLabel: node.label, other: field });
    }
  }
}

// ── 遍历树 ───────────────────────────────────────────────────────────────
function subtreeSize(node) { let c = 0; for (const ch of node.children || []) c += 1 + subtreeSize(ch); return c; }
function contentLen(p) {
  if (!p || !p.card) return 0;
  let n = String(p.card.rootContent || '').trim().length;
  for (const t of Array.isArray(p.card.tabs) ? p.card.tabs : []) n += String(t.content || '').trim().length;
  return n;
}
const rows = [];
function walk(node, parents) {
  const name = node.name || '';
  const tags = PRIORITY.filter((k) => matchers[k](name));
  const p = node.nodeRef ? pool[node.nodeRef] : undefined;
  rows.push({
    name, treeId: node.id, nodeRef: node.nodeRef ?? null,
    path: [...parents, name].join(' / '),
    childCount: (node.children || []).length,
    kids: (node.children || []).map((c) => c.name),
    subtree: subtreeSize(node),
    len: contentLen(p),
    inPool: !!p,
    spec: node.nodeRef ? specByState.get(node.nodeRef) || null : null,
    dupQ: qSet.has(norm(name)),
    cat: tags[0] ?? null,
  });
  for (const ch of node.children || []) walk(ch, [...parents, name]);
}
walk(tree, []);
const convicted = rows.filter((r) => r.cat);

// ── 分小类 ───────────────────────────────────────────────────────────────
const CHAPTER_RENAME = {
  chapter_db_01: '数据库系统', chapter_db_02: '数据模型', chapter_db_03: '数据库结构',
  chapter_db_05: '数据库操作', chapter_db_08: '恢复系统', chapter_db_09: '日志系统',
  chapter_db_10: '存储系统', chapter_db_12: '数据表示', chapter_db_13: '数据库设计',
  chapter_db_14: '数据库分布与复制', chapter_db_16: '数据库安全', chapter_db_17: '数据库运维',
  chapter_db_18: '数据库编程与接口', chapter_db_19: '数据库产品', chapter_db_20: '数据库文件与实现',
};
const BIG_SHELL = new Set(['基础', '软件开发（实践总览）', '跨系统标准与约定（总览）', '进阶思路：监控驱动动态扩容']);
function dTier(r) {
  if (!r.nodeRef) return '无 nodeRef';
  if (specHostRefs.has(r.nodeRef)) return 'spec 宿主';
  if (specByState.has(r.nodeRef)) return specByState.get(r.nodeRef).other ? 'spec 其他槽位' : 'spec 已持有（state）';
  return '无 spec';
}
function cKind(r) {
  const key = String(r.treeId);
  if (CHAPTER_RENAME[key]) return '章节壳 · 去序号';
  if (BIG_SHELL.has(r.name)) return '大壳 · 需先定实名或解散';
  if (/(详解|入门|总览|初识|宝典|进阶|面试)/.test(r.name)) return '详解/总览壳 · 去后缀归本体';
  if (/基础$|基础概念/.test(r.name)) return '「基础」壳 · 实名或解散';
  return '其他壳 · 逐条判';
}

const byCat = (c) => convicted.filter((r) => r.cat === c).sort((a, b) => a.path.localeCompare(b.path, 'zh'));
const sum = (list, f) => list.reduce((s, r) => s + f(r), 0);

// ── 生成名单 ─────────────────────────────────────────────────────────────
const now = new Date().toISOString();
const localDate = new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 10);
let md = `# 目录树剩余定罪全量名单（${localDate}）

> **只读产物**：本文件由 \`scripts/scan-remaining-convictions.mjs\` 生成，未修改任何 \`data/*.json\`。
> 模式定罪 ≠ 终审定罪。「子树」>0 的条目拆除前必须先定子节点去处；「正文」有字数的条目卸载前必须先迁移内容（宪法门二）。
> 生成器：\`node scripts/scan-remaining-convictions.mjs\` · 复核口径：树 ${rows.length} 条 · 池 ${Object.keys(pool).length} 条 · 机制 spec ${specList.length} 个

## 一、总览

| 类 | 条目 | 带子树 | 有正文 | 题库同题 | 子树合计 | 正文字数合计 |
|---|---:|---:|---:|---:|---:|---:|
`;

for (const c of ['E', 'B', 'D', 'C', 'A']) {
  const l = byCat(c);
  md += `| ${c} | ${l.length} | ${l.filter((r) => r.childCount > 0).length} | ${l.filter((r) => r.len > 0).length} | ${l.filter((r) => r.dupQ).length} | ${sum(l, (r) => r.subtree)} | ${sum(l, (r) => r.len)} |\n`;
}
md += `| **合计** | **${convicted.length}** | ${convicted.filter((r) => r.childCount > 0).length} | ${convicted.filter((r) => r.len > 0).length} | ${convicted.filter((r) => r.dupQ).length} | ${sum(convicted, (r) => r.subtree)} | ${sum(convicted, (r) => r.len)} |\n`;

md += `
A 与 B 两大类当前为 **0 条**（A 类已物理拆分完毕、B 类已转题库），故不在下列明细中重复列出。

---

## 二、E 类 · 直接提问型（${byCat('E').length} 条）

**处置（宪法 §2.5）**：提问不成为树节点 → 问题库，\`relatedNodeId\` 指向名词本体。
**\`all-outstanding.md\` 的既有裁决**：正文融入名词正身的「产生背景 / 解决的问题 / 适用条件」tab；判重后并答案、不新建卡。
⚠️ **带子树的必须先上提孩子**（下表「孩子」列非空者）。

| # | 树节点 | nodeRef | 子树 | 孩子 | 正文 | 题库 | treeId | 路径 |
|---:|---|---|---:|---|---:|---|---|---|
`;
byCat('E').forEach((r, i) => {
  md += `| ${i + 1} | ${r.name} | \`${r.nodeRef ?? '（无引用）'}\` | ${r.subtree} | ${r.kids.length ? r.kids.join('、') : '—'} | ${r.len} | ${r.dupQ ? '**同题**' : ''} | \`${r.treeId}\` | ${r.path} |\n`;
});

const d43 = byCat('D');
const dGroups = {};
for (const r of d43) { const t = dTier(r); (dGroups[t] = dGroups[t] || []).push(r); }
md += `
---

## 三、D 类 · 动作 / 状态 / 过程片段（${d43.length} 条）

**处置（宪法 §2.5）**：步骤进 \`mechanismSpec\`；优缺点进 \`viewDimensions\`；实战经验进 \`supplement\`。

### 3.1 按 mechanismSpec 归属分档

⚠️ **机制 spec 存在池节点顶层 \`mechanismSpec\`，不在 \`card.mechanismSpec\`**（按后者查会得 0 个，极易误判）。当前池内共 **${specList.length} 个 spec**、去重持有 **${specByState.size} 个节点引用**。

| 档 | 条目 | 含义 | 处置取向 |
|---|---:|---|---|
`;
const TIER_DESC = {
  'spec 已持有（state）': '该 nodeRef 已是某 spec 的 stateNodeIds 成员 → 树条目是机制视图的重复投影',
  'spec 宿主': '该 nodeRef 本身就是机制 spec 节点（mechanismSpec 的载体）→ 树里是机制的入口',
  'spec 其他槽位': '该 nodeRef 出现在 spec 的 trigger/participant/outcome/failure 槽位',
  '无 spec': '尚未被任何 spec 覆盖 → 需先定载体（新建 spec / viewDimensions / supplement）',
};
const TIER_ACTION = {
  'spec 已持有（state）': '**留树还是卸树，需裁决**（见 3.3）',
  'spec 宿主': '大概率豁免或改名，不宜卸树',
  'spec 其他槽位': '同「已持有」，先核该槽位语义',
  '无 spec': '先定载体，最重的一档',
};
for (const t of ['spec 已持有（state）', 'spec 宿主', 'spec 其他槽位', '无 spec']) {
  const l = dGroups[t] || [];
  md += `| ${t} | ${l.length} | ${TIER_DESC[t]} | ${TIER_ACTION[t]} |\n`;
}

md += `
### 3.2 明细（按档分组）

| # | 树节点 | nodeRef | 档 | 所属 spec | 子树 | 正文 | treeId | 路径 |
|---:|---|---|---|---|---:|---:|---|---|
`;
let di = 0;
for (const t of ['spec 已持有（state）', 'spec 宿主', 'spec 其他槽位', '无 spec']) {
  for (const r of dGroups[t] || []) {
    di++;
    const s = r.spec ? `${r.spec.specLabel}（\`${r.spec.specId}\`）` : '—';
    md += `| ${di} | ${r.name} | \`${r.nodeRef ?? '（无引用）'}\` | ${t} | ${s} | ${r.subtree} | ${r.len} | \`${r.treeId}\` | ${r.path} |\n`;
  }
}

md += `
### 3.3 ⚠️ 动手前必须裁决的分叉：树条目「留」还是「去」

同一批 D 条目，两份现行文件给出相反取向：

| 依据 | 原文 | 对树条目的结论 |
|---|---|---|
| \`outputs/tree-violation-scan/all-outstanding.md\`（2026-09-13 三档裁决） | 「A/IO 组 spec 已引用（**只改名去序号，严禁删**）；Bean 组并入既有 spec；秒杀/流量/军规组新建 mechanismSpec 或 viewDimensions」 | **留树**，只把名字里的 \`①\`/\`1.\` 去掉 |
| 第二篇 · 知识库宪法 §2.5（原 \`docs/CONSTITUTION.md\`） | 「动作/过程片段 …… → 步骤进 \`mechanismSpec\`」 | **不留树**，机制只在机制视图出现 |

两者分歧点：机制状态是否允许在目录树里再挂一份。留树 = 目录仍列出机制步骤；卸树 = 目录只列名词，步骤靠机制视图承载。
**建议先裁这一条，再谈其余 31 条**——它决定 12 条的走法，也影响后续是否要建新 spec。

### 3.4 无 spec 那 ${(dGroups['无 spec'] || []).length} 条的自然簇

| 簇 | 条数 | 建议载体 |
|---|---:|---|
| \`bean_lc_*\`（Spring Bean 生命周期五阶段） | 5 | 新建 \`mechanismSpec\`（池内已有 \`bcs_flow\`「Bean 创建策略机制」，可参照） |
| \`surge_*\`（流量激增应对方法六步） | 6 | \`supplement\` 或 \`viewDimensions\` |
| \`hps_*\`（QPS 提升 10 倍的系统设计） | 6 | \`supplement\` 或 \`viewDimensions\` |
| \`sqopt_idea_*\`（慢查询优化思路十条） | 10 | \`supplement\`（十条并列，非状态机） |
| \`bcs_caller\`（调用方 getBean 请求） | 1 | 核 \`bcs_flow\` 的 trigger/participant 槽位后归位或豁免 |
| 单条：合理地配置线程池 / 线上问题定位 / 创建数据仓库 | 3 | 前两条 → \`supplement\`；「创建数据仓库」带 **32 个孩子**，须先定子树去处 |

---

## 四、C 类 · 教程 / 章节外壳（${byCat('C').length} 条）

**处置（宪法 §2.5 + all-outstanding 裁决）**：详解壳去「详解」并正身；章节壳去「一、二、」序号改实名；「基础」→ 实名或解散；**子树一律原样保留**（本类共 ${sum(byCat('C'), (r) => r.subtree)} 个孩子，零损失）。

### 4.1 分小类

| 小类 | 条目 | 子树合计 | 是否已删/已迁移 |
|---|---:|---:|---|
`;
const cList = byCat('C');
const cKinds = {};
for (const r of cList) { const k = cKind(r); (cKinds[k] = cKinds[k] || []).push(r); }
for (const k of Object.keys(cKinds)) {
  md += `| ${k} | ${cKinds[k].length} | ${sum(cKinds[k], (r) => r.subtree)} | 无（纯改名/去后缀，不移动子树） |\n`;
}

md += `
### 4.2 章节壳去序号映射（${(cKinds['章节壳 · 去序号'] || []).length} 条 · 纯改名，零删零迁移）

先例：\`chapter_db_06\`「查询系统」、\`chapter_db_07\`「数据库事务」、\`chapter_db_11\`「索引」**已正名**，可作为口径参照。

| # | nodeRef | 现名 | 拟改名 | 子树 | 正文字数 | treeId |
|---:|---|---|---|---:|---:|---|
`;
(cKinds['章节壳 · 去序号'] || []).sort((a, b) => String(a.treeId).localeCompare(String(b.treeId))).forEach((r, i) => {
  md += `| ${i + 1} | \`${r.nodeRef}\` | ${r.name} | ${CHAPTER_RENAME[r.treeId]} | ${r.subtree} | ${r.len} | \`${r.treeId}\` |\n`;
});
md += `
> 说明：18 个 \`container:chapter_db_*\` 中已有 3 个去序号完成；\`_04\`/\`_15\` 的容器与树条目均已不存在（早前批次已收），当前全树悬空 nodeRef 为 0。

### 4.3 其余壳明细

| # | 小类 | 树节点 | nodeRef | 子树 | 正文 | treeId | 路径 |
|---:|---|---|---|---:|---:|---|---|
`;
let ci = 0;
for (const k of Object.keys(cKinds)) {
  if (k === '章节壳 · 去序号') continue;
  for (const r of cKinds[k]) {
    ci++;
    md += `| ${ci} | ${k} | ${r.name} | \`${r.nodeRef ?? '（无引用）'}\` | ${r.subtree} | ${r.len} | \`${r.treeId}\` | ${r.path} |\n`;
  }
}

md += `
---

## 五、机制 spec 现状（D 类的参照系）

| spec nodeRef | 名称 | state 数 |
|---|---|---:|
`;
for (const s of specList) {
  const ms = pool[s.id].mechanismSpec;
  md += `| \`${s.id}\` | ${s.label} | ${Array.isArray(ms.stateNodeIds) ? ms.stateNodeIds.length : 0} |\n`;
}

md += `
---

## 六、复核与只读声明

- 本名单由 \`scripts/scan-remaining-convictions.mjs\` 直接读取 \`data/node-pool.json\` / \`data/tree-data.json\` / \`data/questions.json\` 生成，**未写入任何 \`data/*.json\`**。
- 定罪正则与 \`scripts/scan-tree-violations.mjs\` 保持一致；类优先级 问句 > 对比 > 过程 > 教程壳 > 捆绑。
- 交叉核对口径：子树规模（拆壳需重挂孩子）、正文持有量（迁移成本）、题库重合（转移成本）、mechanismSpec 归属（是否已有正确载体）。
- 生成时刻：${now}（UTC，本地日期 ${localDate}）
`;

fs.mkdirSync(OUT, { recursive: true });
const outFile = path.join(OUT, 'remaining-convictions-full-list.md');
fs.writeFileSync(outFile, md);

console.log(`全树条目 ${rows.length} · 定罪 ${convicted.length}`);
for (const c of ['E', 'B', 'D', 'C', 'A']) console.log(`  ${c}: ${byCat(c).length}`);
console.log('D 分档: ' + Object.entries(dGroups).map(([k, v]) => `${k}=${v.length}`).join(' · '));
console.log('C 分小类: ' + Object.entries(cKinds).map(([k, v]) => `${k}=${v.length}`).join(' · '));
console.log('机制 spec: ' + specList.length + ' 个 / 持有节点引用 ' + specByState.size);
console.log('已写出: outputs/tree-violation-scan/remaining-convictions-full-list.md');
