// 验证结构化结果：新节点树、绑定、卡片瘦身、题目关联
import { readFileSync } from 'fs';
const pool = JSON.parse(readFileSync('data/node-pool.json', 'utf8'));
const tree = JSON.parse(readFileSync('data/tree-data.json', 'utf8'));
const edges = JSON.parse(readFileSync('data/knowledge-edges.json', 'utf8'));

const hit = findWithParent(tree, n => n.nodeRef === 'demo_composite_index');
function findWithParent(node, pred, parent = null) {
  if (pred(node)) return { node, parent };
  for (const c of node.children || []) {
    const h = findWithParent(c, pred, node);
    if (h) return h;
  }
  return null;
}
(function d(n, depth) {
  console.log(' '.repeat(depth * 2) + n.name + ' [' + n.nodeRef + ']');
  for (const c of (n.children || [])) d(c, depth + 1);
})(hit.node, 0);

console.log('\n=== MySQL 组合索引卡（瘦身后）===');
console.log(pool['demo_composite_index'].card.tabs[0].content);

console.log('\n=== 新节点绑定检查 ===');
for (const id of ['leftmost_prefix_rule', 'lpf_case_in_order', 'lpf_case_skip_left', 'lpf_case_reordered', 'joint_index_sort_structure', 'jis_first_column_global', 'jis_second_column_local', 'jis_skip_leftmost_corollary']) {
  const b = edges.filter(e => e.id.startsWith('treebind:') && e.target === id);
  const ok = b.length === 1 && !!pool[b[0].source];
  console.log(id, '->', ok ? '绑定: ' + b[0].source : '缺绑定!');
}
// 内容完整性：瘦身卡删掉的信息点都在新节点里
const allNew = ['leftmost_prefix_rule', 'lpf_case_in_order', 'lpf_case_skip_left', 'lpf_case_reordered', 'joint_index_sort_structure', 'jis_first_column_global', 'jis_second_column_local', 'jis_skip_leftmost_corollary']
  .map(id => pool[id].card.tabs.map(t => t.content).join(' ')).join(' ');
for (const kw of ['user_level=\'A\'', '优化器', '全局有序', '局部有序', 'leftmost-prefix-btree.png', '无法定位']) {
  console.log('信息点[' + kw + ']:', allNew.includes(kw) ? '保留' : '丢失!');
}
