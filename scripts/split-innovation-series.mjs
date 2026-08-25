// 彻底拆分「创新系列」：本体(概念节点, 领域中立) + MySQL 实例节点。
// 先备份 data/*.json，再原子写（temp + rename），避免被回写覆盖。
import { readFileSync, writeFileSync, renameSync, mkdirSync, copyFileSync, existsSync } from 'node:fs';

const DATA = 'E:/project/Knowledge-OS/data';
const ts = new Date().toISOString().replace(/[:.]/g, '-');
const BACKUP = `${DATA}/backups/split-innovation-series-${ts}`;
mkdirSync(BACKUP, { recursive: true });

const FILES = ['node-pool.json', 'tree-data.json', 'knowledge-edges.json', 'knowledge-governance.json'];
for (const f of FILES) {
  copyFileSync(`${DATA}/${f}`, `${BACKUP}/${f}`);
  console.log('backup', f);
}

const read = (f) => JSON.parse(readFileSync(`${DATA}/${f}`, 'utf8'));
const writeAtomic = (f, obj) => {
  const tmp = `${DATA}/${f}.tmp-${ts}`;
  writeFileSync(tmp, JSON.stringify(obj, null, 2));
  renameSync(tmp, `${DATA}/${f}`);
};

const pool = read('node-pool.json');
const tree = read('tree-data.json');
const edges = read('knowledge-edges.json');
const gov = read('knowledge-governance.json');

const MYSQL_ID = 'mysql_glossary_innovation_series_1rj8dd';
const CONCEPT_ID = 'concept_innovation_series';
const ENGINE_PARENT_TREE = 'tree_1782833214675_r6mivn';   // 软件工程
const ENGINE_PARENT_NODE = 'k_1782833214639_nueg1f';     // 软件工程 nodeRef
const CONCEPT_TREE_ID = 'tree_concept_innovation_series_c1';

// --- A. 原 MySQL 节点 → MySQL 实例节点 ---
const mysqlNode = pool[MYSQL_ID];
mysqlNode.label = 'MySQL 创新系列 / MySQL Innovation Series';
mysqlNode.dimensions = ['发布模型', '版本管理', 'mysql'];
mysqlNode.tags = ['mysql', '创新系列', '版本模型', 'mysql-glossary'];
mysqlNode.card.title = 'MySQL 创新系列 / MySQL Innovation Series';
mysqlNode.card.tabs = [
  {
    id: 'def',
    label: '定义（MySQL 实例）',
    content:
      '**MySQL 创新系列 / MySQL Innovation Series**\n' +
      'MySQL 采用「创新系列 + LTS 系列」双轨发布模型。相同主版本的创新发布归入同一创新系列：' +
      'MySQL 8.1 到 8.3 构成 MySQL 8 创新系列；与之并行的是 LTS 系列（如 MySQL 8.4 LTS）。\n\n' +
      '这是「创新系列」发布模型概念在 MySQL 中的具体实例（见概念节点「创新系列」）。\n\n' +
      '来源：MySQL 官方术语表 glossary.html#glos_innovation_series（原始行 1430）',
  },
];
mysqlNode.card.rootContent =
  '**MySQL 创新系列 / MySQL Innovation Series**\n' +
  'MySQL 8.1 到 8.3 构成 MySQL 8 创新系列，是「创新系列」发布模型在 MySQL 中的实例。\n';

// --- B. 新建概念节点（领域中立，承载本体）---
pool[CONCEPT_ID] = {
  id: CONCEPT_ID,
  label: '创新系列 / Innovation Series',
  kind: 'Concept',
  role: 'plain',
  dimensions: ['发布模型', '版本管理'],
  tags: ['创新系列', '版本模型'],
  card: {
    nodeId: CONCEPT_ID,
    title: '创新系列 / Innovation Series',
    tabs: [
      {
        id: 'def',
        label: '定义（本体）',
        content:
          '**创新系列 / Innovation Series**\n' +
          '一种发布 / 版本模型：相同主版本的创新发布被归入同一「创新系列」，与长期支持（LTS）系列并行。\n\n' +
          '特征：快速引入新特性、较短的支持周期。\n\n' +
          'MySQL 是该模型最典型的实现（见「MySQL 创新系列」实例节点）。',
      },
      {
        id: 'example',
        label: '示例（跨域实例）',
        content:
          '**同构实例**：MySQL 8.1–8.3 构成 MySQL 8 创新系列；' +
          'Ubuntu 的短期版本、Node.js 的奇数版也采用类似的「创新 / 临时 + LTS」双轨模型。\n\n' +
          '本节点只承载模型本体，具体厂商实例在各自领域回指。',
      },
      {
        id: 'source',
        label: '来源',
        content:
          '通用发布工程概念；MySQL 术语见官方 glossary.html#glos_innovation_series。',
      },
    ],
    rootContent:
      '**创新系列 / Innovation Series**\n' +
      '一种发布 / 版本模型：相同主版本的创新发布归入同一创新系列，与 LTS 系列并行。',
  },
};

// --- C. tree-data：重命名两个投影 + 在软件工程下挂概念节点（真实条目）---
function walk(nodes) {
  for (const n of nodes || []) {
    if (n.nodeRef === MYSQL_ID && n.projection) n.name = 'MySQL 创新系列 / MySQL Innovation Series';
    if (n.children) walk(n.children);
  }
}
walk([tree]);
// 找到软件工程树条目并追加概念节点
function findAndAdd(nodes) {
  for (const n of nodes || []) {
    if (n.id === ENGINE_PARENT_TREE) {
      n.children = n.children || [];
      n.children.push({
        id: CONCEPT_TREE_ID,
        name: '创新系列 / Innovation Series',
        count: 0,
        nodeRef: CONCEPT_ID,
        children: [],
      });
      return true;
    }
    if (n.children && findAndAdd(n.children)) return true;
  }
  return false;
}
const added = findAndAdd([tree]);
console.log('概念节点挂到软件工程:', added);

// --- D. edges：实例→概念 + LTS→概念 ---
const newEdges = [
  {
    id: 'rel:mysql_innovation_series:instance-of:concept_innovation_series',
    source: MYSQL_ID,
    target: CONCEPT_ID,
    type: 'instance-of',
    label: '实例 of 发布模型概念',
    relationKind: 'reference',
  },
  {
    id: 'rel:lts_series:ref:concept_innovation_series',
    source: 'mysql_glossary_lts_series_lpbljr',
    target: CONCEPT_ID,
    type: 'related-to',
    label: '同属发布模型',
    relationKind: 'reference',
  },
];
edges.push(...newEdges);
console.log('新增边:', newEdges.length);

// --- D2. LTS 节点文本指向概念而非 MySQL 实例 ---
const lts = pool['mysql_glossary_lts_series_lpbljr'];
if (lts) {
  lts.card.tabs = (lts.card.tabs || []).map((t) =>
    t.content.includes('另见 创新系列')
      ? { ...t, content: t.content.replace('另见 创新系列。', '另见 创新系列（发布模型概念）。') }
      : t
  );
  if (lts.card.rootContent.includes('另见 创新系列')) {
    lts.card.rootContent = lts.card.rootContent.replace('另见 创新系列。', '另见 创新系列（发布模型概念）。');
  }
}

// --- E. governance：新增概念节点 placement ---
gov.placements.push({
  id: `placement:concept:${CONCEPT_ID}`,
  nodeId: CONCEPT_ID,
  status: 'accepted',
  contentStatus: 'canonical',
  canonicalParentNodeId: ENGINE_PARENT_NODE,
  canonicalTreeEntryId: CONCEPT_TREE_ID,
  pathHint: ['计算机科学', '软件开发（实践总览）', '软件工程', '创新系列 / Innovation Series'],
  confidence: 'high',
  rule: 'cross-domain-peeling-v1',
  rationale: '发布模型概念，领域中立；MySQL 仅作为实例回指。从 MySQL 术语节点剥离本体。',
});
console.log('新增 governance placement:', CONCEPT_ID);

// --- 写回（原子）---
writeAtomic('node-pool.json', pool);
writeAtomic('tree-data.json', tree);
writeAtomic('knowledge-edges.json', edges);
writeAtomic('knowledge-governance.json', gov);
console.log('DONE. 备份目录:', BACKUP);
