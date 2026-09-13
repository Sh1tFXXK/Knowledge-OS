#!/usr/bin/env node
/**
 * 宪法违规扫描（只读 · 可复跑）
 *
 * 对 data/tree-data.json 全部目录条目按五类反宪法形态做模式定罪：
 *   E 提问型   —— 问句当节点（什么是/为什么/如何/？结尾）
 *   B 对比型   —— 区别/差异/关系当节点
 *   D 过程片段 —— 机制步骤（①/1./阶段）/ 优缺点 / 动作任务
 *   A 捆绑型   —— 「X 与 Y」「X 和 Y」强行拼接
 *   C 教程壳   —— 详解/入门/总览/基础/章节序号
 *
 * 交叉核对：子树规模（拆壳需重挂孩子）、节点池正文持有（迁移量）、题库重合（转移成本）。
 * 模式定罪 ≠ 终审定罪——产出的是处置候选清单，按宪法原则一 §1.4 经人工过目后执行。
 *
 * 不写任何 data/*.json。输出：outputs/tree-violation-scan/
 *   scan-result.json   机器可读全量
 *   violation-list.md  人工审查用处置清单草案
 *
 * 用法：node scripts/scan-tree-violations.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DATA = path.join(ROOT, 'data');
const OUT = path.join(ROOT, 'outputs', 'tree-violation-scan');
fs.mkdirSync(OUT, { recursive: true });

const pool = JSON.parse(fs.readFileSync(path.join(DATA, 'node-pool.json'), 'utf8'));
const questions = JSON.parse(fs.readFileSync(path.join(DATA, 'questions.json'), 'utf8'));
const tree = JSON.parse(fs.readFileSync(path.join(DATA, 'tree-data.json'), 'utf8'));

// ── 定罪模式 ──────────────────────────────────────────────────────────────
// 优先级：问句 > 对比 > 过程 > 教程壳 > 捆绑（章序壳比「与」更根本，先归 C 后归 A）
const PRIORITY = ['E', 'B', 'D', 'C', 'A'];

// 误伤豁免（语义层白名单——「与/和」字面匹配救不了的）：
//   1) 运算符/逻辑概念本身含「与」：逻辑与 (&&) 是独立运算符名词，不是捆绑
//   2) 领域固定词组：去掉连接词后两侧不各自成立为一个知识（是一个词，不是两个）
//   3) 缩写对（X/Y 同一概念的两种拼写）
//   4) A-split 裁决豁免（2026-09-13/14）：正统学科/分类/架构名词，双概念但同属一个既有概念域，
//      拆开反而破坏分类语义 → 用户裁决「豁免保留」，树与池均不动
//   ⚠️ 本正则含 `\/`：条目名里的斜杠必须转义，否则会提前终止正则字面量（曾致扫描器 SyntaxError）
const FALSE_POSITIVE_A = /^(逻辑与 \(?&&\)?|逻辑与|逻辑或|按位与|与门|交互与通信|知识表示与推理|自动化规划与调度|服务注册与发现|Unix 和类 Unix|校验和 \/ checksum|软件符号与工具|发布与版本模型 \/ Release & Versioning Model|连接与线程状态|对象关系映射（ORM、O\/RM 和 O\/R 映射）)$/;

const matchers = {
  E: (n) =>
    /(什么是|为什么|如何|怎样|怎么|什么时候|何时|介绍一下|谈谈|说说|啥是)/.test(n) ||
    /[?？]\s*$/.test(n.trim()),
  B: (n) => /(的区别|区别是什么|区别$|差异$|的差异|的对比$|之间的?关系$|的关系$)/.test(n),
  D: (n) =>
    /^[①②③④⑤⑥⑦⑧⑨⑩]/.test(n) ||
    /^\d+[.、]/.test(n) ||
    /阶段$/.test(n) ||
    /(优点|缺点)/.test(n) ||
    /调用方/.test(n) ||
    /(合理地|线上问题定位|创建数据仓库)/.test(n),
  // 与/和 作为连接词；剔除 与/和 作为语素的常见词（饱和/参与…）+ 运算符白名单
  A: (n) => !FALSE_POSITIVE_A.test(n.trim()) && /与|和/.test(n.replace(/(参与|赠与|饱和|缓和|共和|总和|和尚|亲和)/g, '')),
  C: (n) =>
    /(详解|入门|总览|初识|宝典|进阶|面试)/.test(n) ||
    /基础$/.test(n) ||
    /基础概念/.test(n) ||
    /^[一二三四五六七八九十百]+、/.test(n) ||
    /第[一二三四五六七八九十百0-9]+章/.test(n),
};

const norm = (s) => String(s).replace(/\s+/g, '').replace(/[?？。．.…!！]+$/g, '');
const qSet = new Set(questions.map((q) => norm(q.text || '')));

// ── 遍历树 ───────────────────────────────────────────────────────────────
const rows = [];

function subtreeSize(node) {
  let c = 0;
  for (const ch of node.children || []) c += 1 + subtreeSize(ch);
  return c;
}

function walk(node, parents, depth) {
  const name = node.name || '';
  const tags = PRIORITY.filter((k) => matchers[k](name));
  const p = node.nodeRef ? pool[node.nodeRef] : undefined;
  const hasContent = !!(
    p?.card &&
    ((p.card.rootContent && String(p.card.rootContent).trim()) ||
      (Array.isArray(p.card.tabs) && p.card.tabs.some((t) => t.content && String(t.content).trim())))
  );
  rows.push({
    name,
    treeId: node.id,
    nodeRef: node.nodeRef ?? null,
    branch: parents[0] ?? '',
    path: [...parents, name].join(' / '),
    depth,
    childCount: (node.children || []).length,
    subtree: subtreeSize(node),
    role: p?.role ?? null,
    hasContent,
    dupQuestion: qSet.has(norm(name)),
    categories: tags,
    primary: tags[0] ?? null,
  });
  for (const ch of node.children || []) walk(ch, [...parents, name], depth + 1);
}
walk(tree, [], 0);

// ── 用户点名名单核验 ─────────────────────────────────────────────────────
const USER_EXAMPLES = [
  'JSP 与视图渲染', 'Request/Response 与作用域', 'Session/Cookie 与状态管理',
  '面向对象与数据库', 'AQS 与 JUC 工具', 'Topic/Partition 与 Broker',
  'Producer/Consumer 与消费组', '网关与治理组件', '熔断与隔离', '文件流与缓冲流',
  'Hibernate 和 iBatis 的区别', '== 和 equals 的区别是什么?', 'Callable与Runnbale的区别',
  'Error 和 Exception 区别是什么?', '各种内存模型之间的关系', '与雅加达企业 beans (EJB) 的关系',
  'ThreadPoolExecutor详解', 'ArrayList 详解', 'HashMap 详解', 'JVM 基础',
  'Java 多线程编程入门', 'Netty 基础概念', 'MyBatis 定位总览', 'Spring Cloud 定位总览',
  '合理地配置线程池', '线上问题定位', '性能测试', '加载文件', '创建数据仓库',
  '调用方（getBean 请求）', '内部类的优点', '缺点', '什么是 BufferPool',
  'InnoDB 如何管理 Page 页', '介绍一下 Page 页的结构', 'InnoDB 的行锁是怎么实现的',
  'MQ 为什么存在', '什么时候需要分库分表',
];
const exampleCheck = USER_EXAMPLES.map((ex) => {
  const exact = rows.find((r) => r.name === ex);
  if (exact) return { example: ex, status: 'exact', treeName: exact.name, path: exact.path };
  const loose = rows.find((r) => r.name.length >= 2 && (r.name.includes(ex) || ex.includes(r.name)));
  if (loose) return { example: ex, status: 'variant', treeName: loose.name, path: loose.path };
  return { example: ex, status: 'missing', treeName: null, path: null };
});

// ── 汇总 ─────────────────────────────────────────────────────────────────
const convicted = rows.filter((r) => r.primary);
const uniqueRefs = new Set(convicted.map((r) => r.nodeRef).filter(Boolean));

function agg(list) {
  return {
    entries: list.length,
    uniqueNodes: new Set(list.map((r) => r.nodeRef).filter(Boolean)).size,
    withChildren: list.filter((r) => r.childCount > 0).length,
    withContent: list.filter((r) => r.hasContent).length,
    dupQuestion: list.filter((r) => r.dupQuestion).length,
    subtreeTotal: list.reduce((s, r) => s + r.subtree, 0),
  };
}

const byCat = {};
for (const cat of PRIORITY) byCat[cat] = agg(convicted.filter((r) => r.primary === cat));
const byBranch = {};
for (const b of [...new Set(rows.map((r) => r.branch))]) {
  byBranch[b] = agg(convicted.filter((r) => r.branch === b));
}

const summary = {
  generatedAt: new Date().toISOString(),
  totalTreeEntries: rows.length,
  totalConvicted: agg(convicted),
  remainingIfAllConvictedRemoved: rows.length - convicted.length,
  byCategory: byCat,
  byBranch,
  userExampleCheck: {
    exact: exampleCheck.filter((e) => e.status === 'exact').length,
    variant: exampleCheck.filter((e) => e.status === 'variant').length,
    missing: exampleCheck.filter((e) => e.status === 'missing').length,
    detail: exampleCheck,
  },
};

fs.writeFileSync(path.join(OUT, 'scan-result.json'), JSON.stringify({ summary, rows: convicted }, null, 2));

// ── 处置清单草案（人工审查用） ────────────────────────────────────────────
const CAT_META = {
  E: { title: '第五类 · 直接提问型', dest: '→ 问题库（relatedNodeId 指向名词本体），树条目卸载' },
  B: { title: '第二类 · 对比与区别型', dest: '→ 问题库 + answerSteps 引用双方节点，树条目卸载' },
  D: { title: '第四类 · 动作/任务/状态型', dest: '→ 步骤进 mechanismSpec / 优缺点进 viewDimensions / 实战进 supplement' },
  A: { title: '第一类 · 「A 与 B」强行捆绑型', dest: '→ 拆成独立名词 + 语义边；特化场景写 supplement' },
  C: { title: '第三类 · 教程/专栏标题型', dest: '→ 去壳并入本体；带子树的章节壳需先改名或重挂子树' },
};

let md = `# 目录树宪法违规 · 处置清单草案（${summary.generatedAt.slice(0, 10)}）

> 模式定罪 ≠ 终审定罪。本清单按宪法原则一 §1.4 供人工过目；「子树>0」的条目拆除前必须先决定子节点重挂方案，「正文有」的条目卸载前必须先迁移内容（门二）。

| 类 | 条目 | 唯一节点 | 带子树 | 正文有 | 题库重合 |
|---|---:|---:|---:|---:|---:|
`;
for (const cat of PRIORITY) {
  const s = byCat[cat];
  md += `| ${cat} ${CAT_META[cat].title} | ${s.entries} | ${s.uniqueNodes} | ${s.withChildren} | ${s.withContent} | ${s.dupQuestion} |\n`;
}
md += `
**全树 ${rows.length} 条目 · 定罪 ${convicted.length} 条（唯一节点 ${uniqueRefs.size}）· 若全部卸载剩 ${rows.length - convicted.length} 条**

`;
for (const cat of PRIORITY) {
  const list = convicted.filter((r) => r.primary === cat).sort((a, b) => a.path.localeCompare(b.path, 'zh'));
  md += `## ${CAT_META[cat].title}（${list.length} 条）\n\n处置：${CAT_META[cat].dest}\n\n`;
  md += `| 树节点 | 路径 | 子树 | 正文 | 题库 | 树ID | nodeRef |\n|---|---|---:|---|---|---|---|\n`;
  for (const r of list) {
    md += `| ${r.name} | ${r.path} | ${r.subtree} | ${r.hasContent ? '有' : '空'} | ${r.dupQuestion ? '同题' : ''} | ${r.treeId} | ${r.nodeRef ?? '（无引用）'} |\n`;
  }
  md += '\n';
}
fs.writeFileSync(path.join(OUT, 'violation-list.md'), md);

// ── 控制台摘要 ────────────────────────────────────────────────────────────
console.log(`全树条目: ${rows.length}`);
console.log(`定罪条目: ${convicted.length}（唯一节点 ${uniqueRefs.size}）→ 全卸后剩 ${rows.length - convicted.length}`);
for (const cat of PRIORITY) {
  const s = byCat[cat];
  console.log(`  ${cat} ${CAT_META[cat].title}: ${s.entries} 条 | 带子树 ${s.withChildren} | 正文有 ${s.withContent} | 题库重合 ${s.dupQuestion}`);
}
console.log('按一级分支:');
for (const [b, s] of Object.entries(byBranch)) console.log(`  ${b}: ${s.entries}`);
console.log(`用户点名核验: exact=${summary.userExampleCheck.exact} variant=${summary.userExampleCheck.variant} missing=${summary.userExampleCheck.missing}`);
for (const e of exampleCheck.filter((x) => x.status !== 'exact')) {
  console.log(`  [${e.status}] ${e.example}${e.treeName ? ' ≈ ' + e.treeName + ' @ ' + e.path : ' — 未找到'}`);
}
