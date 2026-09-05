import type { ExplanationPage, ExplanationTab, KnowledgeNode } from '../types.ts';
import type { KnowledgePointSnapshot } from './state.ts';

/** 时间线只在这些语义面发生变化时产生一个事件，避免字段级噪声。 */
export const TimelineFacet = {
  Content: 'content',
  Structure: 'structure',
  Metadata: 'metadata',
  Projection: 'projection',
} as const;

export type TimelineFacet = typeof TimelineFacet[keyof typeof TimelineFacet];

export interface TimelineFacetChange {
  facet: TimelineFacet;
  label: string;
  before: string;
  after: string;
}

export interface KnowledgeTimelineEvent {
  id: string;
  knowledgeNodeId: string;
  title: string;
  capturedAt: number;
  note?: string;
  node: KnowledgeNode;
  previousNode: KnowledgeNode | null;
  isBaseline: boolean;
  stableFacets: TimelineFacet[];
  changes: TimelineFacetChange[];
  coalescedSnapshotCount?: number;
  annotationId?: string;
  scopeNodeId?: string;
  introducedNodeIds?: string[];
  sourceNodeIds?: string[];
  effectiveSummary?: string;
}

export interface TimelineAnnotationChange {
  targetNodeId: string;
  sourceNodeIds?: string[];
  facet: TimelineFacet;
  label: string;
  before: string;
  after: string;
}

export interface TimelineIntroducedNode {
  nodeId: string;
  parentNodeId: string;
}

export interface TimelineAnnotation {
  id: string;
  title: string;
  capturedAt: number;
  scopeNodeId?: string;
  sourceOnlyNodeIds?: string[];
  introducedNodes?: TimelineIntroducedNode[];
  note?: string;
  summary: string;
  changes: TimelineAnnotationChange[];
}

export interface KnowledgeTimelineGroup {
  nodeId: string;
  label: string;
  latestCapturedAt: number;
  events: KnowledgeTimelineEvent[];
  hasChanges: boolean;
}

export interface KnowledgeTimelineBatch {
  id: string;
  title: string;
  capturedAt: number;
  note?: string;
  events: KnowledgeTimelineEvent[];
  changedNodeCount: number;
  baselineNodeCount: number;
  annotationId?: string;
  scopeNodeId?: string;
}

export interface KnowledgeTimelineProjection {
  groups: KnowledgeTimelineGroup[];
  batches: KnowledgeTimelineBatch[];
}

const FACET_LABELS: Record<TimelineFacet, string> = {
  [TimelineFacet.Content]: '知识内容',
  [TimelineFacet.Structure]: '解释结构',
  [TimelineFacet.Metadata]: '知识元数据',
  [TimelineFacet.Projection]: '视图投影',
};

function normalizeText(value: string | undefined): string {
  return String(value ?? '').replace(/\s+/g, ' ').trim();
}

function stableSerialize(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableSerialize).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.keys(value as Record<string, unknown>).sort().map((key) =>
      `${JSON.stringify(key)}:${stableSerialize((value as Record<string, unknown>)[key])}`,
    ).join(',')}}`;
  }
  return JSON.stringify(value) ?? 'null';
}

function contentPage(page: ExplanationPage): unknown {
  return {
    content: normalizeText(page.content),
    table: page.table ?? null,
    pages: (page.pages ?? []).map(contentPage),
  };
}

function contentTab(tab: ExplanationTab): unknown {
  return {
    content: normalizeText(tab.content),
    table: tab.table ?? null,
    tabs: (tab.tabs ?? []).map(contentTab),
    pages: (tab.pages ?? []).map(contentPage),
  };
}

function metadataPage(page: ExplanationPage): unknown {
  return {
    tags: [...(page.tags ?? [])].sort(),
    pages: (page.pages ?? []).map(metadataPage),
  };
}

function metadataTab(tab: ExplanationTab): unknown {
  return {
    tags: [...(tab.tags ?? [])].sort(),
    tabs: (tab.tabs ?? []).map(metadataTab),
    pages: (tab.pages ?? []).map(metadataPage),
  };
}

function structurePage(page: ExplanationPage): unknown {
  return {
    id: page.id,
    label: normalizeText(page.label),
    knowledgeNodeId: page.knowledgeNodeId ?? null,
    weight: page.weight ?? 1,
    pages: (page.pages ?? []).map(structurePage),
  };
}

function structureTab(tab: ExplanationTab): unknown {
  return {
    id: tab.id,
    label: normalizeText(tab.label),
    knowledgeNodeId: tab.knowledgeNodeId ?? null,
    weight: tab.weight ?? 1,
    tabs: (tab.tabs ?? []).map(structureTab),
    pages: (tab.pages ?? []).map(structurePage),
  };
}

function allContent(node: KnowledgeNode): string {
  return stableSerialize({
    root: normalizeText(node.card.rootContent),
    rootTable: node.card.rootTable ?? null,
    notes: normalizeText(node.card.notes),
    definitionPages: (node.card.definitionPages ?? []).map(contentPage),
    tabs: node.card.tabs.map(contentTab),
  });
}

function allStructure(node: KnowledgeNode): string {
  return stableSerialize({
    definitionPages: (node.card.definitionPages ?? []).map(structurePage),
    tabs: node.card.tabs.map(structureTab),
  });
}

function allMetadata(node: KnowledgeNode): string {
  return stableSerialize({
    label: node.label,
    canonicalKey: node.canonicalKey ?? null,
    kind: node.kind ?? null,
    role: node.role ?? null,
    tags: [...(node.tags ?? [])].sort(),
    dimensions: [...(node.dimensions ?? [])].sort(),
    aliases: [...(node.aliases ?? [])].sort(),
    provenance: node.provenance ?? [],
    shared: node.shared ?? false,
    locked: node.locked ?? false,
    mechanismSpec: node.mechanismSpec ?? null,
    relationIndex: node.relationIndex ?? null,
    tabMetadata: node.card.tabs.map(metadataTab),
    definitionPageMetadata: (node.card.definitionPages ?? []).map(metadataPage),
  });
}

function allProjection(node: KnowledgeNode): string {
  return stableSerialize(node.viewDimensions ?? []);
}

function contentSummary(node: KnowledgeNode): string {
  const content = normalizeText(node.card.rootContent) || normalizeText(node.card.tabs[0]?.content);
  if (!content) return '无正文';
  if (content.length <= 180) return content;
  return `${content.slice(0, 90)} ... ${content.slice(-90)}`;
}

function structureSummary(node: KnowledgeNode): string {
  const labels = node.card.tabs.map((tab) => tab.label).filter(Boolean);
  const nestedCount = node.card.tabs.reduce(
    (total, tab) => total + (tab.tabs?.length ?? 0) + (tab.pages?.length ?? 0),
    0,
  );
  return labels.length
    ? `${labels.length} 个页签，${nestedCount} 个子页面：${labels.slice(0, 4).join('、')}`
    : '无解释页签';
}

function metadataSummary(node: KnowledgeNode): string {
  const kind = node.kind ?? '未分类';
  const role = node.role ?? 'plain';
  const tags = node.tags?.length ? `${node.tags.length} 个标签` : '无标签';
  return `${kind} · ${role} · ${tags}`;
}

function projectionSummary(node: KnowledgeNode): string {
  const dimensions = node.viewDimensions ?? [];
  const names = dimensions.map((dimension) => dimension.name).filter(Boolean);
  return dimensions.length
    ? `${dimensions.length} 个视图维度：${names.slice(0, 3).join('、')}`
    : '无视图维度';
}

function compareFacet(
  facet: TimelineFacet,
  before: string,
  after: string,
  beforeFingerprint: string,
  afterFingerprint: string,
): TimelineFacetChange | null {
  if (beforeFingerprint === afterFingerprint) return null;
  const sameSummary = before === after;
  return {
    facet,
    label: FACET_LABELS[facet],
    before: sameSummary ? `${before}（摘要相同，深层内容有变化）` : before,
    after: sameSummary ? `${after}（摘要相同，深层内容已更新）` : after,
  };
}

function compareNodes(previous: KnowledgeNode, current: KnowledgeNode): TimelineFacetChange[] {
  return [
    compareFacet(TimelineFacet.Content, contentSummary(previous), contentSummary(current), allContent(previous), allContent(current)),
    compareFacet(TimelineFacet.Structure, structureSummary(previous), structureSummary(current), allStructure(previous), allStructure(current)),
    compareFacet(TimelineFacet.Metadata, metadataSummary(previous), metadataSummary(current), allMetadata(previous), allMetadata(current)),
    compareFacet(TimelineFacet.Projection, projectionSummary(previous), projectionSummary(current), allProjection(previous), allProjection(current)),
  ].filter((change): change is TimelineFacetChange => Boolean(change));
}

function stableFacets(changes: TimelineFacetChange[]): TimelineFacet[] {
  const changed = new Set(changes.map((change) => change.facet));
  return Object.values(TimelineFacet).filter((facet) => !changed.has(facet));
}

function snapshotWeight(snapshot: KnowledgePointSnapshot): number {
  const node = snapshot.node;
  return (
    (node.card.rootContent?.length ?? 0)
    + node.card.tabs.reduce((total, tab) => total + (tab.content?.length ?? 0), 0)
    + node.card.tabs.length * 120
    + (node.tags?.length ?? 0) * 12
  );
}

function pickCanonicalSnapshot(snapshots: KnowledgePointSnapshot[]): KnowledgePointSnapshot {
  return [...snapshots].sort(
    (left, right) => snapshotWeight(right) - snapshotWeight(left) || right.id.localeCompare(left.id),
  )[0];
}

function eventFromSnapshot(
  snapshot: KnowledgePointSnapshot,
  previousNode: KnowledgeNode | null,
  isBaseline: boolean,
  coalescedSnapshotCount = 1,
): KnowledgeTimelineEvent {
  const changes = previousNode ? compareNodes(previousNode, snapshot.node) : [];
  return {
    id: snapshot.id,
    knowledgeNodeId: snapshot.knowledgeNodeId,
    title: snapshot.title,
    capturedAt: snapshot.capturedAt,
    note: snapshot.note,
    node: snapshot.node,
    previousNode,
    isBaseline,
    stableFacets: stableFacets(changes),
    changes,
    ...(coalescedSnapshotCount > 1 ? { coalescedSnapshotCount } : {}),
  };
}

function eventFromAnnotation(
  annotation: TimelineAnnotation,
  targetNodeId: string,
  changes: TimelineAnnotationChange[],
  nodePool: Record<string, KnowledgeNode>,
): KnowledgeTimelineEvent | null {
  const node = nodePool[targetNodeId];
  if (!node) return null;
  return {
    id: `${annotation.id}:${targetNodeId}`,
    knowledgeNodeId: targetNodeId,
    title: annotation.title,
    capturedAt: annotation.capturedAt,
    note: annotation.note,
    node,
    previousNode: null,
    isBaseline: false,
    stableFacets: Object.values(TimelineFacet).filter(
      (facet) => !changes.some((change) => change.facet === facet),
    ),
    changes: changes.map((change) => ({
      facet: change.facet,
      label: change.label,
      before: change.before,
      after: change.after,
    })),
    annotationId: annotation.id,
    scopeNodeId: annotation.scopeNodeId,
    introducedNodeIds: annotation.introducedNodes?.map((introduced) => introduced.nodeId),
    sourceNodeIds: [...new Set(changes.flatMap((change) => change.sourceNodeIds ?? []))],
    effectiveSummary: annotation.summary,
  };
}

export function buildKnowledgeTimeline(
  nodePool: Record<string, KnowledgeNode>,
  snapshots: KnowledgePointSnapshot[],
  annotations: TimelineAnnotation[] = [],
): KnowledgeTimelineProjection {
  const grouped = new Map<string, KnowledgePointSnapshot[]>();
  for (const snapshot of snapshots) {
    const nodeSnapshots = grouped.get(snapshot.knowledgeNodeId) ?? [];
    nodeSnapshots.push(snapshot);
    grouped.set(snapshot.knowledgeNodeId, nodeSnapshots);
  }

  const groups = [...grouped.entries()]
    .map(([nodeId, nodeSnapshots]) => {
      const ordered = [...nodeSnapshots].sort(
        (left, right) => left.capturedAt - right.capturedAt || left.id.localeCompare(right.id),
      );
      const captureBatches = [...new Map(
        ordered.reduce((batches, snapshot) => {
          const sameTime = batches.get(snapshot.capturedAt) ?? [];
          sameTime.push(snapshot);
          batches.set(snapshot.capturedAt, sameTime);
          return batches;
        }, new Map<number, KnowledgePointSnapshot[]>()).entries(),
      )]
        .sort(([left], [right]) => left - right)
        .map(([, sameTime]) => ({
          snapshot: pickCanonicalSnapshot(sameTime),
          snapshots: sameTime,
          coalescedSnapshotCount: sameTime.length,
        }));
      const events: KnowledgeTimelineEvent[] = [];
      let previousNode: KnowledgeNode | null = null;

      for (const captureBatch of captureBatches) {
        const event = eventFromSnapshot(
          captureBatch.snapshot,
          previousNode,
          events.length === 0,
          captureBatch.coalescedSnapshotCount,
        );
        previousNode = captureBatch.snapshot.node;
        // Same semantic content captured twice is one event, not two timeline points.
        if (!event.isBaseline && event.changes.length === 0) continue;
        events.push(event);
      }

      const liveNode = nodePool[nodeId];
      return {
        nodeId,
        label: liveNode?.label ?? captureBatches[captureBatches.length - 1]?.snapshot.node.label ?? nodeId,
        latestCapturedAt: events[events.length - 1]?.capturedAt ?? 0,
        events,
        hasChanges: events.some((event) => event.changes.length > 0),
      };
    })
    .filter((group) => group.events.length > 0)
    .sort((left, right) => right.latestCapturedAt - left.latestCapturedAt || left.label.localeCompare(right.label));

  const groupByNodeId = new Map(groups.map((group) => [group.nodeId, group]));
  for (const annotation of annotations) {
    const changesByTarget = new Map<string, TimelineAnnotationChange[]>();
    for (const change of annotation.changes) {
      const targetChanges = changesByTarget.get(change.targetNodeId) ?? [];
      targetChanges.push(change);
      changesByTarget.set(change.targetNodeId, targetChanges);
    }
    for (const [targetNodeId, targetChanges] of changesByTarget.entries()) {
      const event = eventFromAnnotation(annotation, targetNodeId, targetChanges, nodePool);
      if (!event) continue;
      const existing = groupByNodeId.get(event.knowledgeNodeId);
      if (existing) {
        existing.events.push(event);
        existing.events.sort((left, right) => left.capturedAt - right.capturedAt || left.id.localeCompare(right.id));
        existing.latestCapturedAt = Math.max(existing.latestCapturedAt, event.capturedAt);
        existing.hasChanges = true;
      } else {
        const group: KnowledgeTimelineGroup = {
          nodeId: event.knowledgeNodeId,
          label: event.node.label,
          latestCapturedAt: event.capturedAt,
          events: [event],
          hasChanges: true,
        };
        groups.push(group);
        groupByNodeId.set(group.nodeId, group);
      }
    }
  }

  groups.sort((left, right) => right.latestCapturedAt - left.latestCapturedAt || left.label.localeCompare(right.label));

  const eventBatches = new Map<string, KnowledgeTimelineEvent[]>();
  for (const group of groups) {
    for (const event of group.events) {
      const key = event.isBaseline
        ? JSON.stringify([event.capturedAt, 'baseline'])
        : JSON.stringify([event.capturedAt, event.title, event.note ?? '']);
      const batchEvents = eventBatches.get(key) ?? [];
      batchEvents.push(event);
      eventBatches.set(key, batchEvents);
    }
  }

  const batches = [...eventBatches.entries()]
    .map(([id, events]) => {
      const ordered = [...events].sort((left, right) => left.node.label.localeCompare(right.node.label));
      const annotationIds = [...new Set(ordered.map((event) => event.annotationId).filter(Boolean))];
      const scopeNodeIds = [...new Set(ordered.map((event) => event.scopeNodeId).filter(Boolean))];
      return {
        id: `batch:${id}`,
        title: ordered.every((event) => event.isBaseline) ? '初始基线' : ordered[0]?.title || '知识更新',
        capturedAt: ordered[0]?.capturedAt ?? 0,
        note: ordered.every((event) => event.note === ordered[0]?.note) ? ordered[0]?.note : undefined,
        events: ordered,
        changedNodeCount: new Set(
          ordered.filter((event) => event.changes.length > 0).map((event) => event.knowledgeNodeId),
        ).size,
        baselineNodeCount: new Set(
          ordered.filter((event) => event.isBaseline).map((event) => event.knowledgeNodeId),
        ).size,
        ...(annotationIds.length === 1 ? { annotationId: annotationIds[0] } : {}),
        ...(scopeNodeIds.length === 1 ? { scopeNodeId: scopeNodeIds[0] } : {}),
      } satisfies KnowledgeTimelineBatch;
    })
    .sort((left, right) => right.capturedAt - left.capturedAt || left.title.localeCompare(right.title));

  return { groups, batches };
}

export function facetLabel(facet: TimelineFacet): string {
  return FACET_LABELS[facet];
}

export function nodeContentSummary(node: KnowledgeNode): string {
  return contentSummary(node);
}
