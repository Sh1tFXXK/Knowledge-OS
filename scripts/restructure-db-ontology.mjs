#!/usr/bin/env node
/**
 * Restructure the 数据库 branch from flat Wikipedia-based tree
 * into a 21-section ontology structure.
 *
 * Principles:
 * - Generic concepts (concept_*) go to their ontology section
 * - MySQL implementations stay as children of their concept (already attached)
 * - Redis/PostgreSQL/MongoDB go under "十九、数据库产品"
 * - Wikipedia nodes go under "二十一、数据库知识元数据"
 * - MySQL Server architecture (files/config) goes under "二十、数据库文件与实现"
 * - All nodeRef references preserved
 */

import fs from 'fs';

const TREE_PATH = 'data/tree-data.json';
const POOL_PATH = 'data/node-pool.json';
const OUTPUT_PATH = 'data/tree-data.json';
const TMP_PATH = 'data/tree-data.tmp.json';

const tree = JSON.parse(fs.readFileSync(TREE_PATH, 'utf8'));
const pool = JSON.parse(fs.readFileSync(POOL_PATH, 'utf8'));

// ── Utilities ──
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

function findBranchByRef(node, targetRef) {
  if (node.nodeRef === targetRef) return node;
  if (node.children) {
    for (const child of node.children) {
      const found = findBranchByRef(child, targetRef);
      if (found) return found;
    }
  }
  return null;
}

function makeNode(name, nodeRef, children = []) {
  const node = { name };
  if (nodeRef) node.nodeRef = nodeRef;
  if (children.length > 0) node.children = children;
  return node;
}

function collectAll(node, results = []) {
  results.push(node);
  if (node.children) for (const child of node.children) collectAll(child, results);
  return results;
}

// ── Find the 数据库 branch ──
const dbBranch = findBranch(tree, '数据库');
if (!dbBranch) {
  console.error('数据库 branch not found!');
  process.exit(1);
}

// ── Find the MySQL branch (outside 数据库) ──
const mysqlBranch = findBranch(tree, 'MySQL');
if (!mysqlBranch) {
  console.error('MySQL branch not found!');
  process.exit(1);
}

// ── Find database_principles ──
const principlesBranch = findBranchByRef(dbBranch, 'database_principles');
if (!principlesBranch) {
  console.error('database_principles branch not found!');
  process.exit(1);
}

// ── Index all concept children under 数据库原理 by nodeRef ──
const principlesChildren = principlesBranch.children || [];
console.log(`数据库原理 has ${principlesChildren.length} direct children`);

// ── Build concept→section mapping ──
// Maps concept nodeRef patterns to ontology sections
const conceptToSection = {
  // 一、数据库系统
  'concept_instance': '一、数据库系统',
  'concept_host': '一、数据库系统',
  'concept_database': '一、数据库系统',

  // 二、数据模型
  'concept_relational': '二、数据模型',

  // 三、数据库结构
  'concept_table': '三、数据库结构',
  'concept_column': '三、数据库结构',
  'concept_row': '三、数据库结构',
  'concept_view': '三、数据库结构',
  'concept_schema': '三、数据库结构',
  'concept_partitioning': '三、数据库结构',
  'concept_data_dictionary': '三、数据库结构',
  'concept_temporary_table': '三、数据库结构',
  'concept_generated_column': '三、数据库结构',
  'concept_child_table': '三、数据库结构',
  'concept_parent_table': '三、数据库结构',
  'concept_referential_integrity': '三、数据库结构',
  'concept_delimited_identifier': '三、数据库结构',
  'concept_stored_object': '三、数据库结构',

  // 四、数据约束与标识
  'concept_primary_key': '四、数据约束与标识',
  'concept_unique_key': '四、数据约束与标识',
  'concept_foreign_key': '四、数据约束与标识',
  'concept_not_null_constraint': '四、数据约束与标识',
  'concept_surrogate_key': '四、数据约束与标识',
  'concept_natural_key': '四、数据约束与标识',
  'concept_guid': '四、数据约束与标识',

  // 五、数据库操作
  'concept_insert': '五、数据库操作',
  'concept_delete': '五、数据库操作',
  'concept_truncate': '五、数据库操作',
  'concept_drop': '五、数据库操作',
  'concept_dynamic_sql': '五、数据库操作',
  'concept_prepared_statement': '五、数据库操作',
  'concept_online_ddl': '五、数据库操作',
  'concept_atomic_ddl': '五、数据库操作',

  // 六、查询系统
  'concept_query_processing': '六、查询系统',
  'concept_query_optimizer': '六、查询系统',
  'concept_query_execution_plan': '六、查询系统',
  'concept_full_table_scan': '六、查询系统',
  'concept_selectivity': '六、查询系统',
  'concept_index_hint': '六、查询系统',
  'concept_parser': '六、查询系统',
  'concept_join': '六、查询系统',
  'concept_subquery': '六、查询系统',
  'concept_index_condition_pushdown': '六、查询系统',
  'concept_sort_buffer': '六、查询系统',
  'concept_blind_query_expansion': '六、查询系统',
  'concept_random_dive': '六、查询系统',
  'concept_relevance': '六、查询系统',
  'concept_stemming': '六、查询系统',

  // 七、事务系统
  'concept_transaction': '七、事务系统',
  'concept_mvcc': '七、事务系统',
  'concept_rollback': '七、事务系统',
  'concept_dirty_read': '七、事务系统',
  'concept_read_phenomena': '七、事务系统',
  'concept_consistent_read': '七、事务系统',
  'concept_concurrency': '七、事务系统',
  'concept_lost_update': '七、事务系统',
  'concept_throughput_tps': '七、事务系统',
  'concept_transaction_lifecycle': '七、事务系统',
  'concept_transaction_management': '七、事务系统',
  'concept_global_transaction': '七、事务系统',
  'concept_transaction_id': '七、事务系统',
  'concept_read_only_transaction': '七、事务系统',
  'concept_tcl': '七、事务系统',
  'concept_mini_transaction': '七、事务系统',
  'concept_semi_consistent_read': '七、事务系统',

  // 八、恢复系统
  'concept_checkpoint': '八、恢复系统',
  'concept_dirty_page': '八、恢复系统',
  'concept_backup': '八、恢复系统',
  'concept_restore': '八、恢复系统',
  'concept_point_in_time_recovery': '八、恢复系统',
  'concept_crash_recovery': '八、恢复系统',
  'concept_crash': '八、恢复系统',
  'concept_startup': '八、恢复系统',
  'concept_quiesce': '八、恢复系统',
  'concept_availability': '八、恢复系统',
  'concept_hot_backup': '八、恢复系统',
  'concept_warm_backup': '八、恢复系统',
  'concept_cold_backup': '八、恢复系统',
  'concept_logical_backup': '八、恢复系统',
  'concept_physical_backup': '八、恢复系统',
  'concept_full_backup': '八、恢复系统',
  'concept_incremental_backup': '八、恢复系统',
  'concept_partial_backup': '八、恢复系统',
  'concept_compressed_backup': '八、恢复系统',

  // 九、日志系统
  'concept_flush': '九、日志系统',

  // 十、存储系统
  'concept_compression': '十、存储系统',
  'concept_sparse_file': '十、存储系统',
  'concept_hole_punching': '十、存储系统',
  'concept_transparent_compression': '十、存储系统',
  'concept_compression_failure': '十、存储系统',
  'concept_buffer': '十、存储系统',
  'concept_change_buffer': '十、存储系统',
  'concept_tablespace': '十、存储系统',
  'concept_undo_tablespace': '十、存储系统',
  'concept_shared_tablespace': '十、存储系统',
  'concept_system_tablespace': '十、存储系统',
  'concept_independent_tablespace': '十、存储系统',
  'concept_tablespace_id': '十、存储系统',
  'concept_transportable_tablespace': '十、存储系统',
  'concept_segment': '十、存储系统',
  'concept_extent': '十、存储系统',
  'concept_page': '十、存储系统',
  'concept_page_size': '十、存储系统',
  'concept_rollback_segment': '十、存储系统',
  'concept_undo_log_segment': '十、存储系统',

  // 十一、索引结构
  'concept_index': '十一、索引结构',
  'concept_unique_index': '十一、索引结构',
  'concept_hash_index': '十一、索引结构',
  'concept_clustered_index': '十一、索引结构',
  'concept_covering_index': '十一、索引结构',
  'concept_partial_index': '十一、索引结构',
  'concept_fulltext_index': '十一、索引结构',
  'concept_btree_index': '十一、索引结构',
  'concept_composite_index': '十一、索引结构',
  'concept_secondary_index': '十一、索引结构',
  'concept_prefix_index': '十一、索引结构',
  'concept_descending_index': '十一、索引结构',
  'concept_column_index': '十一、索引结构',
  'concept_virtual_index': '十一、索引结构',
  'concept_inverted_index': '十一、索引结构',
  'concept_adaptive_hash_index': '十一、索引结构',
  'concept_index_statistics': '十一、索引结构',
  'concept_cardinality': '十一、索引结构',
  'concept_fill_factor': '十一、索引结构',
  'concept_sentinel_record': '十一、索引结构',

  // 十二、数据表示
  'concept_variable_length_type': '十二、数据表示',
  'concept_blob': '十二、数据表示',
  'concept_clob': '十二、数据表示',
  'concept_integer_type': '十二、数据表示',
  'concept_real_type': '十二、数据表示',
  'concept_string_type': '十二、数据表示',
  'concept_enum_type': '十二、数据表示',

  // 十三、数据库设计
  // (no direct concept_ mappings, covered by theory nodes)

  // 十四、数据库分布与复制
  'concept_connection': '十四、数据库分布与复制',
  'concept_connection_pool': '十四、数据库分布与复制',

  // 十六、数据库安全
  // (none currently)

  // 十七、数据库运维
  'concept_bottleneck': '十七、数据库运维',
  'concept_workload': '十七、数据库运维',
  'concept_cpu_bound': '十七、数据库运维',
  'concept_io_bound': '十七、数据库运维',
  'concept_wait': '十七、数据库运维',
  'concept_counter': '十七、数据库运维',
  'concept_optimizer_statistics': '十七、数据库运维',
  'concept_cache_warmup': '十七、数据库运维',
  'concept_hot': '十七、数据库运维',
  'concept_physical_vs_logical': '十七、数据库运维',
  'concept_performance_schema': '十七、数据库运维',
  'concept_configuration_option': '十七、数据库运维',

  // 十八、数据库编程与接口
  'concept_data_access_interface': '十八、数据库编程与接口',
  'concept_storage_engine': '十八、数据库编程与接口',

  // 通用概念兜底
  'concept_lock_mechanism': '七、事务系统',
  'concept_deadlock': '七、事务系统',
  'concept_deadlock_detection': '七、事务系统',
  'concept_shared_lock': '七、事务系统',
  'concept_gap_lock': '七、事务系统',
  'concept_next_key_lock': '七、事务系统',
  'concept_lock_escalation': '七、事务系统',
  'concept_row_level_locking': '七、事务系统',
  'concept_exclusive_lock': '七、事务系统',
  'concept_optimistic_lock': '七、事务系统',
  'concept_pessimistic_lock': '七、事务系统',
  'concept_intention_lock': '七、事务系统',
  'concept_record_lock': '七、事务系统',
  'concept_table_level_locking': '七、事务系统',
  'concept_auto_increment_lock': '七、事务系统',
  'concept_insert_intention_lock': '七、事务系统',
  'concept_implicit_row_lock': '七、事务系统',
  'concept_latch': '七、事务系统',
  'concept_metadata_lock': '七、事务系统',
  'concept_non_locking_read': '七、事务系统',
  'concept_locking_read': '七、事务系统',
  'concept_lock_mode': '七、事务系统',
  'concept_range_insert_lock': '七、事务系统',
  'concept_lock_wait_timeout': '七、事务系统',
  'concept_victim': '七、事务系统',
};

// ── Build the 21-section structure ──
const sections = [
  '一、数据库系统',
  '二、数据模型',
  '三、数据库结构',
  '四、数据约束与标识',
  '五、数据库操作',
  '六、查询系统',
  '七、事务系统',
  '八、恢复系统',
  '九、日志系统',
  '十、存储系统',
  '十一、索引结构',
  '十二、数据表示',
  '十三、数据库设计',
  '十四、数据库分布与复制',
  '十五、备份与恢复',
  '十六、数据库安全',
  '十七、数据库运维',
  '十八、数据库编程与接口',
  '十九、数据库产品',
  '二十、数据库文件与实现',
  '二十一、数据库知识元数据'
];

// Create section containers
const sectionNodes = {};
for (const section of sections) {
  sectionNodes[section] = { name: section, children: [] };
}

// ── Map concept children to sections ──
let mapped = 0;
let unmapped = [];
let theoryNodes = []; // theory_domain_* nodes
let otherNodes = [];  // k_dict, k_wiki, mysql_glossary, etc. that are direct children

for (const child of principlesChildren) {
  const ref = child.nodeRef || '';
  const name = child.name || '';

  // Check if it's a concept node
  if (ref.startsWith('concept_')) {
    const section = conceptToSection[ref];
    if (section) {
      sectionNodes[section].children.push(child);
      mapped++;
    } else {
      unmapped.push({ name, ref, type: 'concept' });
      // Default to 十七、数据库运维 as fallback for unmapped concepts
      sectionNodes['十七、数据库运维'].children.push(child);
    }
  }
  // Check if it's a theory domain node
  else if (ref.startsWith('theory_domain_') || ref === 'school_database_theory') {
    theoryNodes.push(child);
  }
  // Check if it's a demo_ node (MySQL implementation that's a direct child)
  else if (ref.startsWith('demo_')) {
    // These are MySQL-specific implementations that are direct children
    // Try to map by name
    const nameLower = name.toLowerCase();
    if (nameLower.includes('buffer') || nameLower.includes('缓冲')) {
      sectionNodes['十、存储系统'].children.push(child);
      mapped++;
    } else if (nameLower.includes('lock') || nameLower.includes('锁')) {
      sectionNodes['七、事务系统'].children.push(child);
      mapped++;
    } else if (nameLower.includes('index') || nameLower.includes('索引')) {
      sectionNodes['十一、索引结构'].children.push(child);
      mapped++;
    } else if (nameLower.includes('mvcc') || nameLower.includes('并发')) {
      sectionNodes['七、事务系统'].children.push(child);
      mapped++;
    } else if (nameLower.includes('innodb')) {
      sectionNodes['十八、数据库编程与接口'].children.push(child);
      mapped++;
    } else if (nameLower.includes('myisam')) {
      sectionNodes['十八、数据库编程与接口'].children.push(child);
      mapped++;
    } else {
      otherNodes.push(child);
    }
  }
  // k_dict, k_wiki direct children (usually under theory sections)
  else if (ref.startsWith('k_dict_') || ref.startsWith('k_wiki_') || ref.startsWith('k_178')) {
    otherNodes.push(child);
  }
  // mysql_glossary direct children
  else if (ref.startsWith('mysql_glossary_') || ref.startsWith('mysql:')) {
    otherNodes.push(child);
  }
  // Nodes without nodeRef (structural containers)
  else if (!ref) {
    otherNodes.push(child);
  }
  else {
    otherNodes.push(child);
  }
}

console.log(`Concept nodes mapped: ${mapped}`);
console.log(`Theory nodes: ${theoryNodes.length}`);
console.log(`Unmapped concepts: ${unmapped.length}`);
console.log(`Other nodes: ${otherNodes.length}`);

// Print unmapped concepts
if (unmapped.length > 0) {
  console.log('\n=== Unmapped concept nodes ===');
  for (const u of unmapped) {
    console.log(`  ${u.name} → ${u.ref}`);
  }
}

// ── Place theory nodes ──
// school_database_theory → 十三、数据库设计 (contains normalization, relational algebra, etc.)
sectionNodes['十三、数据库设计'].children.push(...theoryNodes);

// ── Place other nodes by name matching ──
for (const node of otherNodes) {
  const name = (node.name || '').toLowerCase();
  const ref = node.nodeRef || '';

  if (!ref) {
    // Structural container without content - skip or place in metadata
    // These are things like "日志" (a container under 数据库原理)
    // Check children to decide
    if (name.includes('日志') || name.includes('log')) {
      sectionNodes['九、日志系统'].children.push(node);
    } else if (name.includes('其他') || name.includes('other')) {
      sectionNodes['二十一、数据库知识元数据'].children.push(node);
    } else {
      sectionNodes['二十一、数据库知识元数据'].children.push(node);
    }
  }
  // MySQL-specific terms under the old structure
  else if (ref.startsWith('mysql_glossary_')) {
    // Place by name
    if (name.includes('buffer') || name.includes('缓冲')) {
      sectionNodes['十、存储系统'].children.push(node);
    } else if (name.includes('log') || name.includes('日志')) {
      sectionNodes['九、日志系统'].children.push(node);
    } else if (name.includes('lock') || name.includes('锁')) {
      sectionNodes['七、事务系统'].children.push(node);
    } else if (name.includes('backup') || name.includes('备份')) {
      sectionNodes['十五、备份与恢复'].children.push(node);
    } else if (name.includes('index') || name.includes('索引')) {
      sectionNodes['十一、索引结构'].children.push(node);
    } else if (name.includes('page') || name.includes('页')) {
      sectionNodes['十、存储系统'].children.push(node);
    } else if (name.includes('table') || name.includes('表')) {
      sectionNodes['三、数据库结构'].children.push(node);
    } else if (name.includes('transaction') || name.includes('事务')) {
      sectionNodes['七、事务系统'].children.push(node);
    } else if (name.includes('query') || name.includes('查询')) {
      sectionNodes['六、查询系统'].children.push(node);
    } else if (name.includes('checkpoint') || name.includes('检查点')) {
      sectionNodes['八、恢复系统'].children.push(node);
    } else if (name.includes('disk') || name.includes('磁盘')) {
      sectionNodes['十、存储系统'].children.push(node);
    } else {
      // Default unmapped mysql_glossary to 十七、数据库运维
      sectionNodes['十七、数据库运维'].children.push(node);
    }
  }
  // mysql: prefixed nodes (SQL categories)
  else if (ref.startsWith('mysql:sql:')) {
    sectionNodes['五、数据库操作'].children.push(node);
  }
  // k_dict nodes
  else if (ref.startsWith('k_dict_')) {
    if (name.includes('lock') || name.includes('锁')) {
      sectionNodes['七、事务系统'].children.push(node);
    } else if (name.includes('index') || name.includes('索引')) {
      sectionNodes['十一、索引结构'].children.push(node);
    } else if (name.includes('table') || name.includes('表') || name.includes('row') || name.includes('行') || name.includes('column') || name.includes('列')) {
      sectionNodes['三、数据库结构'].children.push(node);
    } else if (name.includes('transaction') || name.includes('事务')) {
      sectionNodes['七、事务系统'].children.push(node);
    } else if (name.includes('query') || name.includes('查询') || name.includes('join') || name.includes('连接')) {
      sectionNodes['六、查询系统'].children.push(node);
    } else if (name.includes('backup') || name.includes('备份')) {
      sectionNodes['十五、备份与恢复'].children.push(node);
    } else if (name.includes('insert') || name.includes('插入') || name.includes('delete') || name.includes('删除') || name.includes('truncate') || name.includes('drop')) {
      sectionNodes['五、数据库操作'].children.push(node);
    } else if (name.includes('connection') || name.includes('连接') || name.includes('pool')) {
      sectionNodes['十四、数据库分布与复制'].children.push(node);
    } else {
      sectionNodes['二十一、数据库知识元数据'].children.push(node);
    }
  }
  // k_wiki nodes
  else if (ref.startsWith('k_wiki_')) {
    sectionNodes['二十一、数据库知识元数据'].children.push(node);
  }
  // k_178xxx nodes (custom created)
  else if (ref.startsWith('k_178') || ref.startsWith('k_auto')) {
    if (name.includes('log') || name.includes('日志')) {
      sectionNodes['九、日志系统'].children.push(node);
    } else if (name.includes('file') || name.includes('文件') || name.includes('.ibd') || name.includes('ibdata')) {
      sectionNodes['二十、数据库文件与实现'].children.push(node);
    } else if (name.includes('table') || name.includes('表')) {
      sectionNodes['三、数据库结构'].children.push(node);
    } else if (name.includes('page') || name.includes('页')) {
      sectionNodes['十、存储系统'].children.push(node);
    } else if (name.includes('index') || name.includes('索引')) {
      sectionNodes['十一、索引结构'].children.push(node);
    } else if (name.includes('innodb')) {
      sectionNodes['十八、数据库编程与接口'].children.push(node);
    } else {
      sectionNodes['二十一、数据库知识元数据'].children.push(node);
    }
  }
  else {
    sectionNodes['二十一、数据库知识元数据'].children.push(node);
  }
}

// ── Handle the "分类" subtree (Redis, MongoDB, PostgreSQL, etc.) ──
const fenleiBranch = findBranch(dbBranch, '分类');
if (fenleiBranch) {
  for (const child of (fenleiBranch.children || [])) {
    const name = child.name || '';
    if (name === '关系数据库' || name === 'NoSQL' || name === '键值数据库' || name === '对象数据库' || name === '数据库模型') {
      // These are model/type nodes → 二、数据模型 > 数据库类型
      sectionNodes['二、数据模型'].children.push(child);
    } else {
      // Redis, MongoDB, PostgreSQL → 十九、数据库产品
      sectionNodes['十九、数据库产品'].children.push(child);
    }
  }
}

// ── Handle top-level Wikipedia nodes on 数据库 branch ──
// These are direct children of 数据库 that are not 分类 or 数据库原理
const topLevelWikipedia = [];
const dbDirectChildren = dbBranch.children || [];
for (const child of dbDirectChildren) {
  const name = child.name || '';
  const ref = child.nodeRef || '';
  // Skip the ones we've already handled (分类 was processed above, 数据库原理 was processed above)
  if (name === '分类' || name === '数据库原理') continue;
  // Handle "其他功能" which contains the log subtree
  if (name === '其他功能') {
    // Move its children (日志, etc.) to 九、日志系统
    for (const subChild of (child.children || [])) {
      if (subChild.name && subChild.name.includes('日志')) {
        sectionNodes['九、日志系统'].children.push(subChild);
      } else {
        sectionNodes['二十一、数据库知识元数据'].children.push(subChild);
      }
    }
    continue;
  }
  // Wikipedia nodes and other top-level nodes → metadata
  if (ref.startsWith('k_wiki_') || name === '术语' || name === '历史' || name === '应用' ||
      name === '数据库语言' || name === '贮存' || name === '数据库安全' || name === '迁移' ||
      name === '构建、维护和调整' || name === '备份和恢复' || name === '静态分析' ||
      name === '设计与建模' || name === '研究' || name === '数据库概览（来源视图）' ||
      name === '其他功能' || name === '技术初衷' || name === '数据库管理系统' ||
      name === '数据库模型' || name === '数据库技术的发展' || name === '使用案例' ||
      name === '分类术语' || name === 'CRUD' || name === 'NULL') {
    // Some of these should go to specific sections
    if (name === '数据库语言' || ref.includes('database_s15')) {
      sectionNodes['五、数据库操作'].children.push(child);
    } else if (name === '数据库安全' || ref.includes('database_s20')) {
      sectionNodes['十六、数据库安全'].children.push(child);
    } else if (name === '贮存' || name === '备份和恢复' || ref.includes('database_s24')) {
      sectionNodes['十五、备份与恢复'].children.push(child);
    } else if (name === '构建、维护和调整') {
      sectionNodes['十七、数据库运维'].children.push(child);
    } else if (name === '设计与建模') {
      sectionNodes['十三、数据库设计'].children.push(child);
    } else if (name === '迁移') {
      sectionNodes['十七、数据库运维'].children.push(child);
    } else if (name === 'CRUD') {
      sectionNodes['五、数据库操作'].children.push(child);
    } else if (name === 'NULL') {
      sectionNodes['四、数据约束与标识'].children.push(child);
    } else {
      sectionNodes['二十一、数据库知识元数据'].children.push(child);
    }
  }
}

// ── Handle MySQL branch (MySQL Server architecture) ──
// Move MySQL Server architecture under 十九、数据库产品 > MySQL
// BUT extract file/config nodes to 二十、数据库文件与实现
if (mysqlBranch) {
  const mysqlServerNode = mysqlBranch.children.find(c => c.name === 'MySQL Server');
  let fileNodes = [];

  if (mysqlServerNode) {
    const structure = mysqlServerNode.children.find(c => c.name === '结构');
    if (structure) {
      // Extract 系统文件层
      const fileLayerIdx = (structure.children || []).findIndex(c => c.name === '系统文件层');
      if (fileLayerIdx >= 0) {
        const fileLayer = structure.children.splice(fileLayerIdx, 1)[0];
        // Move file layer's children (配置文件, 数据文件, 日志文件, 运行时文件) to 二十
        for (const child of (fileLayer.children || [])) {
          fileNodes.push(child);
        }
        console.log(`Extracted ${fileNodes.length} file nodes from 系统文件层`);
      }

      // Extract 文件格式 and 客户端库 from structure
      const extraFileIdx = (structure.children || []).findIndex(c =>
        c.name === '文件格式' || c.name === '客户端库' ||
        (c.nodeRef || '').includes('file_format') || (c.nodeRef || '').includes('client_libraries')
      );
      while (extraFileIdx >= 0) {
        const extra = structure.children.splice(extraFileIdx, 1)[0];
        fileNodes.push(extra);
        extraFileIdx = (structure.children || []).findIndex(c =>
          c.name === '文件格式' || c.name === '客户端库' ||
          (c.nodeRef || '').includes('file_format') || (c.nodeRef || '').includes('client_libraries')
        );
      }
    }
  }

  // Push file nodes to 二十、数据库文件与实现
  for (const fn of fileNodes) {
    sectionNodes['二十、数据库文件与实现'].children.push(fn);
  }
  console.log(`Moved ${fileNodes.length} file nodes to 二十、数据库文件与实现`);

  // Create MySQL product node with remaining Server architecture
  const mysqlProductNode = {
    name: 'MySQL',
    nodeRef: 'k_wiki_en_outline_of_databases_s15_b5',
    children: mysqlBranch.children || []
  };
  sectionNodes['十九、数据库产品'].children.push(mysqlProductNode);
}

// ── Handle Redis 缓存异常 etc. (already moved with Redis subtree) ──

// ── Build the new 数据库 branch ──
const newDbBranch = {
  name: '数据库',
  nodeRef: 'n_u4va719e',
  children: Object.values(sectionNodes).filter(s => s.children.length > 0)
};

// ── Replace the old 数据库 branch in the tree ──
// Deep-traverse to find the parent of 数据库 and replace it
function findParentOf(node, targetName, parent = null) {
  const name = node.name || node.id || '';
  if (name === targetName) return parent;
  if (node.children) {
    for (const child of node.children) {
      const found = findParentOf(child, targetName, node);
      if (found) return found;
    }
  }
  return null;
}

const dbParent = findParentOf(tree, '数据库');
if (dbParent && dbParent.children) {
  const idx = dbParent.children.findIndex(c => c.name === '数据库' || c.nodeRef === 'n_u4va719e');
  if (idx >= 0) {
    dbParent.children[idx] = newDbBranch;
    console.log(`✓ Replaced 数据库 branch at index ${idx} in parent "${dbParent.name}"`);
  } else {
    console.error('✗ Could not find 数据库 in parent children!');
  }
} else {
  console.error('✗ Could not find parent of 数据库!');
}

// Also remove the old MySQL branch from its original position
// (it's now under 数据库 > 十九、数据库产品 > MySQL)
function removeBranch(node, targetName) {
  if (node.children) {
    const idx = node.children.findIndex(c => c.name === targetName);
    if (idx >= 0) {
      node.children.splice(idx, 1);
      return true;
    }
    for (const child of node.children) {
      if (removeBranch(child, targetName)) return true;
    }
  }
  return false;
}
removeBranch(tree, 'MySQL');

// ── Stats ──
let totalNodes = 0;
function countNodes(node) {
  totalNodes++;
  if (node.children) for (const child of node.children) countNodes(child);
}
countNodes(newDbBranch);
console.log(`\nNew 数据库 branch total nodes: ${totalNodes}`);

// Section stats
for (const section of sections) {
  const sn = sectionNodes[section];
  let count = 0;
  countNodes2(sn);
  function countNodes2(n) { count++; if (n.children) for (const c of n.children) countNodes2(c); }
  console.log(`  ${section}: ${count} nodes (${sn.children.length} direct children)`);
}

// ── Write to temp file first, then rename ──
fs.writeFileSync(TMP_PATH, JSON.stringify(tree, null, 2), 'utf8');
fs.renameSync(TMP_PATH, OUTPUT_PATH);
console.log(`\n✓ tree-data.json updated successfully`);
console.log(`  Backup at: data/backups/ontology-restructure/tree-data.json`);
