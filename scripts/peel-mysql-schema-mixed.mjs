// 剥离 MySQL 域第二批混合知识点（2026-08-23）：数据库对象与元数据 / 存储对象 / 预处理语句 / 逻辑约束 / 数据类型 / 未分类
// 范式同 peel-mysql-cross-domain.mjs：目标域建中立本体 concept_*，MySQL 节点改写为实例并作为真实子节点挂本体下，
// 清除残留投影；加 instance-of 边；governance placement；原子写回。
// 目标：数据库原理簇 (database_principles) 13 个本体；操作系统域 (theory_domain_operating_systems) 1 个（Pthreads）。
// 附带：未分类分支改名「连接器与语言生态」，剥离后空分支（预处理语句、逻辑约束）从 MySQL 树移除。
import { readFileSync, writeFileSync, renameSync, mkdirSync, copyFileSync } from 'fs';
import { join } from 'path';

const DATA = 'data';
const FILES = ['node-pool.json', 'tree-data.json', 'knowledge-edges.json', 'knowledge-governance.json'];
const ts = new Date().toISOString().replace(/[:.]/g, '-');
const backupDir = join(DATA, 'backups', `peel-mysql-schema-mixed-${ts}`);
mkdirSync(backupDir, { recursive: true });
for (const f of FILES) copyFileSync(join(DATA, f), join(backupDir, f));
console.log('backup ->', backupDir);

const pool = JSON.parse(readFileSync(join(DATA, 'node-pool.json'), 'utf8'));
const tree = JSON.parse(readFileSync(join(DATA, 'tree-data.json'), 'utf8'));
const edges = JSON.parse(readFileSync(join(DATA, 'knowledge-edges.json'), 'utf8'));
const gov = JSON.parse(readFileSync(join(DATA, 'knowledge-governance.json'), 'utf8'));

const DBP = 'database_principles';
const OS = 'theory_domain_operating_systems';
const DBP_HINT = ['计算机科学', '信息系统', '数据库管理', '数据库', '数据库原理'];
const OS_HINT = ['计算机科学', '系统组织', '操作系统'];

const ITEMS = [
  {
    conceptId: 'concept_surrogate_key',
    label: '代理键 / surrogate key',
    domain: DBP, hint: DBP_HINT, domainName: '数据库原理',
    dims: ['数据库建模', '键'],
    instances: [
      { ref: 'mysql_glossary_synthetic_key_1drbjs', label: 'MySQL 合成键 / MySQL synthetic key' },
      { ref: 'k_dict_xb5t6pmm', label: 'MySQL 代理键 / MySQL surrogate key' },
    ],
    def: '**代理键 / surrogate key（合成键 / synthetic key）**\n值被**任意分配**、不含现实语义的键列（通常是主键），常见形式是自增列或序列生成的编号。\n\n与自然键（natural key）相对。把键值视为完全任意，可避免现实世界规则变化带来的索引维护与迁移成本（如员工编号出现空洞、编码规则变更），且定长数值更短、可预测。代价是键本身不可读，需要联表才能获得业务含义。\n\n本节点只承载模型本体；各数据库实例在各自领域回指。',
    example: '**同构实例（任意分配的无语义键）**：\n- **MySQL**：`AUTO_INCREMENT` 列作代理主键；`UUID` 类合成键。\n- **PostgreSQL**：`SERIAL` / `IDENTITY` 列。\n- **Oracle**：序列（SEQUENCE）生成的代理键。\n\n这些都属于「代理键」通用概念的不同实现。',
  },
  {
    conceptId: 'concept_natural_key',
    label: '自然键 / natural key',
    domain: DBP, hint: DBP_HINT, domainName: '数据库原理',
    dims: ['数据库建模', '键'],
    instances: [{ ref: 'mysql_glossary_natural_key_tddcrt', label: 'MySQL 自然键 / MySQL natural key' }],
    def: '**自然键 / natural key**\n值具有**现实世界含义**的键列（通常是主键），如身份证号、国家代码、邮箱地址。\n\n与代理键（surrogate key）相对。实践中通常建议避免使用自然键：值一旦变化需要大量索引维护（重排聚簇索引并更新所有二级索引中冗余的主键副本）；即使看似稳定的值也可能以不可预测的方式变化（国家分裂、规则例外），在数据库中难以正确表示。\n\n本节点只承载模型本体；各数据库实例在各自领域回指。',
    example: '**同构实例（含现实语义的键）**：\n- **MySQL**：以国家代码、纳税人 ID 等业务列作主键时的取舍。\n- **通用建模**：代理键 vs 自然键是所有 RDBMS 建模的经典权衡。\n\n该概念为跨库通用的数据库建模知识。',
  },
  {
    conceptId: 'concept_relational',
    label: '关系型 / relational',
    domain: DBP, hint: DBP_HINT, domainName: '数据库原理',
    dims: ['关系模型'],
    instances: [{ ref: 'mysql_glossary_relational_1yoaip', label: 'MySQL 关系型 / MySQL relational' }],
    def: '**关系型 / relational**\n关系模型的核心属性：数据库服务器**编码并强制执行**表之间的一对一、一对多、多对一等关系（唯一性、引用完整性），并能利用这些关系防止错误数据写入、寻找高效访问路径（如唯一值命中第一行即可停止扫描）。\n\n例如：一个人可有零个或多个电话号码；一个纳税人 ID 只能对应一个人。\n\n本节点只承载模型本体；各数据库实例在各自领域回指。',
    example: '**同构实例（关系强制执行）**：\n- **MySQL**：通过唯一约束、外键约束强制执行关系。\n- **PostgreSQL / Oracle / SQL Server**：同以约束体系实现关系模型。\n\n关系模型本身源自 Codd 的关系代数，属数据库原理。',
  },
  {
    conceptId: 'concept_schema',
    label: '模式 / schema',
    domain: DBP, hint: DBP_HINT, domainName: '数据库原理',
    dims: ['数据库建模'],
    instances: [{ ref: 'k_dict_8yoqxtuu', label: 'MySQL 模式 / MySQL schema' }],
    def: '**模式 / schema**\n一组**相互关联的数据库对象**的逻辑集合：表、列及其数据类型、索引、外键、视图、存储程序等，通过 SQL 语法在定义上彼此连接（列构成表、外键指向表和列），并在逻辑上作为统一应用协同工作。\n\n不同产品对 schema 的物理映射不同：有的独立于 database（如 PostgreSQL、SQL Server 的命名空间层），有的与 database 等同（如 MySQL）。\n\n本节点只承载模型本体；各数据库实例在各自领域回指。',
    example: '**同构实例（对象逻辑集合）**：\n- **MySQL**：`schema` 与 `database` 等同（`CREATE SCHEMA` = `CREATE DATABASE`）。\n- **PostgreSQL**：schema 是 database 内的命名空间，如 `public`。\n- **Oracle**：schema 与用户账号绑定。\n\n这些都属于「模式」通用概念的不同实现。',
  },
  {
    conceptId: 'concept_prepared_statement',
    label: '预处理语句 / prepared statement',
    domain: DBP, hint: DBP_HINT, domainName: '数据库原理',
    dims: ['SQL', '查询处理'],
    instances: [
      { ref: 'mysql_glossary_client_side_prepared_statement_1czk27', label: 'MySQL 客户端预处理语句 / MySQL client-side prepared statement' },
      { ref: 'mysql_glossary_server_side_prepared_statement_1g5uc6', label: 'MySQL 服务器端预处理语句 / MySQL server-side prepared statement' },
    ],
    def: '**预处理语句 / prepared statement**\n一种「**先编译、后执行**」的 SQL 执行方式：语句先被解析/编译为执行模板并缓存，之后可携带不同参数反复执行。\n\n收益：重复执行时省去解析与优化的开销；参数与语句文本分离可防 SQL 注入。按缓存与管理位置分为服务器端（由数据库服务器管理会话级预处理语句）与客户端（由驱动本地缓存模拟）两种形态。\n\n本节点只承载模型本体；各系统实例在各自领域回指。',
    example: '**同构实例（编译一次、参数化多次执行）**：\n- **MySQL**：`PREPARE`/`EXECUTE`，或驱动层服务器端/客户端预处理。\n- **PostgreSQL**：扩展协议的 named prepared statement。\n- **JDBC**：`PreparedStatement` 接口。\n\n这些都属于「预处理语句」通用概念的不同实现。',
  },
  {
    conceptId: 'concept_primary_key',
    label: '主键 / primary key',
    domain: DBP, hint: DBP_HINT, domainName: '数据库原理',
    dims: ['数据库建模', '键', '约束'],
    instances: [{ ref: 'k_dict_xxkp8lkc', label: 'MySQL 主键 / MySQL primary key' }],
    def: '**主键 / primary key**\n一组列（隐含基于该列集的索引），能够**唯一标识表中的每一行**，因此必须是**不含 NULL 值的唯一索引**。\n\n主键选择是建模的经典权衡：任意分配的代理键（synthetic key）通常优于依赖现实来源的自然键（natural key）。在以聚簇方式组织的存储引擎中，主键还决定行的物理存放顺序，所有二级索引都会冗余主键值，因此主键应尽量短且稳定。\n\n本节点只承载模型本体；各数据库实例在各自领域回指。',
    example: '**同构实例（唯一行标识）**：\n- **MySQL / InnoDB**：每表必须有主键（否则 InnoDB 隐式生成），按主键聚簇组织存储。\n- **PostgreSQL**：主键默认以 unique B-tree 索引 + NOT NULL 约束实现。\n- **SQL 标准**：`PRIMARY KEY` = UNIQUE + NOT NULL。\n\n这些都属于「主键」通用概念的不同实现。',
  },
  {
    conceptId: 'concept_unique_key',
    label: '唯一键 / unique key',
    domain: DBP, hint: DBP_HINT, domainName: '数据库原理',
    dims: ['数据库建模', '键', '约束'],
    instances: [
      { ref: 'k_dict_rdm2280v', label: 'MySQL 唯一键 / MySQL unique key' },
      { ref: 'mysql_glossary_unique_constraint_cvzep', label: 'MySQL 唯一约束 / MySQL unique constraint' },
    ],
    def: '**唯一键 / unique key（唯一约束 / unique constraint）**\n声明某一列（或列集）**不包含重复值**的约束，在关系代数中用于表达一对一关系。\n\n为高效检查「值是否已存在」，唯一约束由底层的**唯一索引**支撑：等值查询命中第一行即可停止，查找与唯一性判定都很高效。NULL 的处理因产品而异（标准 SQL 中多个 NULL 通常不冲突）。\n\n本节点只承载模型本体；各数据库实例在各自领域回指。',
    example: '**同构实例（防重复值约束）**：\n- **MySQL**：`UNIQUE KEY` / `CREATE UNIQUE INDEX`。\n- **PostgreSQL / Oracle / SQL Server**：`UNIQUE` 约束均以唯一索引实现。\n\n这些都属于「唯一键」通用概念的不同实现。',
  },
  {
    conceptId: 'concept_foreign_key',
    label: '外键 / foreign key',
    domain: DBP, hint: DBP_HINT, domainName: '数据库原理',
    dims: ['数据库建模', '约束', '引用完整性'],
    instances: [
      { ref: 'k_dict_lnpi0qrg', label: 'MySQL 外键 / MySQL foreign key' },
      { ref: 'mysql_glossary_foreign_key_constraint_p6gdbr', label: 'MySQL 外键约束 / MySQL FOREIGN KEY constraint' },
    ],
    def: '**外键 / foreign key（外键约束 / FOREIGN KEY constraint）**\n定义在父表与子表列之间的一种**指针关系**：子表列的值必须引用父表中存在的行。它通过在插入/更新/删除时阻止产生悬空引用来维护**引用完整性（referential integrity）**，是一种典型的 constraint。\n\n级联行为（`ON DELETE/UPDATE CASCADE`、`SET NULL`、`RESTRICT` 等）决定父行变化时子行的命运。\n\n本节点只承载模型本体；各数据库实例在各自领域回指。',
    example: '**同构实例（跨表引用完整性）**：\n- **MySQL / InnoDB**：`FOREIGN KEY ... REFERENCES` + 级联选项。\n- **PostgreSQL / Oracle / SQL Server**：同名约束，行为语义一致。\n\n这些都属于「外键」通用概念的不同实现。',
  },
  {
    conceptId: 'concept_not_null_constraint',
    label: 'NOT NULL 约束 / NOT NULL constraint',
    domain: DBP, hint: DBP_HINT, domainName: '数据库原理',
    dims: ['数据库建模', '约束'],
    instances: [{ ref: 'mysql_glossary_not_null_constraint_1op7sq', label: 'MySQL NOT NULL 约束 / MySQL NOT NULL constraint' }],
    def: '**NOT NULL 约束 / NOT NULL constraint**\n一种约束类型，指定某列**不能包含任何 NULL 值**。\n\n它帮助维护引用完整性（服务器可识别数据中错误的缺失值），也让查询优化器受益：非空列的取值基数可预测，算术与索引条目数估算更准确。\n\n本节点只承载模型本体；各数据库实例在各自领域回指。',
    example: '**同构实例（禁止 NULL）**：\n- **MySQL / PostgreSQL / Oracle / SQL Server**：列定义中的 `NOT NULL`，语义一致。\n- **SQL 标准**：域约束的一种。\n\n这些都属于「NOT NULL 约束」通用概念。',
  },
  {
    conceptId: 'concept_variable_length_type',
    label: '可变长度类型 / variable-length type',
    domain: DBP, hint: DBP_HINT, domainName: '数据库原理',
    dims: ['数据类型'],
    instances: [{ ref: 'mysql_glossary_variable_length_type_1satcr', label: 'MySQL 可变长度类型 / MySQL variable-length type' }],
    def: '**可变长度类型 / variable-length type**\n存储空间随**实际值长度**变化的数据类型，与定长类型（fixed-length，按定义长度补齐）相对。\n\n变长类型节省空间、减少填充浪费，但带来逐行变长管理与长度前缀的额外开销；定长类型定位简单、更新不产生碎片。二者的权衡是存储布局的基础知识。\n\n本节点只承载模型本体；各数据库实例在各自领域回指。',
    example: '**同构实例（按实际长度存储）**：\n- **MySQL**：`VARCHAR` / `VARBINARY` 及 BLOB/TEXT 家族。\n- **PostgreSQL**：`VARCHAR(n)` / `TEXT`；SQL Server：`NVARCHAR(MAX)`。\n\n这些都属于「可变长度类型」通用概念的不同实现。',
  },
  {
    conceptId: 'concept_blob',
    label: 'BLOB / binary large object',
    domain: DBP, hint: DBP_HINT, domainName: '数据库原理',
    dims: ['数据类型'],
    instances: [{ ref: 'mysql_glossary_blob_lhrk4q', label: 'MySQL BLOB' }],
    def: '**BLOB / binary large object（二进制大对象）**\nSQL 标准中用于存储**任意二进制数据**（图像、音频、序列化对象等）的大对象数据类型，容量远超普通行内列，通常按大小分级并有专门的存储与传输处理。\n\n与存储字符数据的 CLOB 相对。各产品在行外存储、内存上限、协议传输方式上各有实现。\n\n本节点只承载模型本体；各数据库实例在各自领域回指。',
    example: '**同构实例（二进制大对象）**：\n- **MySQL**：`TINYBLOB`/`BLOB`/`MEDIUMBLOB`/`LONGBLOB`。\n- **PostgreSQL**：`BYTEA`；Oracle：`BLOB`（行外存储）；SQL Server：`VARBINARY(MAX)`。\n\n这些都属于「BLOB」通用概念的不同实现。',
  },
  {
    conceptId: 'concept_clob',
    label: 'CLOB / character large object',
    domain: DBP, hint: DBP_HINT, domainName: '数据库原理',
    dims: ['数据类型'],
    instances: [{ ref: 'mysql_glossary_clob_kn7shj', label: 'MySQL CLOB' }],
    def: '**CLOB / character large object（字符大对象）**\nSQL 标准中用于存储**任意字符/文本数据**（文档、日志、正文等）的大对象数据类型，带有字符集与排序规则属性，可按大小分级。\n\n与存储二进制数据的 BLOB 相对。各产品的连接器与 API 对 CLOB 的读写方式各异。\n\n本节点只承载模型本体；各数据库实例在各自领域回指。',
    example: '**同构实例（字符大对象）**：\n- **MySQL**：`TINYTEXT`/`TEXT`/`MEDIUMTEXT`/`LONGTEXT`。\n- **Oracle**：`CLOB`；SQL Server：`NVARCHAR(MAX)`；PostgreSQL：`TEXT`。\n\n这些都属于「CLOB」通用概念的不同实现。',
  },
  {
    conceptId: 'concept_stored_object',
    label: '存储对象 / stored object',
    domain: DBP, hint: DBP_HINT, domainName: '数据库原理',
    dims: ['数据库对象'],
    instances: [{ ref: 'mysql_glossary_stored_object_od8fkh', label: 'MySQL 存储对象 / MySQL stored object' }],
    def: '**存储对象 / stored object**\n存储在数据库服务器内、随模式一起管理的对象，统称**存储的程序**（stored program：存储过程、函数、触发器、事件）与**视图**（view）。\n\n它们把业务逻辑下沉到服务器端执行，与表、索引等共同构成模式（schema）的内容物。\n\n本节点只承载模型本体；各数据库实例在各自领域回指。',
    example: '**同构实例（服务器端托管对象）**：\n- **MySQL**：存储过程/函数/触发器/事件/视图（DDL 一并纳入 `INFORMATION_SCHEMA`/`SHOW` 管理）。\n- **PostgreSQL / Oracle / SQL Server**：均有同构的存储程序与视图体系。\n\n这些都属于「存储对象」通用概念的不同实现。',
  },
  {
    conceptId: 'concept_pthreads',
    label: 'Pthreads / POSIX 线程',
    domain: OS, hint: OS_HINT, domainName: '操作系统',
    dims: ['并发', '线程', '操作系统'],
    instances: [{ ref: 'mysql_glossary_pthreads_qfb7k4', label: 'MySQL Pthreads' }],
    def: '**Pthreads / POSIX 线程**\nPOSIX 定义的**线程标准**（IEEE Std 1003.1c），规定了 Unix/Linux 系统上线程的创建、join、互斥量（mutex）、条件变量等线程与锁定操作的 C 语言 API（`pthread_create`、`pthread_mutex_*` 等）。\n\n它是用户态多线程编程的基础接口，许多数据库与服务软件在其上构建并发结构。\n\n本节点只承载模型本体；各系统实例在各自领域回指。',
    example: '**同构实例（POSIX 线程 API 使用方）**：\n- **MySQL / InnoDB**：在 Unix/Linux 上以 Pthreads 实现 mutex 等同步原语。\n- **通用**：glibc / musl 提供的 `-lpthread` 实现是几乎所有 Linux 服务端软件的线程底座。\n\nPthreads 本体属操作系统域。',
  },
];

// ---------- 工具 ----------
function walk(n, fn, parent) {
  fn(n, parent);
  for (const c of (n.children || [])) walk(c, fn, n);
}
function findNode(id) {
  let hit = null;
  walk(tree, (n) => { if (!hit && n.id === id) hit = n; });
  return hit;
}
function isInSubtree(node, root) {
  let found = false;
  walk(root, (n) => { if (n === node) found = true; });
  return found;
}

const MYSQL_ROOT = findNode('forest:view:mysql');
if (!MYSQL_ROOT) throw new Error('未找到 MySQL 根 forest:view:mysql');

// ---------- 1) node-pool：建本体 + 改 MySQL 实例 ----------
for (const it of ITEMS) {
  pool[it.conceptId] = {
    id: it.conceptId,
    label: it.label,
    kind: 'Concept',
    role: 'plain',
    dimensions: it.dims,
    tags: [it.label, ...it.dims],
    card: {
      nodeId: it.conceptId,
      title: it.label,
      tabs: [
        { id: 'def', label: '定义（本体）', content: it.def },
        { id: 'example', label: '示例（跨域实例）', content: it.example },
      ],
      rootContent: it.def.split('\n').slice(0, 2).join(' ').replace(/\*\*/g, ''),
    },
  };
  for (const inst of it.instances) {
    const m = pool[inst.ref];
    if (!m) throw new Error(`缺少 MySQL 节点 ${inst.ref}`);
    const origDef = (m.card.tabs.find((t) => t.id === 'def') || m.card.tabs[0]).content;
    m.label = inst.label;
    m.dimensions = Array.from(new Set([...(m.dimensions || []), 'mysql']));
    m.tags = Array.from(new Set([...(m.tags || []), inst.label, 'mysql']));
    m.card.title = inst.label;
    m.card.tabs = [
      {
        id: 'def',
        label: '定义（MySQL 实例）',
        content: `**${inst.label}**\n「${it.label}」通用概念在 MySQL 中的具体呈现：\n\n${origDef}\n\n本节点是实例，其本体见「${it.label}」概念节点（${it.domainName}）。`,
      },
    ];
    m.card.rootContent = `**${inst.label}**\n「${it.label}」通用概念在 MySQL 中的具体呈现。本节点是实例，本体在${it.domainName}域。`;
  }
}

// ---------- 2) tree-data ----------
for (const it of ITEMS) {
  for (const inst of it.instances) {
    const hits = [];
    walk(tree, (n, parent) => { if (parent && n.nodeRef === inst.ref) hits.push({ n, parent }); });
    for (const { n, parent } of hits) {
      parent.children.splice(parent.children.indexOf(n), 1);
      console.log(`removed tree entry (${isInSubtree(parent, MYSQL_ROOT) ? 'MySQL 树' : parent.name}): ${n.name}`);
    }
  }
  const domain = findNode(it.domain);
  if (!domain) throw new Error(`未找到目标域树节点 ${it.domain}`);
  domain.children = domain.children || [];
  if (domain.children.some((c) => c.nodeRef === it.conceptId)) {
    console.log(`skip tree entry (exists): ${it.label}`);
    continue;
  }
  domain.children.push({
    id: `tree_${it.conceptId}`,
    name: it.label,
    count: 0,
    nodeRef: it.conceptId,
    children: it.instances.map((inst, i) => ({
      id: `tree_mysql_instance_${it.conceptId}_${i}`,
      name: pool[inst.ref].label,
      count: 0,
      nodeRef: inst.ref,
      children: [],
    })),
  });
}

// 未分类分支改名：剩的是连接器/语言生态词条，属 MySQL 生态而非跨域本体
const misc = findNode('tree_1787315799890_4kxe1m');
if (misc) {
  misc.name = '连接器与语言生态 / Connectors & Ecosystem';
  console.log('renamed 未分类 ->', misc.name);
}

// 剥离后清理空分支（预处理语句、逻辑约束）
for (const deadId of ['tree_1787322582387_zyze0n', 'tree_1787053688722_q01jcb']) {
  const node = findNode(deadId);
  if (node && (!node.children || node.children.length === 0)) {
    walk(tree, (n, parent) => {
      if (parent && n === node) parent.children.splice(parent.children.indexOf(n), 1);
    });
    console.log('removed empty branch:', deadId);
  }
}

// ---------- 3) edges：instance-of 回指边 ----------
for (const it of ITEMS) {
  for (const inst of it.instances) {
    const id = `rel:${it.conceptId}:instance-of:${inst.ref}`;
    if (!edges.find((e) => e.id === id)) {
      edges.push({ id, source: inst.ref, target: it.conceptId, type: 'instance-of', label: 'MySQL 实例' });
    }
  }
}

// ---------- 4) governance：placement ----------
const placements = gov.placements;
function upsertPlacement(p) {
  const i = placements.findIndex((x) => x.nodeId === p.nodeId);
  if (i >= 0) placements[i] = p;
  else placements.push(p);
}
for (const it of ITEMS) {
  upsertPlacement({
    id: `placement:concept:${it.conceptId}`,
    nodeId: it.conceptId,
    status: 'accepted',
    contentStatus: 'canonical',
    canonicalParentNodeId: it.domain,
    canonicalTreeEntryId: `tree_${it.conceptId}`,
    pathHint: [...it.hint, it.label],
    confidence: 'high',
    rule: 'cross-domain-peeling-v1',
    rationale: `本体属${it.domainName}域，自 MySQL 混合知识点剥离；MySQL 侧保留为实例并 instance-of 回指。`,
  });
}

// ---------- 5) 原子写回 ----------
function atomicWrite(file, obj) {
  const tmp = join(DATA, `${file}.tmp-${process.pid}`);
  writeFileSync(tmp, JSON.stringify(obj, null, 2), 'utf8');
  renameSync(tmp, join(DATA, file));
}
atomicWrite('node-pool.json', pool);
atomicWrite('tree-data.json', tree);
atomicWrite('knowledge-edges.json', edges);
atomicWrite('knowledge-governance.json', gov);
console.log('peel-mysql-schema-mixed complete:', ITEMS.length, 'concepts,', ITEMS.reduce((s, i) => s + i.instances.length, 0), 'instances');
