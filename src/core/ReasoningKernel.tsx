import React, { useEffect, useRef, useMemo } from 'react';
import { useGraphStore } from '../store/useGraph';
import { extractSubgraph } from '../knowledge/extractSubgraph';

const ZONE_DEFS = [
  { zone: 'axiom',      label: '公理区', sub: '定义/常识', color: '#8b5cf6', border: 'rgba(139,92,246,0.35)' },
  { zone: 'mechanism',  label: '机制区', sub: '过程/方法', color: '#ec4899', border: 'rgba(236,72,153,0.35)' },
  { zone: 'conclusion', label: '结论区', sub: '性质/能力', color: '#06b6d4', border: 'rgba(6,182,212,0.35)'  },
] as const;

const EDGE_COLOR: Record<string, string> = {
  'belongs-to': '#f59e0b',
  'leads-to':   '#10b981',
  'needs-for':  '#a855f7',
  'needs':      '#a855f7',
  'depends-on': '#ef4444',
  'enables':    '#3b82f6',
  'determines': '#06b6d4',
};
const edgeColor = (t: string) => EDGE_COLOR[t] ?? '#6b7280';
const roleColor = (role?: string) => {
  if (role === 'axiom')      return '#8b5cf6';
  if (role === 'mechanism')  return '#ec4899';
  if (role === 'conclusion') return '#06b6d4';
  return '#94a3b8';
};

export default function ReasoningKernel() {
  const nodePool        = useGraphStore((s) => s.nodePool);
  const knowledgeEdges  = useGraphStore((s) => s.knowledgeEdges);
  const selectedNodeId  = useGraphStore((s) => s.selectedNodeId);
  const focusNodeId     = useGraphStore((s) => s.focusNodeId);
  const setSelectedNodeOnly = useGraphStore((s) => s.setSelectedNodeOnly);
  const dimension       = useGraphStore((s) => s.currentPerspective?.id ?? 'all');

  const pack = useMemo(
    () => extractSubgraph(nodePool, knowledgeEdges, { focus: focusNodeId, scope: 'local', dimension }),
    [nodePool, knowledgeEdges, focusNodeId, dimension],
  );

  const grouped = useMemo(() => {
    const g: Record<string, typeof pack.nodes> = { axiom: [], mechanism: [], conclusion: [] };
    for (const n of pack.nodes) {
      const r = n.role ?? 'plain';
      if (r === 'axiom' || r === 'mechanism' || r === 'conclusion') {
        g[r].push(n);
      } else {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const z = (n as any).zone ?? 'mechanism';
        (g[z] ?? g.mechanism).push(n);
      }
    }
    return g;
  }, [pack.nodes]);

  const svgRef = useRef<SVGSVGElement>(null);
  const [svgDim, setSvgDim] = React.useState({ w: 600, h: 480 });

  useEffect(() => {
    const obs = new ResizeObserver((entries) => {
      const el = entries[0]?.contentRect;
      if (el) setSvgDim({ w: Math.max(el.width, 100), h: Math.max(el.height, 100) });
    });
    const parent = svgRef.current?.parentElement;
    if (parent) {
      obs.observe(parent);
      const rect = parent.getBoundingClientRect();
      setSvgDim({ w: Math.max(rect.width, 100), h: Math.max(rect.height, 100) });
    }
    return () => obs.disconnect();
  }, []);

  const { w, h } = svgDim;
  const PAD    = 20;
  const ZONE_H = (h - PAD * 2) / 3;

  /* 梯形漏斗区带 */
  const zones = ZONE_DEFS.map((z, i) => {
    const ratio = 1 - i * 0.15;
    const zw    = (w - PAD * 2) * ratio;
    const x     = PAD + (w - PAD * 2 - zw) / 2;
    const y     = PAD + i * ZONE_H;
    return { ...z, x, y, zw, zh: ZONE_H - 6 };
  });

  type PackNode = typeof pack.nodes[0];
  type LaidNode = PackNode & { cx: number; cy: number };

  function layoutZone(zi: number, nodes: PackNode[]): LaidNode[] {
    const z = zones[zi];
    if (!z || nodes.length === 0) return [];
    const colW = z.zw / (nodes.length + 1);
    return nodes.map((n, i) => ({ ...n, cx: z.x + colW * (i + 1), cy: z.y + z.zh / 2 }));
  }

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const laidOut: LaidNode[] = useMemo(() => [
    ...layoutZone(0, grouped.axiom),
    ...layoutZone(1, grouped.mechanism),
    ...layoutZone(2, grouped.conclusion),
  ], [grouped, svgDim]); // eslint-disable-line

  const nodePos = useMemo(() => {
    const m = new Map<string, { cx: number; cy: number }>();
    laidOut.forEach((n) => m.set(n.id, { cx: n.cx, cy: n.cy }));
    return m;
  }, [laidOut]);

  const edgePaths = useMemo(() => pack.edges.flatMap((e) => {
    const from = nodePos.get(e.source);
    const to   = nodePos.get(e.target);
    if (!from || !to) return [];
    const mx    = (from.cx + to.cx) / 2;
    const my    = (from.cy + to.cy) / 2 - 24;
    const color = edgeColor(e.type);
    const d     = `M ${from.cx} ${from.cy} Q ${mx} ${my} ${to.cx} ${to.cy}`;
    return [{ id: e.id, d, color, label: e.label, type: e.type, dimmed: e.dimmed, mx, my }];
  }), [pack.edges, nodePos]);

  const isEmpty  = pack.nodes.length === 0;
  const edgeKeys = Object.keys(EDGE_COLOR);

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', overflow: 'hidden' }}>
      {/* 增强的背景效果 */}
      <div className="kernel-bg-enhanced" />

      {/* 标题栏 - 显示当前焦点 */}
      {selectedNodeId && nodePool[selectedNodeId] && (
        <div className="kernel-context-header">
          <div className="context-title">
            {nodePool[selectedNodeId].label}
          </div>
          <div className="context-subtitle">
            五不原语：一不定值 · 去资源 · 无资源依归 · 不定律 · 去规则
          </div>
        </div>
      )}

      {/* 空状态提示 */}
      {isEmpty && (
        <div style={{
          position: 'absolute', inset: 0, display: 'flex', alignItems: 'center',
          justifyContent: 'center', fontSize: 12, color: 'rgba(148,163,184,0.4)',
          textAlign: 'center', padding: 32, zIndex: 1, pointerEvents: 'none',
        }}>
          选中左侧目录节点<br />此处显示局部推理漏斗
        </div>
      )}

      <svg ref={svgRef} width="100%" height="100%"
        style={{ position: 'absolute', inset: 0, display: 'block' }}>
        <defs>
          {/* 增强的渐变 */}
          {ZONE_DEFS.map((z) => (
            <linearGradient key={z.zone} id={`zg-${z.zone}`} x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%"   stopColor={z.color} stopOpacity={0.05} />
              <stop offset="50%"  stopColor={z.color} stopOpacity={0.2} />
              <stop offset="100%" stopColor={z.color} stopOpacity={0.05} />
            </linearGradient>
          ))}
          {/* 放射状渐变用于中心定点 */}
          <radialGradient id="rg-focus">
            <stop offset="0%" stopColor="#f59e0b" stopOpacity={0.3} />
            <stop offset="100%" stopColor="#f59e0b" stopOpacity={0} />
          </radialGradient>
          {/* 箭头 marker */}
          {edgeKeys.map((type) => (
            <marker key={type} id={`arr-${type}`} viewBox="0 0 10 10"
              refX="9" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
              <path d="M 0 0 L 10 5 L 0 10 z" fill={EDGE_COLOR[type]} />
            </marker>
          ))}
          <marker id="arr-default" viewBox="0 0 10 10"
            refX="9" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
            <path d="M 0 0 L 10 5 L 0 10 z" fill="#6b7280" />
          </marker>
          {/* 增强的发光滤镜 */}
          <filter id="fglow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="4" result="b" />
            <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
          <filter id="fglow-strong" x="-100%" y="-100%" width="300%" height="300%">
            <feGaussianBlur stdDeviation="8" result="b" />
            <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>

        {/* 梯形区带 - 增强样式 */}
        {zones.map((z, i) => {
          const nz  = zones[i + 1];
          const bw  = nz ? nz.zw : z.zw * 0.88;
          const bx  = nz ? nz.x  : z.x + (z.zw - bw) / 2;
          const pts = `${z.x},${z.y} ${z.x + z.zw},${z.y} ${bx + bw},${z.y + z.zh} ${bx},${z.y + z.zh}`;
          return (
            <g key={z.zone}>
              <polygon points={pts} fill={`url(#zg-${z.zone})`}
                stroke={z.border} strokeWidth={1.5}
                strokeDasharray={i === 0 ? 'none' : '4 6'} />
              <text x={z.x + 10} y={z.y + 18} fontSize={12}
                fill={z.color} opacity={0.95} fontWeight={700}>{z.label}</text>
              <text x={z.x + 10} y={z.y + 32} fontSize={9}
                fill={z.color} opacity={0.6}>({z.sub})</text>
            </g>
          );
        })}

        {/* 边 - 增强样式 */}
        {edgePaths.map((ep) => {
          const mk = edgeKeys.includes(ep.type) ? ep.type : 'default';
          return (
            <g key={ep.id} opacity={ep.dimmed ? 0.2 : 0.9}>
              {/* 发光底层 */}
              <path d={ep.d} fill="none" stroke={ep.color} strokeWidth={3}
                opacity={0.2} filter="url(#fglow)" />
              {/* 主线 */}
              <path d={ep.d} fill="none" stroke={ep.color} strokeWidth={2}
                strokeDasharray={ep.dimmed ? '4 4' : undefined}
                markerEnd={`url(#arr-${mk})`} />
              {/* 边标签 */}
              {ep.label && (
                <text x={ep.mx} y={ep.my - 3} textAnchor="middle" fontSize={9}
                  fill={ep.color} opacity={0.85} fontWeight={500}>{ep.label}</text>
              )}
            </g>
          );
        })}

        {/* 节点 - 增强样式 */}
        {laidOut.map((n) => {
          const isSelected = n.id === selectedNodeId;
          const isFocusNode = n.isFocus;
          const color      = roleColor(n.role);
          const r          = isFocusNode ? 22 : 16;
          return (
            <g key={n.id} style={{ cursor: 'pointer' }} opacity={n.dimmed ? 0.25 : 1}
               onClick={() => setSelectedNodeOnly(isSelected ? null : n.id)}>
              {/* 外发光圈 */}
              {(isSelected || isFocusNode) && (
                <>
                  <circle cx={n.cx} cy={n.cy} r={r + 12} fill={color} opacity={0.1}
                    filter="url(#fglow-strong)" />
                  <circle cx={n.cx} cy={n.cy} r={r + 10} fill="none" stroke={color}
                    strokeWidth={1.5} strokeDasharray="3 5" opacity={0.6}
                    filter="url(#fglow)">
                    <animate attributeName="r" values={`${r + 8};${r + 12};${r + 8}`}
                      dur="3s" repeatCount="indefinite" />
                  </circle>
                </>
              )}
              {/* 主节点 */}
              <circle cx={n.cx} cy={n.cy} r={r}
                fill={`${color}25`} stroke={color}
                strokeWidth={isSelected ? 3 : 2}
                filter={isFocusNode ? "url(#fglow)" : undefined} />
              {/* 焦点中心点 */}
              {isFocusNode && (
                <circle cx={n.cx} cy={n.cy} r={6} fill={color} opacity={0.9}>
                  <animate attributeName="opacity" values="0.7;1;0.7"
                    dur="2s" repeatCount="indefinite" />
                </circle>
              )}
              {/* 标签 */}
              <text x={n.cx} y={n.cy + r + 14} textAnchor="middle" fontSize={11}
                fill={isSelected ? color : 'rgba(226,232,240,0.9)'}
                fontWeight={isSelected ? 700 : 500}>
                {n.label.length > 9 ? n.label.slice(0, 8) + '…' : n.label}
              </text>
              {/* 共享标记 */}
              {nodePool[n.id]?.shared && (
                <text x={n.cx + r - 2} y={n.cy - r + 5} fontSize={10} fill="#f59e0b">⟳</text>
              )}
            </g>
          );
        })}

        {/* 区带间收束虚线 */}
        {zones.slice(0, -1).map((z, i) => {
          const nz = zones[i + 1];
          return (
            <line key={`neck-${i}`}
              x1={z.x + z.zw / 2} y1={z.y + z.zh}
              x2={nz.x + nz.zw / 2} y2={nz.y}
              stroke={ZONE_DEFS[i + 1].color}
              strokeWidth={0.5} strokeDasharray="2 8" opacity={0.2} />
          );
        })}
      </svg>
    </div>
  );
}
