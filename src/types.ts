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

export type AppView = 'universe' | 'index' | 'mechanism' | 'database' | 'questions' | 'supertags' | 'timeline';

/** 挂在目录引用上的路径特化补充（如 MySQL / PostgreSQL 方言差异） */
export interface TreeRefSupplement {
  tabs?: ExplanationTab[];
  notes?: string;
}

export interface TreeNode {
  id: string;
  name: string;
  count?: number;
  expanded?: boolean;
  active?: boolean;
  /** 指向节点池中的知识 ID；目录只存引用，不存知识本体 */
  nodeRef?: string;
  /** 该导航路径下的补充解释卡（共性在节点池，差异在此） */
  supplement?: TreeRefSupplement;
  children?: TreeNode[];
}

/** 推理漏斗中的层级角色（B 区局部镜头布局用） */
export type KnowledgeRole = 'axiom' | 'mechanism' | 'conclusion' | 'subsystem' | 'plain';

export enum KnowledgeNodeKind {
  Concept = 'concept',
  Entity = 'entity',
  State = 'state',
  Event = 'event',
  Rule = 'rule',
  Mechanism = 'mechanism',
  Evidence = 'evidence',
}

export interface KnowledgeSourceSpan {
  startLine: number;
  endLine: number;
}

export interface KnowledgeProvenance {
  sourceId: string;
  sourceKind: string;
  sourceTitle: string;
  spanBasis?: 'normalized-markdown-body';
  sourceSpans: KnowledgeSourceSpan[];
}

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
  kind?: KnowledgeNodeKind;
  /** Source-independent semantic identity proposed by an importer. */
  canonicalKey?: string;
  aliases?: string[];
  provenance?: KnowledgeProvenance[];
  mechanismSpec?: MechanismSpec;
  shared?: boolean;
  locked?: boolean;
  tags?: string[];
  role?: KnowledgeRole;
  /** 多维视角标签（左侧切面过滤） */
  dimensions?: string[];
  /** Projection dimensions. Dimensions reference nodePool atoms; they do not own them. */
  viewDimensions?: ViewDimension[];
  /** Optional source node whose type DAG is projected by this node's index view. */
  relationIndex?: {
    rootNodeId: string;
  };
  card: NodeExplanation;
}

export enum TypeRelationKind {
  Implements = 'implements',
  Extends = 'extends',
}

/** 边表：关系数据，供关系网 / 漏斗 / 子系统消费；解释卡不读 */
export interface KnowledgeEdge {
  id: string;
  source: string;
  target: string;
  type: string;
  label: string;
  dimensions?: string[];
  relationKind?: KnowledgeRelationKind;
  provenance?: KnowledgeProvenance[];
}

export interface MechanismSpec {
  phenomenonNodeId: string;
  triggerNodeIds: string[];
  participantNodeIds: string[];
  stateNodeIds: string[];
  transitionEdgeIds: string[];
  constraintEdgeIds: string[];
  outcomeNodeIds: string[];
  failureNodeIds: string[];
}

export enum KnowledgeRelationKind {
  Structure = 'structure',
  Classification = 'classification',
  Dependency = 'dependency',
  Causality = 'causality',
  StateTransition = 'state-transition',
  Constraint = 'constraint',
  Evidence = 'evidence',
  Reference = 'reference',
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

export interface ExplanationTableColumn {
  id: string;
  label: string;
}

export interface ExplanationTableRow {
  id: string;
  cells: Record<string, string>;
}

export interface ExplanationTable {
  id: string;
  title?: string;
  columns: ExplanationTableColumn[];
  rows: ExplanationTableRow[];
}

export interface ExplanationPage {
  id: string;
  label: string;
  content: string;
  /** 合成导航页使用的规范实体引用；普通存储页可省略。 */
  knowledgeNodeId?: string;
  table?: ExplanationTable;
  tags?: string[];
  /** 在同级排列轴上的相对占比；旧数据缺省为 1。 */
  weight?: number;
  /**
   * 子页面（无限递归）。
   * - 顶部横向页签支持多层堆叠：选中一个 page 后，下一行渲染它的子页面。
   * - 旧数据没有此字段时按 undefined 处理，等同于叶子页面。
   */
  pages?: ExplanationPage[];
}

export interface ExplanationTab extends ExplanationPage {
  /**
   * 子 Tab（无限递归）。
   * - 左侧纵向页签渲染为树形：子 Tab 缩进显示在父 Tab 下方。
   * - 旧数据没有此字段时按 undefined 处理，等同于叶子 Tab。
   */
  tabs?: ExplanationTab[];
  /** pages 继承自 ExplanationPage，作为该 Tab 下的横向页签（可继续递归）。 */
}

export enum ExplanationSelectionKind {
  Root = 'root',
  Content = 'content',
  Path = 'path',
}

export interface ExplanationRootSelection {
  kind: ExplanationSelectionKind.Root;
  nodeId: string;
}

export interface ExplanationContentSelection {
  kind: ExplanationSelectionKind.Content;
  nodeId: string;
  tabId: string;
  pageId: string | null;
}

export interface ExplanationPathSelection {
  kind: ExplanationSelectionKind.Path;
  nodeId: string;
  treeNodeId: string;
  tabId: string;
}

export type ExplanationIndexSelection = ExplanationRootSelection | ExplanationContentSelection;
export type ExplanationSelection = ExplanationIndexSelection | ExplanationPathSelection;

/** 解释卡字段：仅「节点是什么」，不含关系 */
export interface NodeExplanation {
  nodeId: string;
  title: string;
  /** 标题索引根节点下的总述正文（与 tabs 并列，非某个 tab 的内容） */
  rootContent?: string;
  rootTable?: ExplanationTable;
  tabs: ExplanationTab[];
  /** Legacy storage for definition child pages; new pages live on their parent tab. */
  definitionPages?: ExplanationPage[];
  notes?: string;
}

export interface QuestionAnswerStep {
  nodeId: string;
  note?: string;
}

export enum QuestionKind {
  Definition = 'definition',
  Mechanism = 'mechanism',
  Comparison = 'comparison',
  Application = 'application',
  Troubleshooting = 'troubleshooting',
  Recall = 'recall',
}

export enum QuestionDifficulty {
  Basic = 'basic',
  Intermediate = 'intermediate',
  Advanced = 'advanced',
}

export enum QuestionSourceKind {
  Document = 'document',
  Web = 'web',
}

export interface QuestionSource {
  kind: QuestionSourceKind;
  /** 稳定来源标识：文档内容哈希或网页 URL。 */
  sourceId: string;
  sourceTitle: string;
  /** 问题在来源文档中的章节标题。 */
  sectionTitle?: string;
}

export interface Question {
  id: string;
  text: string;
  answered: boolean;
  /** 问题考察方式。旧数据缺省时按 Recall 展示。 */
  kind?: QuestionKind;
  /** 认知难度。旧数据缺省时按 Basic 展示。 */
  difficulty?: QuestionDifficulty;
  /** 自动导入问题的可追溯来源；手工问题可缺省。 */
  source?: QuestionSource;
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

export interface NotificationItem {
  id: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  timestamp: number;
}

export type ThemeType = 'dark' | 'light';
