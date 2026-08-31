// 索引问题库清理（2026-08-31）
//  1) 去重合并（读懂内容合并，非择大保留）：
//     - 「索引的基本原理」×2 → 保留结构化答案者，补入倒排表/地址链构建视角与 BTree 适用操作符
//     - 「索引设计原则」四胞胎（基本原则/设计的原则/创建索引的原则/创建时注意什么）→ 合并为
//       一道「索引设计的原则有哪些？」，按 列选择/数量与更新/最左前缀 三段重组全部要点
//     - 「B+树和哈希索引的区别」×2 → 保留干净题干者，答案取自有答案的一方并挂到哈希索引概念
//  2) 陈述句/残题改写为规范问题（保留原答案）：
//     「删除索引」「前缀索引」「B+树在满足…不需要回表」「LIMIT 1000000,10」「优缺点（重点）」「三种方式，」
//  3) 挂错链接修正：「创建的索引有没有被使用到」 concept_not_null_constraint → concept_index_statistics；
//     「前缀索引」 → concept_prefix_index。
//  4) 全库 136 道缺 kind/difficulty 的题按启发式补齐（区别→comparison、原理/为什么→mechanism、
//     如何/怎么→application、什么是→definition、慢/排查→troubleshooting，默认 recall）。
import { readFileSync, writeFileSync, renameSync, mkdirSync, copyFileSync } from 'fs';
import { join } from 'path';

const DATA = 'data';
const FILES = ['questions.json'];
const ts = new Date().toISOString().replace(/[:.]/g, '-');
const backupDir = join(DATA, 'backups', `fix-index-questions-${ts}`);
mkdirSync(backupDir, { recursive: true });
for (const f of FILES) copyFileSync(join(DATA, f), join(backupDir, f));
console.log('backup ->', backupDir);

const qs = JSON.parse(readFileSync(join(DATA, 'questions.json'), 'utf8'));
const byId = new Map(qs.map((q) => [q.id, q]));
const now = Date.now();
function patch(q, fields) {
  Object.assign(q, fields, { updatedAt: now });
}

// ---------- 1) 去重合并 ----------
// 1a. 索引的基本原理
{
  const keep = byId.get('q_1781623296032_24obic');
  const drop = byId.get('q_dbnotes_index_5');
  if (!keep || !drop) throw new Error('dedup 1a missing');
  keep.relatedNodeId = 'concept_index';
  keep.answer = (keep.answer || '')
    + '\n\n【补充：索引的构建视角】把无序的数据变成有序的查询：1) 对创建了索引的列内容进行排序；2) 对排序结果生成倒排表；3) 在倒排表内容上拼上数据地址链；4) 查询时先拿到倒排表内容，再沿数据地址链取出具体数据。\n\nBTree 算法可用于 =、>、>=、<、<=、between 这些比较操作符，也可用于不以通配符开头的 like。';
  patch(keep, {});
  const i = qs.indexOf(drop);
  qs.splice(i, 1);
  console.log('merged 索引的基本原理 ->', keep.id);
}
// 1b. 索引设计的原则（四合一）
{
  const keep = byId.get('q_1787497023823_1h6frm');
  if (!keep) throw new Error('dedup 1b missing');
  keep.text = '索引设计的原则有哪些？';
  keep.kind = 'application';
  keep.difficulty = 'intermediate';
  keep.relatedNodeId = 'concept_index';
  keep.answer = [
    '【列的选择】',
    '1. 适合索引的列是出现在 WHERE 子句或连接条件中的列；定义有外键的列一定要建索引。',
    '2. 选择区分度/离散度高的列（可用 count(distinct col) 衡量，越大越适合）；性别这类低区分度列不适合；取值离散大的列放联合索引前面。',
    '3. 索引列越短越好：长字符串列应指定前缀长度（短索引节省大量索引空间）；大文本、大对象不建索引。',
    '4. 尽量 NOT NULL：含空值的列难以做查询优化，会使索引、索引统计信息和比较运算更复杂；用 0、特殊值或空串代替空值。',
    '【索引数量与更新代价】',
    '5. 不要给每个字段都建索引——索引需要额外磁盘空间，并降低写操作性能（修改表时索引要更新甚至重构，索引列越多越慢），只保持需要的索引。',
    '6. 更新频繁的字段不适合建索引；基数较小的列索引效果差，没必要建。',
    '7. 尽量扩展已有索引（升级为组合索引）而不是新建索引；组合索引列数不宜过多。',
    '【组合索引与最左前缀】',
    '8. 最左前缀匹配原则：MySQL 一直向右匹配直到遇到范围查询（>、<、between、like）就停止。例如 `a=1 and b=2 and c>3 and d=4`：建 (a,b,c,d) 顺序的索引时 d 用不到索引；建 (a,b,d,c) 则都能用到，且 a,b,d 的顺序可任意调整。',
    '9. 索引字段越小越好：数据以页为单位存储，一页能存的数据越多，一次 IO 获取的数据越多，效率越高。',
  ].join('\n');
  patch(keep, {});
  for (const id of ['q_dbnotes_index_6', 'q_dbnotes_index_7', 'q_dbnotes_index_10']) {
    const drop = byId.get(id);
    if (!drop) throw new Error('dedup 1b missing ' + id);
    qs.splice(qs.indexOf(drop), 1);
  }
  console.log('merged 索引设计原则 四合一 ->', keep.id);
}
// 1c. B+树 vs 哈希
{
  const keep = byId.get('demo_q4');
  const drop = byId.get('q_dbnotes_index_18');
  if (!keep || !drop) throw new Error('dedup 1c missing');
  if (drop.answer) keep.answer = drop.answer;
  if (drop.answerSteps && drop.answerSteps.length) keep.answerSteps = drop.answerSteps;
  keep.answered = true;
  keep.relatedNodeId = 'concept_hash_index';
  patch(keep, {});
  qs.splice(qs.indexOf(drop), 1);
  console.log('merged B+树 vs 哈希 ->', keep.id);
}

// ---------- 2) 陈述句/残题改写 ----------
const rewrites = [
  ['B+树在满足聚簇索引和覆盖索引的时候不需要回表查询数据',
   '为什么满足聚簇索引或覆盖索引时不需要回表查询？',
   { kind: 'mechanism', difficulty: 'intermediate', relatedNodeId: 'concept_covering_index' }],
  ['MySQL 在无法利用索引的情况下跳过1000000条记录后，再获取10条记录',
   '无法利用索引的深分页（LIMIT 1000000,10）如何优化？',
   { kind: 'application', difficulty: 'advanced' }],
  ['索引有哪些优缺点？ 索引使用场景（重点）',
   '索引有哪些优缺点？适用场景是什么？',
   { kind: 'definition', difficulty: 'basic' }],
  ['创建索引的三种方式，',
   '创建索引有哪几种方式？',
   { kind: 'application', difficulty: 'basic' }],
  ['删除索引',
   '如何删除索引？有什么注意事项？',
   { kind: 'application', difficulty: 'basic' }],
  ['前缀索引',
   '什么是前缀索引？如何选择前缀长度？',
   { kind: 'definition', difficulty: 'intermediate', relatedNodeId: 'concept_prefix_index' }],
];
for (const [frag, newText, fields] of rewrites) {
  const q = qs.find((x) => x.text.includes(frag));
  if (!q) throw new Error('rewrite target not found: ' + frag);
  q.text = newText;
  patch(q, fields);
  console.log('rewritten:', newText, '(' + q.id + ')');
}

// ---------- 3) 挂错链接 ----------
{
  const q = qs.find((x) => x.text.includes('创建的索引有没有被使用到'));
  if (!q) throw new Error('mislink target not found');
  q.relatedNodeId = 'concept_index_statistics';
  q.kind = q.kind || 'troubleshooting';
  q.difficulty = q.difficulty || 'intermediate';
  patch(q, {});
  console.log('relinked:', q.text.slice(0, 20), '-> concept_index_statistics');
}

// ---------- 4) 全库缺 kind/difficulty 启发式补齐 ----------
function inferKind(text) {
  if (/区别|优劣|对比|相比|vs/i.test(text)) return 'comparison';
  if (/原理|为什么|为何|底层|怎么实现|如何实现/.test(text)) return 'mechanism';
  if (/慢|排查|故障|问题在哪|原因/.test(text)) return 'troubleshooting';
  if (/如何|怎么|方式|步骤|哪些方法|怎样/.test(text)) return 'application';
  if (/什么是|定义|哪些|列举|有哪几种/.test(text)) return 'definition';
  return 'recall';
}
function inferDifficulty(text) {
  return /^(什么是|列举|简述)/.test(text.trim()) ? 'basic' : 'intermediate';
}
let filled = 0;
for (const q of qs) {
  if (q.kind === undefined && q.difficulty === undefined) {
    q.kind = inferKind(q.text);
    q.difficulty = inferDifficulty(q.text);
    patch(q, {});
    filled++;
  } else if (q.kind === undefined) {
    q.kind = inferKind(q.text);
    patch(q, {});
    filled++;
  } else if (q.difficulty === undefined) {
    q.difficulty = inferDifficulty(q.text);
    patch(q, {});
    filled++;
  }
}
console.log('enum filled:', filled);

// ---------- 5) 全库 text trim ----------
let trimmed = 0;
for (const q of qs) {
  const t = q.text.replace(/\s+$/, '').replace(/^[\s　]+/, '');
  if (t !== q.text) { q.text = t; trimmed++; }
}
console.log('text trimmed:', trimmed);

// ---------- 校验 ----------
const seen = new Map();
let dupText = 0;
for (const q of qs) {
  const key = q.text.replace(/\s+/g, '');
  if (seen.has(key)) { dupText++; console.log('仍重复:', q.text); }
  seen.set(key, q.id);
}
const pool = JSON.parse(readFileSync(join(DATA, 'node-pool.json'), 'utf8'));
let dangle = 0;
for (const q of qs) if (q.relatedNodeId && !pool[q.relatedNodeId]) { dangle++; console.log('悬挂:', q.id, q.relatedNodeId); }
console.log(`校验: 总题 ${qs.length} | 疑似重复文本 ${dupText} | 悬挂 ${dangle}`);

const tmp = join(DATA, `questions.json.tmp-${process.pid}`);
writeFileSync(tmp, JSON.stringify(qs, null, 2), 'utf8');
renameSync(tmp, join(DATA, 'questions.json'));
console.log('fix-index-questions complete');
