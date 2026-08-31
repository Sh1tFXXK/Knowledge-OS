// 数据库剩余章节批量整理（2026-08-31）
//  A. 融合章节同名文件夹：一、数据库系统→「数据库」；九、日志系统→「日志」
//  B. 同题实例合并 12 组（保留信息量大者，别名/独有点折入保留卡，薄卡摘树归档）
//  C. MySQL 视图 归位到「视图」节点；视图节点补定义
//  D. 「未分类」容器改名为「客户端连接器」并补卡
//  E. 高价值空卡补内容（数据仓库词条、使用案例、MySQL 页）
//  F. 全库解释卡剥离套话：「…中的具体呈现」头、「本节点是实例，其本体见…」尾、「英文：/中文：」对照行
//  G. 章节容器卡概览全部按当前子树重新生成
import { readFileSync, writeFileSync, renameSync, mkdirSync, copyFileSync } from 'fs';
import { join } from 'path';

const DATA = 'data';
const FILES = ['node-pool.json', 'tree-data.json', 'knowledge-edges.json', 'knowledge-governance.json'];
const ts = new Date().toISOString().replace(/[:.]/g, '-');
const backupDir = join(DATA, 'backups', `fix-db-chapters-batch-${ts}`);
mkdirSync(backupDir, { recursive: true });
for (const f of FILES) copyFileSync(join(DATA, f), join(backupDir, f));
console.log('backup ->', backupDir);

const pool = JSON.parse(readFileSync(join(DATA, 'node-pool.json'), 'utf8'));
const tree = JSON.parse(readFileSync(join(DATA, 'tree-data.json'), 'utf8'));
const edges = JSON.parse(readFileSync(join(DATA, 'knowledge-edges.json'), 'utf8'));
const gov = JSON.parse(readFileSync(join(DATA, 'knowledge-governance.json'), 'utf8'));

function findWithParent(node, pred, parent = null) {
  if (pred(node)) return { node, parent };
  for (const c of node.children || []) {
    const hit = findWithParent(c, pred, node);
    if (hit) return hit;
  }
  return null;
}
const byRef = (ref) => findWithParent(tree, (n) => n.nodeRef === ref);
function detachByRef(ref) {
  const hit = byRef(ref);
  if (!hit) throw new Error('tree entry not found: ' + ref);
  const i = hit.parent.children.indexOf(hit.node);
  hit.parent.children.splice(i, 1);
  return hit.node;
}
function refreshRoot(node) {
  const card = node.card;
  card.rootContent = [card.title || node.label, ...card.tabs.map((t) => t.content || '')].join(' ').replace(/\s+/g, ' ').trim();
}
function atomicWrite(file, obj) {
  const tmp = join(DATA, `${file}.tmp-${process.pid}`);
  writeFileSync(tmp, JSON.stringify(obj, null, 2), 'utf8');
  let ok = false;
  for (let i = 0; i < 8 && !ok; i++) {
    try { renameSync(tmp, join(DATA, file)); ok = true; }
    catch (err) {
      if (i === 7) throw err;
      console.log('rename busy, retry...');
      Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 300);
    }
  }
}

let db = null;
(function w(n) { if (n.nodeRef === 'n_u4va719e' && !db) db = n; for (const c of (n.children || [])) w(c); })(tree);
const chapterByName = (name) => { const c = (db.children || []).find(x => x.name === name); if (!c) throw new Error('chapter missing: ' + name); return c; };

const droppedRefs = new Set();   // 被归档/被摘除的节点
const promotedRefs = new Set();  // 被提升为章节直属的节点

// ---------- A1. 一、数据库系统 → 融合「数据库 / database」 ----------
{
  const ch = chapterByName('一、数据库系统');
  const folder = (ch.children || []).find(c => c.nodeRef === 'concept_database');
  if (!folder) throw new Error('数据库 folder missing');
  const instEntry = (folder.children || []).find(c => c.nodeRef === 'k_dict_lc7qrne8');
  if (!instEntry) throw new Error('MySQL 数据库 instance missing');
  // 本体并入实例卡
  const onto = pool['concept_database'];
  const ontoDef = onto.card.tabs.find(t => t.id === 'def');
  const inst = pool['k_dict_lc7qrne8'];
  const defTab = inst.card.tabs.find(t => t.id === 'def') || inst.card.tabs[0];
  defTab.content = defTab.content
    .replace(/「[^」]+」通用概念在[^：]*中的具体呈现：\n*/g, '')
    .replace(/\n*本节点是实例，其本体见[^。]*。/g, '');
  if (!inst.card.tabs.some(t => t.id === 'ontology')) {
    inst.card.tabs.splice(Math.min(1, inst.card.tabs.length), 0, { id: 'ontology', label: '本体（数据库 / database）', content: ontoDef.content });
  }
  refreshRoot(inst);
  // 提升 + 摘除
  const pos = ch.children.indexOf(folder);
  ch.children.splice(pos, 1);
  ch.children.splice(0, 0, instEntry);
  droppedRefs.add('concept_database');
  promotedRefs.add('k_dict_lc7qrne8');
  const pl = gov.placements.find(p => p.nodeId === 'concept_database');
  if (pl) pl.canonicalTreeEntryId = undefined;
  console.log('A1 done: 一、数据库系统 融合 数据库 文件夹');
}

// ---------- A2. 九、日志系统 → 融合「日志」容器 ----------
{
  const ch = chapterByName('九、日志系统');
  const folder = (ch.children || []).find(c => c.nodeRef === 'k_1787582631928_0i4c4u');
  if (!folder) throw new Error('日志 folder missing');
  const pos = ch.children.indexOf(folder);
  ch.children.splice(pos, 1);
  const kids = [...(folder.children || [])];
  ch.children.splice(pos, 0, ...kids);
  droppedRefs.add('k_1787582631928_0i4c4u');
  for (const k of kids) promotedRefs.add(k.nodeRef);
  console.log('A2 done: 九、日志系统 融合 日志 容器（提升', kids.length, '子树）');
}

// ---------- B. 同题实例合并 ----------
const MERGES = [
  // [conceptId, keepId, [dropIds], 折入保留卡的别名/要点行]
  ['concept_data_dictionary', 'mysql_glossary_serialized_dictionary_information_sdi_1ee69u',
    ['mysql_glossary_sdi_8vlmf5'], 'SDI 即「序列化字典信息」的缩写。'],
  ['concept_surrogate_key', 'mysql_glossary_synthetic_key_1drbjs',
    ['k_dict_xb5t6pmm'], '又称**代理键 / surrogate key**——两个名称同义。'],
  ['concept_primary_key', 'k_dict_xxkp8lkc',
    ['k_auto_va5371'], null],
  ['concept_unique_key', 'mysql_glossary_unique_constraint_cvzep',
    ['k_dict_rdm2280v'], '唯一键 / unique key 与唯一约束 / unique constraint 在 MySQL 中同义：定义唯一索引即施加唯一约束。'],
  ['concept_foreign_key', 'k_dict_lnpi0qrg',
    ['mysql_glossary_foreign_key_constraint_p6gdbr'], '外键列上施加的引用完整性检查即外键约束 / FOREIGN KEY constraint。'],
  ['concept_dynamic_sql', 'mysql_glossary_dynamic_statement_1evhmv',
    ['k_dict_p7los2aq'], null],
  ['concept_dirty_page', 'k_dict_rjl6lkaz',
    ['k_1781974756575_ldbdtp'], null],
  ['concept_physical_backup', 'mysql_glossary_physical_backup_1o7b7v',
    ['mysql_glossary_raw_backup_1s82jm'], '又称**原始备份 / raw backup**：按数据库自身存储格式原样复制的备份（区别于逻辑备份）。'],
  ['concept_change_buffer', 'k_1781901890734_vckmz5',
    ['mysql_glossary_insert_buffer_1xx0p8', 'mysql_glossary_insert_buffering_m9lmge'],
    '旧称**插入缓冲区 / insert buffer**（早期仅缓冲二级索引页的插入，后扩展为变更缓冲，覆盖 update/delete）；insert buffering 指这一缓冲过程本身。'],
  ['concept_io_bound', 'mysql_glossary_disk_bound_1eazx6',
    ['mysql_glossary_i_o_bound_9k72or'], '又称 **I/O 绑定 / I/O-bound**。'],
  ['concept_counter', 'mysql_glossary_counter_17gzh9',
    ['mysql_glossary_metrics_counter_1tynuw'], '性能监控场景下也称**指标计数器 / metrics counter**。'],
  ['concept_data_access_interface', 'mysql_glossary_api_y14yjr',
    ['mysql_glossary_application_programming_interface_api_73cc6c'], '应用程序编程接口（application programming interface）即 API 的全称。'],
];
for (const [conceptId, keepId, dropIds, foldLine] of MERGES) {
  const keep = pool[keepId];
  if (!keep) throw new Error('keep missing: ' + keepId);
  const defTab = keep.card.tabs.find(t => t.id === 'def') || keep.card.tabs[0];
  if (foldLine && !defTab.content.includes(foldLine.slice(0, 12))) {
    defTab.content = defTab.content.replace(/\n*本节点是实例，其本体见[^。]*。/g, '');
    defTab.content += '\n\n' + foldLine;
  }
  refreshRoot(keep);
  for (const dropId of dropIds) {
    const entry = byRef(dropId);
    if (!entry) throw new Error('drop tree entry missing: ' + dropId);
    if ((entry.node.children || []).length) throw new Error('drop has children: ' + dropId);
    entry.parent.children.splice(entry.parent.children.indexOf(entry.node), 1);
    pool[dropId].status = 'archived-redirect';
    gov.redirects.push({
      id: `redirect:${dropId}`, from: dropId, to: keepId,
      status: 'accepted', contentStatus: 'archived-redirect',
      rationale: `与「${pool[keepId].label}」同题实例，实质内容已并入保留卡后摘树归档。`,
    });
    droppedRefs.add(dropId);
  }
  console.log('merged:', pool[keepId].label, '<-', dropIds.join(', '));
}
// 被归档实例的 instance-of 边移除
let out = edges.filter(e => !(e.type === 'instance-of' && droppedRefs.has(e.source)));

// ---------- C. MySQL 视图 归位 ----------
{
  const ch3 = chapterByName('三、数据库结构');
  const viewEntry = (ch3.children || []).find(c => c.nodeRef === 'k_1784714555181_hzcpf5');
  if (!viewEntry) throw new Error('视图 node missing');
  const viewNode = pool['k_1784714555181_hzcpf5'];
  const def = viewNode.card.tabs.find(t => t.id === 'def') || (viewNode.card.tabs.push({ id: 'def', label: '定义' }), viewNode.card.tabs[0]);
  if (!(def.content || '').trim()) {
    def.content = '**视图 / view**\n基于 SQL 查询定义的**虚拟表**：保存查询定义而非数据本身，查询时动态生成结果集。常用于封装复杂查询、权限隔离与对外提供稳定接口。';
    viewNode.role = 'plain';
    refreshRoot(viewNode);
  }
  // MySQL 视图 从 存储对象 下移到 视图 下
  const mvEntry = detachByRef('k_dict_lm90vzok');
  viewEntry.children = viewEntry.children || [];
  viewEntry.children.push(mvEntry);
  console.log('C done: MySQL 视图 -> 视图 节点下');
}

// ---------- D. 未分类 → 客户端连接器 ----------
{
  const uf = pool['k_1787315799359_ne8gfs'];
  uf.label = '客户端连接器 / client connectors';
  if (!uf.card) {
    uf.card = { nodeId: uf.id, title: uf.label, tabs: [{ id: 'def', label: '定义', content: '' }], rootContent: '' };
  }
  uf.card.title = uf.label;
  if (!uf.card.tabs || !uf.card.tabs.length) uf.card.tabs = [{ id: 'def', label: '定义', content: '' }];
  const def = uf.card.tabs.find(t => t.id === 'def') || uf.card.tabs[0];
  def.content = '各语言与平台的 MySQL 客户端连接器与 API 聚合：JDBC、ODBC、.NET、Python、Ruby、Perl、PHP 等。应用通过连接器以统一协议访问 MySQL 服务端。';
  refreshRoot(uf);
  const e = byRef('k_1787315799359_ne8gfs');
  if (e) e.node.name = uf.label;
  console.log('D done: 未分类 -> 客户端连接器');
}

// ---------- E. 高价值空卡补内容 ----------
const FILLS = [
  ['k_dict_o5254svl', '**数据仓库 / data warehouse**\n面向**分析**而非在线事务的集中式数据存储：整合多来源、多主题的历史数据，支撑 OLAP 查询、报表与商业智能。与面向高并发短事务的 OLTP 系统相对。'],
  ['k_wiki_en_database_s10', '数据库的典型使用案例：事务处理（订单、支付、库存）、内容管理、用户与会话存储、配置与元数据管理、报表与数据分析等。'],
  ['k_1787209372193_jgoudp', 'InnoDB 磁盘管理的**最小物理单位**，默认 16KB（页大小由 innodb_page_size 配置）。常见类型：数据页、索引页、undo 页、系统页等；行数据按页组织，缓冲池以页为单位在磁盘与内存间换入换出。'],
];
for (const [id, content] of FILLS) {
  const p = pool[id];
  if (!p) throw new Error('fill target missing: ' + id);
  const def = p.card.tabs.find(t => t.id === 'def') || (p.card.tabs.push({ id: 'def', label: '定义' }), p.card.tabs[0]);
  if (!(def.content || '').trim()) {
    def.content = content;
    p.role = p.role || 'plain';
    refreshRoot(p);
    console.log('filled:', p.label);
  }
}

// ---------- F. 全库剥离套话 ----------
let stripped = 0;
const RE_HEADER = /「[^」]+」通用概念在[^：\n]*中的具体呈现：\s*\n?/g;
const RE_TAIL = /\n*\s*本节点是实例，其本体见[^。\n]*。\s*/g;
const RE_EN = /\n?英文：[^\n]*/g;
const RE_ZH = /\n?中文：[^\n]*/g;
for (const p of Object.values(pool)) {
  if (!p.card || !Array.isArray(p.card.tabs)) continue;
  let touched = false;
  for (const t of p.card.tabs) {
    const before = t.content || '';
    let after = before
      .replace(RE_HEADER, '')
      .replace(RE_TAIL, '\n')
      .replace(RE_EN, '')
      .replace(RE_ZH, '');
    after = after.replace(/\n{3,}/g, '\n\n').trim();
    if (after !== before) { t.content = after; touched = true; }
  }
  if (touched) { refreshRoot(p); stripped++; }
}
console.log('套话剥离卡数:', stripped);

// ---------- G. 章节容器卡概览重生成 ----------
for (const ch of (db.children || []).filter(c => /^([一二三四五六七八九十]+、|MySQL)/.test(c.name))) {
  const card = pool['container:' + ch.id];
  if (!card) continue;
  const kids = (ch.children || []).map(c => c.name);
  const summary = `本节点是导航容器，聚合 ${kids.length} 个子主题：${kids.slice(0, 6).join('、')}${kids.length > 6 ? '等' : ''}。点击子节点查看具体内容。`;
  card.label = ch.name;
  card.card.title = ch.name;
  card.card.tabs[0].content = `**${ch.name}**\n${summary}`;
  card.card.rootContent = [ch.name, summary].join(' ').replace(/\s+/g, ' ').trim();
}
console.log('章节容器卡概览已重生成');

// ---------- H. 边同步 ----------
out = out.filter(e => !(e.id.startsWith('treebind:') && (droppedRefs.has(e.target) || promotedRefs.has(e.target) || droppedRefs.has(e.source))));
console.log('edges ->', out.length);

// ---------- 校验 ----------
for (const ref of droppedRefs) {
  if (byRef(ref)) throw new Error('still in tree: ' + ref);
}
let dangling = 0;
(function chk(n) {
  if (n.nodeRef && !pool[n.nodeRef]) { dangling++; console.log('dangling:', n.name, n.nodeRef); }
  for (const c of (n.children || [])) chk(c);
})(tree);
console.log('校验: dropped 未摘净检查通过, 悬挂 =', dangling);

atomicWrite('node-pool.json', pool);
atomicWrite('tree-data.json', tree);
atomicWrite('knowledge-edges.json', out);
atomicWrite('knowledge-governance.json', gov);
console.log('fix-db-chapters-batch complete');
