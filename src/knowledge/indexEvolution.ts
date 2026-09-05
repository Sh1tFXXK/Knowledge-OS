import type { TimelineAnnotation, TimelineIntroducedNode } from './timelineEvolution.ts';

export interface IndexEvolutionProjection {
  annotations: TimelineAnnotation[];
  activeAnnotation: TimelineAnnotation | null;
  excludedNodeIds: ReadonlySet<string>;
  hiddenIntroducedNodeIds: ReadonlySet<string>;
  allIntroducedNodes: TimelineIntroducedNode[];
  visibleIntroducedNodes: TimelineIntroducedNode[];
  currentIntroducedNodeIds: ReadonlySet<string>;
  currentChangedNodeIds: ReadonlySet<string>;
}

export function annotationsForIndexScope(
  scopeNodeIds: ReadonlySet<string>,
  annotations: readonly TimelineAnnotation[],
): TimelineAnnotation[] {
  return annotations
    .filter((annotation) => {
      if (annotation.scopeNodeId && scopeNodeIds.has(annotation.scopeNodeId)) return true;
      return annotation.changes.some((change) => scopeNodeIds.has(change.targetNodeId));
    })
    .sort((left, right) => left.capturedAt - right.capturedAt || left.id.localeCompare(right.id));
}

export function buildIndexEvolutionProjection(
  annotations: readonly TimelineAnnotation[],
  activeAnnotationId: string | null,
): IndexEvolutionProjection {
  const ordered = [...annotations].sort(
    (left, right) => left.capturedAt - right.capturedAt || left.id.localeCompare(right.id),
  );
  const activeIndex = activeAnnotationId
    ? ordered.findIndex((annotation) => annotation.id === activeAnnotationId)
    : -1;
  const activeAnnotation = activeIndex >= 0 ? ordered[activeIndex] : null;
  const sourceOnlyNodeIds = new Set(
    ordered.flatMap((annotation) => annotation.sourceOnlyNodeIds ?? []),
  );
  const allIntroducedNodes = ordered.flatMap((annotation) => annotation.introducedNodes ?? []);
  const visibleIntroducedNodes = activeIndex >= 0
    ? ordered.slice(0, activeIndex + 1).flatMap((annotation) => annotation.introducedNodes ?? [])
    : [];
  const visibleNodeIds = new Set(visibleIntroducedNodes.map((introduced) => introduced.nodeId));
  const hiddenIntroducedNodeIds = new Set(
    allIntroducedNodes
      .filter((introduced) => !visibleNodeIds.has(introduced.nodeId))
      .map((introduced) => introduced.nodeId),
  );

  return {
    annotations: ordered,
    activeAnnotation,
    excludedNodeIds: sourceOnlyNodeIds,
    hiddenIntroducedNodeIds,
    allIntroducedNodes,
    visibleIntroducedNodes,
    currentIntroducedNodeIds: new Set(
      activeAnnotation?.introducedNodes?.map((introduced) => introduced.nodeId) ?? [],
    ),
    currentChangedNodeIds: new Set(
      activeAnnotation?.changes.map((change) => change.targetNodeId) ?? [],
    ),
  };
}
