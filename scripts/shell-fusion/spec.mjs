/**
 * 工单「定义/概述/提问形态壳融合」21 条壳的声明式规格。
 * 每条壳：树条目定位 + 池节点 + 正文去向（目标树条目 + supplement tab）+ 孩子去向。
 *
 * target.kind:
 *   'nodeRef' — 按树条目 nodeRef 定位
 *   'name'    — 按树条目 name 定位
 *   'self'    — 壳自己的树条目（仅改名保留，不退池）
 * promote: 壳的孩子上提到目标父节点（true = 全部孩子上提到 target）
 */

/** 目标定位器。 */
const byRef = (nodeRef) => ({ kind: 'nodeRef', value: nodeRef })
const byName = (name) => ({ kind: 'name', value: name })
/** 按树条目 id 定位（nodeRef 被多个树条目共用时用）。 */
const byTreeId = (id) => ({ kind: 'treeId', value: id })
const SELF = { kind: 'self' }
/** 目标 = 壳自己的父节点（工单写「父即本体」时用）。 */
const PARENT = { kind: 'parent' }

export const SHELLS = [
  // ── 分组 A：InnoDB 四提问壳 ─────────────────────────────────────────────
  {
    key: 'A1', group: 'A', shellTreeId: 'tree_vault_mysql_innodb_bufferpool',
    shellNodeRef: 'k_vault_mysql_innodb_bufferpool',
    target: byRef('demo_buffer'),
    tab: { id: 'context:mysql:buffer-pool:vault', label: 'InnoDB 语境中的缓冲池' },
  },
  {
    key: 'A2', group: 'A', shellTreeId: 'tree_vault_mysql_innodb_page_mgmt',
    shellNodeRef: 'k_vault_mysql_innodb_page_mgmt',
    target: byRef('k_1781002610469_nik1ek'),
    tab: { id: 'context:mysql:page:vault-mgmt', label: 'InnoDB 如何管理页' },
  },
  {
    key: 'A3', group: 'A', shellTreeId: 'tree_vault_mysql_innodb_page_struct',
    shellNodeRef: 'k_vault_mysql_innodb_page_struct',
    target: byRef('k_1781002610469_nik1ek'),
    tab: { id: 'context:mysql:page:vault-struct', label: 'InnoDB 页结构' },
  },
  {
    key: 'A4', group: 'A', shellTreeId: 'tree_vault_mysql_innodb_rowlock',
    shellNodeRef: 'k_vault_mysql_innodb_rowlock',
    target: byRef('demo_row_lock'),
    tab: { id: 'context:mysql:row-lock:vault', label: 'InnoDB 行锁实现' },
  },

  // ── 分组 B：框架基础概念壳 ──────────────────────────────────────────────
  {
    key: 'B1', group: 'B', shellTreeId: null, shellTreeName: 'Netty 基础概念',
    shellNodeRef: 'k_vault_javanetty_1343pt',
    target: byRef('k_java_fw_netty'),
    tab: { id: 'context:java:netty:basics', label: 'Netty 基础概念' },
  },
  {
    key: 'B2', group: 'B', shellTreeId: null, shellTreeName: 'RabbitMQ 基础概念',
    shellNodeRef: 'k_vault_javarabbitmq_vcvmol',
    target: byRef('k_java_fw_rabbitmq'),
    tab: { id: 'context:java:rabbitmq:basics', label: 'RabbitMQ 基础概念' },
  },
  {
    key: 'B3', group: 'B', shellTreeId: null, shellTreeName: '什么是分库分表',
    shellNodeRef: 'sharding_what',
    target: byRef('sharding_overview'),
    tab: { id: 'context:mysql:sharding:what', label: '什么是分库分表' },
  },

  // ── 分组 C：wiki 定义/概述/使用壳 ───────────────────────────────────────
  {
    key: 'C1', group: 'C', shellTreeId: null, shellTreeName: '定义', shellParentName: '虚拟机',
    shellNodeRef: 'k_wiki_en_virtual_machine_s1',
    // 工单写 nodeRef=k_wiki_en_virtual_machine，实为 treeId；真实「虚拟机」nodeRef 见下。
    target: PARENT,
    tab: null, // 正文仅 7 字引导语，不迁移
    promote: true,
  },
  {
    key: 'C2', group: 'C', shellTreeId: null, shellTreeName: '概述', shellParentName: '链接器（计算）',
    shellNodeRef: 'k_wiki_en_linker_computing_s1',
    target: byRef('k_wiki_en_linker_computing'),
    tab: { id: 'context:wiki:linker:overview', label: '概述' },
  },
  {
    key: 'C3', group: 'C', shellTreeId: null, shellTreeName: '使用', shellParentName: '解释器（计算）',
    shellNodeRef: 'k_wiki_en_interpreter_computing_s2',
    target: byRef('k_wiki_en_interpreter_computing'),
    tab: { id: 'context:wiki:interpreter:usage', label: '使用' },
  },

  // ── 分组 D：JUC 结构壳 ──────────────────────────────────────────────────
  {
    key: 'D1', group: 'D', shellTreeId: null, shellTreeName: 'ConcurrentHashMap的结构',
    shellNodeRef: 'k_1786031455498_0hhkpd',
    // nodeRef 被「常见类」与「java.util.concurrent」两个树条目共用 → 按 treeId 精确定位
    target: byTreeId('tree_1785293964453_8vqlt3'),
    tab: { id: 'context:java:concurrent-hash-map:structure', label: 'ConcurrentHashMap 的结构' },
  },
  {
    key: 'D2', group: 'D', shellTreeId: null, shellTreeName: 'ConcurrentLinkedQueue的结构',
    shellNodeRef: 'k_1786030906252_kngk5k',
    target: byTreeId('tree_1786030856071_2edcr6'),
    tab: { id: 'context:java:concurrent-linked-queue:structure', label: 'ConcurrentLinkedQueue 的结构' },
  },
  {
    key: 'D3', group: 'D', shellTreeId: null, shellTreeName: 'CyclicBarrier简介',
    shellNodeRef: 'k_1786089941002_b81wxc',
    target: byName('同步屏障CyclicBarrier'),
    tab: { id: 'context:java:cyclic-barrier:brief', label: '简介' },
  },
  // D4 系列（三层嵌套违规，整体拆解）：正身 = 爷爷「Executor框架」(k_1785898835766_erx4pw)。
  // 中间「Executor框架的结构与成员」是 0 字空中转壳，不得改名当正身（宪法 §2.1 单一家园）。
  // 孙壳「结构」「成员」正文分别转 supplement，孩子上提到正身；三层壳全退。
  {
    key: 'D4a', group: 'D', shellTreeId: null, shellTreeName: 'Executor框架的结构',
    shellNodeRef: 'k_1785906997755_571bbl',
    target: byName('Executor框架'),
    tab: { id: 'context:java:executor-framework:structure', label: 'Executor 框架的结构' },
    promote: true,
  },
  {
    key: 'D4b', group: 'D', shellTreeId: null, shellTreeName: 'Executor框架的成员',
    shellNodeRef: 'k_1786093035635_3g0tyz',
    target: byName('Executor框架'),
    tab: { id: 'context:java:executor-framework:members', label: 'Executor 框架的成员' },
    promote: true,
  },
  {
    key: 'D4c', group: 'D', shellTreeId: null, shellTreeName: 'Executor框架的结构与成员',
    shellNodeRef: 'k_1785906968783_0dyspy',
    target: byName('Executor框架'),
    tab: null, // 正文 0 字，不迁移
    promote: true,
  },

  // ── 分组 E：数据仓库概念壳 ──────────────────────────────────────────────
  {
    key: 'E1', group: 'E', shellTreeId: null, shellTreeName: '概念', shellParentName: '创建数据仓库',
    shellNodeRef: 'k_wiki_en_outline_of_databases_s22',
    target: byName('创建数据仓库'),
    tab: { id: 'context:wiki:data-warehouse:concepts', label: '数据仓库核心概念' },
    promote: true,
  },
  {
    key: 'E2', group: 'E', shellTreeId: null, shellTreeName: '概念', shellParentName: '使用数据仓库',
    shellNodeRef: 'k_wiki_en_outline_of_databases_s29',
    target: byName('使用数据仓库'),
    tab: { id: 'context:wiki:data-warehouse-usage:concepts', label: '使用数据仓库相关概念' },
    promote: true,
  },
  {
    key: 'E3', group: 'E', shellTreeId: null, shellTreeName: '应用', shellParentName: '十八、数据库编程与接口',
    shellNodeRef: 'k_wiki_en_database_s13',
    target: byName('十八、数据库编程与接口'),
    tab: { id: 'context:wiki:db-programming:applications', label: '应用' },
    promote: true,
  },

  // ── 分组 F：零散壳 ──────────────────────────────────────────────────────
  {
    key: 'F1', group: 'F', shellTreeId: null, shellTreeName: 'Reactor概述', shellParentName: '网络编程模型',
    shellNodeRef: 'k_reactor_overview',
    target: SELF,
    renameTargetTo: 'Reactor 模式',
    tab: null,            // 正文不动（它本身就是 Reactor 正身）
    keepPool: true,       // 池节点保留（有 3 条真语义边）
    keepTreeEntry: true,  // 树条目保留，只改名（名字去「概述」）
  },
  {
    key: 'F2', group: 'F', shellTreeId: null, shellTreeName: '实现', shellParentName: 'java',
    shellNodeRef: 'k_1784343538435_2potgn',
    target: byName('java'),
    tab: { id: 'context:java:implementation', label: 'Java 实现生态' },
  },
  {
    key: 'F3', group: 'F', shellTreeId: null, shellTreeName: '介绍', shellParentName: '并发计算',
    shellNodeRef: 'k_1784346820123_3r1xxg',
    target: byName('并发计算'),
    tab: { id: 'context:cs:concurrency:intro', label: '并发计算导览' },
    promote: true,
  },
  {
    key: 'F4', group: 'F', shellTreeId: null, shellTreeName: '实现', shellParentName: '并发计算',
    shellNodeRef: 'k_1784348517053_72vt2j',
    target: byName('并发计算'),
    tab: null, // 正文仅 63 字，不迁移
    promote: true,
  },
]

export const GROUPS = ['B', 'A', 'C', 'D', 'F', 'E']

export function shellsOf(group) {
  return SHELLS.filter((s) => s.group === group)
}
