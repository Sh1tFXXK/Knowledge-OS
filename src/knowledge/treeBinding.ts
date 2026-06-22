import type { KnowledgeEdge, KnowledgeNode, TreeNode } from '../types';

export const TREE_BINDING_EDGE_PREFIX = 'treebind:';
export const TREE_BINDING_EDGE_TYPE = 'belongs-to';
export const TREE_BINDING_EDGE_LABEL = 'contains';

function findTreeNodeById(root: TreeNode, id: string): TreeNode | null {
  if (root.id === id) return root;
  for (const child of root.children ?? []) {
    const found = findTreeNodeById(child, id);
    if (found) return found;
  }
  return null;
}

function mergeDimensions(
  source: KnowledgeNode | undefined,
  target: KnowledgeNode | undefined,
): string[] | undefined {
  const dimensions = new Set([
    ...(source?.dimensions ?? []),
    ...(target?.dimensions ?? []),
  ]);
  return dimensions.size > 0 ? [...dimensions] : undefined;
}

export function resolveTreeBindingTarget(
  tree: TreeNode,
  treeNodeId: string,
): string | null {
  const node = findTreeNodeById(tree, treeNodeId);
  if (!node) return null;
  return node.nodeRef;
}

export function createTreeBindingEdge({
  tree,
  nodePool,
  parentTreeId,
  childTreeId,
  childKnowledgeId,
}: {
  tree: TreeNode;
  nodePool: Record<string, KnowledgeNode>;
  parentTreeId: string;
  childTreeId: string;
  childKnowledgeId: string;
}): KnowledgeEdge | null {
  const parentTreeNode = findTreeNodeById(tree, parentTreeId);
  const parentKnowledgeId = parentTreeNode?.nodeRef;

  if (!parentKnowledgeId) return null;
  if (parentKnowledgeId === childKnowledgeId) return null;
  if (!nodePool[parentKnowledgeId] || !nodePool[childKnowledgeId]) return null;

  return {
    id: `${TREE_BINDING_EDGE_PREFIX}${parentTreeId}:${childTreeId}`,
    source: parentKnowledgeId,
    target: childKnowledgeId,
    type: TREE_BINDING_EDGE_TYPE,
    label: TREE_BINDING_EDGE_LABEL,
    dimensions: mergeDimensions(nodePool[parentKnowledgeId], nodePool[childKnowledgeId]),
  };
}

export function createMovedTreeBindingEdges({
  tree,
  nodePool,
  movedTreeId,
  nextParentTreeId,
}: {
  tree: TreeNode;
  nodePool: Record<string, KnowledgeNode>;
  movedTreeId: string;
  nextParentTreeId: string;
}): KnowledgeEdge[] {
  const movedTreeNode = findTreeNodeById(tree, movedTreeId);
  if (!movedTreeNode?.nodeRef) return [];

  return [
    createTreeBindingEdge({
      tree,
      nodePool,
      parentTreeId: nextParentTreeId,
      childTreeId: movedTreeId,
      childKnowledgeId: movedTreeNode.nodeRef,
    }),
    ...(movedTreeNode.children ?? []).map((child) =>
      createTreeBindingEdge({
        tree,
        nodePool,
        parentTreeId: movedTreeId,
        childTreeId: child.id,
        childKnowledgeId: child.nodeRef,
      }),
    ),
  ].filter((edge): edge is KnowledgeEdge => edge !== null);
}

export function isTreeBindingEdgeForTreeIds(
  edge: KnowledgeEdge,
  treeIds: Set<string>,
): boolean {
  if (!edge.id.startsWith(TREE_BINDING_EDGE_PREFIX)) return false;
  const binding = edge.id.slice(TREE_BINDING_EDGE_PREFIX.length);
  const [parentTreeId, childTreeId] = binding.split(':');
  return treeIds.has(parentTreeId) || treeIds.has(childTreeId);
}

export function removeTreeBindingEdgesForTreeIds(
  edges: KnowledgeEdge[],
  treeIds: Set<string>,
): KnowledgeEdge[] {
  return edges.filter((edge) => !isTreeBindingEdgeForTreeIds(edge, treeIds));
}
