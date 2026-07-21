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

export type AppView = 'universe' | 'mechanism' | 'database' | 'questions' | 'supertags';

/** 挂在目录引用上的路径特化补充（如 MySQL / PostgreSQL 方言差异） */
export interface TreeRefSupplement {
  tabs?: ExplanationTab[];
  notes?: string;
}

export interface TreeNode {
  id: string;
  name: string;
  count: number;
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

export type AtomAttrValue = string | number;

/** A projection-space binding to a node-pool atom. */
export interface AtomBinding {
  nodeId: string;
  attrs?: Record<string, AtomAttrValue>;
  desc?: string;
}

export type SectionLayout = 'stack' | 'grid' | 'tree' | 'chain' | 'matrix' | 'btree';

/** B+ 树实例结构：一个磁盘块（页）。键/指针是结构数据，不是知识概念。 */
export interface BPlusTreeNode {
  /** 磁盘块号 / 页号 */
  id: number;
  /** 叶子节点：只存键；内部节点：键作路由分隔符 */
  leaf: boolean;
  /** 内部节点=路由键；叶子=实际键 */
  keys: number[];
  /** 内部节点=子块号（长度 = keys.length + 1）；叶子留空（链表由 leafChain 表达） */
  ptrs: number[];
}

/** 一棵 B+ 树实例。挂在 ViewSection.config.btree 上，由 BPlusTreeSection 渲染。 */
export interface BPlusTreeData {
  /** 分支因子（每个内部节点最多多少子指针） */
  fanout: number;
  nodes: BPlusTreeNode[];
  rootId: number;
  /** 叶子双向链表顺序（块号），从左到右键递增 */
  leafChain: number[];
}

export interface ViewSection {
  id: string;
  title?: string;
  layout: SectionLayout;
  config?: {
    total?: number;
    unit?: string;
    columns?: Array<{ key: string; label: string }>;
    tagQuery?: string[];
    /** Span projection: which atom attr encodes position/extent (default: offset/size). Domain-specific, never universal. */
    positionAttr?: string;
    extentAttr?: string;
    /** B+ 树实例结构（layout === 'btree' 时由 BPlusTreeSection 读取）。 */
    btree?: BPlusTreeData;
  };
  atoms: AtomBinding[];
}

/** Semantic group overlay across one or more rendered sections. */
export interface SemanticGroup {
  id: string;
  label: string;
  nodeId?: string;
  members: string[];
}

export interface ClassificationScopeMeta {
  id: string;
  name: string;
  target: 'object' | 'parts' | 'children';
  targetLabel?: string;
}

export interface ViewDimension {
  id: string;
  name: string;
  color: string;
  hint?: string;
  scope?: ClassificationScopeMeta;
  sections: ViewSection[];
  groups?: SemanticGroup[];
}

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
  /** Projection dimensions. Dimensions reference nodePool atoms; they do not own them. */
  viewDimensions?: ViewDimension[];
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

export interface ExplanationPage {
  id: string;
  label: string;
  content: string;
  /** Relative share of the parent split axis. Undefined is equal share. */
  weight?: number;
  /**
   * 子页面（无限递归）。
   * - 顶部横向页签支持多层堆叠：选中一个 page 后，下一行渲染它的子页面。
   * - 旧数据没有此字段时按 undefined 处理，等同于叶子页面。
   */
  pages?: ExplanationPage[];
}

/** Stable, typed address for a mutable title node in an explanation tree. */
export type ExplanationTitleTarget =
  | { kind: 'tab'; tabId: string }
  | { kind: 'page'; tabId: string; pageId: string };

export interface ExplanationTab extends ExplanationPage {
  /**
   * 子 Tab（无限递归）。
   * - 左侧纵向页签渲染为树形：子 Tab 缩进显示在父 Tab 下方。
   * - 旧数据没有此字段时按 undefined 处理，等同于叶子 Tab。
   */
  tabs?: ExplanationTab[];
  /** pages 继承自 ExplanationPage，作为该 Tab 下的横向页签（可继续递归）。 */
}

/** 解释卡字段：仅「节点是什么」，不含关系 */
export interface NodeExplanation {
  nodeId: string;
  title: string;
  tabs: ExplanationTab[];
  /** Legacy storage for definition child pages; new pages live on their parent tab. */
  definitionPages?: ExplanationPage[];
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
