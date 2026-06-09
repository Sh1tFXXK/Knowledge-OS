// Knowledge OS - Type Definitions

export interface GraphNode {
  id: string;
  label: string;
  x: number;
  y: number;
  color: string;
  size: number;
  zone: 'axiom' | 'mechanism' | 'conclusion';
  px?: number;
  py?: number;
  phase: number;
  glow: boolean;
  description?: string;
}

export interface GraphEdge {
  id: string;
  source: string;
  target: string;
  type: string;
  label: string;
}

export interface GraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

/** 挂在目录引用上的路径特化补充（如 MySQL / PostgreSQL 方言差异） */
export interface TreeRefSupplement {
  tabs?: ExplanationTab[];
  notes?: string;
}

export interface TreeNode {
  id: string;
  name: string;
  count: number;
  icon: string;
  expanded?: boolean;
  active?: boolean;
  /** 指向节点池中的知识 ID；目录只存引用，不存知识本体 */
  nodeRef: string;
  /** 该导航路径下的补充解释卡（共性在节点池，差异在此） */
  supplement?: TreeRefSupplement;
  children?: TreeNode[];
}

/** 推理漏斗中的层级角色（B 区局部镜头布局用） */
export type KnowledgeRole = 'axiom' | 'mechanism' | 'conclusion' | 'subsystem' | 'plain';

/** 节点池中的知识实体（全局唯一存储；解释卡只读 card/label 等自身字段） */
export interface KnowledgeNode {
  id: string;
  label: string;
  shared?: boolean;
  locked?: boolean;
  tags?: string[];
  role?: KnowledgeRole;
  /** 多维视角标签（左侧切面过滤） */
  dimensions?: string[];
  /** 知识点自定义维度选项卡（分类树视图） */
  viewDimensions?: Array<{
    id: string;
    name: string;
    color: string;
    hint?: string;
    children?: Array<{ label: string; desc?: string; nodeId?: string }>;
  }>;
  card: NodeExplanation;
}

/** 边表：关系数据，供关系网 / 漏斗 / 子系统消费；解释卡不读 */
export interface KnowledgeEdge {
  id: string;
  source: string;
  target: string;
  type: string;
  label: string;
  dimensions?: string[];
}

export type ViewScope = 'local' | 'neighbor' | 'global';

export type LayoutHint = 'funnel' | 'neighbor' | 'force';

export interface ViewNode {
  id: string;
  label: string;
  role: KnowledgeRole;
  isFocus: boolean;
  dimmed: boolean;
  zone?: 'axiom' | 'mechanism' | 'conclusion';
  layoutHint?: {
    x?: number;
    y?: number;
    color?: string;
    size?: number;
  };
}

export interface ViewEdge {
  id: string;
  source: string;
  target: string;
  type: string;
  label: string;
  dimmed: boolean;
}

export interface ViewDataPack {
  nodes: ViewNode[];
  edges: ViewEdge[];
  layoutHint: LayoutHint;
  meta: {
    focus: string | null;
    scope: ViewScope;
    dimension: string;
    nodeCount: number;
    edgeCount: number;
    activeNodeCount: number;
    activeEdgeCount: number;
  };
}

export interface Perspective {
  id: string;
  name: string;
  nameEn: string;
  color: string;
  description?: string;
}

export interface Rule {
  premise: string[];
  result: string;
}

export interface SubSystem {
  id: string;
  name: string;
  color: string;
  nodes: number;
  relations: number;
}

export interface InferenceStep {
  label: string;
  description: string;
}

export interface InferenceEngine {
  steps: InferenceStep[];
  answer: string;
}

export interface ExplanationTab {
  id: string;
  label: string;
  content: string;
}

/** 解释卡字段：仅「节点是什么」，不含关系 */
export interface NodeExplanation {
  nodeId: string;
  title: string;
  tabs: ExplanationTab[];
  notes?: string;
}

export interface QuestionAnswerStep {
  nodeId: string;
  note?: string;
}

export interface Question {
  id: string;
  text: string;
  answered: boolean;
  /** 关联的知识节点 ID 或目录项 ID（可选） */
  relatedNodeId?: string;
  /** 组成答案的有序知识节点引用 */
  answerSteps?: QuestionAnswerStep[];
  /** 答案内容（可选） */
  answer?: string;
  /** 创建时间 */
  createdAt?: number;
  /** 更新时间 */
  updatedAt?: number;
}

export interface Coordinates {
  x: number;
  y: number;
  z: number;
}

export interface NotificationItem {
  id: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  timestamp: number;
}

export type ThemeType = 'dark' | 'light';
