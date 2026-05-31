import React, { useEffect, useRef } from 'react';
import { useGraphStore } from '../store/useGraph';

export default function SubsystemDeck() {
  const canvasRefs = useRef<(HTMLCanvasElement | null)[]>([]);
  const addNotification = useGraphStore((s) => s.addNotification);
  const subSystems = useGraphStore((s) => s.subSystems);

  useEffect(() => {
    const anims: number[] = [];
    canvasRefs.current.forEach((canvas, idx) => {
      const ss = subSystems[idx];
      if (!canvas || !ss) return;
      const ctx = canvas.getContext('2d')!;
      const dpr = window.devicePixelRatio || 1;
      const w = (canvas.width = canvas.clientWidth * dpr);
      const h = (canvas.height = canvas.clientHeight * dpr);
      ctx.scale(dpr, dpr);
      const color = ss.color;
      const displayW = w / dpr;
      const displayH = h / dpr;

      const points = Array.from({ length: 8 }, () => ({
        x: Math.random() * displayW,
        y: Math.random() * displayH,
        r: 2 + Math.random() * 3,
        vx: (Math.random() - 0.5) * 0.4,
        vy: (Math.random() - 0.5) * 0.4,
      }));

      const draw = () => {
        ctx.clearRect(0, 0, displayW, displayH);
        points.forEach((p) => {
          points.forEach((q) => {
            const d = Math.sqrt((p.x - q.x) ** 2 + (p.y - q.y) ** 2);
            if (d < 50) {
              ctx.strokeStyle = color + '15';
              ctx.lineWidth = 0.5;
              ctx.beginPath();
              ctx.moveTo(p.x, p.y);
              ctx.lineTo(q.x, q.y);
              ctx.stroke();
            }
          });
        });
        points.forEach((p) => {
          p.x += p.vx;
          p.y += p.vy;
          if (p.x < 0 || p.x > displayW) p.vx *= -1;
          if (p.y < 0 || p.y > displayH) p.vy *= -1;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
          ctx.fillStyle = color + '70';
          ctx.fill();
          ctx.strokeStyle = color + '40';
          ctx.lineWidth = 0.5;
          ctx.stroke();
        });
        anims[idx] = requestAnimationFrame(draw);
      };
      draw();
    });
    return () => anims.forEach((a) => cancelAnimationFrame(a));
  }, [subSystems]);

  return (
    <>
      {/* Bottom Left — Location Info */}
      <div className="bottom-left">
        <div className="location-info">
          <span className="label">📍 当前位置 (You are here)</span>
          <div className="location-path">Universe &gt; Database &gt; MySQL &gt; Transaction &gt; MVCC</div>
        </div>
        <div className="coordinates">
          <span className="coord-label">🎯 定位坐标 (Coordinates)</span>
          <span>X: 12.5 &nbsp; Y: 8.3 &nbsp; Z: 4.1</span>
        </div>
        <div className="mini-map">
          <div className="mini-map-dot" style={{ left: '40%', top: '55%' }}></div>
        </div>
      </div>

      {/* Bottom Center — Subsystem Cards */}
      <div className="bottom-center">
        <div className="bottom-section-title">
          🔁 递归子系统 <span className="title-en">(平行微缩宇宙)</span>
          <span style={{ flex: 1 }}></span>
          <span className="text-xs text-muted">—— 一组四图元 ——</span>
        </div>
        <div className="subsystem-cards">
          {subSystems.map((ss, i) => (
            <div
              key={ss.id}
              className="subsystem-card"
              style={{ '--card-color': ss.color } as React.CSSProperties}
              data-sys={ss.id}
              onClick={() => {
                addNotification(`打开子系统: ${ss.name}`, 'info');
              }}
            >
              <div className="subsystem-card-title">{ss.name}</div>
              <div className="subsystem-card-stats">
                <span>节点: {ss.nodes}</span><span>关系: {ss.relations}</span>
              </div>
              <div className="subsystem-card-preview">
                <canvas
                  className="subsystem-mini-canvas"
                  ref={(el) => {
                    canvasRefs.current[i] = el;
                  }}
                  data-color={ss.color}
                  data-index={i}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom Right — Actions */}
      <div className="bottom-right" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
        <button className="btn btn-sm" id="btn-discover-more" onClick={() => addNotification('发现更多子系统关联...', 'info')}>发现更多</button>
        <div className="text-xs text-muted" style={{ textAlign: 'center' }}>查看全屏</div>
      </div>
    </>
  );
}
