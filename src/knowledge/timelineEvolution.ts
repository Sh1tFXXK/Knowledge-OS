/**
 * 知识演化事件的类型（2026-09-15 用户裁决：Timeline = 实体演化图）。
 *
 * evolution-events.json 是**唯一事实源**（append-only）：只收「知识实体自身的演化」，
 * 不收仓库操作历史（moveNode / renameNode / import / 批次重构留痕等）—— 那些由
 * git 提交 + batch-manifests 承载。批次脚本不得向本文件写入操作日志类事件。
 */
export const EvolutionEventType = {
  Release: 'release',
  Introduce: 'introduce',
  Deprecate: 'deprecate',
  Replace: 'replace',
  Split: 'split',
  Merge: 'merge',
} as const;

export type EvolutionEventType = typeof EvolutionEventType[keyof typeof EvolutionEventType];

const EVENT_TYPE_LABELS: Record<EvolutionEventType, string> = {
  [EvolutionEventType.Release]: '发布',
  [EvolutionEventType.Introduce]: '引入',
  [EvolutionEventType.Deprecate]: '废弃',
  [EvolutionEventType.Replace]: '替代',
  [EvolutionEventType.Split]: '拆分',
  [EvolutionEventType.Merge]: '合并',
};

export function evolutionEventTypeLabel(type: EvolutionEventType): string {
  return EVENT_TYPE_LABELS[type];
}

function isEvolutionEventType(value: unknown): value is EvolutionEventType {
  return typeof value === 'string' && value in EVENT_TYPE_LABELS;
}

/** 时间线只在这些语义面发生变化时产生一个事件，避免字段级噪声。 */
export const TimelineFacet = {
  Content: 'content',
  Structure: 'structure',
  Metadata: 'metadata',
  Projection: 'projection',
} as const;

export type TimelineFacet = typeof TimelineFacet[keyof typeof TimelineFacet];

interface KnowledgeEvolutionChange {
  targetNodeId: string;
  facet: TimelineFacet;
  before: string;
  after: string;
}

export interface KnowledgeEvolutionIntroducedNode {
  nodeId: string;
  parentNodeId: string;
}

/** 持久化的知识演化事件：一次有意义的语义变化（而非逐字段噪声）。 */
export interface KnowledgeEvolutionEvent {
  id: string;
  type: EvolutionEventType;
  scopeRootId: string;
  occurredAt: number;
  title: string;
  summary: string;
  sourceOnlyNodeIds: string[];
  introducedNodes: KnowledgeEvolutionIntroducedNode[];
  changes: KnowledgeEvolutionChange[];
}

const FACET_LABELS: Record<TimelineFacet, string> = {
  [TimelineFacet.Content]: '知识内容',
  [TimelineFacet.Structure]: '解释结构',
  [TimelineFacet.Metadata]: '知识元数据',
  [TimelineFacet.Projection]: '视图投影',
};

export function facetLabel(facet: TimelineFacet): string {
  return FACET_LABELS[facet];
}

function isFacet(value: unknown): value is TimelineFacet {
  return (
    value === TimelineFacet.Content ||
    value === TimelineFacet.Structure ||
    value === TimelineFacet.Metadata ||
    value === TimelineFacet.Projection
  );
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === 'string');
}

function asIntroducedNodes(value: unknown): KnowledgeEvolutionIntroducedNode[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item): KnowledgeEvolutionIntroducedNode[] => {
    if (!item || typeof item !== 'object') return [];
    const node = item as { nodeId?: unknown; parentNodeId?: unknown };
    if (typeof node.nodeId !== 'string' || typeof node.parentNodeId !== 'string') return [];
    return [{ nodeId: node.nodeId, parentNodeId: node.parentNodeId }];
  });
}

function asChanges(value: unknown): KnowledgeEvolutionChange[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item): KnowledgeEvolutionChange[] => {
    if (!item || typeof item !== 'object') return [];
    const change = item as { targetNodeId?: unknown; facet?: unknown; before?: unknown; after?: unknown };
    if (typeof change.targetNodeId !== 'string' || !isFacet(change.facet)) return [];
    return [{
      targetNodeId: change.targetNodeId,
      facet: change.facet,
      before: typeof change.before === 'string' ? change.before : '',
      after: typeof change.after === 'string' ? change.after : '',
    }];
  });
}

/**
 * 加载时校验演化事件数组，丢弃无法识别的条目。
 *
 * `type` 是**必填**的演化类型：缺失或非法（含历史批次写入的操作日志事件）一律丢弃，
 * 不做默认值兜底 —— 防止仓库操作日志以「无类型」形态复活进实体演化图。
 */
export function normalizeEvolutionEvents(value: unknown): KnowledgeEvolutionEvent[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((entry): KnowledgeEvolutionEvent[] => {
    if (!entry || typeof entry !== 'object') return [];
    const event = entry as Record<string, unknown>;
    if (typeof event.id !== 'string' || typeof event.title !== 'string') return [];
    if (!isEvolutionEventType(event.type)) return [];
    return [{
      id: event.id,
      type: event.type,
      scopeRootId: typeof event.scopeRootId === 'string' ? event.scopeRootId : '',
      occurredAt: typeof event.occurredAt === 'number' ? event.occurredAt : 0,
      title: event.title,
      summary: typeof event.summary === 'string' ? event.summary : '',
      sourceOnlyNodeIds: asStringArray(event.sourceOnlyNodeIds),
      introducedNodes: asIntroducedNodes(event.introducedNodes),
      changes: asChanges(event.changes),
    }];
  });
}
