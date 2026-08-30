// 导入 SQL.md 问答为问题卡 + 升级 SQL 概念节点（2026-08-29）
// 1. SQL.md 是问答式笔记（# 问题 + 正文答案）——按问答切分导入「问题库」为问题卡，
//    每张卡带答案并关联到对应的知识节点（relatedNodeId）。
// 2. 「SQL（结构化查询语言）」节点由 75 字占位升级为正式的 SQL 概念卡。
import { readFileSync, writeFileSync, renameSync, mkdirSync, copyFileSync } from 'fs';
import { join } from 'path';

const VAULT_SQL = 'C:/Users/Administrator/Documents/Obsidian Vault/数据库/SQL.md';
const DATA = 'data';
const ts = new Date().toISOString().replace(/[:.]/g, '-');
const backupDir = join(DATA, 'backups', `import-sql-question-cards-${ts}`);
mkdirSync(backupDir, { recursive: true });
for (const f of ['node-pool.json', 'questions.json']) copyFileSync(join(DATA, f), join(backupDir, f));
console.log('backup ->', backupDir);

const pool = JSON.parse(readFileSync(join(DATA, 'node-pool.json'), 'utf8'));
const tree = JSON.parse(readFileSync(join(DATA, 'tree-data.json'), 'utf8'));
const questions = JSON.parse(readFileSync(join(DATA, 'questions.json'), 'utf8'));

const imgText = {
  '20251104164741': `【对比表】
| | Delete | Truncate | Drop |
| --- | --- | --- | --- |
| 类型 | 属于 DML | 属于 DDL | 属于 DDL |
| 回滚 | 可回滚 | 不可回滚 | 不可回滚 |
| 删除内容 | 表结构还在，删除表的全部或者一部分数据行 | 表结构还在，删除表中的所有数据 | 从数据库中删除表，所有的数据行，索引和权限也会被删除 |
| 删除速度 | 删除速度慢，需要逐行删除 | 删除速度快 | 删除速度快 |`,
  '20251104165447': '【图：EXPLAIN 示例】SQL：`SELECT o.card_amount FROM orders o INNER JOIN order_item oi ON o.order_id = oi.order_id`；执行计划：第一行 id=1、SIMPLE、table=o、type=ALL（全表扫描）、possible_keys=PRIMARY、key=(Null)、rows=1441512；第二行 id=1、SIMPLE、table=oi、type=ref、key=ORDER_8、ref=rcims。',
  '20251104165545': `【表：select_type 取值】
| id | select_type | description |
| --- | --- | --- |
| 1 | SIMPLE | 不包含任何子查询或 union 等查询 |
| 2 | PRIMARY | 包含子查询，外层查询就显示为 PRIMARY |
| 3 | SUBQUERY | 在 select 或 where 字句中包含的查询 |
| 4 | DERIVED | from 字句中包含的查询 |
| 5 | UNION | 出现在 union 后的查询语句中 |
| 6 | UNION RESULT | 从 UNION 中获取结果集，例如上文的第三个例子 |`,
  '20251104170424': '【图：SQL 生命周期与 MySQL 架构】Client Apps ⇅ MySQLD：连接管理 → 连接进程 → 用户模块 → 查询缓存 → 命令分发器 → 命令解析器（select→查询优化器；dml→表变更；ddl→表维护；rep→复制；status→状态）→ 访问控制 → 表管理 → 存储引擎接口；旁路：日志记录、网络交互、核心 API；底层 Storage Engines（MyISAM/InnoDB/NDB/Falcon/Memory/Archive/Merge/Federated/User defined）。',
  '20251104175532': '【图：垂直分区】一张〔列1~列7〕的表按列拆分为〔列1~列4〕与〔列1、列6、列7〕两张表。',
  '20251104175547': '【图：垂直分表】原表〔id, C1, C2, C3, Cn〕沿列拆分为〔id, C1〕与〔id, C2, C3, Cn〕。',
  '20251104175752': '【图：水平分区】一张表按行拆分为两张结构完全相同的表。',
  '20251104175927': '【图：水平分表】一张大表沿行方向切分为 1、2、3 多段独立数据表。',
  '20251104181426': '【图：跨分片排序分页】Data Node1（ID 1-10000）与 Data Node2（ID 10001-20000）各自执行 select …order by date desc limit 0,10 取前 10 条，合并后再次排序截取，返回最终结果集。',
  '20251104181800': '【图：主从复制】Master：数据变更写入 Binary log；Slave：I/O thread 读取 Binlog 写入 Relay log，SQL thread 读取 Relay log 并重放。',
};
const replaceImages = (text) => String(text).replace(/!\[\[([^\]]+)\]\]/g, (_m, name) => {
  const m = String(name).match(/(\d{14})/);
  return (m && imgText[m[1]]) ?? '';
});

// ========== 1. SQL 概念节点升级 ==========
const SQL_REF = 'k_wiki_en_outline_of_databases_s5_b5';
pool[SQL_REF].card.tabs[0].content = `SQL（Structured Query Language，结构化查询语言）——专用编程语言，设计用于管理关系数据库管理系统（RDBMS）中保存的数据，或用于关系数据流管理系统（RDSMS）中的流处理。它是关系数据库的标准语言，主要方言包括 MySQL、Oracle、SQL Server、PostgreSQL 等各自的实现。

【语句分类】
- DDL（数据定义语言）：CREATE、DROP、ALTER——对逻辑结构操作，包括表结构、视图和索引
- DQL（数据查询语言）：SELECT——查询操作
- DML（数据操纵语言）：INSERT、UPDATE、DELETE——对数据进行操作
- DCL（数据控制语言）：GRANT、REVOKE——权限控制；COMMIT、ROLLBACK——事务控制

【本库相关位置】
- SQL 语言知识（分类/键辨析/约束/关联查询/子查询/数据类型/LIMIT）：本节点下方子节点
- SQL 优化（EXPLAIN/慢查询/优化方法）：数据库/六、查询系统
- 与 Java 的结合：java/常用类库/JDBC 连接 MySQL`;

// ========== 2. 解析 SQL.md 问答 ==========
const raw = readFileSync(VAULT_SQL, 'utf8').replace(/\r\n/g, '\n');
const lines = raw.split('\n');
const sections = [];
let cur = null;
for (const line of lines) {
  if (/^#/.test(line)) {
    cur = { question: line.replace(/^#+\s*/, '').trim(), body: [] };
    sections.push(cur);
  } else if (cur) {
    cur.body.push(line);
  }
}
// 清洗：图片转写 + 去掉零宽字符
for (const s of sections) {
  s.answer = replaceImages(s.body.join('\n')).replace(/\u200b/g, '').replace(/\n{3,}/g, '\n\n').trim();
  s.question = s.question.replace(/\[\[([^\]|]*)\|?([^\]]*)\]\]/g, (_m, t, l) => l || t);
}
const usable = sections.filter((s) => s.question && s.answer.length > 0);
console.log('解析出问答:', sections.length, '段，其中有答案内容的:', usable.length, '段');

// ========== 3. 问题 → 知识节点关联映射 ==========
const TARGETS = {
  keys: 'concept_primary_key', notnull: 'concept_not_null_constraint', fk: 'concept_foreign_key',
  joins: 'k_sql_joins', subquery: 'k_sql_subquery_in_exists', datatypes: 'k_sql_datatypes',
  limit: 'k_sql_limit', ddt: 'k_sql_drop_delete_truncate', explain: 'k_sql_explain',
  lifecycle: 'k_sql_lifecycle', slow: 'k_sql_slow_query', opt: 'k_sql_optimization',
  huge: 'k_sql_huge_offset', bigtable: 'k_sql_bigtable_sharding', cpu: 'k_sql_cpu_spike',
  backup: 'k_sql_backup_tools', repair: 'k_sql_table_repair', repl: 'k_sql_replication',
  binlog: 'k_sql_binlog_modes', types: 'k_sql_statement_types', concept: SQL_REF,
};
function relatedOf(q, a) {
  const t = q + ' ' + a;
  if (/超键|候选键/.test(t)) return TARGETS.keys;
  if (/NOT ?NULL|notnull/i.test(t)) return TARGETS.notnull;
  if (/外键/.test(t)) return TARGETS.fk;
  if (/主键/.test(t)) return TARGETS.keys;
  if (/约束/.test(t)) return TARGETS.keys;
  if (/关联查询|JOIN|连接查询|等值连接|自连接/i.test(t)) return TARGETS.joins;
  if (/子查询/.test(t)) return TARGETS.subquery;
  if (/in和exists|in和not|not in/i.test(t)) return TARGETS.subquery;
  if (/varchar|char\(|int\(10\)|int\(20\)|FLOAT|DOUBLE|密码散列|50的涵义|20的涵义|这么设计/i.test(t)) return TARGETS.datatypes;
  if (/limit|分页/i.test(t)) return /超大|优化/i.test(t) ? TARGETS.huge : TARGETS.limit;
  if (/drop|delete|truncate/i.test(t)) return TARGETS.ddt;
  if (/union/i.test(t)) return TARGETS.opt;
  if (/索引|执行计划|explain|type.*级别|range|ref级别/i.test(t)) return TARGETS.explain;
  if (/生命周期/i.test(t)) return TARGETS.lifecycle;
  if (/慢查询|耗时/i.test(t)) return TARGETS.slow;
  if (/cpu/i.test(t)) return TARGETS.cpu;
  if (/备份|mysqldump|xtra/i.test(t)) return TARGETS.backup;
  if (/损坏|repair|myisamchk/i.test(t)) return TARGETS.repair;
  if (/复制|主从|读写分离|binlog/i.test(t)) return /binlog|STATEMENT|ROW模式|MIXED/i.test(t) ? TARGETS.binlog : TARGETS.repl;
  if (/大表|分库|分表|分片|Sharding|Sharding-JDBC|垂直|水平|ID问题|跨库/i.test(t)) return TARGETS.bigtable;
  if (/优化/.test(t)) return TARGETS.opt;
  if (/分类|DDL|DQL|DML|DCL/i.test(t)) return TARGETS.types;
  return TARGETS.concept;
}

// ========== 4. 生成问题卡 ==========
const now = Date.now();
let idx = 0, linked = 0;
for (const s of usable) {
  idx += 1;
  const id = `q_sql_notes_${idx}`;
  if (questions.some((q) => q.id === id)) continue;
  const relatedNodeId = relatedOf(s.question, s.answer);
  questions.push({
    id,
    text: s.question,
    answered: true,
    relatedNodeId,
    answer: s.answer,
    createdAt: now,
    updatedAt: now,
  });
  linked++;
}
console.log('created question cards:', linked);

// ========== 校验 ==========
const problems = [];
for (const q of questions) if (q.relatedNodeId && !pool[q.relatedNodeId]) problems.push(`q ${q.id} -> ${q.relatedNodeId}`);
if (problems.length) { problems.slice(0, 10).forEach((p) => console.error('PROBLEM:', p)); throw new Error('integrity failed: ' + problems.length); }

const atomicWrite = (file, obj) => { const tmp = join(DATA, `${file}.tmp-${process.pid}`); writeFileSync(tmp, JSON.stringify(obj, null, 2), 'utf8'); renameSync(tmp, join(DATA, file)); };
atomicWrite('node-pool.json', pool);
atomicWrite('questions.json', questions);
console.log(`import-sql-question-cards complete:
  - SQL 概念节点已升级（定义 + 分类 + 关联位置）
  - 新增问题卡: ${linked} 张（问题库总数 ${questions.length}）`);
