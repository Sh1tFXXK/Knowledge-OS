/**
 * 统一子图提取：extract(focus, scope, dimension)
 * 四个视图共用同一出口，各读各的字段。
 */
import type {
  KnowledgeEdge,
  KnowledgeNode,
  KnowledgeRole,
  LayoutHint,
  ViewDataPack,
  ViewEdge,
  ViewNode,
  ViewScope,
} from '../types';

export interface ExtractParams {
  focus: string | null;
  scope: ViewScope;
  /** 'all' 或视角 id（事务/存储/性能…） */
  dimension: string;
}

const REASONING_TYPES = new Set([
  'belongs-to',
  'leads-to',
  'needs-for',
  'needs',
  'depends-on',
  'enables',
  'determines',
]);

function buildAdjacency(edges: KnowledgeEdge[]): Map<string, KnowledgeEdge[]> {
  const adj = new Map<string, KnowledgeEdge[]>();
  for (const e of edges) {
    if (!adj.has(e.source)) adj.set(e.source, []);
    if (!adj.has(e.target)) adj.set(e.target, []);
    adj.get(e.source)!.push(e);
    adj.get(e.target)!.push(e);
  }
  return adj;
}

function matchesDimension(tags: string[] | undefined, dimension: string): boolean {
  if (dimension === 'all') return true;
  return !!tags?.includes(dimension);
}

function isDimmed(tags: string[] | undefined, dimension: string): boolean {
  return dimension !== 'all' && !matchesDimension(tags, dimension);
}

function collectNodeIds(
  focus: string,
  edges: KnowledgeEdge[],
  maxHops: number,
  edgeFilter?: (e: KnowledgeEdge, hop: number) => boolean,
): Set<string> {
  const adj = buildAdjacency(edges);
  const visited = new Set<string>([focus]);
  let frontier = [focus];

  for (let hop = 0; hop < maxHops && frontier.length; hop++) {
    const next: string[] = [];
    for (const id of frontier) {
      for (const e of adj.get(id) ?? []) {
        if (edgeFilter && !edgeFilter(e, hop)) continue;
        const other = e.source === id ? e.target : e.source;
        if (!visited.has(other)) {
          visited.add(other);
          next.push(other);
        }
      }
    }
    frontier = next;
  }
  return visited;
}

function scopeNodeIds(
  focus: string | null,
  scope: ViewScope,
  nodePool: Record<string, KnowledgeNode>,
  edges: KnowledgeEdge[],
): Set<string> {
  const allIds = new Set(Object.keys(nodePool));

  if (scope === 'global') return allIds;
  if (!focus || !nodePool[focus]) return new Set();

  if (scope === 'local') {
    // 漏斗镜头：焦点 + 仅直接相连的推理边邻居（星形，不扩散到兄弟节点）
    const ids = new Set<string>([focus]);
    for (const e of edges) {
      if (!REASONING_TYPES.has(e.type)) continue;
      if (e.source === focus) ids.add(e.target);
      if (e.target === focus) ids.add(e.source);
    }
    return ids;
  }

  if (scope === 'neighbor') {
    const near = collectNodeIds(focus, edges, 2);
    const subsystem = new Set<string>([focus]);
    for (const id of near) {
      if (nodePool[id]?.role === 'subsystem') subsystem.add(id);
    }
    for (const id of near) {
      if (nodePool[id]?.role !== 'subsystem') subsystem.add(id);
    }
    return subsystem;
  }

  return allIds;
}

function layoutForScope(scope: ViewScope): LayoutHint {
  if (scope === 'local') return 'funnel';
  if (scope === 'neighbor') return 'neighbor';
  return 'force';
}

function roleLayoutOrder(role: KnowledgeRole): number {
  const order: Record<KnowledgeRole, number> = {
    axiom: 0,
    mechanism: 1,
    conclusion: 2,
    subsystem: 3,
    plain: 4,
  };
  return order[role] ?? 4;
}

export function extractSubgraph(
  nodePool: Record<string, KnowledgeNode>,
  edges: KnowledgeEdge[],
  params: ExtractParams,
): ViewDataPack {
  const { focus, scope, dimension } = params;
  const nodeIds = scopeNodeIds(focus, scope, nodePool, edges);

  const edgeInScope = edges.filter(
    (e) => nodeIds.has(e.source) && nodeIds.has(e.target),
  );

  const viewNodes: ViewNode[] = [...nodeIds]
    .map((id) => {
      const kn = nodePool[id];
      if (!kn) return null;
      const dims = kn.dimensions ?? [];
      const role = kn.role ?? 'plain';
      return {
        id,
        label: kn.label,
        role,
        isFocus: focus === id,
        dimmed: isDimmed(dims, dimension),
        zone:
          role === 'axiom' || role === 'mechanism' || role === 'conclusion'
            ? role
            : undefined,
      } satisfies ViewNode;
    })
    .filter(Boolean) as ViewNode[];

  viewNodes.sort((a, b) => roleLayoutOrder(a.role) - roleLayoutOrder(b.role));

  const viewEdges: ViewEdge[] = edgeInScope.map((e) => ({
    id: e.id,
    source: e.source,
    target: e.target,
    type: e.type,
    label: e.label,
    dimmed:
      isDimmed(e.dimensions, dimension) ||
      isDimmed(nodePool[e.source]?.dimensions, dimension) ||
      isDimmed(nodePool[e.target]?.dimensions, dimension),
  }));

  const activeNodes = viewNodes.filter((n) => !n.dimmed).length;
  const activeEdges = viewEdges.filter((e) => !e.dimmed).length;

  return {
    nodes: viewNodes,
    edges: viewEdges,
    layoutHint: layoutForScope(scope),
    meta: {
      focus,
      scope,
      dimension,
      nodeCount: viewNodes.length,
      edgeCount: viewEdges.length,
      activeNodeCount: activeNodes,
      activeEdgeCount: activeEdges,
    },
  };
}
