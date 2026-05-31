import React, { useEffect, useRef, useCallback } from 'react';
import { useGraphStore } from '../store/useGraph';

const ZONE_DEFS = [
  { zone: 'axiom', label: '公理区', sub: '(定义/常识)', color: '#8b5cf6' },
  { zone: 'mechanism', label: '机制区', sub: '(过程/方法)', color: '#ec4899' },
  { zone: 'conclusion', label: '结论区', sub: '(性质/能力)', color: '#06b6d4' },
] as const;

export default function ReasoningKernel() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const zoneLabelRef = useRef<HTMLDivElement>(null);
  const axioms = useGraphStore((s) => s.axioms);
  const mechanisms = useGraphStore((s) => s.mechanisms);
  const conclusions = useGraphStore((s) => s.conclusions);
  const edges = useGraphStore((s) => s.edges);
  const selectedNodeId = useGraphStore((s) => s.selectedNodeId);
  const setSelectedNode = useGraphStore((s) => s.setSelectedNode);
  const setHoveredNode = useGraphStore((s) => s.setHoveredNode);
  const addNotification = useGraphStore((s) => s.addNotification);
  const isKernelEmpty = axioms.length + mechanisms.length + conclusions.length === 0;

  const dragRef = useRef<any>(null);
  const hoveredRef = useRef<string | null>(null);
  const animRef = useRef<number>(0);
  const timeRef = useRef(0);
  const particlesRef = useRef<Array<{ edge: any; t: number; speed: number }>>([]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    const dpr = window.devicePixelRatio || 1;

    const resize = () => {
      const parent = canvas.parentElement;
      if (!parent) return;
      const rect = parent.getBoundingClientRect();
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      canvas.style.width = rect.width + 'px';
      canvas.style.height = rect.height + 'px';
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener('resize', resize);

    const allNodes = () => [...axioms, ...mechanisms, ...conclusions];
    const ZONES: Record<string, number> = { axiom: 0.15, mechanism: 0.40, conclusion: 0.65 };

    const animate = () => {
      timeRef.current += 0.016;
      const t = timeRef.current;
      const w = canvas.width / dpr;
      const h = canvas.height / dpr;
      ctx.clearRect(0, 0, w, h);

      // Grid
      ctx.strokeStyle = 'rgba(120,160,255,0.05)';
      ctx.lineWidth = 0.5;
      for (let x = 0; x < w; x += 60) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, h);
        ctx.stroke();
      }
      for (let y = 0; y < h; y += 60) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
        ctx.stroke();
      }

      // Zone divider lines (labels now in HTML overlays)
      ZONE_DEFS.forEach((z) => {
        const yp = ZONES[z.zone] * h;
        ctx.strokeStyle = z.color + '10';
        ctx.setLineDash([4, 14]);
        ctx.beginPath();
        ctx.moveTo(0, yp + 6);
        ctx.lineTo(w, yp + 6);
        ctx.stroke();
        ctx.setLineDash([]);
      });

      const nodes = allNodes();
      nodes.forEach((n) => {
        if (!dragRef.current || dragRef.current.node.id !== n.id) {
          n.px = (n.px || n.x * w) + Math.cos(t * 0.5 + n.phase) * 0.3;
          n.py = (n.py || n.y * h) + Math.sin(t * 0.8 + n.phase) * 0.3;
        }
      });

      // Draw edges
      const edgeDefs: Array<{ from: { px: number; py: number }; to: { px: number; py: number }; midX: number; midY: number; color: string }> = [];
      edges.forEach((e) => {
        const from = nodes.find((n) => n.id === e.source);
        const to = nodes.find((n) => n.id === e.target);
        if (!from || !to) return;
        const midX = (from.px! + to.px!) / 2;
        const midY = (from.py! + to.py!) / 2 - 10;
        edgeDefs.push({ from: { px: from.px!, py: from.py! }, to: { px: to.px!, py: to.py! }, midX, midY, color: from.color || '#8b5cf6' });

        ctx.strokeStyle = 'rgba(120,160,255,0.2)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(from.px!, from.py!);
        ctx.quadraticCurveTo(midX, midY, to.px!, to.py!);
        ctx.stroke();
      });

      // Flow particles along edges
      if (!particlesRef.current.length && edgeDefs.length > 0) {
        edgeDefs.forEach((ed) => {
          for (let i = 0; i < 2; i++) {
            particlesRef.current.push({ edge: ed, t: Math.random(), speed: 0.003 + Math.random() * 0.005 });
          }
        });
      }
      // Update orphaned particles
      particlesRef.current = particlesRef.current.filter(p => edgeDefs.includes(p.edge));
      edgeDefs.forEach(ed => {
        const existing = particlesRef.current.filter(p => p.edge === ed);
        if (existing.length === 0) {
          particlesRef.current.push({ edge: ed, t: Math.random(), speed: 0.003 + Math.random() * 0.005 });
        }
      });

      particlesRef.current.forEach(p => {
        p.t += p.speed;
        if (p.t > 1) p.t = 0;
        const t = p.t;
        const { from, to, midX, midY } = p.edge;
        // Quadratic Bezier: B(t) = (1-t)^2*P0 + 2(1-t)t*P1 + t^2*P2
        const bx = (1 - t) * (1 - t) * from.px + 2 * (1 - t) * t * midX + t * t * to.px;
        const by = (1 - t) * (1 - t) * from.py + 2 * (1 - t) * t * midY + t * t * to.py;
        const alpha = 1 - Math.abs(t - 0.5) * 2;
        ctx.beginPath();
        ctx.arc(bx, by, 2.5, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(139,92,246,${alpha.toFixed(2)})`;
        ctx.fill();
        ctx.beginPath();
        ctx.arc(bx, by, 5, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(139,92,246,${(alpha * 0.3).toFixed(2)})`;
        ctx.fill();
      });

      // Draw nodes
      nodes.forEach((n) => {
        const x = n.px!;
        const y = n.py!;
        const r = n.size || 24;
        const isSelected = selectedNodeId === n.id;

        if (isSelected || n.glow) {
          ctx.beginPath();
          ctx.arc(x, y, r + 6, 0, Math.PI * 2);
          ctx.strokeStyle = n.color + '50';
          ctx.lineWidth = 2;
          ctx.stroke();
        }
        const grad = ctx.createRadialGradient(x - r * 0.3, y - r * 0.3, r * 0.1, x, y, r);
        grad.addColorStop(0, n.color + 'FF');
        grad.addColorStop(1, n.color + '30');
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fillStyle = grad;
        ctx.fill();
        ctx.strokeStyle = isSelected ? '#ffffff' : n.color + '70';
        ctx.lineWidth = isSelected ? 2 : 1;
        ctx.stroke();

        ctx.fillStyle = '#dfe7f5';
        ctx.font = `${isSelected ? 10 : 9}px ui-sans-serif`;
        ctx.textAlign = 'center';
        ctx.fillText(n.label, x, y + r + 14);
      });

      animRef.current = requestAnimationFrame(animate);
    };
    animate();

    return () => {
      cancelAnimationFrame(animRef.current);
      window.removeEventListener('resize', resize);
    };
  }, [axioms, mechanisms, conclusions, edges, selectedNodeId]);

  const getEventPos = (e: React.MouseEvent) => {
    const rect = canvasRef.current!.getBoundingClientRect();
    return { mx: e.clientX - rect.left, my: e.clientY - rect.top };
  };

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      const { mx, my } = getEventPos(e);
      const nodes = [...axioms, ...mechanisms, ...conclusions];
      for (let i = nodes.length - 1; i >= 0; i--) {
        const n = nodes[i];
        const dx = mx - (n.px || 0),
          dy = my - (n.py || 0);
        if (Math.sqrt(dx * dx + dy * dy) < (n.size || 24) + 6) {
          dragRef.current = { node: n, ox: dx, oy: dy };
          setSelectedNode(n.id);
          addNotification(`已选中: ${n.label}`, 'info');
          e.preventDefault();
          return;
        }
      }
      setSelectedNode(null);
    },
    [axioms, mechanisms, conclusions, setSelectedNode, addNotification],
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      const { mx, my } = getEventPos(e);
      const canvas = canvasRef.current!;
      const dpr = window.devicePixelRatio || 1;
      const w = canvas.width / dpr;
      const h = canvas.height / dpr;

      if (dragRef.current) {
        const { node, ox, oy } = dragRef.current;
        node.px = mx - ox;
        node.py = my - oy;
        node.x = node.px / w;
        node.y = node.py / h;
        return;
      }

      const nodes = [...axioms, ...mechanisms, ...conclusions];
      let found: string | null = null;
      for (const n of nodes) {
        const dx = mx - (n.px || 0),
          dy = my - (n.py || 0);
        if (Math.sqrt(dx * dx + dy * dy) < (n.size || 24) + 6) {
          found = n.id;
          break;
        }
      }
      if (found !== hoveredRef.current) {
        hoveredRef.current = found;
        setHoveredNode(found);
      }
      canvas.style.cursor = found ? 'pointer' : 'default';
    },
    [axioms, mechanisms, conclusions, setHoveredNode],
  );

  const handleMouseUp = useCallback(() => {
    if (dragRef.current) {
      const canvas = canvasRef.current!;
      const dpr = window.devicePixelRatio || 1;
      const node = dragRef.current.node;
      const w = canvas.width / dpr;
      const h = canvas.height / dpr;
      useGraphStore.getState().updateNode(node.id, { x: node.px / w, y: node.py / h });
      dragRef.current = null;
    }
  }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Delete' && selectedNodeId) {
        const store = useGraphStore.getState();
        const node = [...store.axioms, ...store.mechanisms, ...store.conclusions].find(
          (n) => n.id === selectedNodeId,
        );
        store.removeNode(selectedNodeId);
        store.addNotification(node ? `已删除: ${node.label}` : '节点已删除', 'warning');
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [selectedNodeId]);

  return (
    <div ref={containerRef} style={{ position: 'relative', width: '100%', height: '100%' }}>
      {/* Zone Labels as HTML overlays */}
      <div ref={zoneLabelRef} style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 2 }}>
        {ZONE_DEFS.map((z) => {
          const topPct =
            z.zone === 'axiom' ? '8%' : z.zone === 'mechanism' ? '38%' : '62%';
          return (
            <div
              key={z.zone}
              className="zone-label"
              style={{ left: '5%', top: topPct, color: z.color }}
            >
              {z.label}
              <span className="zone-subtitle">{z.sub}</span>
            </div>
          );
        })}
      </div>

      {/* Title */}
      <div className="graph-title">
        <h2>中心 · 推理内核</h2>
        <p>五个隐喻 · 一个定理 · 无限递归</p>
      </div>

      {isKernelEmpty && (
        <div
          className="text-muted"
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            pointerEvents: 'none',
            fontSize: 13,
            fontStyle: 'italic',
            zIndex: 3,
          }}
        >
          推理内核为空
        </div>
      )}

      <canvas
        ref={canvasRef}
        id="graph-canvas"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      />
    </div>
  );
}
