import type { TreeNode, TreeRefSupplement } from '../types';

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
  if (root.id === id) return root;
  if (root.children) {
    for (const child of root.children) {
      const found = findTreeNodeById(child, id);
      if (found) return found;
    }
  }
  return null;
}

export function findTreeParent(root: TreeNode, childId: string): TreeNode | null {
  if (root.children) {
    if (root.children.some((c) => c.id === childId)) return root;
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

export function collectTreeNodes(node: TreeNode): TreeNode[] {
  return [node, ...(node.children ? node.children.flatMap(collectTreeNodes) : [])];
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

export function setTreeSupplement(
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
