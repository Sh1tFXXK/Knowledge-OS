import type { KnowledgeEdge, KnowledgeNode, NodeExplanation, Perspective, TreeNode } from '../types';

export const EXPLANATION_TAB_LABELS = ['定义', '机制', '边界', '来源'] as const;

/** 内置维度切面（镜头滤镜定义，非知识内容） */
export const BUILTIN_DIMENSIONS: Perspective[] = [
  { id: 'all', name: '全部', nameEn: 'All', color: '#94a3b8' },
  { id: 'transaction', name: '事务视角', nameEn: 'Transaction', color: '#ff6b6b' },
  { id: 'storage', name: '存储视角', nameEn: 'Storage', color: '#4ecdc4' },
  { id: 'performance', name: '性能视角', nameEn: 'Performance', color: '#45b7d1' },
  { id: 'security', name: '安全视角', nameEn: 'Security', color: '#feca57' },
];

export function genId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export function createEmptyExplanation(nodeId: string, title: string): NodeExplanation {
  const tabIds = ['def', 'mech', 'bound', 'source'] as const;
  return {
    nodeId,
    title,
    tabs: EXPLANATION_TAB_LABELS.map((label, i) => ({
      id: tabIds[i],
      label,
      content: '',
    })),
  };
}

export function createKnowledgeNode(label: string, id?: string): KnowledgeNode {
  const nodeId = id ?? genId('k');
  return {
    id: nodeId,
    label,
    card: createEmptyExplanation(nodeId, label),
  };
}

export function createEmptyTreeRoot(): TreeNode {
  return {
    id: 'universe',
    name: '知识宇宙',
    count: 0,
    icon: '🌌',
    expanded: true,
    children: [],
  };
}

export function createTreeFolder(name: string, icon = '📁'): TreeNode {
  return {
    id: genId('tree'),
    name,
    count: 0,
    icon,
    expanded: false,
    children: [],
  };
}

export function createKnowledgeEdge(
  source: string,
  target: string,
  type: string,
  label?: string,
  dimensions?: string[],
): KnowledgeEdge {
  return {
    id: genId('edge'),
    source,
    target,
    type,
    label: label ?? type,
    dimensions,
  };
}

export function createTreeRef(
  name: string,
  nodeRef: string,
  icon = '📄',
): TreeNode {
  return {
    id: genId('tree'),
    name,
    count: 0,
    icon,
    nodeRef,
  };
}
