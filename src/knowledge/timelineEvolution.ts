/** 时间线只在这些语义面发生变化时产生一个事件，避免字段级噪声。 */
export const TimelineFacet = {
  Content: 'content',
  Structure: 'structure',
  Metadata: 'metadata',
  Projection: 'projection',
} as const;

export type TimelineFacet = typeof TimelineFacet[keyof typeof TimelineFacet];

export interface KnowledgeEvolutionChange {
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

/** 加载时校验演化事件数组，丢弃无法识别的条目。 */
export function normalizeEvolutionEvents(value: unknown): KnowledgeEvolutionEvent[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((entry): KnowledgeEvolutionEvent[] => {
    if (!entry || typeof entry !== 'object') return [];
    const event = entry as Record<string, unknown>;
    if (typeof event.id !== 'string' || typeof event.title !== 'string') return [];
    return [{
      id: event.id,
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
