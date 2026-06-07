import type { KnowledgeEdge, KnowledgeNode } from '../types';

const ROLE_COLORS: Record<string, string> = {
  axiom: '#8B5CF6',
  mechanism: '#3B82F6',
  conclusion: '#10B981',
  subsystem: '#F59E0B',
  plain: '#94A3B8',
};

export interface SubsystemCardData {
  id: string;
  title: string;
  desc: string;
  col: string;
  nodeCount: number;
  edgeCount: number;
  pts: [number, number][];
  es: [number, number][];
}

function roleColor(role?: string) {
  return ROLE_COLORS[role ?? 'plain'] ?? ROLE_COLORS.plain;
}

/** 收集焦点节点的子系统卡片：直接子节点 + 兄弟节点（最多 4 张） */
export function getSubsystemCards(
  focusId: string,
  nodePool: Record<string, KnowledgeNode>,
  edges: KnowledgeEdge[],
  limit = 4,
): SubsystemCardData[] {
  const childIds = edges
    .filter((e) => e.source === focusId && nodePool[e.target])
    .map((e) => e.target);

  const parentEdge = edges.find((e) => e.target === focusId);
  const siblingIds = parentEdge
    ? edges
        .filter((e) => e.source === parentEdge.source && e.target !== focusId && nodePool[e.target])
        .map((e) => e.target)
    : [];

  const ids = [...new Set([...childIds, ...siblingIds])].slice(0, limit);

  return ids.map((id) => buildCard(id, nodePool, edges));
}

function buildCard(
  id: string,
  nodePool: Record<string, KnowledgeNode>,
  edges: KnowledgeEdge[],
): SubsystemCardData {
  const kn = nodePool[id];
  const localIds = new Set<string>([id]);
  for (const e of edges) {
    if (e.source === id) localIds.add(e.target);
    if (e.target === id) localIds.add(e.source);
  }

  const localNodes = [...localIds].filter((nid) => nodePool[nid]).slice(0, 7);
  const localEdges = edges.filter(
    (e) => localIds.has(e.source) && localIds.has(e.target),
  );

  const n = localNodes.length || 1;
  const pts: [number, number][] = localNodes.map((_, i) => {
    const angle = (i / n) * Math.PI * 2 - Math.PI / 2;
    const dist = i === 0 ? 0 : 28 + (i % 3) * 8;
    const cx = 81;
    const cy = 32;
    return [
      Math.round(cx + Math.cos(angle) * dist),
      Math.round(cy + Math.sin(angle) * dist * 0.65),
    ] as [number, number];
  });

  const idxMap = new Map(localNodes.map((nid, i) => [nid, i]));
  const es: [number, number][] = [];
  for (const e of localEdges) {
    const si = idxMap.get(e.source);
    const ti = idxMap.get(e.target);
    if (si !== undefined && ti !== undefined) es.push([si, ti]);
  }
  if (es.length === 0 && pts.length > 1) {
    for (let i = 1; i < pts.length; i++) es.push([0, i]);
  }

  const defTab = kn.card.tabs[0]?.content ?? '';

  return {
    id,
    title: kn.label,
    desc: defTab.length > 36 ? defTab.slice(0, 35) + '…' : defTab,
    col: roleColor(kn.role),
    nodeCount: localNodes.length,
    edgeCount: localEdges.length,
    pts,
    es,
  };
}
