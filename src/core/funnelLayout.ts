/** 漏斗区节点布局（ReasoningKernel 等视图共用） */

export interface ZoneRect {
  x: number;
  y: number;
  zw: number;
  zh: number;
}

export interface LayoutNode {
  id: string;
  label: string;
}

export interface LayoutEdge {
  source: string;
  target: string;
}

export interface LaidNode<T extends LayoutNode = LayoutNode> extends T {
  cx: number;
  cy: number;
}

const MIN_NODE_GAP = 108;

export function layoutFunnelZone<T extends LayoutNode>(
  zone: ZoneRect,
  nodes: T[],
  opts: {
    canvasW: number;
    focusId?: string | null;
    edges?: LayoutEdge[];
  },
): LaidNode<T>[] {
  if (nodes.length === 0) return [];

  const centerY = zone.y + zone.zh / 2;
  const centerX = zone.x + zone.zw / 2;
  const usableW = Math.max(zone.zw, opts.canvasW * 0.82);

  if (nodes.length === 1) {
    return [{ ...nodes[0], cx: centerX, cy: centerY }];
  }

  const focusId = opts.focusId;
  const edges = opts.edges ?? [];
  const focus = focusId ? nodes.find((n) => n.id === focusId) : undefined;

  if (focus && focusId) {
    const left: T[] = [];
    const right: T[] = [];
    for (const n of nodes) {
      if (n.id === focusId) continue;
      const isUpstream = edges.some((e) => e.target === focusId && e.source === n.id);
      if (isUpstream) left.push(n);
      else right.push(n);
    }
    const laid: LaidNode<T>[] = [{ ...focus, cx: centerX, cy: centerY }];
    left.forEach((n, i) => {
      laid.push({ ...n, cx: centerX - MIN_NODE_GAP * (i + 1), cy: centerY });
    });
    right.forEach((n, i) => {
      laid.push({ ...n, cx: centerX + MIN_NODE_GAP * (i + 1), cy: centerY });
    });
    return laid;
  }

  if (nodes.length > 3) {
    const half = Math.ceil(nodes.length / 2);
    const rowGap = Math.min(zone.zh * 0.28, 36);
    const rows = [nodes.slice(0, half), nodes.slice(half)];
    const laid: LaidNode<T>[] = [];
    rows.forEach((row, ri) => {
      const cy = centerY + (ri === 0 ? -rowGap : rowGap);
      const span = Math.max(usableW * 0.88, MIN_NODE_GAP * Math.max(row.length - 1, 1));
      const step = row.length > 1 ? span / (row.length - 1) : 0;
      const startX = centerX - span / 2;
      row.forEach((node, i) => {
        laid.push({
          ...node,
          cx: row.length === 1 ? centerX : startX + step * i,
          cy,
        });
      });
    });
    return laid;
  }

  const span = Math.max(usableW * 0.88, MIN_NODE_GAP * (nodes.length - 1));
  const step = nodes.length > 1 ? span / (nodes.length - 1) : 0;
  const startX = centerX - span / 2;
  return nodes.map((node, i) => ({
    ...node,
    cx: nodes.length === 1 ? centerX : startX + step * i,
    cy: centerY,
  }));
}
