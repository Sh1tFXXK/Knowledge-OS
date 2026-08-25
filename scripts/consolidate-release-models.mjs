import { readFileSync, writeFileSync, renameSync, mkdirSync, copyFileSync } from 'fs';
import { join } from 'path';

const DATA = 'data';
const FILES = ['node-pool.json', 'tree-data.json', 'knowledge-edges.json', 'knowledge-governance.json'];
const ts = new Date().toISOString().replace(/[:.]/g, '-');
const backupDir = join(DATA, 'backups', `consolidate-release-models-${ts}`);
mkdirSync(backupDir, { recursive: true });
for (const f of FILES) copyFileSync(join(DATA, f), join(backupDir, f));
console.log('backup ->', backupDir);

const pool = JSON.parse(readFileSync(join(DATA, 'node-pool.json'), 'utf8'));
const tree = JSON.parse(readFileSync(join(DATA, 'tree-data.json'), 'utf8'));
const edges = JSON.parse(readFileSync(join(DATA, 'knowledge-edges.json'), 'utf8'));
const gov = JSON.parse(readFileSync(join(DATA, 'knowledge-governance.json'), 'utf8'));

// ---------- node-pool: 本体簇 group + 三个新概念本体 ----------
pool['concept_release_model'] = {
  id: 'concept_release_model',
  label: '发布与版本模型 / Release & Versioning Model',
  kind: 'Concept',
  dimensions: ['发布模型', '版本管理', '软件生命周期'],
  tags: ['发布模型', '版本管理', '创新系列', 'LTS系列', 'GA', 'Beta'],
  card: {
    nodeId: 'concept_release_model',
    title: '发布与版本模型 / Release & Versioning Model',
    tabs: [
      { id: 'def', label: '定义（本体）', content: '**发布与版本模型 / Release & Versioning Model**\n描述软件如何被组织成「系列」、并在生命周期中从一个阶段推进到下一个（如 Beta → GA）的一族模型。\n\n核心成员：\n- **创新系列 / Innovation Series**：快速引入特性的短周期系列。\n- **LTS 系列 / LTS Series**：长期支持系列。\n- **Beta / 测试版**：生命周期的早期评估阶段。\n- **GA / Generally Available**：离开 Beta、可供生产使用的阶段。\n\n各概念的知识本体在本簇下独立成节点；厂商实例（如 MySQL）作为「一种类型」挂在各本体之下。' },
      { id: 'example', label: '示例（跨域实例）', content: '**MySQL 的实现**：MySQL 8 采用「创新系列 + LTS 系列」双轨；版本经历 early adopter（类似 Beta）阶段后达到 GA。Ubuntu 的 LTS、Node.js 的 LTS 线、各类预发布通道也都采用同构模型。' },
    ],
    rootContent: '**发布与版本模型 / Release & Versioning Model**\n描述软件如何被组织成「系列」并推进到 GA 的一族模型，含创新系列、LTS 系列、Beta、GA。',
  },
};

pool['concept_lts_series'] = {
  id: 'concept_lts_series',
  label: 'LTS系列 / LTS Series',
  kind: 'Concept',
  dimensions: ['发布模型', '版本管理'],
  tags: ['LTS系列 / LTS Series', 'LTS系列', '版本模型'],
  card: {
    nodeId: 'concept_lts_series',
    title: 'LTS系列 / LTS Series',
    tabs: [
      { id: 'def', label: '定义（本体）', content: '**LTS系列 / LTS Series**\n一种发布 / 版本模型：相同主版本号的长期支持（Long-Term Support）版本被归入同一「LTS 系列」，以较长的支持周期换取稳定性。\n\n与「创新系列」并行：创新系列快速引入特性、周期短；LTS 系列稳定、支持长。\n\n本节点只承载模型本体，厂商实例在各自领域回指（见「MySQL LTS系列」实例节点）。' },
      { id: 'example', label: '示例（跨域实例）', content: '**同构实例**：MySQL 8.4.x 构成 MySQL 8.4 LTS 系列；Ubuntu 的 LTS 版本、Node.js 的 LTS 线也采用长期支持模型。' },
    ],
    rootContent: '**LTS系列 / LTS Series**\n一种发布 / 版本模型：相同主版本号的长期支持版本归入同一 LTS 系列，与「创新系列」并行。',
  },
};

pool['concept_ga'] = {
  id: 'concept_ga',
  label: 'GA / Generally Available',
  kind: 'Concept',
  dimensions: ['发布模型', '版本管理', '软件生命周期'],
  tags: ['GA', '普遍可用', '版本模型'],
  card: {
    nodeId: 'concept_ga',
    title: 'GA / Generally Available',
    tabs: [
      { id: 'def', label: '定义（本体）', content: '**GA / Generally Available（普遍可用）**\n软件产品生命周期中的一个状态：离开 Beta / 早期评估阶段，可供销售、官方支持和生产使用。\n\n它是版本从「预发布」走向「正式发布」的里程碑，与 Beta 构成前后相继的关系。' },
      { id: 'example', label: '示例（跨域实例）', content: '**实例**：MySQL 的 LTS / 创新系列版本在成熟后达到 GA（如 MySQL 8.4 LTS 即 GA 版本）。多数软件以 GA 标记首个可生产版本。' },
    ],
    rootContent: '**GA / Generally Available（普遍可用）**\n软件生命周期状态：离开 Beta，可供销售、官方支持和生产使用。',
  },
};

pool['concept_beta'] = {
  id: 'concept_beta',
  label: 'Beta / 测试版',
  kind: 'Concept',
  dimensions: ['发布模型', '版本管理', '软件生命周期'],
  tags: ['Beta', '测试版', '版本模型'],
  card: {
    nodeId: 'concept_beta',
    title: 'Beta / 测试版',
    tabs: [
      { id: 'def', label: '定义（本体）', content: '**Beta / 测试版**\n软件产品生命周期中的早期阶段，此时仅供评估，通常没有明确的版本号或版本号小于 1。\n\n它是 GA 的前置阶段：产品经历 Beta（或类似 early adopter 的阶段）后，最终达到 GA 发布。' },
      { id: 'example', label: '示例（跨域实例）', content: '**实例**：MySQL 的创新系列版本在 GA 前常经历 early adopter（类似 Beta）阶段；部分项目直接以 Beta 标记预发布版本。' },
    ],
    rootContent: '**Beta / 测试版**\n软件生命周期早期阶段，仅供评估，通常为 GA 的前置阶段。',
  },
};

// 把 GA / Beta 的既有节点重构为「MySQL 实例类型」（保留 id，避免断链）
const ga = pool['mysql_glossary_ga_ql2xt1'];
ga.label = 'MySQL GA / MySQL Generally Available';
ga.dimensions = ['发布模型', '版本管理', 'mysql'];
ga.tags = ['MySQL GA', 'mysql', 'glossary', 'ga', '发布模型'];
ga.card.title = 'MySQL GA / MySQL Generally Available';
ga.card.tabs = [{ id: 'def', label: '定义（MySQL 实例）', content: '**MySQL GA / MySQL Generally Available**\n在 MySQL 中，版本（无论是 LTS 系列还是创新系列）在经历 early adopter 等阶段后达到 **GA（普遍可用）** 状态，即可供生产使用并获官方支持。\n\n例如，MySQL 8.4 LTS 在发布时即为 GA 版本。\n\n这是「GA / 普遍可用」发布模型在 MySQL 中的实例；其通用本体见「GA」概念节点。\n\n来源：MySQL Glossary（GA）。' }];
ga.card.rootContent = '**MySQL GA / MySQL Generally Available**\nMySQL 版本在 early adopter 阶段后达到 GA 状态，可供生产使用。本节点是「GA」概念在 MySQL 中的实例。';

const beta = pool['mysql_glossary_beta_1cp3ef'];
beta.label = 'MySQL Beta / MySQL 测试版';
beta.dimensions = ['发布模型', '版本管理', 'mysql'];
beta.tags = ['MySQL Beta', 'mysql', 'glossary', 'beta', '发布模型'];
beta.card.title = 'MySQL Beta / MySQL 测试版';
beta.card.tabs = [{ id: 'def', label: '定义（MySQL 实例）', content: '**MySQL Beta / MySQL 测试版**\n在 MySQL 中，创新系列等新版本在 GA 之前通常经历 **early adopter（早期采用者）** 阶段——一个类似于 Beta 的评估期，常延续多个小版本。\n\n`InnoDB` 不使用 beta 标识，而是倾向于 early adopter 阶段，最终导致 **GA** 发布。\n\n这是「Beta / 测试版」发布模型在 MySQL 中的实例；其通用本体见「Beta」概念节点。\n\n来源：MySQL Glossary（beta）。' }];
beta.card.rootContent = '**MySQL Beta / MySQL 测试版**\nMySQL 版本在 GA 前经历 early adopter（类似 Beta）阶段。本节点是「Beta」概念在 MySQL 中的实例。';

// ---------- tree-data: 建簇并把四个概念本体归到一起 ----------
const SOFT_ENG_ID = 'tree_1782833214675_r6mivn';
function findNode(n, id) { if (n.id === id) return n; for (const c of (n.children || [])) { const r = findNode(c, id); if (r) return r; } return null; }
function removeChild(n, id) {
  if (!n.children) return false;
  const i = n.children.findIndex((c) => c.id === id);
  if (i >= 0) { n.children.splice(i, 1); return true; }
  for (const c of n.children) { if (removeChild(c, id)) return true; }
  return false;
}

const softEng = findNode(tree, SOFT_ENG_ID);
const innovationEntry = findNode(tree, 'tree_concept_innovation_series_c1');

function mysqlInstanceChild(nodeRef) {
  return {
    id: `projection:mysql-term:${nodeRef}`,
    name: pool[nodeRef].label,
    count: 0,
    nodeRef,
    projection: true,
    view: 'mysql-architecture',
    projectionKind: 'canonical-topic',
    sourceNodeId: nodeRef,
    children: [],
  };
}

const groupEntry = {
  id: 'tree_concept_release_model_rm',
  name: '发布与版本模型 / Release & Versioning Model',
  count: 0,
  nodeRef: 'concept_release_model',
  children: [
    innovationEntry,
    { id: 'tree_concept_lts_series', name: pool['concept_lts_series'].label, count: 0, nodeRef: 'concept_lts_series', children: [mysqlInstanceChild('mysql_glossary_lts_series_lpbljr')] },
    { id: 'tree_concept_ga', name: pool['concept_ga'].label, count: 0, nodeRef: 'concept_ga', children: [mysqlInstanceChild('mysql_glossary_ga_ql2xt1')] },
    { id: 'tree_concept_beta', name: pool['concept_beta'].label, count: 0, nodeRef: 'concept_beta', children: [mysqlInstanceChild('mysql_glossary_beta_1cp3ef')] },
  ],
};

removeChild(softEng, 'tree_concept_innovation_series_c1');
softEng.children.push(groupEntry);

// ---------- knowledge-edges: 概念间关系 + 实例边 ----------
function addEdge(id, source, target, type, label) {
  if (!edges.find((e) => e.id === id)) edges.push({ id, source, target, type, label: label || '' });
}
const ltsEdge = edges.find((e) => e.id === 'rel:lts_series:ref:concept_innovation_series');
if (ltsEdge) {
  ltsEdge.id = 'rel:lts_series:instance-of:concept_lts_series';
  ltsEdge.source = 'mysql_glossary_lts_series_lpbljr';
  ltsEdge.target = 'concept_lts_series';
  ltsEdge.type = 'instance-of';
  ltsEdge.label = 'MySQL 实例';
}
addEdge('rel:concept_lts_series:related-to:concept_innovation_series', 'concept_lts_series', 'concept_innovation_series', 'related-to', '并行轨道');
addEdge('rel:mysql_ga:instance-of:concept_ga', 'mysql_glossary_ga_ql2xt1', 'concept_ga', 'instance-of', 'MySQL 实例');
addEdge('rel:mysql_beta:instance-of:concept_beta', 'mysql_glossary_beta_1cp3ef', 'concept_beta', 'instance-of', 'MySQL 实例');
addEdge('rel:concept_beta:related-to:concept_ga', 'concept_beta', 'concept_ga', 'related-to', '生命周期推进');
addEdge('rel:concept_innovation_series:member-of:concept_release_model', 'concept_innovation_series', 'concept_release_model', 'related-to', '属于发布与版本模型');
addEdge('rel:concept_lts_series:member-of:concept_release_model', 'concept_lts_series', 'concept_release_model', 'related-to', '属于发布与版本模型');
addEdge('rel:concept_ga:member-of:concept_release_model', 'concept_ga', 'concept_release_model', 'related-to', '属于发布与版本模型');
addEdge('rel:concept_beta:member-of:concept_release_model', 'concept_beta', 'concept_release_model', 'related-to', '属于发布与版本模型');

// ---------- governance: 补 placement ----------
const placements = gov.placements;
function upsertPlacement(p) {
  const i = placements.findIndex((x) => x.nodeId === p.nodeId);
  if (i >= 0) placements[i] = p; else placements.push(p);
}
const SOFT_ENG_POOL = 'k_1782833214639_nueg1f';
const RM_PATH = ['计算机科学', '软件开发（实践总览）', '软件工程', '发布与版本模型 / Release & Versioning Model'];
upsertPlacement({ id: 'placement:concept:concept_release_model', nodeId: 'concept_release_model', status: 'accepted', contentStatus: 'canonical', canonicalParentNodeId: SOFT_ENG_POOL, canonicalTreeEntryId: 'tree_concept_release_model_rm', pathHint: RM_PATH });
upsertPlacement({ id: 'placement:concept:concept_lts_series', nodeId: 'concept_lts_series', status: 'accepted', contentStatus: 'canonical', canonicalParentNodeId: 'concept_release_model', canonicalTreeEntryId: 'tree_concept_lts_series', pathHint: [...RM_PATH, 'LTS系列 / LTS Series'] });
upsertPlacement({ id: 'placement:concept:concept_ga', nodeId: 'concept_ga', status: 'accepted', contentStatus: 'canonical', canonicalParentNodeId: 'concept_release_model', canonicalTreeEntryId: 'tree_concept_ga', pathHint: [...RM_PATH, 'GA / Generally Available'] });
upsertPlacement({ id: 'placement:concept:concept_beta', nodeId: 'concept_beta', status: 'accepted', contentStatus: 'canonical', canonicalParentNodeId: 'concept_release_model', canonicalTreeEntryId: 'tree_concept_beta', pathHint: [...RM_PATH, 'Beta / 测试版'] });
const ci = placements.find((x) => x.nodeId === 'concept_innovation_series');
if (ci) {
  ci.canonicalParentNodeId = 'concept_release_model';
  ci.canonicalTreeEntryId = 'tree_concept_innovation_series_c1';
  ci.pathHint = [...RM_PATH, '创新系列 / Innovation Series'];
}

// ---------- 原子写入 ----------
function atomicWrite(file, obj) {
  const tmp = join(DATA, `${file}.tmp-${process.pid}`);
  writeFileSync(tmp, JSON.stringify(obj, null, 2), 'utf8');
  renameSync(tmp, join(DATA, file));
}
atomicWrite('node-pool.json', pool);
atomicWrite('tree-data.json', tree);
atomicWrite('knowledge-edges.json', edges);
atomicWrite('knowledge-governance.json', gov);
console.log('consolidation complete');
