import { TypeRelationKind, type KnowledgeEdge } from '../types';

export enum TypeRelationOrigin {
  Direct = 'direct',
  Derived = 'derived',
}

export interface DirectTypeRelation {
  edge: KnowledgeEdge;
  kind: TypeRelationKind;
}

export interface TypeRelationProjection {
  targetId: string;
  kind: TypeRelationKind;
  origin: TypeRelationOrigin;
  edgeId?: string;
  path: readonly string[];
}

export interface TypeRelationGraphNode {
  nodeId: string;
  depth: number;
}

export interface TypeRelationGraphEdge {
  edgeId: string;
  sourceId: string;
  targetId: string;
  kind: TypeRelationKind;
}

export interface TypeRelationGraph {
  nodes: readonly TypeRelationGraphNode[];
  edges: readonly TypeRelationGraphEdge[];
  maxDepth: number;
}

function relationKindFor(edge: KnowledgeEdge): TypeRelationKind | null {
  switch (edge.type) {
    case TypeRelationKind.Implements:
      return TypeRelationKind.Implements;
    case TypeRelationKind.Extends:
      return TypeRelationKind.Extends;
    default:
      return null;
  }
}

export function typeRelationLabel(kind: TypeRelationKind): string {
  return kind === TypeRelationKind.Implements ? 'implements' : 'extends';
}

export function collectDirectTypeRelations(
  edges: readonly KnowledgeEdge[],
  sourceId?: string,
): DirectTypeRelation[] {
  return edges.flatMap((edge) => {
    if (sourceId && edge.source !== sourceId) return [];
    const kind = relationKindFor(edge);
    return kind ? [{ edge, kind }] : [];
  });
}

export function hasDirectTypeRelation(
  edges: readonly KnowledgeEdge[],
  sourceId: string,
  targetId: string,
  kind: TypeRelationKind,
): boolean {
  return collectDirectTypeRelations(edges, sourceId).some(
    (relation) => relation.edge.target === targetId && relation.kind === kind,
  );
}

function relationKindForPath(path: readonly DirectTypeRelation[]): TypeRelationKind {
  return path.some((relation) => relation.kind === TypeRelationKind.Implements)
    ? TypeRelationKind.Implements
    : TypeRelationKind.Extends;
}

function outgoingRelations(
  edges: readonly KnowledgeEdge[],
): Map<string, DirectTypeRelation[]> {
  const outgoing = new Map<string, DirectTypeRelation[]>();
  for (const relation of collectDirectTypeRelations(edges)) {
    const current = outgoing.get(relation.edge.source) ?? [];
    current.push(relation);
    outgoing.set(relation.edge.source, current);
  }
  return outgoing;
}

export function resolveTypeRelationGraph(
  sourceId: string,
  edges: readonly KnowledgeEdge[],
): TypeRelationGraph {
  const outgoing = outgoingRelations(edges);
  const graphEdges: TypeRelationGraphEdge[] = [];
  const graphEdgeIds = new Set<string>();
  const nodeIds = new Set<string>([sourceId]);
  const queue = [sourceId];

  while (queue.length > 0) {
    const current = queue.shift();
    if (!current) break;

    for (const relation of outgoing.get(current) ?? []) {
      if (!graphEdgeIds.has(relation.edge.id)) {
        graphEdgeIds.add(relation.edge.id);
        graphEdges.push({
          edgeId: relation.edge.id,
          sourceId: relation.edge.source,
          targetId: relation.edge.target,
          kind: relation.kind,
        });
      }
      if (nodeIds.has(relation.edge.target)) continue;
      nodeIds.add(relation.edge.target);
      queue.push(relation.edge.target);
    }
  }

  const indegree = new Map([...nodeIds].map((nodeId) => [nodeId, 0]));
  for (const edge of graphEdges) {
    indegree.set(edge.targetId, (indegree.get(edge.targetId) ?? 0) + 1);
  }

  const depths = new Map<string, number>([[sourceId, 0]]);
  const topologicalQueue = [...nodeIds].filter((nodeId) => (indegree.get(nodeId) ?? 0) === 0);
  const processed = new Set<string>();

  while (topologicalQueue.length > 0) {
    const current = topologicalQueue.shift();
    if (!current) break;
    processed.add(current);
    const currentDepth = depths.get(current) ?? 0;

    for (const edge of graphEdges.filter((item) => item.sourceId === current)) {
      depths.set(edge.targetId, Math.max(depths.get(edge.targetId) ?? 0, currentDepth + 1));
      const nextIndegree = (indegree.get(edge.targetId) ?? 1) - 1;
      indegree.set(edge.targetId, nextIndegree);
      if (nextIndegree === 0) topologicalQueue.push(edge.targetId);
    }
  }

  for (const nodeId of nodeIds) {
    if (!processed.has(nodeId) && !depths.has(nodeId)) depths.set(nodeId, 1);
  }

  const nodes = [...nodeIds]
    .map((nodeId) => ({ nodeId, depth: depths.get(nodeId) ?? 0 }))
    .sort((left, right) => left.depth - right.depth || left.nodeId.localeCompare(right.nodeId));
  const maxDepth = nodes.reduce((maximum, node) => Math.max(maximum, node.depth), 0);

  return { nodes, edges: graphEdges, maxDepth };
}

/**
 * Produces one display cell per reachable target. Only direct edges are persisted;
 * all transitive conformance is derived from the typed relation graph.
 */
export function resolveTypeRelationProjections(
  sourceId: string,
  edges: readonly KnowledgeEdge[],
): TypeRelationProjection[] {
  const direct = collectDirectTypeRelations(edges, sourceId);
  const projections = new Map<string, TypeRelationProjection>();
  const queue = direct.map((relation) => ({
    targetId: relation.edge.target,
    path: [relation],
  }));
  const shortestPathLength = new Map<string, number>([[sourceId, 0]]);

  for (const relation of direct) {
    if (projections.has(relation.edge.target)) continue;
    projections.set(relation.edge.target, {
      targetId: relation.edge.target,
      kind: relation.kind,
      origin: TypeRelationOrigin.Direct,
      edgeId: relation.edge.id,
      path: [sourceId, relation.edge.target],
    });
    shortestPathLength.set(relation.edge.target, 1);
  }

  const outgoing = outgoingRelations(edges);
  while (queue.length > 0) {
    const current = queue.shift();
    if (!current) break;

    for (const relation of outgoing.get(current.targetId) ?? []) {
      const nextPath = [...current.path, relation];
      const nextTargetId = relation.edge.target;
      const nextLength = nextPath.length;
      const knownLength = shortestPathLength.get(nextTargetId);

      if (nextTargetId === sourceId || (knownLength !== undefined && knownLength <= nextLength)) {
        continue;
      }

      shortestPathLength.set(nextTargetId, nextLength);
      queue.push({ targetId: nextTargetId, path: nextPath });

      if (!projections.has(nextTargetId)) {
        projections.set(nextTargetId, {
          targetId: nextTargetId,
          kind: relationKindForPath(nextPath),
          origin: TypeRelationOrigin.Derived,
          path: [sourceId, ...nextPath.map((item) => item.edge.target)],
        });
      }
    }
  }

  return [...projections.values()].sort((left, right) => {
    if (left.origin !== right.origin) {
      return left.origin === TypeRelationOrigin.Direct ? -1 : 1;
    }
    return left.targetId.localeCompare(right.targetId);
  });
}

export function wouldIntroduceTypeRelationCycle(
  edges: readonly KnowledgeEdge[],
  sourceId: string,
  targetId: string,
): boolean {
  if (sourceId === targetId) return true;

  const outgoing = outgoingRelations(edges);
  const visited = new Set<string>();
  const queue = [targetId];

  while (queue.length > 0) {
    const current = queue.shift();
    if (!current || visited.has(current)) continue;
    if (current === sourceId) return true;
    visited.add(current);

    for (const relation of outgoing.get(current) ?? []) {
      queue.push(relation.edge.target);
    }
  }

  return false;
}
