import React, { useEffect, useRef, useMemo, useCallback } from 'react';
import { useGraphStore } from '../store/useGraph';
import { extractSubgraph } from '../knowledge/extractSubgraph';

/* ── 关系颜色表 ─────────────────────────────────────────── */
const EDGE_COLOR: Record<string, string> = {
  'belongs-to': '#f59e0b',
  'leads-to':   '#10b981',
  'needs-for':  '#a855f7',
  'needs':      '#a855f7',
  'depends-on': '#ef4444',
  'enables':    '#3b82f6',
  'determines': '#06b6d4',
};
const eColor = (t: string) => EDGE_COLOR[t] ?? '#6b7280';

const ROLE_COLOR: Record<string, string> = {
  axiom:      '#8b5cf6',
  mechanism:  '#ec4899',
  conclusion: '#06b6d4',
  subsystem:  '#f59e0b',
  plain:      '#94a3b8',
};
const rColor = (r?: string) => ROLE_COLOR[r ?? 'plain'] ?? '#94a3b8';

/* ── 粒子类型 ─────────────────────────────────────────────── */
interface Particle {
  id:      string;
  label:   string;
  role:    string;
  isFocus: boolean;
  shared:  boolean;
  x: number; y: number;
  vx: number; vy: number;
  pinned: boolean;
}

/* ── 力导向常数 ──────────────────────────────────────────── */
const REPULSE  = 9000;
const ATTRACT  = 0.022;
const CENTER_K = 0.008;
const DAMPING  = 0.82;
const LINK_LEN = 140;
const DT       = 0.55;
const MAX_V    = 8;

function clamp(v: number, lo: number, hi: number) {
  return v < lo ? lo : v > hi ? hi : v;
}

/* ───────────────────────────────────────────────────────── */
export default function RelationNetwork() {
  const nodePool        = useGraphStore((s) => s.nodePool);
  const knowledgeEdges  = useGraphStore((s) => s.knowledgeEdges);
  const selectedNodeId  = useGraphStore((s) => s.selectedNodeId);
  const focusNodeId     = useGraphStore((s) => s.focusNodeId);
  const openCard        = useGraphStore((s) => s.openCard);
  const dimension       = useGraphStore((s) => s.currentPerspective?.id ?? 'all');

  /* 关系网：有焦点时只显示邻域子图，避免全局过密 */
  const pack = useMemo(
    () => extractSubgraph(nodePool, knowledgeEdges, {
      focus: focusNodeId,
      scope: focusNodeId ? 'neighbor' : 'global',
      dimension,
    }),
    [nodePool, knowledgeEdges, focusNodeId, dimension],
  );

  /* SVG 容器尺寸 */
  const wrapRef = useRef<HTMLDivElement>(null);
  const svgRef  = useRef<SVGSVGElement>(null);
  const [svgDim, setSvgDim] = React.useState({ w: 500, h: 400 });
  useEffect(() => {
    const obs = new ResizeObserver((entries) => {
      const el = entries[0]?.contentRect;
      if (el) setSvgDim({ w: Math.max(el.width, 100), h: Math.max(el.height, 100) });
    });
    if (wrapRef.current) {
      obs.observe(wrapRef.current);
      const r = wrapRef.current.getBoundingClientRect();
      setSvgDim({ w: Math.max(r.width, 100), h: Math.max(r.height, 100) });
    }
    return () => obs.disconnect();
  }, []);

  const { w, h } = svgDim;
  const cx = w / 2;
  const cy = h / 2;

  /* 粒子池（持久化 ref，避免重置位置） */
  const particlesRef = useRef<Map<string, Particle>>(new Map());

  useMemo(() => {
    const prev = particlesRef.current;
    const next  = new Map<string, Particle>();
    const n     = pack.nodes.length || 1;
    pack.nodes.forEach((nd, i) => {
      const old = prev.get(nd.id);
      if (old) {
        next.set(nd.id, {
          ...old,
          label:   nd.label,
          role:    nd.role ?? 'plain',
          isFocus: nd.isFocus,
          shared:  !!nodePool[nd.id]?.shared,
        });
      } else {
        const angle = (i / n) * Math.PI * 2;
        const dist  = 70 + Math.random() * 70;
        next.set(nd.id, {
          id:      nd.id,
          label:   nd.label,
          role:    nd.role ?? 'plain',
          isFocus: nd.isFocus,
          shared:  !!nodePool[nd.id]?.shared,
          x:  cx + Math.cos(angle) * dist,
          y:  cy + Math.sin(angle) * dist,
          vx: 0, vy: 0,
          pinned: false,
        });
      }
    });
    particlesRef.current = next;
  }, [pack.nodes, nodePool, cx, cy]);

  /* 渲染帧计数 */
  const [, setTick] = React.useState(0);
  const rafRef  = useRef<number>(0);
  const runRef  = useRef(true);

  /* 拖拽状态 */
  const dragRef = useRef<{ id: string; ox: number; oy: number } | null>(null);

  /* 力模拟循环 */
  useEffect(() => {
    runRef.current = true;
    const edges = pack.edges;

    function step() {
      if (!runRef.current) return;
      const ps  = Array.from(particlesRef.current.values());
      const map = particlesRef.current;

      /* 斥力 */
      for (let i = 0; i < ps.length; i++) {
        for (let j = i + 1; j < ps.length; j++) {
          const a  = ps[i]; const b = ps[j];
          const dx = b.x - a.x; const dy = b.y - a.y;
          const d2 = dx * dx + dy * dy + 0.01;
          const d  = Math.sqrt(d2);
          const f  = REPULSE / d2;
          const fx = (dx / d) * f; const fy = (dy / d) * f;
          a.vx -= fx * DT; a.vy -= fy * DT;
          b.vx += fx * DT; b.vy += fy * DT;
        }
      }

      /* 弹簧引力（边） */
      for (const e of edges) {
        const a = map.get(e.source); const b = map.get(e.target);
        if (!a || !b) continue;
        const dx = b.x - a.x; const dy = b.y - a.y;
        const d  = Math.sqrt(dx * dx + dy * dy) + 0.01;
        const f  = (d - LINK_LEN) * ATTRACT;
        const fx = (dx / d) * f; const fy = (dy / d) * f;
        a.vx += fx * DT; a.vy += fy * DT;
        b.vx -= fx * DT; b.vy -= fy * DT;
      }

      /* 向心力 */
      for (const p of ps) {
        p.vx += (cx - p.x) * CENTER_K * DT;
        p.vy += (cy - p.y) * CENTER_K * DT;
      }

      /* 积分 + 边界 */
      for (const p of ps) {
        if (p.pinned) continue;
        p.vx = clamp(p.vx * DAMPING, -MAX_V, MAX_V);
        p.vy = clamp(p.vy * DAMPING, -MAX_V, MAX_V);
        p.x  = clamp(p.x + p.vx, 20, w - 20);
        p.y  = clamp(p.y + p.vy, 20, h - 20);
      }

      setTick((t) => t + 1);
      rafRef.current = requestAnimationFrame(step);
    }

    rafRef.current = requestAnimationFrame(step);
    return () => {
      runRef.current = false;
      cancelAnimationFrame(rafRef.current);
    };
  }, [pack.edges, cx, cy, w, h]);

  /* 拖拽 mousedown */
  const onMouseDown = useCallback((e: React.MouseEvent, id: string) => {
    e.preventDefault();
    e.stopPropagation();
    const p = particlesRef.current.get(id);
    if (!p) return;
    const rect = svgRef.current!.getBoundingClientRect();
    dragRef.current = {
      id,
      ox: e.clientX - rect.left - p.x,
      oy: e.clientY - rect.top  - p.y,
    };
    p.pinned = true;
  }, []);

  /* 全局 move/up */
  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      const d = dragRef.current; if (!d) return;
      const p    = particlesRef.current.get(d.id);
      const rect = svgRef.current?.getBoundingClientRect();
      if (!p || !rect) return;
      p.x  = clamp(e.clientX - rect.left - d.ox, 20, w - 20);
      p.y  = clamp(e.clientY - rect.top  - d.oy, 20, h - 20);
      p.vx = 0; p.vy = 0;
    };
    const onUp = () => {
      if (dragRef.current) {
        const p = particlesRef.current.get(dragRef.current.id);
        if (p) p.pinned = false;
        dragRef.current = null;
      }
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup',   onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup',   onUp);
    };
  }, [w, h]);

  const particles = Array.from(particlesRef.current.values());
  const posMap    = new Map(particles.map((p) => [p.id, p]));
  const isEmpty   = pack.nodes.length === 0;
  const edgeKeys  = Object.keys(EDGE_COLOR);

  return (
    <div className="right-section relation-panel">
    <div
      ref={wrapRef}
      className="relation-panel-canvas"
    >

      {isEmpty && (
        <div style={{
          position: 'absolute', inset: 0, display: 'flex', alignItems: 'center',
          justifyContent: 'center', fontSize: 12, color: 'rgba(148,163,184,0.4)',
          textAlign: 'center', padding: 32, zIndex: 1, pointerEvents: 'none',
        }}>
          暂无节点数据<br />请先在左侧加载知识库
        </div>
      )}

      <svg
        ref={svgRef}
        width="100%"
        height="100%"
        style={{ display: 'block', cursor: dragRef.current ? 'grabbing' : 'default' }}
      >
        <defs>
          {edgeKeys.map((type) => (
            <marker key={type} id={`rn-arr-${type}`} viewBox="0 0 10 10"
              refX="18" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
              <path d="M 0 0 L 10 5 L 0 10 z" fill={EDGE_COLOR[type]} opacity={0.75} />
            </marker>
          ))}
          <marker id="rn-arr-default" viewBox="0 0 10 10"
            refX="18" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
            <path d="M 0 0 L 10 5 L 0 10 z" fill="#6b7280" opacity={0.6} />
          </marker>
          <filter id="rn-glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="3" result="b" />
            <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>

        {/* 边 */}
        {pack.edges.map((e) => {
          const from = posMap.get(e.source);
          const to   = posMap.get(e.target);
          if (!from || !to) return null;
          const color = eColor(e.type);
          const mk    = edgeKeys.includes(e.type) ? e.type : 'default';
          const mx    = (from.x + to.x) / 2;
          const my    = (from.y + to.y) / 2 - 18;
          return (
            <g key={e.id} opacity={e.dimmed ? 0.15 : 0.75}>
              <path
                d={`M ${from.x} ${from.y} Q ${mx} ${my} ${to.x} ${to.y}`}
                fill="none"
                stroke={color}
                strokeWidth={1.4}
                strokeDasharray={e.dimmed ? '4 4' : undefined}
                markerEnd={`url(#rn-arr-${mk})`}
              />
              {e.label && (
                <text x={mx} y={my - 3} textAnchor="middle" fontSize={8}
                  fill={color} opacity={0.75} style={{ pointerEvents: 'none' }}>
                  {e.label}
                </text>
              )}
            </g>
          );
        })}

        {/* 节点 */}
        {particles.map((p) => {
          const isSelected = p.id === selectedNodeId;
          const nodeData   = pack.nodes.find((n) => n.id === p.id);
          const isDimmed   = nodeData?.dimmed ?? false;
          const color      = rColor(p.role);
          const r          = p.isFocus ? 18 : p.shared ? 14 : 12;
          return (
            <g
              key={p.id}
              style={{ cursor: 'grab' }}
              opacity={isDimmed ? 0.25 : 1}
              onMouseDown={(e) => onMouseDown(e, p.id)}
              onClick={() => openCard(isSelected ? null : p.id)}
            >
              {isSelected && (
                <circle cx={p.x} cy={p.y} r={r + 10} fill="none"
                  stroke={color} strokeWidth={1.5} strokeDasharray="3 5"
                  opacity={0.6} filter="url(#rn-glow)" />
              )}
              <circle cx={p.x} cy={p.y} r={r}
                fill={`${color}22`} stroke={color}
                strokeWidth={isSelected ? 2.5 : 1.5} />
              {p.isFocus && (
                <circle cx={p.x} cy={p.y} r={5} fill={color} opacity={0.9} />
              )}
              {p.shared && (
                <text x={p.x + r - 2} y={p.y - r + 4} fontSize={8}
                  fill="#f59e0b" textAnchor="middle" style={{ pointerEvents: 'none' }}>
                  ⟳
                </text>
              )}
              <text x={p.x} y={p.y + r + 13} textAnchor="middle" fontSize={10}
                fill={isSelected ? color : 'rgba(226,232,240,0.82)'}
                fontWeight={isSelected ? 700 : 400}
                style={{ pointerEvents: 'none', userSelect: 'none' }}>
                {p.label.length > 8 ? p.label.slice(0, 7) + '…' : p.label}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
    </div>
  );
}
