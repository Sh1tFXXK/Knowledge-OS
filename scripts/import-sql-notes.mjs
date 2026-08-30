// 导入 Obsidian「数据库/SQL.md」SQL 知识（2026-08-29）
// 源：C:\Users\Administrator\Documents\Obsidian Vault\数据库\SQL.md（452 行，43.5KB 面试知识合集）
// 原则：SQL 语言知识 → 数据库/五、数据库操作/数据库语言；SQL 优化/执行计划/慢查询 → 六、查询系统；
//       结构优化/CPU 飙升/大表分库分表 → 十七、数据库运维；备份/表修复 → 八、恢复系统；
//       主从复制/读写分离/binlog → 十四、数据库分布与复制
// 图片：10 张内嵌图全部人工转写为「【图解：…】」文字。
import { readFileSync, writeFileSync, renameSync, mkdirSync, copyFileSync } from 'fs';
import { join } from 'path';

const VAULT_SQL = 'C:/Users/Administrator/Documents/Obsidian Vault/数据库/SQL.md';
const DATA = 'data';
const ts = new Date().toISOString().replace(/[:.]/g, '-');
const backupDir = join(DATA, 'backups', `import-sql-notes-${ts}`);
mkdirSync(backupDir, { recursive: true });
for (const f of ['node-pool.json', 'tree-data.json', 'knowledge-edges.json']) copyFileSync(join(DATA, f), join(backupDir, f));
console.log('backup ->', backupDir);

const pool = JSON.parse(readFileSync(join(DATA, 'node-pool.json'), 'utf8'));
const tree = JSON.parse(readFileSync(join(DATA, 'tree-data.json'), 'utf8'));
let edges = JSON.parse(readFileSync(join(DATA, 'knowledge-edges.json'), 'utf8'));

function findTreeByRef(node, ref) { if (node.nodeRef === ref) return node; for (const c of node.children ?? []) { const f = findTreeByRef(c, ref); if (f) return f; } return null; }
const upsertEdge = (edge) => { const i = edges.findIndex((e) => e.id === edge.id); if (i >= 0) edges[i] = edge; else edges.push(edge); };

// ========== 图片转写 ==========
const imgText = {
  '20251104164741': `【图解：DELETE / TRUNCATE / DROP 对比表】
| | Delete | Truncate | Drop |
| --- | --- | --- | --- |
| 类型 | 属于 DML | 属于 DDL | 属于 DDL |
| 回滚 | 可回滚 | 不可回滚 | 不可回滚 |
| 删除内容 | 表结构还在，删除表的全部或者一部分数据行 | 表结构还在，删除表中的所有数据 | 从数据库中删除表，所有的数据行，索引和权限也会被删除 |
| 删除速度 | 删除速度慢，需要逐行删除 | 删除速度快 | 删除速度快 |`,
  '20251104165447': '【图解：EXPLAIN 执行计划示例（一）】客户端中执行的 SQL：`SELECT o.card_amount FROM orders o INNER JOIN order_item oi ON o.order_id = oi.order_id`；其执行计划表：第一行 id=1、select_type=SIMPLE、table=o、type=ALL（全表扫描）、possible_keys=PRIMARY、key=(Null)、rows=1441512——orders 表走了全表扫描；第二行 id=1、SIMPLE、table=oi、type=ref、possible_keys=ORDER_ITEM_ORD…、key=ORDER_8、ref=rcims——order_item 表走了 ref 索引关联。',
  '20251104165545': `【图解：select_type 取值说明表】
| id | select_type | description |
| --- | --- | --- |
| 1 | SIMPLE | 不包含任何子查询或 union 等查询 |
| 2 | PRIMARY | 包含子查询，外层查询就显示为 PRIMARY |
| 3 | SUBQUERY | 在 select 或 where 字句中包含的查询 |
| 4 | DERIVED | from 字句中包含的查询 |
| 5 | UNION | 出现在 union 后的查询语句中 |
| 6 | UNION RESULT | 从 UNION 中获取结果集，例如上文的第三个例子 |`,
  '20251104170424': '【图解：SQL 生命周期与 MySQL 架构】Client Apps ⇅ MySQLD：连接管理模块 → 连接进程模块 → 用户模块 → 查询缓存模块 → 命令分发器 → 命令解析器（select→查询优化器；dml→表变更模块；ddl→表维护模块；rep→复制模块；status→状态模块）→ 访问控制模块 → 表管理模块 → 存储引擎接口；旁路有日志记录模块、网络交互（网络监听/交互协议处理）、核心 API（内存管理、小 IO、数字及字符串）；底层 Storage Engines（MyISAM、InnoDB、NDB、Falcon、Memory、Archive、Merge、Federated、User defined）。',
  '20251104175532': '【图解：垂直分区】一张含 列1~列7 的表，按列拆分为两张表：〔列1~列4〕与〔列1、列6、列7〕——按数据表的相关性把列拆到不同表/库。',
  '20251104175547': '【图解：垂直分表】原表〔id, C1, C2, C3, Cn〕沿列拆分为〔id, C1〕与〔id, C2, C3, Cn〕——主键与部分常用列放一张表，其余列放另一张表。',
  '20251104175752': '【图解：水平分区】一张〔列1~列7〕的表，向下拆分为两张结构完全相同的表〔列1~列7〕——表结构不变，按行分片存储。',
  '20251104175927': '【图解：水平分表】一张大表沿行方向被切分为 1、2、3 多段，每段成为独立的数据表——降低查询时读取的数据与索引页数。',
  '20251104181426': '【图解：跨分片排序分页】Data Node1（ID 1-10000）与 Data Node2（ID 10001-20000）各自执行 select …order by date desc limit 0,10，各取出前 10 条；然后合并、再执行一次相同的排序截取，返回最终结果集。',
  '20251104181800': '【图解：MySQL 主从复制原理】Master 侧：数据变更（Data changes）写入 Binary log；Slave 侧：I/O thread 读取（Read）Master 的 Binary log 并写入（Write）本地 Relay log；SQL thread 读取（Read）Relay log 并重放（Replay），使从库数据与主库保持一致。',
};
const replaceImages = (text) => String(text).replace(/!\[\[([^\]]+)\]\]/g, (_m, name) => {
  const m = String(name).match(/(\d{14})/);
  const key = m ? m[1] : null;
  return (key && imgText[key]) ?? '';
});

// ========== 按行切片 ==========
const raw = readFileSync(VAULT_SQL, 'utf8').replace(/\r\n/g, '\n').split('\n');
const slice = (a, b) => raw.slice(a - 1, b).join('\n').trim();

function clean(text) {
  let c = String(text);
  c = replaceImages(c); // 先替换图片（避免 wikilink 替换破坏 ![[...]]）
  c = c.replace(/^#+\s*/gm, (m, off) => (off === 0 ? '' : '## ')); // 首个/行首 # 标题降级为普通段落标题
  c = c.replace(/\[\[([^\]|]*)\|?([^\]]*)\]\]/g, (_m, target, label) => label || target.replace(/^.*\//, ''));
  c = replaceImages(c);
  c = c.replace(/\u200b/g, '').replace(/[\u00a0 ]+/g, ' ');
  c = c.replace(/\n{3,}/g, '\n\n').trim();
  return c;
}

// ========== 目标章节 ==========
const langTree = findTreeByRef(tree, 'k_wiki_en_outline_of_databases_s5'); // 五、数据库操作/数据库语言
if (!langTree) throw new Error('数据库语言 node not found');
const langParentId = langTree.parentInfo?.id ?? null;


const targets = {
  lang: langTree,
  op: findTreeByRef(tree, 'k_wiki_zh_数据库_s8_s12') ?? findByName2('五、数据库操作'),
  query: findByName2('六、查询系统'),
  ops: findByName2('十七、数据库运维'),
  restore: findByName2('八、恢复系统'),
  repl: findByName2('十四、数据库分布与复制'),
};
function findByName2(name) { let hit = null; (function walk(n) { if (n.name === name) { hit = n; return; } for (const c of n.children ?? []) walk(c); })(tree); if (!hit) throw new Error('target missing: ' + name); return hit; }

// ========== 创建节点 ==========
const created = [];
const usedIds = new Set(Object.keys(pool));
function makeNode(id, name, content, parentTree, tags = ['SQL', 'MySQL', '数据库']) {
  if (pool[id]) throw new Error(`id exists: ${id}`);
  pool[id] = { id, label: name, role: 'reference', dimensions: ['database'], tags: [...new Set(tags)], card: { nodeId: id, title: name, tabs: [{ id: 'def', label: '定义', content }] } };
  parentTree.children ??= [];
  parentTree.children.push({ id: 'tree_' + id.slice(2), name, count: 0, nodeRef: id, children: [] });
  // 父容器若无池条目（纯目录节点），按 App 约定不建 treebind
  if (parentTree.nodeRef && pool[parentTree.nodeRef]) {
    upsertEdge({ id: `treebind:${parentTree.id}:tree_${id.slice(2)}`, source: parentTree.nodeRef, target: id, type: 'belongs-to', label: 'contains', relationKind: 'structure', dimensions: ['database'] });
  }
  created.push(name);
}

// --- 数据库语言 下：SQL 语言知识 ---
makeNode('k_sql_statement_types', 'SQL 语句分类（DDL/DQL/DML/DCL）', clean(slice(1, 11)), targets.lang, ['SQL', '数据库语言']);
makeNode('k_sql_keys', 'SQL 键辨析：超键、候选键、主键、外键', clean(slice(12, 17)), targets.lang, ['SQL', '键']);
makeNode('k_sql_constraints', 'SQL 约束（NOT NULL/UNIQUE/PRIMARY KEY/FOREIGN KEY/CHECK）', clean(slice(18, 23)), targets.lang, ['SQL', '约束']);
makeNode('k_sql_joins', 'SQL 关联查询（六种 JOIN）', clean(slice(24, 46)), targets.lang, ['SQL', 'JOIN', '关联查询']);
makeNode('k_sql_subquery_in_exists', 'SQL 子查询与 in/exists', clean(slice(47, 59)), targets.lang, ['SQL', '子查询']);
makeNode('k_sql_datatypes', 'SQL 数据类型辨析（varchar/char/int/FLOAT/DOUBLE）', clean(slice(60, 70)) + '\n\n' + clean(slice(157, 172)), targets.lang, ['SQL', '数据类型']);
makeNode('k_sql_limit', 'LIMIT 分页', clean(slice(71, 156)) + '\n\n## LIMIT 语法（补充）\n\n' + clean(slice(234, 239)), targets.lang, ['SQL', 'LIMIT', '分页']);

// --- 五、数据库操作 下：操作对比 ---
makeNode('k_sql_drop_delete_truncate', 'DROP、DELETE 与 TRUNCATE 的区别', clean(slice(173, 174)), targets.op, ['SQL', 'DDL', 'DML']);

// --- 六、查询系统 下：SQL 优化 ---
makeNode('k_sql_explain', 'SQL 执行计划（EXPLAIN）', clean(slice(178, 208)), targets.query, ['SQL', '执行计划', 'EXPLAIN', '优化']);
makeNode('k_sql_lifecycle', 'SQL 生命周期', clean(slice(209, 216)), targets.query, ['SQL', '生命周期']);
makeNode('k_sql_slow_query', '慢查询日志与优化实践', clean(slice(240, 254)), targets.query, ['SQL', '慢查询', '优化']);
makeNode('k_sql_optimization', 'SQL 优化方法', [clean(slice(260, 288)), clean(slice(292, 293)), clean(slice(294, 316))].join('\n\n'), targets.query, ['SQL', '优化']);
makeNode('k_sql_huge_offset', '超大分页与 LIMIT 优化', clean(slice(224, 233)) + '\n\n' + clean(slice(289, 291)), targets.query, ['SQL', '分页', '优化']);

// --- 十七、数据库运维 下：运维调优 ---
makeNode('k_sql_bigtable_query', '大表数据查询优化', clean(slice(217, 223)), targets.ops, ['MySQL', '大表', '优化']);
makeNode('k_sql_db_structure_opt', '数据库结构优化', clean(slice(317, 330)), targets.ops, ['MySQL', '结构优化']);
makeNode('k_sql_cpu_spike', 'MySQL CPU 飙升处理', clean(slice(331, 335)), targets.ops, ['MySQL', 'CPU', '运维']);
makeNode('k_sql_bigtable_sharding', '大表优化与分库分表', clean(slice(336, 392)), targets.ops, ['MySQL', '分库分表', 'Sharding']);

// --- 八、恢复系统 下：备份与修复 ---
makeNode('k_sql_backup_tools', 'MySQL 备份计划与备份工具原理（mysqldump/xtrabackup）', clean(slice(427, 441)), targets.restore, ['MySQL', '备份', 'mysqldump', 'xtrabackup']);
makeNode('k_sql_table_repair', 'MySQL 数据表损坏的修复方式', clean(slice(442, 448)), targets.restore, ['MySQL', '修复', 'myisamchk']);

// --- 十四、数据库分布与复制 下：复制与 binlog ---
makeNode('k_sql_replication', 'MySQL 主从复制原理与读写分离', clean(slice(393, 426)), targets.repl, ['MySQL', '主从复制', '读写分离']);
makeNode('k_sql_binlog_modes', 'MySQL binlog 三种模式', clean(slice(449, 453)), targets.repl, ['MySQL', 'binlog']);

// ========== 填充 数据库语言 下的 0 字语言存根 ==========
const defs = {
  'k_wiki_en_outline_of_databases_s5_b1': '数据定义语言（DDL，Data Definition Language）：CREATE、DROP、ALTER 等操作，即对逻辑结构有操作的语句，包括表结构、视图和索引。',
  'k_wiki_en_outline_of_databases_s5_b2': '数据操纵语言（DML，Data Manipulation Language）：INSERT、UPDATE、DELETE，主要对数据进行操作，与查询操作 DQL 共同构成常用的增删改查。',
  'k_wiki_en_outline_of_databases_s5_b3': '数据查询语言（DQL，Data Query Language）：SELECT 关键字，即查询操作，各种简单查询、连接查询等都属于 DQL。',
};
for (const [ref, def] of Object.entries(defs)) {
  const n = pool[ref];
  if (n && (n.card?.tabs ?? []).every((t) => !(String(t.content ?? '').trim()))) {
    n.card.tabs[0].content = def;
  }
}

// ========== 校验 ==========
const preexisting = new Set();
const preEdges = JSON.parse(readFileSync(join(backupDir, 'knowledge-edges.json'), 'utf8'));
for (const e of preEdges) for (const end of ['source', 'target']) if (!pool[e[end]]) preexisting.add(e[end]);
const problems = [];
(function walk(n) { if (n.nodeRef && !pool[n.nodeRef]) problems.push(n.id + '->' + n.nodeRef); for (const c of n.children ?? []) walk(c); })(tree);
for (const e of edges) { if (!pool[e.source] && !preexisting.has(e.source)) problems.push('edge src ' + e.id); if (!pool[e.target] && !preexisting.has(e.target)) problems.push('edge tgt ' + e.id); }
for (const name of created) {
  const node = Object.values(pool).find((p) => p.label === name);
  if (!node) problems.push('missing node: ' + name);
  else {
    const c = String(node.card.tabs[0].content);
    if (!c.trim()) problems.push('empty content: ' + name);
    if (/!\[\[|Pasted image/.test(c)) problems.push('raw image in ' + name);
  }
}
if (problems.length) { problems.slice(0, 20).forEach((p) => console.error('PROBLEM:', p)); throw new Error('integrity failed: ' + problems.length); }

const atomicWrite = (file, obj) => { const tmp = join(DATA, `${file}.tmp-${process.pid}`); writeFileSync(tmp, JSON.stringify(obj, null, 2), 'utf8'); renameSync(tmp, join(DATA, file)); };
atomicWrite('node-pool.json', pool);
atomicWrite('tree-data.json', tree);
atomicWrite('knowledge-edges.json', edges);

console.log(`import-sql-notes complete: created ${created.length} nodes
  - 数据库语言: 7（语句分类/键辨析/约束/关联查询/子查询与in-exists/数据类型辨析/LIMIT）
  - 五、数据库操作: DROP DELETE TRUNCATE 区别
  - 六、查询系统: EXPLAIN/SQL生命周期/慢查询/SQL优化方法/超大分页
  - 十七、数据库运维: 大表查询/结构优化/CPU飙升/分库分表
  - 八、恢复系统: 备份工具原理/表损坏修复
  - 十四、数据库分布与复制: 主从复制/binlog三模式
  - 图片: 10 张全部转写`);
