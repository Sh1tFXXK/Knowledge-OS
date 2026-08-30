// 导入 Obsidian「数据库 / 软件工程 / 架构」三文件夹（2026-08-29，按原则分域）
// 原则（延续本会话确认的口径）：
//   - 问答式面试笔记 → 问题卡（问题库），关联到对应知识节点，不进目录树
//   - 知识型笔记（设计模式/架构专题/MySQL 产品知识）→ 目录树知识节点
//   - 图片 → 全部人工转写为「【图解：…】」文字（.tmp-db2-images/transcriptions.jsonl，61 张）
//   - MySQL 词汇表×3 → 跳过（其内容已作为 k_dict_* MySQL 词条存在于系统）
//   - SQL.md → 已于上轮导入，跳过
import { readFileSync, writeFileSync, renameSync, mkdirSync, copyFileSync, existsSync, readdirSync } from 'fs';
import { join } from 'path';

const V = 'C:/Users/Administrator/Documents/Obsidian Vault';
const DATA = 'data';
const ts = new Date().toISOString().replace(/[:.]/g, '-');
const backupDir = join(DATA, 'backups', `import-db-sw-arch-${ts}`);
mkdirSync(backupDir, { recursive: true });
for (const f of ['node-pool.json', 'tree-data.json', 'knowledge-edges.json', 'questions.json']) copyFileSync(join(DATA, f), join(backupDir, f));
console.log('backup ->', backupDir);

const pool = JSON.parse(readFileSync(join(DATA, 'node-pool.json'), 'utf8'));
const tree = JSON.parse(readFileSync(join(DATA, 'tree-data.json'), 'utf8'));
let edges = JSON.parse(readFileSync(join(DATA, 'knowledge-edges.json'), 'utf8'));
const questions = JSON.parse(readFileSync(join(DATA, 'questions.json'), 'utf8'));

function findTreeByRef(node, ref) { if (node.nodeRef === ref) return node; for (const c of node.children ?? []) { const f = findTreeByRef(c, ref); if (f) return f; } return null; }
function findTreeByName(node, name) { if (node.name === name) return node; for (const c of node.children ?? []) { const f = findTreeByName(c, name); if (f) return f; } return null; }
const upsertEdge = (edge) => { const i = edges.findIndex((e) => e.id === edge.id); if (i >= 0) edges[i] = edge; else edges.push(edge); };

// ========== 图片转写 ==========
const imgText = {};
for (const line of readFileSync('.tmp-db2-images/transcriptions.jsonl', 'utf8').trim().split('\n')) {
  try { const o = JSON.parse(line); imgText[o.key] = o.text; } catch { console.warn('bad jsonl line skipped'); }
}
const replaceImages = (text) => String(text).replace(/!\[\[([^\]]+)\]\]/g, (_m, name) => {
  const dm = String(name).match(/(\d{14})/);
  return (dm && imgText[dm[1]]) ?? `（图片：${name}）`;
});


// 文件定位：先按相对路径直取，失败则按文件名在 vault 内递归搜索
function vaultFile(rel) {
  const direct = join(V, rel);
  if (existsSync(direct)) return direct;
  const base = rel.split('/').pop();
  let hit = null;
  (function walk(dir) {
    if (hit) return;
    for (const e of readdirSync(dir, { withFileTypes: true })) {
      const p = join(dir, e.name);
      if (e.isDirectory()) { if (!p.includes('.tmp')) walk(p); }
      else if (e.name === base && p.endsWith('.md')) { hit = p; return; }
    }
  })(V);
  if (!hit) throw new Error(`vault file not found: ${rel}`);
  return hit;
}

const clean = (text) => {
  let c = replaceImages(text);
  c = c.replace(/\[\[([^\]|]*)\|?([^\]]*)\]\]/g, (_m, target, label) => label || target.replace(/^.*\//, ''));
  c = c.replace(/\u200b/g, '');
  c = c.replace(/\n{3,}/g, '\n\n').trim();
  return c;
};
// 去掉首个 H1（节点名已承载标题）
const cleanNoH1 = (text) => clean(text).replace(/^# [^\n]*\n+/, '');

// ========== 节点/问题卡创建 ==========
const created = [];
let qSeq = 0;
function node(id, name, file, parentTree, tags, dimensions = ['database']) {
  if (pool[id]) throw new Error(`id exists: ${id}`);
  const content = file ? cleanNoH1(readFileSync(vaultFile(file), 'utf8')) : '';
  pool[id] = { id, label: name, role: 'reference', dimensions, tags: [...new Set([name, ...tags])], card: { nodeId: id, title: name, tabs: [{ id: 'def', label: '定义', content }] } };
  parentTree.children ??= [];
  parentTree.children.push({ id: 'tree_' + id.slice(2), name, count: 0, nodeRef: id, children: [] });
  if (parentTree.nodeRef && pool[parentTree.nodeRef]) {
    upsertEdge({ id: `treebind:${parentTree.id}:tree_${id.slice(2)}`, source: parentTree.nodeRef, target: id, type: 'belongs-to', label: 'contains', relationKind: 'structure', dimensions });
  }
  created.push(id);
  return id;
}
function group(id, name, cardText, parentTree, tags, dimensions = ['database']) {
  if (pool[id]) throw new Error(`group exists: ${id}`);
  pool[id] = { id, label: name, role: 'group', dimensions, tags: [...new Set([name, ...tags])], card: { nodeId: id, title: name, tabs: [{ id: 'def', label: '定义', content: cardText }] } };
  parentTree.children ??= [];
  parentTree.children.push({ id: 'tree_' + id.slice(2), name, count: 0, nodeRef: id, children: [] });
  if (parentTree.nodeRef && pool[parentTree.nodeRef]) {
    upsertEdge({ id: `treebind:${parentTree.id}:tree_${id.slice(2)}`, source: parentTree.nodeRef, target: id, type: 'belongs-to', label: 'contains', relationKind: 'structure', dimensions });
  }
  created.push(id);
  return findTreeByRef(tree, id);
}
function qaCards(file, relatedRef, tag) {
  const raw = readFileSync(vaultFile(file), 'utf8').replace(/\r\n/g, '\n');
  const sections = [];
  let cur = null;
  for (const line of raw.split('\n')) {
    if (/^#/.test(line)) { cur = { question: line.replace(/^#+\s*/, '').trim(), body: [] }; sections.push(cur); }
    else if (cur) cur.body.push(line);
  }
  const now = Date.now();
  let n = 0;
  for (const s of sections) {
    const answer = replaceImages(s.body.join('\n')).replace(/\u200b/g, '').replace(/\n{3,}/g, '\n\n').trim();
    const question = s.question.replace(/\[\[([^\]|]*)\|?([^\]]*)\]\]/g, (_m, t, l) => l || t);
    if (!question || !answer) continue;
    qSeq += 1;
    const id = `q_dbnotes_${tag}_${qSeq}`;
    if (questions.some((q) => q.id === id)) continue;
    questions.push({ id, text: question, answered: true, relatedNodeId: relatedRef, answer, createdAt: now, updatedAt: now });
    n++;
  }
  return n;
}

// ========== A. 软件工程 → 软件开发（实践总览）/软件工程 ==========
const swRef = 'k_1783260209305_4t111y' === 'x' ? null : null;
const swTree = findTreeByName(tree, '软件开发（实践总览）');
const swEngTree = findTreeByName(tree, '软件工程');
if (!swEngTree) throw new Error('软件工程 subtree not found');
// 软件工程 组卡追加知识地图 Tab
const swEngNode = pool[swEngTree.nodeRef];
swEngNode.card.tabs.push({ id: 'notes-map', label: '知识地图（笔记）', content: cleanNoH1(readFileSync(join(V, '软件工程/软件工程.md'), 'utf8')) });

const dmGroup = group('k_vault_se_design_patterns', '设计模式（笔记）', cleanNoH1(readFileSync(join(V, '软件工程/设计模式/设计模式.md'), 'utf8')), swEngTree, ['软件工程', '设计模式']);
const creGroup = group('k_vault_se_patterns_creational', '创建型模式（笔记）', cleanNoH1(readFileSync(join(V, '软件工程/设计模式/创建者模式/创建型模式.md'), 'utf8')), dmGroup, ['设计模式', '创建型']);
const strGroup = group('k_vault_se_patterns_structural', '结构型模式（笔记）', cleanNoH1(readFileSync(join(V, '软件工程/设计模式/结构型模式/结构型模式.md'), 'utf8')), dmGroup, ['设计模式', '结构型']);
const behGroup = group('k_vault_se_patterns_behavioral', '行为型模式（笔记）', cleanNoH1(readFileSync(join(V, '软件工程/设计模式/行为型模式/行为型模式.md'), 'utf8')), dmGroup, ['设计模式', '行为型']);
const P = '软件工程/设计模式/';
node('k_vault_se_pat_singleton', '单例模式（笔记）', P + '创建者模式/单例.md', creGroup, ['设计模式', '单例']);
node('k_vault_se_pat_prototype', '原型模式（笔记）', P + '创建者模式/原型.md', creGroup, ['设计模式', '原型']);
node('k_vault_se_pat_factory_method', '工厂方法模式（笔记）', P + '创建者模式/工厂方法.md', creGroup, ['设计模式', '工厂方法']);
node('k_vault_se_pat_builder', '建造者模式（笔记）', P + '创建者模式/建造者.md', creGroup, ['设计模式', '建造者']);
node('k_vault_se_pat_abstract_factory', '抽象工厂模式（笔记）', P + '创建者模式/抽象工厂.md', creGroup, ['设计模式', '抽象工厂']);
node('k_vault_se_pat_flyweight', '享元模式（笔记）', P + '结构型模式/享元.md', strGroup, ['设计模式', '享元']);
node('k_vault_se_pat_proxy', '代理模式（笔记）', P + '结构型模式/代理.md', strGroup, ['设计模式', '代理']);
node('k_vault_se_pat_facade', '外观模式（笔记）', P + '结构型模式/外观.md', strGroup, ['设计模式', '外观']);
node('k_vault_se_pat_bridge', '桥接模式（笔记）', P + '结构型模式/桥接.md', strGroup, ['设计模式', '桥接']);
node('k_vault_se_pat_composite', '组合模式（笔记）', P + '结构型模式/组合.md', strGroup, ['设计模式', '组合']);
node('k_vault_se_pat_decorator', '装饰器模式（笔记）', P + '结构型模式/装饰器.md', strGroup, ['设计模式', '装饰器']);
node('k_vault_se_pat_adapter', '适配器模式（笔记）', P + '结构型模式/适配器.md', strGroup, ['设计模式', '适配器']);
node('k_vault_se_pat_mediator', '中介者模式（笔记）', P + '行为型模式/中介.md', behGroup, ['设计模式', '中介者']);
node('k_vault_se_pat_command', '命令模式（笔记）', P + '行为型模式/命令.md', behGroup, ['设计模式', '命令']);
node('k_vault_se_pat_memento', '备忘录模式（笔记）', P + '行为型模式/备忘录.md', behGroup, ['设计模式', '备忘录']);
node('k_vault_se_pat_template_method', '模板方法模式（笔记）', P + '行为型模式/模板方法.md', behGroup, ['设计模式', '模板方法']);
node('k_vault_se_pat_state', '状态模式（笔记）', P + '行为型模式/状态.md', behGroup, ['设计模式', '状态']);
node('k_vault_se_pat_strategy', '策略模式（笔记）', P + '行为型模式/策略.md', behGroup, ['设计模式', '策略']);
node('k_vault_se_pat_observer', '观察者模式（笔记）', P + '行为型模式/观察者.md', behGroup, ['设计模式', '观察者']);
node('k_vault_se_pat_interpreter', '解释器模式（笔记）', P + '行为型模式/解释器.md', behGroup, ['设计模式', '解释器']);
node('k_vault_se_pat_visitor', '访问者模式（笔记）', P + '行为型模式/访问者.md', behGroup, ['设计模式', '访问者']);
node('k_vault_se_pat_chain', '责任链模式（笔记）', P + '行为型模式/责任链.md', behGroup, ['设计模式', '责任链']);
node('k_vault_se_pat_iterator', '迭代器模式（笔记）', P + '行为型模式/迭代器.md', behGroup, ['设计模式', '迭代器']);
const ooGroup = group('k_vault_se_oo', '面向对象（笔记）', cleanNoH1(readFileSync(join(V, '软件工程/面向对象/面向对象.md'), 'utf8')), swEngTree, ['软件工程', '面向对象']);
node('k_vault_se_oo_basic', '面向对象基本思想（笔记）', '软件工程/面向对象/基本思想.md', ooGroup, ['面向对象']);
node('k_vault_se_dry', 'DRY 原则（笔记）', '软件工程/DRY.md', swEngTree, ['软件工程', 'DRY']);
node('k_vault_se_auth', '身份认证（笔记）', '软件工程/身份认证.md', swEngTree, ['软件工程', '认证']);

// ========== B. 架构 → 系统组织/分布式系统/架构设计（笔记） ==========
const distTree = findTreeByRef(tree, 'k_acm2012_software_organization_distributed_systems') ?? findTreeByName(tree, '分布式系统');
if (!distTree) throw new Error('分布式系统 not found');
const archGroup = group('k_vault_arch_design', '架构设计（笔记）', cleanNoH1(readFileSync(join(V, '架构/架构.md'), 'utf8')), distTree, ['架构', '分布式'], ['architecture']);
const hcGroup = group('k_vault_arch_hc', '高并发架构（笔记）', cleanNoH1(readFileSync(join(V, '架构/高并发架构/高并发架构.md'), 'utf8')), archGroup, ['架构', '高并发']);
const HC = '架构/高并发架构/';
node('k_vault_arch_hc_design', '高并发架构设计（笔记）', '架构/高并发架构/高并发架构设计.md', hcGroup, ['架构', '高并发']);
node('k_vault_arch_cqrs', 'CQRS（笔记）', HC + 'CQRS.md', hcGroup, ['架构', 'CQRS']);
node('k_vault_arch_lvs', 'LVS（笔记）', HC + 'LVS.md', hcGroup, ['架构', 'LVS']);
node('k_vault_arch_replica_lag', '主从延迟与解决方案（笔记）', HC + '主从延迟与解决方案.md', hcGroup, ['架构', '主从复制']);
node('k_vault_arch_other_sharding', '其他数据分片形式（笔记）', HC + '其他数据分片形式.md', hcGroup, ['架构', '分片']);
node('k_vault_arch_write_agg', '写聚合（笔记）', HC + '写聚合.md', hcGroup, ['架构', '写聚合']);
node('k_vault_arch_db_table_split', '分库和分表（笔记）', HC + '分库和分表.md', hcGroup, ['架构', '分库分表']);
node('k_vault_arch_vertical_split', '垂直拆分（笔记）', HC + '垂直拆分.md', hcGroup, ['架构', '垂直拆分']);
node('k_vault_arch_cache_eviction', '基本的缓存淘汰策略（笔记）', HC + '基本的缓存淘汰策略.md', hcGroup, ['架构', '缓存']);
node('k_vault_arch_async_write', '异步写（笔记）', HC + '异步写.md', hcGroup, ['架构', '异步写']);
node('k_vault_arch_scale_up', '扩容方案（笔记）', HC + '扩容方案.md', hcGroup, ['架构', '扩容']);
node('k_vault_arch_horizontal_split', '水平拆分（笔记）', HC + '水平拆分.md', hcGroup, ['架构', '水平拆分']);
node('k_vault_arch_mass_storage', '海量数据存储策略（笔记）', HC + '海量数据存储策略.md', hcGroup, ['架构', '海量存储']);
node('k_vault_arch_cache_breakdown', '缓存击穿（笔记）', HC + '缓存击穿.md', hcGroup, ['架构', '缓存']);
node('k_vault_arch_cache_update', '缓存更新（笔记）', HC + '缓存更新.md', hcGroup, ['架构', '缓存']);
node('k_vault_arch_cache_penetration', '缓存穿透（笔记）', HC + '缓存穿透.md', hcGroup, ['架构', '缓存']);
node('k_vault_arch_cache_avalanche', '缓存雪崩（笔记）', HC + '缓存雪崩.md', hcGroup, ['架构', '缓存']);
node('k_vault_arch_rw_split', '读，写分离架构（笔记）', HC + '读，写分离架构.md', hcGroup, ['架构', '读写分离']);
const govGroup = group('k_vault_arch_governance', '服务可用性治理（笔记）', cleanNoH1(readFileSync(join(V, '架构/通用的服务可用性治理手段/通用的服务可用性治理手段.md'), 'utf8')), archGroup, ['架构', '可用性']);
node('k_vault_arch_micro_net', '微服务架构与网络调用（笔记）', '架构/通用的服务可用性治理手段/微服务架构与网络调用.md', govGroup, ['微服务', '网络调用']);
node('k_vault_arch_circuit_breaker', '熔断与隔离（笔记）', '架构/通用的服务可用性治理手段/熔断与隔离.md', govGroup, ['熔断', '隔离']);
node('k_vault_arch_retry', '重试（笔记）', '架构/通用的服务可用性治理手段/重试.md', govGroup, ['重试']);
const idGroup = group('k_vault_arch_id_gen', '唯一ID生成器（笔记）', cleanNoH1(readFileSync(join(V, '架构/唯一ID生成器/唯一ID生成器.md'), 'utf8')), archGroup, ['分布式ID']);
node('k_vault_arch_id_leaf', 'Leaf（笔记）', '架构/唯一ID生成器/Leaf.md', idGroup, ['Leaf', '分布式ID']);
node('k_vault_arch_id_snowflake', 'Snowflake（笔记）', '架构/唯一ID生成器/Snowflake.md', idGroup, ['Snowflake', '分布式ID']);
node('k_vault_arch_id_distributed', '分布式 ID（笔记）', '架构/唯一ID生成器/分布式ID.md', idGroup, ['分布式ID']);
node('k_vault_arch_id_bloom', '布隆过滤器（笔记）', '架构/唯一ID生成器/布隆过滤器.md', idGroup, ['布隆过滤器']);
const storGroup = group('k_vault_arch_storage', '存储层技术（笔记）', cleanNoH1(readFileSync(join(V, '架构/存储层技术/存储层技术.md'), 'utf8')), archGroup, ['存储层']);
node('k_vault_arch_storage_master', '主从模式（笔记）', '架构/存储层技术/主从模式.md', storGroup, ['主从模式']);
node('k_vault_arch_storage_ha', '高可用架构（笔记）', '架构/存储层技术/高可用架构.md', storGroup, ['高可用']);
node('k_vault_arch_user_login', '用户登录服务（笔记）', '架构/用户登录服务/用户登录服务.md', archGroup, ['用户登录']);
node('k_vault_arch_service_discovery', '服务发现（笔记）', '架构/服务发现.md', archGroup, ['服务发现']);
node('k_vault_arch_rw_route', '读，写请求路由方式（笔记）', '架构/读，写请求路由方式.md', archGroup, ['读写分离', '路由']);
node('k_vault_arch_rw_split_arch', '读&写分离架构（笔记）', '架构/读&写分离架构.md', archGroup, ['读写分离']);

// ========== C. 数据库笔记 → 问题卡 + MySQL 知识节点 ==========
const ch11 = findTreeByName(tree, '十一、索引结构');
const idxRef = (findTreeByName(ch11, '索引 / index') ?? { nodeRef: null }).nodeRef;
const lockRef = (findTreeByName(findTreeByName(tree, '七、事务系统'), '锁机制 / locking mechanism') ?? { nodeRef: null }).nodeRef;
const txRef = (findTreeByName(findTreeByName(tree, '七、事务系统'), '事务 / transaction') ?? { nodeRef: null }).nodeRef;
const qpRef = (findTreeByName(findTreeByName(tree, '六、查询系统'), '查询处理 / query processing') ?? { nodeRef: null }).nodeRef;
const dbRef = (findTreeByName(findTreeByName(tree, '一、数据库系统'), '数据库 / database') ?? { nodeRef: null }).nodeRef;
const distTxRef = 'k_vault_java02_yikc89';

let qaTotal = 0;
qaTotal += qaCards('数据库/索引.md', idxRef ?? 'k_sql_x_index', 'index');
qaTotal += qaCards('数据库/锁.md', lockRef ?? 'k_sql_x_lock', 'lock');
qaTotal += qaCards('数据库/事务.md', txRef ?? 'k_sql_x_tx', 'tx');
qaTotal += qaCards('数据库/查询优化与性能.md', qpRef ?? 'k_sql_x_qp', 'qp');
qaTotal += qaCards('数据库/基础概念.md', dbRef ?? 'k_sql_x_db', 'basic');
qaTotal += qaCards('数据库/分布式事务.md', distTxRef, 'disttx');

// MySQL 产品知识 → 十九、数据库产品/MySQL
const mysqlProd = findTreeByName(tree, 'MySQL');
if (!mysqlProd) throw newError('MySQL product node not found');
function throwErr(m) { throw new Error(m); }
node('k_vault_mysql_basics', 'MySQL 基础知识（笔记）', '数据库/Mysql/mysql基础知识.md', mysqlProd, ['MySQL', '基础']);
node('k_vault_mysql_engines', 'MySQL 存储引擎（笔记）', '数据库/Mysql/存储引擎.md', mysqlProd, ['MySQL', '存储引擎']);
node('k_vault_mysql_datatypes', 'MySQL 数据类型（笔记）', '数据库/Mysql/数据类型.md', mysqlProd, ['MySQL', '数据类型']);
const innoDBGroup = group('k_vault_mysql_innodb', 'InnoDB（笔记）', 'InnoDB 存储引擎的进阶笔记：BufferPool、Page 结构与管理、行锁实现、概念字典。', mysqlProd, ['MySQL', 'InnoDB']);
node('k_vault_mysql_innodb_bufferpool', '什么是 BufferPool（笔记）', '数据库/Mysql/innodb/什么是BufferPool？.md', innoDBGroup, ['InnoDB', 'BufferPool']);
node('k_vault_mysql_innodb_page_mgmt', 'InnoDB 如何管理 Page 页（笔记）', '数据库/Mysql/innodb/InnoDB如何管理Page⻚？.md', innoDBGroup, ['InnoDB', 'Page']);
node('k_vault_mysql_innodb_page_struct', '介绍一下 Page 页的结构（笔记）', '数据库/Mysql/innodb/介绍⼀下Page⻚的结构？.md', innoDBGroup, ['InnoDB', 'Page']);
node('k_vault_mysql_innodb_rowlock', 'InnoDB 的行锁是怎么实现的（笔记）', '数据库/Mysql/innodb/InnoDB的⾏锁是怎么实现 的？.md', innoDBGroup, ['InnoDB', '行锁']);
node('k_vault_mysql_innodb_dict', '概念字典-InnoDB（笔记）', '数据库/Mysql/innodb/概念字典-InnoDB.md', innoDBGroup, ['InnoDB', '概念字典']);
node('k_vault_mysql_innodb_dict_mech', '概念字典-InnoDB-机制（笔记）', '数据库/Mysql/innodb/概念字典-InnoDB-机制.md', innoDBGroup, ['InnoDB', '概念字典']);

// NoSQL 笔记 → 二、数据模型/NoSQL 下
const nosqlTree = findTreeByRef(tree, 'n_21yoee5g');
if (!nosqlTree) throw new Error('NoSQL node not found');
node('k_vault_nosql_overview', 'NoSQL 数据库（笔记）', '数据库/NoSQL数据库.md', nosqlTree, ['NoSQL']);
node('k_vault_redis_notes', 'Redis（笔记）', '数据库/Redis/Redis.md', nosqlTree, ['Redis', 'NoSQL']);
node('k_vault_redis_datatypes', 'Redis 数据类型（笔记）', '数据库/Redis/Redis数据类型.md', nosqlTree, ['Redis', '数据类型']);
node('k_vault_mongo_notes', 'MongoDB（笔记）', '数据库/Mongo/Mongo.md', nosqlTree, ['MongoDB', 'NoSQL']);

// 分布式事务笔记 → 分布式事务子节点（同主题融合）
node('k_vault_dist_tx_notes', '分布式事务（笔记）', '数据库/分布式事务.md', findTreeByRef(tree, distTxRef), ['分布式事务']);

// ========== 校验 ==========
const preexisting = new Set();
const preEdges = JSON.parse(readFileSync(join(backupDir, 'knowledge-edges.json'), 'utf8'));
for (const e of preEdges) for (const end of ['source', 'target']) if (!pool[e[end]]) preexisting.add(e[end]);
const problems = [];
(function walk(n) { if (n.nodeRef && !pool[n.nodeRef]) problems.push(n.id + '->' + n.nodeRef); for (const c of n.children ?? []) walk(c); })(tree);
for (const e of edges) { if (!pool[e.source] && !preexisting.has(e.source)) problems.push('edge src ' + e.id); if (!pool[e.target] && !preexisting.has(e.target)) problems.push('edge tgt ' + e.id); }
for (const q of questions) if (q.relatedNodeId && !pool[q.relatedNodeId]) problems.push(`q ${q.id} -> ${q.relatedNodeId}`);
for (const id of created) if (!findTreeByRef(tree, id)) problems.push('created not in tree: ' + id + ' (' + (pool[id]?.label ?? '') + ')');
for (const id of created) for (const t of (pool[id].card?.tabs ?? [])) if (/!\[\[|Pasted image|cdn-mineru/.test(String(t.content))) problems.push('raw image in ' + id);
if (problems.length) { problems.slice(0, 25).forEach((p) => console.error('PROBLEM:', p)); throw new Error(`integrity failed: ${problems.length}`); }

const atomicWrite = (file, obj) => { const tmp = join(DATA, `${file}.tmp-${process.pid}`); writeFileSync(tmp, JSON.stringify(obj, null, 2), 'utf8'); renameSync(tmp, join(DATA, file)); };
atomicWrite('node-pool.json', pool);
atomicWrite('tree-data.json', tree);
atomicWrite('knowledge-edges.json', edges);
atomicWrite('questions.json', questions);

console.log(`import-db-sw-arch complete:
  - 新建节点: ${created.length}
  - 软件工程: 设计模式等 ${created.filter((id) => pool[id].tags?.includes('软件工程')).length} 节点 → 软件开发（实践总览）/软件工程
  - 架构: ${created.filter((id) => pool[id].tags?.includes('架构')).length} 节点 → 分布式系统/架构设计（笔记）
  - 数据库笔记: 问答问题卡 ${qaTotal} 张 + MySQL 知识节点
  - 跳过: SQL.md（已导入）、MySQL 词汇表×3（已存在词条）、MySQL.md（纯导航）`);
