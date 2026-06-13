import { readFileSync, writeFileSync } from 'node:fs';

const FILE = new URL('../data/node-pool.json', import.meta.url);
const pool = JSON.parse(readFileSync(FILE, 'utf8'));

// ── 1. demo_lock 维度乱码修复 ──
const lockDim = pool.demo_lock.viewDimensions[0];
lockDim.name = '多维分类';
lockDim.hint = '同一批锁原子，按粒度/引擎/操作/策略四套规矩分别投影；粒度对比矩阵归属本节点结论区，子节点引用并高亮自己。';
const lockTitles = {
  lock_grain_grid: '按锁粒度',
  lock_engine_grid: '按存储引擎',
  lock_type_grid: '按操作类型',
  lock_strategy_grid: '按锁策略',
  lock_grain_matrix: '锁粒度对比',
};
for (const section of lockDim.sections) {
  if (lockTitles[section.id]) section.title = lockTitles[section.id];
}
const matrix = lockDim.sections.find((s) => s.id === 'lock_grain_matrix');
matrix.config.columns = [
  { key: 'grain', label: '粒度' },
  { key: 'cost', label: '开销' },
  { key: 'deadlock', label: '死锁' },
  { key: 'concurrency', label: '并发' },
];
const lockAttrs = {
  demo_table_lock: { grain: '粗', cost: '低', deadlock: '不会', concurrency: '低' },
  demo_page_lock: { grain: '中', cost: '中', deadlock: '会', concurrency: '中' },
  demo_row_lock: { grain: '细', cost: '高', deadlock: '会', concurrency: '高' },
};
for (const atom of matrix.atoms) {
  if (lockAttrs[atom.nodeId]) atom.attrs = lockAttrs[atom.nodeId];
}

// ── 2. Page 维度乱码修复 + 链式引用改回既有节点 + 语义组 ──
const page = pool.k_1781002610469_nik1ek;
const pageDim = page.viewDimensions[0];
pageDim.name = 'page结构';
pageDim.hint = '16KB 物理空间内，每个原子以真实 offset/size 占位';
for (const section of pageDim.sections) {
  if (section.id === 'page_16kb_stack') section.title = '16KB 物理布局';
  if (section.id === 'page_link_chain') {
    section.title = '页间双向链表';
    section.atoms = section.atoms.map((atom) => {
      if (atom.nodeId === 'k_auto_fvo7ug') return { ...atom, nodeId: 'k_1781008748598_72gaz3' };
      if (atom.nodeId === 'k_auto_fvmooo') return { ...atom, nodeId: 'k_1781008786381_wiun1h' };
      return atom;
    });
  }
  if (section.id === 'page_category_grid') section.title = '页类型分类';
}
pageDim.groups = [
  {
    id: 'page_group_row_record',
    label: '行记录',
    nodeId: 'k_1781107266786_b2goai',
    members: ['k_1781026368980_68t0s0', 'k_1781005866277_bj0eht'],
  },
  {
    id: 'page_group_common',
    label: '通用部分',
    nodeId: 'k_1781027323338_n7l44z',
    members: ['k_1781003561186_d5ngg6', 'k_1781008515280_bvqrs9'],
  },
];

// ── 3. 删除与既有节点重复的 k_auto 原子 ──
delete pool.k_auto_fvo7ug;
delete pool.k_auto_fvmooo;

// ── 4. k_auto_* 节点的 tab 标签乱码修复 ──
const TAB_LABELS = { def: '定义', mech: '机制', bound: '边界', source: '来源' };
for (const node of Object.values(pool)) {
  for (const tab of node.card?.tabs ?? []) {
    if (TAB_LABELS[tab.id] && tab.label.includes('?')) tab.label = TAB_LABELS[tab.id];
  }
}

writeFileSync(FILE, JSON.stringify(pool, null, 2) + '\n', 'utf8');

// ── 5. 复查：列出仍含 '?' 的字符串 ──
const leftovers = [];
(function walk(value, path) {
  if (typeof value === 'string' && value.includes('?')) leftovers.push(`${path}: ${value}`);
  else if (Array.isArray(value)) value.forEach((item, i) => walk(item, `${path}[${i}]`));
  else if (value && typeof value === 'object')
    Object.entries(value).forEach(([k, v]) => walk(v, `${path}.${k}`));
})(pool, '$');
console.log(leftovers.length ? leftovers.join('\n') : 'CLEAN: no "?" left');
