import type { KnowledgeEdge } from '../types';

export const CONTAINMENT_EDGE_TYPE = 'belongs-to' as const;
export const CONTAINMENT_EDGE_LABEL = 'contains' as const;

export interface DirectContainmentRelation {
  edge: KnowledgeEdge;
}

export function isContainmentEdge(edge: KnowledgeEdge): boolean {
  return edge.type === CONTAINMENT_EDGE_TYPE;
}

export function isManagedContainmentEdge(edge: KnowledgeEdge): boolean {
  return isContainmentEdge(edge) && edge.id.startsWith('treebind:');
}

export function collectDirectContainmentRelations(
  edges: readonly KnowledgeEdge[],
  sourceId?: string,
): DirectContainmentRelation[] {
  return edges.flatMap((edge) => {
    if (!isContainmentEdge(edge)) return [];
    if (sourceId && edge.source !== sourceId) return [];
    return [{ edge }];
  });
}

export function hasDirectContainmentRelation(
  edges: readonly KnowledgeEdge[],
  sourceId: string,
  targetId: string,
): boolean {
  return collectDirectContainmentRelations(edges, sourceId).some(
    ({ edge }) => edge.target === targetId,
  );
}

export function wouldIntroduceContainmentCycle(
  edges: readonly KnowledgeEdge[],
  sourceId: string,
  targetId: string,
): boolean {
  if (sourceId === targetId) return true;

  const outgoing = new Map<string, string[]>();
  for (const { edge } of collectDirectContainmentRelations(edges)) {
    const targets = outgoing.get(edge.source) ?? [];
    targets.push(edge.target);
    outgoing.set(edge.source, targets);
  }

  const visited = new Set<string>();
  const queue = [targetId];
  while (queue.length > 0) {
    const current = queue.shift();
    if (!current || visited.has(current)) continue;
    if (current === sourceId) return true;
    visited.add(current);
    queue.push(...(outgoing.get(current) ?? []));
  }
  return false;
}
