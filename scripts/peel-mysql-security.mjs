// 剥离 MySQL 域 · 安全/Kerberos 簇（2026-08-23，第十批，用户「完成」）
// 用户：把 MySQL 安全主题下所有通用安全/认证概念（Kerberos/KDC/TGS/principal/keystore/SSL/trust 等）
// 按「本体 vs 实例」范式剥离到安全本体域 school_security（计算机科学 > 安全）。
// 注意：这些是通用安全概念，不属于 database_principles（数据库原理），故落到 school_security。
//
// 同义/缩写合并（一个概念 + 多个 MySQL 实例）：
//  - authentication server 含 AS（缩写）
//  - service principal name 含 SPN（缩写）
//  - partial trust 含 medium trust（同义词）
// 故 15 个 MySQL 词节点 → 12 个通用概念。
//
// 关键坑：k_dict_dedl7dno（SSL）同时被密码学域的别名节点
//   mysql_term_cryptography_ssl_ykk31j（nodeRef=k_dict_dedl7dno）引用。
//   detachByRef 必须只扫 MySQL 子树，否则会把密码学别名也摘掉；
//   摘完后把该别名 nodeRef 改指 concept_ssl（密码学域引用概念而非 MySQL 实例，更正确）。
import { readFileSync, writeFileSync, renameSync, mkdirSync, copyFileSync } from 'fs';
import { join } from 'path';

const DATA = 'data';
const FILES = ['node-pool.json', 'tree-data.json', 'knowledge-edges.json', 'knowledge-governance.json'];
const ts = new Date().toISOString().replace(/[:.]/g, '-');
const backupDir = join(DATA, 'backups', `peel-mysql-security-${ts}`);
mkdirSync(backupDir, { recursive: true });
for (const f of FILES) copyFileSync(join(DATA, f), join(backupDir, f));
console.log('backup ->', backupDir);

const pool = JSON.parse(readFileSync(join(DATA, 'node-pool.json'), 'utf8'));
const tree = JSON.parse(readFileSync(join(DATA, 'tree-data.json'), 'utf8'));
const edges = JSON.parse(readFileSync(join(DATA, 'knowledge-edges.json'), 'utf8'));
const gov = JSON.parse(readFileSync(join(DATA, 'knowledge-governance.json'), 'utf8'));

function walk(n, fn, parent) { fn(n, parent); for (const c of (n.children || [])) walk(c, fn, n); }
function findNode(id) { let hit = null; walk(tree, n => { if (!hit && n.id === id) hit = n; }); return hit; }
const MYSQL_ROOT = findNode('forest:view:mysql');
const TARGET = 'school_security'; // 安全本体域
const targetNode = findNode(TARGET);
if (!targetNode) { console.error('TARGET domain not found:', TARGET); process.exit(1); }
const TARGET_HINT = ['计算机科学', '安全'];

// 12 个通用概念（安全/Kerberos 本体）
const NEWS = [
  { conceptId: 'concept_authentication_server', label: '认证服务器 / authentication server', dims: ['安全', '认证', 'Kerberos'],
    def: '**认证服务器 / authentication server（AS）**\n在 Kerberos 等认证体系中，向客户端颁发票证授予票证（TGT）的服务器；它与票证授予服务器（TGS）共同构成密钥分发中心（KDC）。是身份核验的第一道关口。\n\n本节点只承载模型本体；各系统的认证服务器实现作为实例挂其下。',
    example: '**同构实例**：Kerberos 的 AS 角色、MySQL 启用 Kerberos 认证时由 KDC 中的 AS 颁发 TGT。' },
  { conceptId: 'concept_ticket_granting_server', label: '票证授予服务器 / ticket-granting server', dims: ['安全', '认证', 'Kerberos'],
    def: '**票证授予服务器 / ticket-granting server（TGS）**\n在 Kerberos 中，向持有 TGT 的客户端颁发服务票据的服务器；与认证服务器（AS）结合构成密钥分发中心（KDC）。TGS 也指其提供的票证授予服务本身。\n\n本节点只承载模型本体；各系统的 TGS 实现作为实例挂其下。',
    example: '**同构实例**：Kerberos 的 TGS 角色。' },
  { conceptId: 'concept_ticket_granting_ticket', label: '票证授予票证 / ticket-granting ticket', dims: ['安全', '认证', 'Kerberos'],
    def: '**票证授予票证 / ticket-granting ticket（TGT）**\n在 Kerberos 中由认证服务器（AS）颁发、客户端凭其向票证授予服务器（TGS）换取服务票据的票证，是获取其他服务访问凭证的"万能钥匙"。\n\n本节点只承载模型本体；各系统的 TGT 实现作为实例挂其下。',
    example: '**同构实例**：Kerberos TGT。' },
  { conceptId: 'concept_key_distribution_center', label: '密钥分发中心 / key distribution center', dims: ['安全', '认证', 'Kerberos'],
    def: '**密钥分发中心 / key distribution center（KDC）**\n分发密钥的可信第三方，由认证服务器（AS）与票证授予服务器（TGS）组成，是 Kerberos 认证体系的核心枢纽。\n\n本节点只承载模型本体；各系统的 KDC 实现作为实例挂其下。',
    example: '**同构实例**：Kerberos KDC（如 MIT Krb5、Active Directory 的 KDC 角色）。' },
  { conceptId: 'concept_principal', label: '主体 / principal', dims: ['安全', '认证', '身份'],
    def: '**主体 / principal**\n安全与认证领域中被命名的安全实体，如用户或服务器；是认证与授权的基本对象。在 Kerberos 中泛指可被认证的身份。\n\n本节点只承载模型本体；各系统的主体概念作为实例挂其下。',
    example: '**同构实例**：Kerberos principal（用户主体 / 服务主体）。' },
  { conceptId: 'concept_service_principal_name', label: '服务主体名称 / service principal name', dims: ['安全', '认证', 'Kerberos'],
    def: '**服务主体名称 / service principal name（SPN）**\n标识某项服务的命名实体名称，用于在 Kerberos 中定位服务主体，使客户端能请求到正确服务的票证。\n\n本节点只承载模型本体；各系统的 SPN 实现作为实例挂其下。',
    example: '**同构实例**：Kerberos SPN（如 `MYSERVICE/host@example.com`）。' },
  { conceptId: 'concept_service_ticket', label: '服务票据 / service ticket', dims: ['安全', '认证', 'Kerberos'],
    def: '**服务票据 / service ticket**\n在 Kerberos 中授予访问某应用服务（如 Web 服务器或数据库服务器）的票证，由 TGS 凭 TGT 签发。\n\n本节点只承载模型本体；各系统的服务票据实现作为实例挂其下。',
    example: '**同构实例**：Kerberos service ticket。' },
  { conceptId: 'concept_user_principal_name', label: '用户主体名称 / user principal name', dims: ['安全', '认证', '身份'],
    def: '**用户主体名称 / user principal name（UPN）**\n标识用户的命名实体名称，用于在 Kerberos 中定位用户主体。\n\n本节点只承载模型本体；各系统的 UPN 实现作为实例挂其下。',
    example: '**同构实例**：Kerberos UPN（如 `user@EXAMPLE.COM`）。' },
  { conceptId: 'concept_partial_trust', label: '部分信任 / partial trust', dims: ['安全', '信任模型', '沙盒'],
    def: '**部分信任 / partial trust**\n对执行环境中主体所拥有权限范围的描述：主体可能拥有部分权限（如能联网访问数据库服务器，但被"沙盒化"限制本地文件读写）。相比于低/中/高三档的简化划分，更强调权限是连续而非离散的。\n\n本节点只承载模型本体；各系统的部分信任/沙盒模型作为实例挂其下。',
    example: '**同构实例**：.NET 的部分信任沙盒、数据库驱动运行时的受限执行环境。' },
  { conceptId: 'concept_keystore', label: '密钥库 / keystore', dims: ['安全', '密钥管理', '证书'],
    def: '**密钥库 / keystore**\n存储私钥与证书的安全容器，供服务端或客户端管理自身密钥材料与身份凭证。\n\n本节点只承载模型本体；各系统的密钥库实现作为实例挂其下。',
    example: '**同构实例**：Java KeyStore（JKS）、PKCS#12 容器。' },
  { conceptId: 'concept_truststore', label: '信任库 / truststore', dims: ['安全', '密钥管理', '证书'],
    def: '**信任库 / truststore**\n存储受信任证书的安全容器，用于在建立安全连接（如 SSL/TLS）时验证对端实体身份。\n\n本节点只承载模型本体；各系统的信任库实现作为实例挂其下。',
    example: '**同构实例**：Java TrustStore、CA 证书库。' },
  { conceptId: 'concept_ssl', label: '安全套接层 / SSL', dims: ['安全', '密码学', '传输加密'],
    def: '**安全套接层 / SSL（及其继任者 TLS）**\n在网络通信两端之间提供加密层的安全协议，保障传输的机密性与完整性，并对端实体进行身份认证。\n\n本节点只承载模型本体；各系统的 SSL/TLS 实现作为实例挂其下。',
    example: '**同构实例**：MySQL 与客户端之间的 SSL/TLS 加密连接、HTTPS。' },
];

// 15 个 MySQL 词节点 → 12 个概念（同义/缩写合并为同概念的多个实例）
const MAPS = [
  { ref: 'mysql_glossary_authentication_server_1njohk', conceptId: 'concept_authentication_server', inst: 'MySQL 认证服务器 / authentication server' },
  { ref: 'mysql_glossary_as_h5mr7x', conceptId: 'concept_authentication_server', inst: 'MySQL AS（认证服务器）' },
  { ref: 'mysql_glossary_ticket_granting_server_1cuy2c', conceptId: 'concept_ticket_granting_server', inst: 'MySQL 票证授予服务器 / TGS' },
  { ref: 'mysql_glossary_ticket_granting_ticket_14xqfb', conceptId: 'concept_ticket_granting_ticket', inst: 'MySQL 票证授予票证 / TGT' },
  { ref: 'mysql_glossary_key_distribution_center_fhraw7', conceptId: 'concept_key_distribution_center', inst: 'MySQL 密钥分发中心 / KDC' },
  { ref: 'mysql_glossary_principal_1llz4f', conceptId: 'concept_principal', inst: 'MySQL 主体 / principal' },
  { ref: 'mysql_glossary_service_principal_name_4syyjd', conceptId: 'concept_service_principal_name', inst: 'MySQL 服务主体名称 / SPN' },
  { ref: 'mysql_glossary_spn_qxzu3s', conceptId: 'concept_service_principal_name', inst: 'MySQL SPN（服务主名称）' },
  { ref: 'mysql_glossary_service_ticket_oqmgfc', conceptId: 'concept_service_ticket', inst: 'MySQL 服务票据 / service ticket' },
  { ref: 'mysql_glossary_user_principal_name_daz6wj', conceptId: 'concept_user_principal_name', inst: 'MySQL 用户主体名称 / UPN' },
  { ref: 'mysql_glossary_partial_trust_rcrlto', conceptId: 'concept_partial_trust', inst: 'MySQL 部分信任 / partial trust' },
  { ref: 'mysql_glossary_medium_trust_113pv6', conceptId: 'concept_partial_trust', inst: 'MySQL 中等信任 / medium trust' },
  { ref: 'mysql_glossary_keystore_1khbxb', conceptId: 'concept_keystore', inst: 'MySQL 密钥库 / keystore' },
  { ref: 'mysql_glossary_truststore_rgbyfy', conceptId: 'concept_truststore', inst: 'MySQL 信任库 / truststore' },
  { ref: 'k_dict_dedl7dno', conceptId: 'concept_ssl', inst: 'MySQL 安全套接层 / SSL' },
];

const createdConcepts = [];
for (const it of NEWS) {
  if (pool[it.conceptId]) { console.log('skip existing concept:', it.conceptId); continue; }
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
  targetNode.children = targetNode.children || [];
  targetNode.children.push({ id: `tree_${it.conceptId}`, name: it.label, count: 0, nodeRef: it.conceptId, children: [] });
  createdConcepts.push(it.conceptId);
}
console.log('created concepts:', createdConcepts.length);

// 仅扫 MySQL 子树，避免误摘密码学域的 SSL 别名节点
function detachByRef(ref) {
  let existing = null;
  const hits = [];
  walk(MYSQL_ROOT, (n, parent) => { if (parent && n.nodeRef === ref) hits.push({ n, parent }); });
  for (const { n, parent } of hits) {
    parent.children.splice(parent.children.indexOf(n), 1);
    if (!existing) existing = n;
  }
  return existing;
}
let mapped = 0, skipped = 0;
for (const it of MAPS) {
  const m = pool[it.ref];
  const concept = pool[it.conceptId];
  if (!m || !concept) { console.log('skip missing:', it.ref); skipped++; continue; }
  const tabs = (m.card && m.card.tabs) || [];
  const origDef = (tabs.find((t) => t.id === 'def') || tabs[0] || {}).content || '';
  m.label = it.inst;
  m.dimensions = Array.from(new Set([...(m.dimensions || []), 'mysql']));
  m.tags = Array.from(new Set([...(m.tags || []), it.inst, 'mysql']));
  m.card = m.card || {};
  m.card.title = it.inst;
  m.card.tabs = [
    { id: 'def', label: '定义（MySQL 实例）',
      content: `**${it.inst}**\n「${concept.label}」通用概念在 MySQL 中的具体呈现：\n\n${origDef}\n\n本节点是实例，其本体见「${concept.label}」概念节点（安全域）。` },
  ];
  m.card.rootContent = `**${it.inst}**\n「${concept.label}」通用概念在 MySQL 中的具体呈现。本节点是实例，本体在安全域。`;
  const conceptEntry = findNode(`tree_${it.conceptId}`);
  if (!conceptEntry) { console.log('skip no tree entry:', it.conceptId); skipped++; continue; }
  const detached = detachByRef(it.ref);
  if (!detached) { console.log('skip not under MySQL:', it.ref); skipped++; continue; }
  detached.name = it.inst;
  detached.projection = false;
  delete detached.view; delete detached.projectionKind; delete detached.sourceNodeId;
  conceptEntry.children = conceptEntry.children || [];
  conceptEntry.children.push(detached);
  mapped++;
  console.log(`mapped ${it.inst} -> ${concept.label}`);
}

// 密码学域的 SSL 别名节点改指 concept_ssl（引用概念而非 MySQL 实例，更正确）
const sslAlias = findNode('mysql_term_cryptography_ssl_ykk31j');
if (sslAlias && pool['concept_ssl']) {
  sslAlias.nodeRef = 'concept_ssl';
  console.log('repointed cryptography SSL alias -> concept_ssl');
}

// 移除已空的主题/话题容器
const EMPTY_THEMES = ['mysql:theme:security-access', 'mysql_topic_security_auth'];
let removedThemes = 0;
for (const tid of EMPTY_THEMES) {
  const t = findNode(tid);
  if (!t) continue;
  if ((t.children || []).length > 0) { console.log('主题非空，保留:', tid, t.children.map(c => c.name)); continue; }
  walk(tree, (n, parent) => {
    if (parent && parent.children) {
      const i = parent.children.findIndex(c => c.id === tid);
      if (i >= 0) { parent.children.splice(i, 1); }
    }
  });
  removedThemes++;
  console.log('removed empty theme:', tid);
}

// 通用清理（nodeRef 为空的残留空容器）
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
console.log('removed empty themes:', removedThemes, '| other empty containers:', removedEmpty, '| mapped:', mapped, '| skipped:', skipped);

for (const it of MAPS) {
  const id = `rel:${it.conceptId}:instance-of:${it.ref}`;
  if (!edges.find((e) => e.id === id)) {
    edges.push({ id, source: it.ref, target: it.conceptId, type: 'instance-of', label: 'MySQL 实例' });
  }
}

const placements = gov.placements;
function upsertPlacement(p) {
  const i = placements.findIndex((x) => x.nodeId === p.nodeId);
  if (i >= 0) placements[i] = p; else placements.push(p);
}
for (const it of NEWS) {
  upsertPlacement({
    id: `placement:concept:${it.conceptId}`, nodeId: it.conceptId,
    status: 'accepted', contentStatus: 'canonical',
    canonicalParentNodeId: TARGET, canonicalTreeEntryId: `tree_${it.conceptId}`,
    pathHint: [...TARGET_HINT, it.label], confidence: 'high', rule: 'cross-domain-peeling-v1',
    rationale: `通用安全/认证概念，自 MySQL 安全簇剥离；MySQL 侧保留为实例并 instance-of 回指。`,
  });
}
for (const it of MAPS) {
  if (!pool[it.ref] || !pool[it.conceptId]) continue;
  upsertPlacement({
    id: `placement:instance:${it.ref}`, nodeId: it.ref,
    status: 'accepted', contentStatus: 'canonical',
    canonicalParentNodeId: it.conceptId, canonicalTreeEntryId: `tree_${it.conceptId}`,
    pathHint: [...TARGET_HINT, pool[it.conceptId].label, it.inst], confidence: 'high', rule: 'cross-domain-peeling-v1',
    rationale: `MySQL 实例，自 MySQL 安全簇剥离；本体见「${pool[it.conceptId].label}」（安全域）。`,
  });
}

function atomicWrite(file, obj) {
  const tmp = join(DATA, `${file}.tmp-${process.pid}`);
  writeFileSync(tmp, JSON.stringify(obj, null, 2), 'utf8');
  renameSync(tmp, join(DATA, file));
}
atomicWrite('node-pool.json', pool);
atomicWrite('tree-data.json', tree);
atomicWrite('knowledge-edges.json', edges);
atomicWrite('knowledge-governance.json', gov);
console.log('peel-mysql-security complete: concepts+=', createdConcepts.length, 'instances=', mapped);
