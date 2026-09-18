import type { TreeNode, TreeRefSupplement } from '../types';

export interface TreeNodeReference {
  treeNodeId: string;
  name: string;
  path: string[];
  supplement?: TreeRefSupplement;
}

export function cloneTree(node: TreeNode): TreeNode {
  return {
    ...node,
    children: node.children ? node.children.map(cloneTree) : undefined,
  };
}

export function normalizeTreeNode(node: TreeNode): TreeNode {
  const {
    expanded: _expanded,
    icon: _icon,
    children,
    ...rest
  } = node as TreeNode & { icon?: string };
  return {
    ...rest,
    children: children ? children.map(normalizeTreeNode) : undefined,
  };
}

export function cloneTreeWithNewIds(
  node: TreeNode,
  createId: () => string,
): TreeNode {
  const { children, ...rest } = normalizeTreeNode(node);
  return {
    ...rest,
    id: createId(),
    children: children
      ? children.map((child) => cloneTreeWithNewIds(child, createId))
      : undefined,
  };
}

export function findTreeNodeById(root: TreeNode, id: string): TreeNode | null {
  if (id == null) return null;
  if (root.id != null && root.id === id) return root;
  if (root.children) {
    for (const child of root.children) {
      const found = findTreeNodeById(child, id);
      if (found) return found;
    }
  }
  return null;
}

export function findTreeParent(root: TreeNode, childId: string): TreeNode | null {
  if (childId == null) return null;
  if (root.children) {
    if (root.children.some((c) => c.id != null && c.id === childId)) return root;
    for (const child of root.children) {
      const found = findTreeParent(child, childId);
      if (found) return found;
    }
  }
  return null;
}

export interface MoveTreeNodeResult {
  tree: TreeNode;
  movedNode: TreeNode;
  previousParentId: string;
  nextParentId: string;
}

export interface MoveTreeNodesResult {
  tree: TreeNode;
  movedNodeIds: string[];
}

export function moveTreeNodes(
  root: TreeNode,
  nodeIds: string[],
  nextParentId: string,
): MoveTreeNodesResult {
  let tree = root;
  const movedNodeIds: string[] = [];

  for (const nodeId of [...new Set(nodeIds)]) {
    const moved = moveTreeNode(tree, nodeId, nextParentId);
    if (!moved) continue;
    tree = moved.tree;
    movedNodeIds.push(nodeId);
  }

  return { tree, movedNodeIds };
}

export function collectTreeNodes(node: TreeNode): TreeNode[] {
  return [node, ...(node.children ? node.children.flatMap(collectTreeNodes) : [])];
}

export function collectTreeReferencesByNodeRef(
  root: TreeNode,
  nodeRef: string,
): TreeNodeReference[] {
  const references: TreeNodeReference[] = [];

  const walk = (node: TreeNode, path: string[]) => {
    const nextPath = [...path, node.name];
    if (node.nodeRef === nodeRef) {
      references.push({
        treeNodeId: node.id,
        name: node.name,
        path: nextPath,
        supplement: node.supplement,
      });
    }
    for (const child of node.children ?? []) {
      walk(child, nextPath);
    }
  };

  walk(root, []);
  return references;
}

export function countTreeNodes(node: TreeNode): number {
  return collectTreeNodes(node).length;
}

export function updateTreeNode(
  root: TreeNode,
  nodeId: string,
  patch: Partial<Pick<TreeNode, 'name' | 'nodeRef' | 'supplement'>>,
): TreeNode {
  const next = cloneTree(root);
  const target = findTreeNodeById(next, nodeId);
  if (!target) return root;
  Object.assign(target, patch);
  return next;
}

export function appendTreeChild(root: TreeNode, parentId: string, child: TreeNode): TreeNode {
  const next = cloneTree(root);
  const parent = findTreeNodeById(next, parentId);
  if (!parent) return root;
  if (!parent.children) parent.children = [];
  parent.children.push(child);
  return next;
}

export function removeTreeChild(root: TreeNode, nodeId: string): TreeNode | null {
  if (root.id === nodeId) return null;
  const next = cloneTree(root);
  const parent = findTreeParent(next, nodeId);
  if (!parent?.children) return next;
  parent.children = parent.children.filter((c) => c.id !== nodeId);
  return next;
}

export function moveTreeNode(
  root: TreeNode,
  nodeId: string,
  nextParentId: string,
): MoveTreeNodeResult | null {
  if (root.id === nodeId || nodeId === nextParentId) return null;

  const currentParent = findTreeParent(root, nodeId);
  const movingNode = findTreeNodeById(root, nodeId);
  const nextParent = findTreeNodeById(root, nextParentId);

  if (!currentParent || !movingNode || !nextParent) return null;
  if (currentParent.id === nextParentId) return null;
  if (findTreeNodeById(movingNode, nextParentId)) return null;

  const next = cloneTree(root);
  const clonedCurrentParent = findTreeParent(next, nodeId);
  const clonedNextParent = findTreeNodeById(next, nextParentId);
  if (!clonedCurrentParent?.children || !clonedNextParent) return null;

  const movingIndex = clonedCurrentParent.children.findIndex((child) => child.id === nodeId);
  if (movingIndex < 0) return null;

  const [movedNode] = clonedCurrentParent.children.splice(movingIndex, 1);
  if (!clonedNextParent.children) clonedNextParent.children = [];
  clonedNextParent.children.push(movedNode);

  return {
    tree: next,
    movedNode,
    previousParentId: currentParent.id,
    nextParentId,
  };
}

function setTreeSupplement(
  root: TreeNode,
  treeNodeId: string,
  supplement: TreeRefSupplement | undefined,
): TreeNode {
  return updateTreeNode(root, treeNodeId, { supplement });
}

/** 从根到目标节点的名称路径（用于面包屑） */
export function getTreePathNames(root: TreeNode, targetId: string): string[] {
  const walk = (node: TreeNode, trail: string[]): string[] | null => {
    const next = [...trail, node.name];
    if (node.id === targetId) return next;
    if (node.children) {
      for (const child of node.children) {
        const found = walk(child, next);
        if (found) return found;
      }
    }
    return null;
  };
  return walk(root, []) ?? [];
}

/** 目录条目是否绑定到这个知识点：历史数据里 id 与 nodeRef 都可能出现。 */
function isBoundToKnowledge(node: TreeNode, knowledgeId: string): boolean {
  return node.id === knowledgeId || node.nodeRef === knowledgeId;
}

/**
 * 解绑某个知识点的目录条目：命中条目移除、其子条目上移，根条目命中则只清绑定。
 * 本体删除后若绑定还留着，投影会按 nodeRef 继续造包含边，图上就多出一个裸 id 的幽灵方框。
 */
export function detachKnowledgeBinding(root: TreeNode, knowledgeId: string): TreeNode {
  const detachList = (nodes: readonly TreeNode[]): TreeNode[] => {
    const result: TreeNode[] = [];
    for (const node of nodes) {
      const children = detachList(node.children ?? []);
      if (isBoundToKnowledge(node, knowledgeId)) {
        // 命中：条目出局，已解绑过的子条目上移（子条目自身可能也绑同一个本体）。
        result.push(...children);
        continue;
      }
      result.push({ ...node, children: children.length > 0 ? children : undefined });
    }
    return result;
  };
  const children = detachList(root.children ?? []);
  const detached: TreeNode = {
    ...root,
    children: children.length > 0 ? children : undefined,
  };
  // 根条目命中时不能删根，只清掉本体绑定。
  return isBoundToKnowledge(root, knowledgeId) ? { ...detached, nodeRef: undefined } : detached;
}
