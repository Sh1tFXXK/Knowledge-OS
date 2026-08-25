// 剥离 MySQL 域第六批（2026-08-23）：存储程序、数据库对象与元数据、连接器生态、数据类型
// 集中模式：本体挂「数据库原理」（存储程序嵌套在已有 concept_stored_object 下），
// MySQL 节点/分支整体迁移为实例子文件，不留在 MySQL 树。
import { readFileSync, writeFileSync, renameSync, mkdirSync, copyFileSync } from 'fs';
import { join } from 'path';

const DATA = 'data';
const FILES = ['node-pool.json', 'tree-data.json', 'knowledge-edges.json', 'knowledge-governance.json'];
const ts = new Date().toISOString().replace(/[:.]/g, '-');
const backupDir = join(DATA, 'backups', `peel-mysql-remaining-mixed-${ts}`);
mkdirSync(backupDir, { recursive: true });
for (const f of FILES) copyFileSync(join(DATA, f), join(backupDir, f));
console.log('backup ->', backupDir);

const pool = JSON.parse(readFileSync(join(DATA, 'node-pool.json'), 'utf8'));
const tree = JSON.parse(readFileSync(join(DATA, 'tree-data.json'), 'utf8'));
const edges = JSON.parse(readFileSync(join(DATA, 'knowledge-edges.json'), 'utf8'));
const gov = JSON.parse(readFileSync(join(DATA, 'knowledge-governance.json'), 'utf8'));

const DBP = 'database_principles';
const HINT = ['计算机科学', '信息系统', '数据库管理', '数据库', '数据库原理'];

const C = (conceptId, label, dims, def, example, parentConcept) => ({
  conceptId, label, dims, def, example, parentConcept, instances: [],
});
const I = (c, ref) => { c.instances.push({ ref }); return c; };

const storedProgram = I(C('concept_stored_program', '存储程序 / stored program', ['数据库对象', 'SQL'],
  '**存储程序 / stored program**\n存储在数据库服务器内、可按名调用执行的程序对象，统称存储过程（procedure）、存储函数（function）、触发器（trigger）与事件（event）。把逻辑下沉到服务器端执行，可复用、减少网络往返，但增加服务器负载与版本管理复杂度。配套概念有游标（cursor，逐行遍历结果集）与存储例程（stored routine，过程/函数统称）。\n\n本节点只承载模型本体；各数据库实例与子条目挂其下。',
  '**同构实例**：MySQL 存储过程/函数/触发器/事件、PostgreSQL PL/pgSQL 函数与触发器、Oracle PL/SQL、SQL Server T-SQL 存储过程。', 'concept_stored_object'), 'mysql_glossary_stored_program_mzfpca');

const dataDictionary = C('concept_data_dictionary', '数据字典 / data dictionary', ['数据库对象', '元数据'],
  '**数据字典 / data dictionary**\n数据库系统中**跟踪所有对象元数据**（表、列、索引、权限等定义）的目录（catalog），是服务器解析、优化与授权的依据。业界标准形态是 SQL 标准定义的 INFORMATION_SCHEMA 只读视图接口；各产品另有内部物理存储形态（如序列化字典信息 SDI，把元数据冗余存进表空间以便离线解析）。\n\n本节点只承载模型本体；各数据库实例挂其下。',
  '**同构实例**：MySQL 8.0 数据字典 + INFORMATION_SCHEMA（+ InnoDB SDI）、PostgreSQL pg_catalog 与 information_schema、Oracle 数据字典视图（DBA_/ALL_/USER_）。');
dataDictionary.instances.push(
  { ref: 'k_dict_nsqweksd' }, { ref: 'k_dict_qus727rl' },
  { ref: 'mysql_glossary_sdi_8vlmf5' }, { ref: 'mysql_glossary_serialized_dictionary_information_sdi_1ee69u' });

const accessInterface = I(C('concept_data_access_interface', '数据访问接口与连接生态 / data access interfaces & connector ecosystem', ['数据访问', '中间件', '生态'],
  '**数据访问接口与连接生态**\n应用程序连接与操作数据库的**标准化 API 与驱动体系**：跨语言的标准接口（JDBC、ODBC、ADO.NET）与各数据库厂商/社区提供的连接器、客户端库、语言绑定。标准接口屏蔽厂商差异，连接器把标准调用翻译为具体数据库协议。\n\n本节点承载通用本体；各数据库的连接器与语言绑定作为实例挂其下。',
  '**同构实例**：JDBC（Java）、ODBC（C/C++）、ADO.NET（.NET）、Python DB-API、各厂商 Connector/驱动。'), 'mysql_glossary_connector_ijze9c');

const integerType = I(C('concept_integer_type', '整数类型 / integer type', ['数据类型'],
  '**整数类型 / integer type**\n取值为整数的 SQL 数值数据类型，按位宽与是否有符号划分为多档（如 1/2/3/4/8 字节），位宽决定取值范围与存储开销；配合自增（auto-increment）属性常用于生成代理键。\n\n本节点只承载模型本体；各数据库实例挂其下。',
  '**同构实例**：MySQL TINYINT~BIGINT、PostgreSQL smallint/integer/bigint、标准 SQL INTEGER/SMALLINT。'), 'k_1782749047493_w36knu');
const realType = I(C('concept_real_type', '实数类型 / real type', ['数据类型'],
  '**实数类型 / real type**\n表示带小数的近似/精确数值的 SQL 数据类型：浮点（FLOAT/DOUBLE，二进制近似、有精度误差）与定点（DECIMAL/NUMERIC，精确、按定义精度存储）两大流派；金融等精确场景须用定点。\n\n本节点只承载模型本体；各数据库实例挂其下。',
  '**同构实例**：MySQL FLOAT/DOUBLE/DECIMAL、PostgreSQL real/double precision/numeric、IEEE 754 浮点语义。'), 'k_1782749263813_199twh');
const stringType = I(C('concept_string_type', '字符串类型 / string type', ['数据类型'],
  '**字符串类型 / string type**\n存储字符/文本数据的 SQL 数据类型，按定长/变长、二进制/字符、带/不带字符集与排序规则（collation）划分；定长补齐、变长带长度前缀，大文本另设大对象类型。\n\n本节点只承载模型本体；各数据库实例挂其下。',
  '**同构实例**：MySQL CHAR/VARCHAR/BINARY/VARBINARY + charset、PostgreSQL char/varchar/text、SQL 标准 CHARACTER VARYING。'), 'k_1782749276682_qsjks8');
const enumType = I(C('concept_enum_type', '枚举类型 / enum type', ['数据类型'],
  '**枚举类型 / enum type**\n取值限定于**预定义枚举列表**之一的数据类型：紧凑（按序号存储）且自带取值约束；代价是修改枚举集需要 DDL、可移植性差，部分产品不提供（改用 CHECK 约束达成同等语义）。\n\n本节点只承载模型本体；各数据库实例挂其下。',
  '**同构实例**：MySQL ENUM/SET、PostgreSQL 原生 ENUM 类型（CREATE TYPE）、CHECK 约束等价方案。'), 'k_1782749287355_2zl67c');

const ITEMS = [storedProgram, dataDictionary, accessInterface, integerType, realType, stringType, enumType];
// 连接器生态分支整体作为实例挂到 concept_data_access_interface
const ECOSYSTEM_BRANCH_ID = 'tree_1787315799890_4kxe1m';

// ---------- 工具 ----------
function walk(n, fn, parent) { fn(n, parent); for (const c of (n.children || [])) walk(c, fn, n); }
function findNode(id) { let hit = null; walk(tree, (n) => { if (!hit && n.id === id) hit = n; }); return hit; }
function findByRef(ref) { let hit = null; walk(tree, (n) => { if (!hit && n.nodeRef === ref) hit = n; }); return hit; }
const MYSQL_ROOT = findNode('forest:view:mysql');
if (!MYSQL_ROOT) throw new Error('未找到 MySQL 根');

// ---------- 1) node-pool ----------
for (const it of ITEMS) {
  if (pool[it.conceptId]) throw new Error(`concept id 冲突: ${it.conceptId}`);
  pool[it.conceptId] = {
    id: it.conceptId, label: it.label, kind: 'Concept', role: 'plain',
    dimensions: it.dims, tags: [it.label, ...it.dims],
    card: {
      nodeId: it.conceptId, title: it.label,
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
    const tabs = (m.card && m.card.tabs) || [];
    const origDef = (tabs.find((t) => t.id === 'def') || tabs[0] || {}).content || '';
    inst.label = `MySQL ${m.label}`;
    m.label = inst.label;
    m.dimensions = Array.from(new Set([...(m.dimensions || []), 'mysql']));
    m.tags = Array.from(new Set([...(m.tags || []), inst.label, 'mysql']));
    m.card.title = inst.label;
    m.card.tabs = [
      {
        id: 'def', label: '定义（MySQL 实例）',
        content: `**${inst.label}**\n「${it.label}」通用概念在 MySQL 中的具体呈现：\n\n${origDef}\n\n本节点是实例，其本体见「${it.label}」概念节点（数据库原理）。`,
      },
    ];
    m.card.rootContent = `**${inst.label}**\n「${it.label}」通用概念在 MySQL 中的具体呈现。本节点是实例。`;
  }
}

// ---------- 2) tree-data ----------
function detachByRef(ref) {
  let existing = null;
  const hits = [];
  walk(tree, (n, parent) => { if (parent && n.nodeRef === ref) hits.push({ n, parent }); });
  for (const { n, parent } of hits) {
    parent.children.splice(parent.children.indexOf(n), 1);
    if (!existing && !n.projection) existing = n;
  }
  return existing;
}
for (const it of ITEMS) {
  const entry = {
    id: `tree_${it.conceptId}`, name: it.label, count: 0, nodeRef: it.conceptId,
    children: it.instances.map((inst, i) => {
      const existing = detachByRef(inst.ref);
      if (existing) {
        existing.name = pool[inst.ref].label;
        existing.projection = false;
        delete existing.view; delete existing.projectionKind; delete existing.sourceNodeId;
        return existing;
      }
      return { id: `tree_mysql_instance_${it.conceptId}_${i}`, name: pool[inst.ref].label, count: 0, nodeRef: inst.ref, children: [] };
    }),
  };
  const parent = it.parentConcept ? findByRef(it.parentConcept) : findNode(DBP);
  if (!parent) throw new Error(`未找到父节点 for ${it.label}`);
  parent.children = parent.children || [];
  parent.children.push(entry);
}
// 连接器与语言生态分支整体挂到 concept_data_access_interface 下
const ecoBranch = findNode(ECOSYSTEM_BRANCH_ID);
const accessEntry = findByRef('concept_data_access_interface');
if (ecoBranch && accessEntry) {
  walk(tree, (n, parent) => {
    if (parent && n === ecoBranch) parent.children.splice(parent.children.indexOf(n), 1);
  });
  ecoBranch.name = 'MySQL 连接器与语言生态 / MySQL Connectors & Ecosystem';
  accessEntry.children.push(ecoBranch);
  console.log('connector ecosystem branch -> concept_data_access_interface');
}
// 清空分支删除（schema-objects、数据类型）
for (const deadId of ['mysql:theme:schema-objects', 'tree_1782748910933_jw2hib']) {
  const node = findNode(deadId);
  if (node && (!node.children || node.children.length === 0)) {
    walk(tree, (n, parent) => { if (parent && n === node) parent.children.splice(parent.children.indexOf(n), 1); });
    console.log('removed empty branch:', deadId);
  }
}
// MySQL 子树空容器清理
let removedEmpty = 0, changed = true;
while (changed) {
  changed = false;
  const empties = [];
  walk(MYSQL_ROOT, (n, parent) => {
    if (parent && !n.nodeRef && (!n.children || n.children.length === 0)) empties.push({ n, parent });
  });
  for (const { n, parent } of empties) {
    parent.children.splice(parent.children.indexOf(n), 1);
    removedEmpty++; changed = true;
  }
}
console.log('removed empty MySQL containers:', removedEmpty);

// ---------- 3) edges ----------
for (const it of ITEMS) {
  for (const inst of it.instances) {
    const id = `rel:${it.conceptId}:instance-of:${inst.ref}`;
    if (!edges.find((e) => e.id === id)) {
      edges.push({ id, source: inst.ref, target: it.conceptId, type: 'instance-of', label: 'MySQL 实例' });
    }
  }
}
// 生态分支整体：给分支 nodeRef（如有）加边
if (ecoBranch && ecoBranch.nodeRef) {
  const id = 'rel:concept_data_access_interface:instance-of:ecosystem-branch';
  if (!edges.find((e) => e.id === id)) {
    edges.push({ id, source: ecoBranch.nodeRef, target: 'concept_data_access_interface', type: 'instance-of', label: 'MySQL 连接器生态' });
  }
}

// ---------- 4) governance ----------
const placements = gov.placements;
function upsertPlacement(p) {
  const i = placements.findIndex((x) => x.nodeId === p.nodeId);
  if (i >= 0) placements[i] = p; else placements.push(p);
}
for (const it of ITEMS) {
  upsertPlacement({
    id: `placement:concept:${it.conceptId}`, nodeId: it.conceptId,
    status: 'accepted', contentStatus: 'canonical',
    canonicalParentNodeId: it.parentConcept || DBP,
    canonicalTreeEntryId: `tree_${it.conceptId}`,
    pathHint: [...HINT, ...(it.parentConcept ? ['存储对象 / stored object'] : []), it.label],
    confidence: 'high', rule: 'cross-domain-peeling-v1',
    rationale: '通用数据库概念，自 MySQL 混合知识点剥离；MySQL 侧保留为实例并 instance-of 回指。',
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
console.log('peel-mysql-remaining-mixed complete:', ITEMS.length, 'concepts');
