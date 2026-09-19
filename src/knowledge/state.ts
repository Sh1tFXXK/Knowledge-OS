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
  TreeNode,
} from '../types';
import type { KnowledgeEvolutionEvent } from './timelineEvolution';
import type { VersionChain } from './versionChains';

export const APP_STATE_VERSION = 7 as const;

interface GraphSlice {
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
  evolutionEvents: KnowledgeEvolutionEvent[];
  /** 版本链（versions-v1.2 接线）：raw 数组，消费方经 normalizeVersionChains 严格校验 */
  versionChains: VersionChain[];
}

/** 应用初始知识库（数据库知识体系 + 锁机制细粒度节点） */
export function createEmptyAppState(): PersistedAppState {
  return {
    version: APP_STATE_VERSION,
    treeData: {
      id: 'universe',
      name: 'Knowledge Universe',
      count: 0,
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
    evolutionEvents: [],
    versionChains: [],
  };
}
