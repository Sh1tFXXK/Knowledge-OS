import type { KnowledgeEdge, KnowledgeNode } from '../types';

export const SystemConnectionDirection = {
  Incoming: 'incoming',
  Outgoing: 'outgoing',
  Bidirectional: 'bidirectional',
} as const;

export type SystemConnectionDirection =
  typeof SystemConnectionDirection[keyof typeof SystemConnectionDirection];

export interface ConnectedSystem {
  id: string;
  label: string;
  direction: SystemConnectionDirection;
  edgeIds: readonly string[];
  relationTypes: readonly string[];
}

export interface SystemConnectionGraph {
  currentSystem: {
    id: string;
    label: string;
    anchorId: string;
    anchorLabel: string;
  };
  connectedSystems: readonly ConnectedSystem[];
  totalSystemCount: number;
  totalEdgeCount: number;
}

interface MutableConnection {
  node: KnowledgeNode;
  incoming: boolean;
  outgoing: boolean;
  edgeIds: Set<string>;
  relationTypes: Set<string>;
}

interface BuildSystemConnectionGraphOptions {
  maxSystems?: number;
}

const DEFAULT_MAX_SYSTEMS = 7;

function connectionDirection(connection: MutableConnection): SystemConnectionDirection {
  if (connection.incoming && connection.outgoing) {
    return SystemConnectionDirection.Bidirectional;
  }
  return connection.outgoing
    ? SystemConnectionDirection.Outgoing
    : SystemConnectionDirection.Incoming;
}

/**
 * Projects knowledge edges onto a system-level neighborhood. A relation-index
 * root is an alias of the selected owner, so it never becomes duplicate state.
 */
export function buildSystemConnectionGraph(
  currentSystemId: string | null,
  nodePool: Record<string, KnowledgeNode>,
  knowledgeEdges: readonly KnowledgeEdge[],
  options: BuildSystemConnectionGraphOptions = {},
): SystemConnectionGraph | null {
  if (!currentSystemId) return null;
  const currentSystem = nodePool[currentSystemId];
  if (!currentSystem) return null;

  const configuredAnchorId = currentSystem.relationIndex?.rootNodeId;
  const anchorId = configuredAnchorId && nodePool[configuredAnchorId]
    ? configuredAnchorId
    : currentSystem.id;
  const anchorIds = new Set([currentSystem.id, anchorId]);
  const bySystemId = new Map<string, MutableConnection>();

  for (const edge of knowledgeEdges) {
    const sourceIsAnchor = anchorIds.has(edge.source);
    const targetIsAnchor = anchorIds.has(edge.target);
    if (sourceIsAnchor === targetIsAnchor) continue;

    const externalId = sourceIsAnchor ? edge.target : edge.source;
    const externalNode = nodePool[externalId];
    if (!externalNode) continue;

    const connection = bySystemId.get(externalId) ?? {
      node: externalNode,
      incoming: false,
      outgoing: false,
      edgeIds: new Set<string>(),
      relationTypes: new Set<string>(),
    };
    connection.outgoing ||= sourceIsAnchor;
    connection.incoming ||= targetIsAnchor;
    connection.edgeIds.add(edge.id);
    if (edge.type) connection.relationTypes.add(edge.type);
    bySystemId.set(externalId, connection);
  }

  const allConnections = [...bySystemId.values()]
    .sort((left, right) =>
      right.edgeIds.size - left.edgeIds.size ||
      left.node.label.localeCompare(right.node.label, 'zh-CN') ||
      left.node.id.localeCompare(right.node.id),
    );
  const maxSystems = Math.max(0, options.maxSystems ?? DEFAULT_MAX_SYSTEMS);
  const visibleConnections = allConnections.slice(0, maxSystems);

  return {
    currentSystem: {
      id: currentSystem.id,
      label: currentSystem.label,
      anchorId,
      anchorLabel: nodePool[anchorId]?.label ?? currentSystem.label,
    },
    connectedSystems: visibleConnections.map((connection) => ({
      id: connection.node.id,
      label: connection.node.label,
      direction: connectionDirection(connection),
      edgeIds: [...connection.edgeIds].sort(),
      relationTypes: [...connection.relationTypes].sort(),
    })),
    totalSystemCount: allConnections.length,
    totalEdgeCount: allConnections.reduce(
      (count, connection) => count + connection.edgeIds.size,
      0,
    ),
  };
}
