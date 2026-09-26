import type {
  KnowledgeEdge,
  KnowledgeNode,
  KnowledgeRelationKind,
  NodeExplanation,
  TreeNode,
} from '../types';

export function genId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function createEmptyExplanation(nodeId: string, title: string): NodeExplanation {
  return {
    nodeId,
    title,
    tabs: [],
  };
}

export function createKnowledgeNode(label: string, id?: string): KnowledgeNode {
  const nodeId = id ?? genId('k');
  return {
    id: nodeId,
    label,
    tags: [label],
    card: createEmptyExplanation(nodeId, label),
  };
}

export function createTreeEntry(
  name: string,
  nodeRef: string,
): TreeNode {
  return {
    id: genId('tree'),
    name,
    count: 0,
    nodeRef,
  };
}

export function createKnowledgeEdge(
  source: string,
  target: string,
  type: string,
  label?: string,
  dimensions?: string[],
  relationKind?: KnowledgeRelationKind,
): KnowledgeEdge {
  return {
    id: genId('edge'),
    source,
    target,
    type,
    label: label ?? type,
    dimensions,
    relationKind,
  };
}
