/**
 * 前端知识数据模型
 *
 * ┌─────────────────────────────────────────────────────────┐
 * │  nodePool: Record<id, KnowledgeNode>  ← 节点表（是什么）  │
 * │    └─ card: 定义 / 机制 / 边界 / 来源（解释卡只读这部分） │
 * ├─────────────────────────────────────────────────────────┤
 * │  knowledgeEdges: KnowledgeEdge[]  ← 边表（连着谁）       │
 * ├─────────────────────────────────────────────────────────┤
 * │  treeData: TreeNode  ← 仅导航，nodeRef → nodePool.id    │
 * └─────────────────────────────────────────────────────────┘
 */
import type {
  GraphNode,
  GraphEdge,
  KnowledgeEdge,
  KnowledgeNode,
  Perspective,
  Question,
  Rule,
  SubSystem,
  TreeNode,
} from '../types';

export const APP_STATE_VERSION = 4 as const;

export interface GraphSlice {
  axioms: GraphNode[];
  mechanisms: GraphNode[];
  conclusions: GraphNode[];
  edges: GraphEdge[];
}

export interface PersistedAppState {
  version: typeof APP_STATE_VERSION;
  treeData: TreeNode;
  nodePool: Record<string, KnowledgeNode>;
  knowledgeEdges: KnowledgeEdge[];
  graph: GraphSlice;
  questions: Question[];
  rules: Rule[];
  perspectives: Perspective[];
  subSystems: SubSystem[];
  inferenceResponses: Record<string, string>;
}

/** 应用初始知识库（数据库知识体系 + 锁机制细粒度节点） */
export function createEmptyAppState(): PersistedAppState {
  return {
    version: APP_STATE_VERSION,
    treeData: {
      id: 'universe',
      name: 'Knowledge Universe',
      count: 0,
      icon: 'K',
      expanded: true,
      nodeRef: 'empty-root',
      children: [],
    },
    nodePool: {},
    knowledgeEdges: [],
    graph: {
      axioms: [],
      mechanisms: [],
      conclusions: [],
      edges: [],
    },
    questions: [],
    rules: [],
    perspectives: [],
    subSystems: [],
    inferenceResponses: {},
  };
}
