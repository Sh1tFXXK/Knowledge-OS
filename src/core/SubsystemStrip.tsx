import { useMemo, type CSSProperties } from 'react';
import { useGraphStore } from '../store/useGraph';
import { getSubsystemCards } from './subsystemData';

interface Props {
  focusNodeId: string;
}

export default function SubsystemStrip({ focusNodeId }: Props) {
  const nodePool = useGraphStore((s) => s.nodePool);
  const knowledgeEdges = useGraphStore((s) => s.knowledgeEdges);
  const openCard = useGraphStore((s) => s.openCard);

  const cards = useMemo(
    () => getSubsystemCards(focusNodeId, nodePool, knowledgeEdges),
    [focusNodeId, nodePool, knowledgeEdges],
  );

  const handleCardClick = (id: string) => {
    openCard(id);
  };

  if (cards.length === 0) return null;

  return (
    <div className="subsystem-strip">
      <div className="subsystem-strip-bridge" aria-hidden>
        <svg width="100%" height="28" viewBox="0 0 800 28" preserveAspectRatio="none">
          <line x1="400" y1="0" x2="400" y2="14" stroke="rgba(139,92,246,0.35)" strokeWidth="1" strokeDasharray="3 4" />
          {cards.map((_, i) => {
            const x = 100 + (600 / Math.max(cards.length - 1, 1)) * i;
            return (
              <g key={i}>
                <line x1="400" y1="14" x2={x} y2="26" stroke="rgba(139,92,246,0.2)" strokeWidth="1" />
                <circle cx={x} cy="26" r="2.5" fill="rgba(139,92,246,0.5)" />
              </g>
            );
          })}
        </svg>
      </div>

      <div className="subsystem-strip-head">
        <span className="subsystem-strip-title">递归子系统</span>
        <span className="subsystem-strip-sub">平行微缩宇宙 · 结构固定，无限递归</span>
      </div>

      <div className="subsystem-strip-grid">
        {cards.map((sub) => (
          <button
            key={sub.id}
            type="button"
            className="subsystem-card-v2"
            style={{ '--sub-col': sub.col } as CSSProperties}
            onClick={() => handleCardClick(sub.id)}
          >
            <svg className="subsystem-mini-canvas" viewBox="0 0 162 65" preserveAspectRatio="xMidYMid meet">
              {sub.es.map(([i, j], k) => {
                const [x1, y1] = sub.pts[i] ?? [81, 32];
                const [x2, y2] = sub.pts[j] ?? [81, 32];
                return (
                  <line
                    key={k}
                    x1={x1} y1={y1}
                    x2={x2} y2={y2}
                    stroke={sub.col}
                    strokeWidth="0.9"
                    strokeOpacity="0.4"
                  />
                );
              })}
              {sub.pts.map(([x, y], i) => (
                <circle
                  key={i}
                  cx={x} cy={y}
                  r={i === 0 ? 6 : 4.5}
                  fill="var(--bg-card, #09090f)"
                  stroke={sub.col}
                  strokeWidth="0.8"
                  opacity={i === 0 ? 0.95 : 0.75}
                />
              ))}
            </svg>
            <div className="subsystem-card-v2-title">{sub.title}</div>
            <div className="subsystem-card-v2-desc">{sub.desc}</div>
            <div className="subsystem-card-v2-meta">
              <span>节点 {sub.nodeCount}</span>
              <span>关系 {sub.edgeCount}</span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
