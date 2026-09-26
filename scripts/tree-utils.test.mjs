import assert from 'node:assert/strict';
import test from 'node:test';
import {
  cloneTree,
  normalizeTreeNode,
  cloneTreeWithNewIds,
  findTreeNodeById,
  findTreeParent,
  moveTreeNode,
  moveTreeNodes,
  collectTreeNodes,
  collectTreeReferencesByNodeRef,
  appendTreeChild,
  removeTreeChild,
  updateTreeNode,
  getTreePathNames,
  countTreeNodes,
  detachKnowledgeBinding,
} from '../src/knowledge/treeUtils.ts';
function buildTree() {
  return {
    id: 'root',
    name: '根',
    children: [
      { id: 'a', name: 'A', nodeRef: 'node-a', children: [
        { id: 'a1', name: 'A1', nodeRef: 'node-a' },
        { id: 'a2', name: 'A2' },
      ] },
      { id: 'b', name: 'B', nodeRef: 'node-b' },
    ],
  };
}

test('findTreeNodeById / findTreeParent 定位节点与父节点', () => {
  const tree = buildTree();
  assert.equal(findTreeNodeById(tree, 'a2')?.name, 'A2');
  assert.equal(findTreeNodeById(tree, 'nope'), null);
  assert.equal(findTreeNodeById(tree, 'root')?.id, 'root');

  assert.equal(findTreeParent(tree, 'a1')?.id, 'a');
  assert.equal(findTreeParent(tree, 'a')?.id, 'root');
  // 根节点没有父节点
  assert.equal(findTreeParent(tree, 'root'), null);
  assert.equal(findTreeParent(tree, 'nope'), null);
});

test('collectTreeNodes / countTreeNodes 遍历全部节点', () => {
  const tree = buildTree();
  assert.deepEqual(collectTreeNodes(tree).map((n) => n.id), ['root', 'a', 'a1', 'a2', 'b']);
  assert.equal(countTreeNodes(tree), 5);
});

test('collectTreeReferencesByNodeRef 按 nodeRef 收集引用路径', () => {
  const refs = collectTreeReferencesByNodeRef(buildTree(), 'node-a');
  // 目录只存引用：两个目录项共享同一个节点池实体
  assert.deepEqual(refs.map((r) => r.treeNodeId), ['a', 'a1']);
  assert.deepEqual(refs[0].path, ['根', 'A']);
  assert.deepEqual(refs[1].path, ['根', 'A', 'A1']);
  assert.deepEqual(collectTreeReferencesByNodeRef(buildTree(), 'missing'), []);
});

test('appendTreeChild / removeTreeChild 增删保持原树不可变', () => {
  const tree = buildTree();
  const next = appendTreeChild(tree, 'b', { id: 'b1', name: 'B1' });
  assert.ok(findTreeNodeById(next, 'b')?.children?.some((c) => c.id === 'b1'));
  // 原树未被修改
  assert.ok(!findTreeNodeById(tree, 'b')?.children);

  const removed = removeTreeChild(next, 'b1');
  assert.ok(!findTreeNodeById(removed, 'b1'));
  // 父节点不存在时原样返回
  assert.equal(appendTreeChild(tree, 'nope', { id: 'x', name: 'X' }), tree);
  // 删除根节点返回 null（没有可以替代的树）
  assert.equal(removeTreeChild(tree, 'root'), null);
});

test('moveTreeNode 拒绝移入自身子树并正确落位', () => {
  const tree = buildTree();

  // a 不能移到自己的后代 a1 下面
  assert.equal(moveTreeNode(tree, 'a', 'a1'), null);
  // 移到同一父节点等于没动
  assert.equal(moveTreeNode(tree, 'a', 'root'), null);
  // 自身不能作为自己的父节点
  assert.equal(moveTreeNode(tree, 'a', 'a'), null);

  // 合法移动：a2 从 a 移到 b
  const moved = moveTreeNode(tree, 'a2', 'b');
  assert.ok(moved);
  assert.equal(moved.previousParentId, 'a');
  assert.equal(moved.nextParentId, 'b');
  assert.ok(findTreeNodeById(moved.tree, 'b')?.children?.some((c) => c.id === 'a2'));
  assert.ok(!findTreeNodeById(moved.tree, 'a')?.children?.some((c) => c.id === 'a2'));
  // 原树保持不变
  assert.ok(findTreeNodeById(tree, 'a')?.children?.some((c) => c.id === 'a2'));

  // 多节点批量移动：去重 + 只报告真正移动的
  const batch = moveTreeNodes(buildTree(), ['a2', 'a2', 'a1'], 'b');
  assert.deepEqual(batch.movedNodeIds, ['a2', 'a1']);
});

test('normalizeTreeNode 剥离 UI 态字段（expanded/icon）且递归处理', () => {
  const raw = {
    id: 'r',
    name: 'R',
    expanded: true,
    icon: 'folder',
    children: [{ id: 'c', name: 'C', expanded: false }],
  };
  const clean = normalizeTreeNode(raw);
  assert.equal('expanded' in clean, false);
  assert.equal('icon' in clean, false);
  assert.equal('expanded' in clean.children[0], false);
  assert.equal(clean.children[0].id, 'c');
});

test('cloneTree 深拷贝：改拷贝不影响原树', () => {
  const tree = buildTree();
  const copy = cloneTree(tree);
  copy.children[0].name = 'changed';
  assert.equal(tree.children[0].name, 'A');
});

test('cloneTreeWithNewIds 全树换 id 且保留结构', () => {
  const tree = buildTree();
  const seq = ['n1', 'n2', 'n3', 'n4', 'n5'];
  const next = cloneTreeWithNewIds(tree, () => seq.shift());
  assert.deepEqual(collectTreeNodes(next).map((n) => n.id).sort(), ['n1', 'n2', 'n3', 'n4', 'n5']);
  assert.deepEqual(collectTreeNodes(next).map((n) => n.name).sort(), ['A', 'A1', 'A2', 'B', '根']);
});

test('updateTreeNode 打补丁；目标不存在时原样返回', () => {
  const tree = buildTree();
  const renamed = updateTreeNode(tree, 'a', { name: 'A*' });
  assert.equal(findTreeNodeById(renamed, 'a')?.name, 'A*');
  assert.equal(updateTreeNode(tree, 'nope', { name: 'x' }), tree);
});

test('getTreePathNames 返回根到目标的名称路径', () => {
  const tree = buildTree();
  assert.deepEqual(getTreePathNames(tree, 'a2'), ['根', 'A', 'A2']);
  assert.deepEqual(getTreePathNames(tree, 'root'), ['根']);
  assert.deepEqual(getTreePathNames(tree, 'nope'), []);
});

test('detachKnowledgeBinding 命中条目移除、子条目上移', () => {
  const tree = buildTree();
  const next = detachKnowledgeBinding(tree, 'node-b');
  assert.equal(findTreeNodeById(next, 'b'), null);
  assert.equal(findTreeNodeById(next, 'a')?.name, 'A');
});

test('detachKnowledgeBinding 按 nodeRef 命中，多处引用一次清干净，子条目保级', () => {
  const tree = buildTree();
  // node-a 同时绑在 a 与 a1 两个目录条目上；删本体后两处绑定都要没，a2 上移到根。
  const next = detachKnowledgeBinding(tree, 'node-a');
  assert.deepEqual(
    collectTreeNodes(next).map((n) => n.id),
    ['root', 'a2', 'b'],
  );
  assert.equal(findTreeNodeById(next, 'a2')?.nodeRef, undefined);
  assert.equal(collectTreeNodes(next).some((n) => n.nodeRef === 'node-a'), false);
});

test('detachKnowledgeBinding 兼容按 id 绑定的历史条目；根条目只清绑定', () => {
  const tree = buildTree();
  assert.equal(findTreeNodeById(detachKnowledgeBinding(tree, 'a2'), 'a2'), null);

  const rooted = { id: 'root', name: '根', nodeRef: 'node-root', children: [{ id: 'c', name: 'C' }] };
  const next = detachKnowledgeBinding(rooted, 'node-root');
  assert.equal(next.id, 'root');
  assert.equal(next.nodeRef, undefined);
  assert.equal(findTreeNodeById(next, 'c')?.name, 'C');
});
