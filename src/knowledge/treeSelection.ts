import type { TreeNode } from '../types';
import { findTreeNodeById } from './treeUtils';

/** 从目录项解析节点池 ID */
export function resolvePoolIdFromTreeNode(node: TreeNode): string | null {
  return node.nodeRef ?? null;
}

export function resolvePoolIdFromTree(root: TreeNode, treeNodeId: string): string | null {
  const node = findTreeNodeById(root, treeNodeId);
  if (!node) return null;
  return resolvePoolIdFromTreeNode(node);
}
