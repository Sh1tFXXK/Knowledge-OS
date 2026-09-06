import type { KnowledgeEvolutionEvent, KnowledgeEvolutionIntroducedNode } from './timelineEvolution.ts';

export interface TemporalIndexProjection {
  events: KnowledgeEvolutionEvent[];
  activeEvent: KnowledgeEvolutionEvent | null;
  excludedNodeIds: ReadonlySet<string>;
  hiddenIntroducedNodeIds: ReadonlySet<string>;
  allIntroducedNodes: KnowledgeEvolutionIntroducedNode[];
  visibleIntroducedNodes: KnowledgeEvolutionIntroducedNode[];
  currentIntroducedNodeIds: ReadonlySet<string>;
  currentChangedNodeIds: ReadonlySet<string>;
}

export function eventsForIndexScope(
  scopeNodeIds: ReadonlySet<string>,
  events: readonly KnowledgeEvolutionEvent[],
): KnowledgeEvolutionEvent[] {
  return events
    .filter((event) => {
      if (event.scopeRootId && scopeNodeIds.has(event.scopeRootId)) return true;
      return event.changes.some((change) => scopeNodeIds.has(change.targetNodeId));
    })
    .sort((left, right) => left.occurredAt - right.occurredAt || left.id.localeCompare(right.id));
}

export function buildTemporalIndexProjection(
  events: readonly KnowledgeEvolutionEvent[],
  activeEventId: string | null,
): TemporalIndexProjection {
  const ordered = [...events].sort(
    (left, right) => left.occurredAt - right.occurredAt || left.id.localeCompare(right.id),
  );
  const activeIndex = activeEventId
    ? ordered.findIndex((event) => event.id === activeEventId)
    : -1;
  const activeEvent = activeIndex >= 0 ? ordered[activeIndex] : null;
  const excludedNodeIds = new Set(ordered.flatMap((event) => event.sourceOnlyNodeIds));
  const allIntroducedNodes = ordered.flatMap((event) => event.introducedNodes);
  const visibleIntroducedNodes = activeIndex >= 0
    ? ordered.slice(0, activeIndex + 1).flatMap((event) => event.introducedNodes)
    : [];
  const visibleNodeIds = new Set(visibleIntroducedNodes.map((introduced) => introduced.nodeId));
  const hiddenIntroducedNodeIds = new Set(
    allIntroducedNodes
      .filter((introduced) => !visibleNodeIds.has(introduced.nodeId))
      .map((introduced) => introduced.nodeId),
  );

  return {
    events: ordered,
    activeEvent,
    excludedNodeIds,
    hiddenIntroducedNodeIds,
    allIntroducedNodes,
    visibleIntroducedNodes,
    currentIntroducedNodeIds: new Set(
      activeEvent?.introducedNodes.map((introduced) => introduced.nodeId) ?? [],
    ),
    currentChangedNodeIds: new Set(
      activeEvent?.changes.map((change) => change.targetNodeId) ?? [],
    ),
  };
}

/** 瞬时的时态上下文：当前作用域、当前事件、是否跟随外部节点选择。 */
export interface TemporalContext {
  scopeRootId: string | null;
  activeEventId: string | null;
  followSelection: boolean;
}

export function resolveTemporalContext(params: {
  events: readonly KnowledgeEvolutionEvent[];
  scopeRootId: string | null;
  selectedNodeId: string | null;
  lastActiveEventId: string | null;
  followSelection: boolean;
}): { scopeEvents: KnowledgeEvolutionEvent[]; activeEventId: string | null } {
  const scopeEvents = params.scopeRootId
    ? eventsForIndexScope(new Set([params.scopeRootId]), params.events)
    : [];

  if (params.followSelection && params.selectedNodeId) {
    const match = [...scopeEvents].reverse().find(
      (event) =>
        event.changes.some((change) => change.targetNodeId === params.selectedNodeId) ||
        event.introducedNodes.some((introduced) => introduced.nodeId === params.selectedNodeId),
    );
    if (match) return { scopeEvents, activeEventId: match.id };
  }

  const stillInScope = scopeEvents.some((event) => event.id === params.lastActiveEventId);
  return { scopeEvents, activeEventId: stillInScope ? params.lastActiveEventId : null };
}
