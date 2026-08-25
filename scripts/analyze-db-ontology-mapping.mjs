#!/usr/bin/env node
/**
 * Analyze the 921 database branch nodes and map them to the new 21-section ontology structure.
 * Output: a JSON mapping report + console summary.
 */
import fs from 'fs';

const TREE_PATH = 'data/tree-data.json';
const POOL_PATH = 'data/node-pool.json';
const OUTPUT_PATH = 'data/ontology-mapping-report.json';

const tree = JSON.parse(fs.readFileSync(TREE_PATH, 'utf8'));
const pool = JSON.parse(fs.readFileSync(POOL_PATH, 'utf8'));

// ── Find the 数据库 branch ──
function findBranch(node, targetName) {
  const name = node.name || node.id || '';
  if (name === targetName) return node;
  if (node.children) {
    for (const child of node.children) {
      const found = findBranch(child, targetName);
      if (found) return found;
    }
  }
  return null;
}

// ── Collect all nodes recursively ──
function collectNodes(node, path = '', results = []) {
  const name = node.name || node.id || '';
  const currentPath = path ? path + ' > ' + name : name;
  const nodeRef = node.nodeRef || '';
  const hasContent = nodeRef && pool[nodeRef] && pool[nodeRef].card?.tabs?.[0]?.content;
  const content = hasContent ? (pool[nodeRef].card.tabs[0].content || '').substring(0, 200) : '';

  results.push({
    id: node.id || '',
    name,
    nodeRef,
    path: currentPath,
    depth: currentPath.split(' > ').length,
    hasContent: !!hasContent,
    contentPreview: content,
    childCount: node.children ? node.children.length : 0,
    children: node.children ? node.children.map(c => c.name || c.id || '') : [],
    rawNode: node
  });

  if (node.children) {
    for (const child of node.children) {
      collectNodes(child, currentPath, results);
    }
  }
  return results;
}

const dbBranch = findBranch(tree, '数据库');
if (!dbBranch) {
  console.error('数据库 branch not found!');
  process.exit(1);
}

const allNodes = collectNodes(dbBranch);
console.log(`Total nodes under 数据库: ${allNodes.length}`);

// ── New ontology sections (21) ──
const ontologySections = {
  '一、数据库系统': ['数据库系统', '数据库管理系统', 'DBMS', '数据库服务器', '数据库实例', '数据库主机', '数据库客户端', 'server', 'instance', 'host', 'client'],
  '二、数据模型': ['数据模型', '层次模型', '网状模型', '关系模型', '对象模型', 'ER模型', '图模型', '键值模型', '文档模型', '维度模型', '平面文件', '数据库类型', '关系数据库', 'NoSQL', '对象数据库', '键值数据库', 'MongoDB', 'PostgreSQL', 'Redis'],
  '三、数据库结构': ['模式', 'Schema', '表', '行', '列', '关系', '视图', '物化视图', '索引', '分区', '触发器', '游标', '数据字典', '光标'],
  '四、数据约束与标识': ['约束', '主键', '唯一键', '外键', 'NOT NULL', 'Superkey', '候选键', '代理键', '自然键', 'GUID', '空值', 'NULL', '自增', 'auto-increment', '合成键', 'synthetic key'],
  '五、数据库操作': ['CRUD', 'Create', 'Read', 'Update', 'Delete', '查询', '插入', '更新', '删除', 'SQL', 'DQL', 'DML', 'DDL', 'DCL', '预处理语句', 'prepared statement', '动态SQL'],
  '六、查询系统': ['查询处理', '查询解析', '查询优化', '查询执行', '查询优化器', '查询计划', '查询扩展', '盲查询扩展', '随机探查', 'random dive', '索引条件下推', 'ICP', '排序缓冲', 'sort buffer', '相关性', 'relevance', '词干提取', 'stemming', 'plan stability'],
  '七、事务系统': ['事务', 'ACID', 'Atomicity', 'Consistency', 'Isolation', 'Durability', '并发控制', '锁', '事务隔离', 'REPEATABLE READ', 'isolation', 'concurrency'],
  '八、恢复系统': ['数据库恢复', '恢复理论', '检查点', '模糊检查点', 'fuzzy checkpoint', '尖锐检查点', 'sharp checkpoint', 'PITR', '关闭', 'shutdown', 'fast shutdown', 'slow shutdown', 'clean shutdown', '可用性', 'availability'],
  '九、日志系统': ['日志', '事务日志', '重做日志', 'Redo Log', 'redo', '撤销日志', 'Undo Log', 'undo', '二进制日志', 'Binary Log', '查询日志', '通用查询日志', '慢查询日志', '日志记录', '日志段', '日志组', '日志传送', 'Log Shipping', '日志管理', '重做日志归档', 'redo log archiving', 'ib_logfile', 'ibbackup_logfile', 'Update Undo Log', 'Insert Undo Log'],
  '十、存储系统': ['持久化', '存储结构', '页', 'page', '页大小', 'page size', '表空间', 'tablespace', '回滚段', 'rollback segment', 'Undo日志段', 'undo log segment', '缓冲', '缓冲池', 'buffer pool', 'Change Buffer', 'Flush', 'flush', '自适应刷新', 'adaptive flushing', '双写', 'doublewrite', '数据压缩', 'compression', '透明压缩', 'transparent', '稀疏文件', 'sparse', '打孔', 'hole punching', 'KEY_BLOCK_SIZE', '基于磁盘', 'disk-based', '页清理器', 'page cleaner', '字典对象缓存', 'dictionary object cache', '撤销缓冲区', 'undo buffer', '变更缓冲', 'change buffering', '清理缓冲', 'purge', '删除缓冲', 'delete buffering', '溢出页', 'overflow page', '年轻页', 'young', 'torn page'],
  '十一、索引结构': ['B+树', '索引页', '特殊记录', 'infimum', 'supremum', '哨兵记录', 'sentinel record', '聚簇索引', 'clustered index'],
  '十二、数据表示': ['数据表示', '字符集', '字符集集合', 'Repertoire', 'repertoire', '数据类型', '字符编码', 'ANSI', '规范化', 'normalized', '反规范化', 'denormalized'],
  '十三、数据库设计': ['数据库设计', '数据建模', 'ER模型', '规范化', '函数依赖', '依赖理论', '数据库重构', '设计与建模', '维度建模', '星型', '实体关系模型'],
  '十四、数据库分布与复制': ['分布式数据库', '联邦数据库', '集中式数据库', '数据库复制', 'Replication', 'replication', '日志传送', '复制', '分区', 'cluster', 'Cluster', '主从', '哨兵模式', 'Redis Cluster', '分片'],
  '十五、备份与恢复': ['备份', '数据库备份', '物理备份', '逻辑备份', '在线备份', '恢复到时间点', 'mysqldump', 'mysqlbackup', 'MySQL Enterprise Backup', 'prepared backup', '备份与恢复'],
  '十六、数据库安全': ['数据库安全', '访问控制', '审计', '监控', '取证', 'DAM', '负面数据库', '安全', '账号', '认证', '权限', 'SSL'],
  '十七、数据库运维': ['数据库管理', '构建', '维护', '调整', '优化', '迁移', '故障排除', 'troubleshooting', '可用性', '仪器仪表', 'instrumentation', '校验和', 'checksum', '严格模式', 'strict mode', '间隙', 'gap', '在线', 'online'],
  '十八、数据库编程与接口': ['数据库编程', 'JDBC', 'ODBC', 'C API', 'c_api', 'ORM', '抽象层', 'libmysqlclient', 'libmysql', 'mysqlclient', 'native C API', 'libmysqld', '客户端库', 'client libraries', '数据库连接', '数据库应用程序', '数据库抽象层', '对象关系映射'],
  '十九、数据库产品': ['MySQL', 'PostgreSQL', 'Redis', 'MongoDB', 'MySQL Server', 'InnoDB', 'MyISAM', '存储引擎', 'MySQL Binary Log', 'InnoDB Redo Log', 'InnoDB Undo Log', 'InnoDB Buffer Pool', 'InnoDB Doublewrite', 'InnoDB Change Buffer', 'InnoDB Tablespace', 'ilist'],
  '二十、数据库文件与实现': ['数据库文件', '配置文件', '数据文件', '日志文件', '运行时文件', '文件格式', 'file format', 'my.cnf', 'my.ini', '选项文件', 'option file', '.frm', '.MYD', '.MYI', '.ibd', 'ibdata', 'ibdata1', 'ibtmp', '.ibz', '.cfg', '.OPT', 'db.opt', '.ARM', '.ARZ', '.MRG', '.par', 'PID', 'Socket', 'file-per-table', 'innodb_file_per_table', '数据目录', 'data directory'],
  '二十一、数据库知识元数据': ['数据库历史', '数据库术语', '数据库研究', '学者', '组织', '出版物', '应用', '技术初衷', '数据库技术的发展', '使用案例', '分类术语', '数据库概览', '数据库学者', '数据库相关组织', '数据库相关出版物', 'Edgar', 'Codd', 'Kimball', 'C. J.', 'Inmon', 'Peter Chen']
};

// ── Classify each node ──
function classifyNode(node) {
  const name = node.name || '';
  const nameLower = name.toLowerCase();
  const nodeRef = node.nodeRef || '';
  const path = node.path || '';

  // Skip the root 数据库 node
  if (name === '数据库' && node.depth === 1) return { section: 'ROOT', confidence: 'high' };

  // Try to match by keyword
  let bestSection = null;
  let bestScore = 0;

  for (const [section, keywords] of Object.entries(ontologySections)) {
    let score = 0;
    for (const kw of keywords) {
      const kwLower = kw.toLowerCase();
      if (nameLower === kwLower) score += 10;
      else if (nameLower.includes(kwLower) && kwLower.length > 2) score += 5;
      else if (kwLower.includes(nameLower) && nameLower.length > 2) score += 3;
    }
    // Also check path context
    if (path.includes(section.split('、')[1])) score += 2;

    if (score > bestScore) {
      bestScore = score;
      bestSection = section;
    }
  }

  // Determine confidence
  let confidence = 'low';
  if (bestScore >= 10) confidence = 'high';
  else if (bestScore >= 5) confidence = 'medium';

  return { section: bestSection || 'UNMAPPED', confidence, score: bestScore };
}

// ── Classify all nodes ──
const mapping = [];
for (const node of allNodes) {
  if (node.name === '数据库' && node.depth === 1) {
    mapping.push({ ...node, section: 'ROOT', confidence: 'high', score: 0 });
    continue;
  }
  const result = classifyNode(node);
  mapping.push({ ...node, ...result });
}

// ── Summary by section ──
const sectionSummary = {};
for (const m of mapping) {
  if (!sectionSummary[m.section]) sectionSummary[m.section] = { total: 0, withContent: 0, unmapped: 0 };
  sectionSummary[m.section].total++;
  if (m.hasContent) sectionSummary[m.section].withContent++;
}

// ── Count unmapped ──
const unmapped = mapping.filter(m => m.section === 'UNMAPPED');

console.log('\n=== Section Distribution ===');
for (const [section, stats] of Object.entries(sectionSummary).sort()) {
  console.log(`${section}: ${stats.total} nodes (${stats.withContent} with content)`);
}

console.log(`\n=== Unmapped: ${unmapped.length} nodes ===`);
for (const u of unmapped.slice(0, 30)) {
  console.log(`  ${u.path} | ref: ${u.nodeRef} | content: ${u.hasContent}`);
}
if (unmapped.length > 30) console.log(`  ... and ${unmapped.length - 30} more`);

// ── Wikipedia outline nodes (source-preserved) ──
const wikiNodes = mapping.filter(m => m.nodeRef && m.nodeRef.startsWith('k_wiki_'));
console.log(`\n=== Wikipedia source nodes: ${wikiNodes.length} ===`);

// ── MySQL glossary nodes ──
const glossaryNodes = mapping.filter(m => m.nodeRef && m.nodeRef.includes('mysql_glossary'));
console.log(`=== MySQL glossary nodes: ${glossaryNodes.length} ===`);

// ── MySQL concept nodes ──
const conceptNodes = mapping.filter(m => m.nodeRef && m.nodeRef.includes('concept_'));
console.log(`=== Generic concept nodes: ${conceptNodes.length} ===`);

// ── MySQL specific nodes ──
const mysqlNodes = mapping.filter(m => m.nodeRef && (m.nodeRef.includes('mysql:') || m.nodeRef.includes('mysql_file_') || m.nodeRef.includes('mysql_topic_') || m.nodeRef.includes('mysql_theme')));
console.log(`=== MySQL-specific nodes: ${mysqlNodes.length} ===`);

// ── Redis nodes ──
const redisNodes = mapping.filter(m => m.path.includes('Redis') || m.nodeRef === 'demo_redis');
console.log(`=== Redis nodes: ${redisNodes.length} ===`);

// ── k_dict nodes ──
const kDictNodes = mapping.filter(m => m.nodeRef && m.nodeRef.startsWith('k_dict_'));
console.log(`=== k_dict nodes: ${kDictNodes.length} ===`);

// ── Save full report ──
const report = {
  totalNodes: mapping.length,
  sectionSummary,
  unmapped: unmapped.map(u => ({ name: u.name, path: u.path, nodeRef: u.nodeRef, hasContent: u.hasContent })),
  mapping: mapping.map(m => ({
    name: m.name,
    path: m.path,
    nodeRef: m.nodeRef,
    section: m.section,
    confidence: m.confidence,
    score: m.score,
    hasContent: m.hasContent,
    depth: m.depth,
    childCount: m.childCount
  }))
};

fs.writeFileSync(OUTPUT_PATH, JSON.stringify(report, null, 2), 'utf8');
console.log(`\nFull report saved to ${OUTPUT_PATH}`);
