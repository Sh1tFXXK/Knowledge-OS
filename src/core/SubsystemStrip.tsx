import { useMemo } from 'react';
import { useGraphStore } from '../store/useGraph';
import { getSubsystemCards, type SubsystemCardData } from './subsystemData';
import { collectProjectedNodeIds } from '../knowledge/projection';

interface Props {
  focusNodeId: string;
}

export default function SubsystemStrip({ focusNodeId }: Props) {
  const nodePool       = useGraphStore((s) => s.nodePool);
  const knowledgeEdges = useGraphStore((s) => s.knowledgeEdges);
  const openCard       = useGraphStore((s) => s.openCard);

  // ── 联动：读取当前焦点节点的 viewDimensions，提取所有已绑定的 subsystem nodeId ──
  const dimLinkedSubsystems = useMemo(() => {
    const focusNode = nodePool[focusNodeId];
    if (!focusNode?.viewDimensions) return new Set<string>();
    const ids = new Set<string>();
    for (const nodeId of collectProjectedNodeIds(focusNode.viewDimensions, nodePool)) {
      const rn = nodePool[nodeId];
      if (rn?.role === 'subsystem') ids.add(nodeId);
    }
    return ids;
  }, [focusNodeId, nodePool]);

  const cards = useMemo(
    () => getSubsystemCards(focusNodeId, nodePool, knowledgeEdges),
    [focusNodeId, nodePool, knowledgeEdges],
  ) as SubsystemCardData[];

  const handleCardClick = (id: string) => {
    openCard(id);
  };

  if (cards.length === 0) return null;

  return (
    <div className="subsystem-strip">
      <div className="subsystem-strip-bridge" aria-hidden>
        <svg width="100%" height="28" viewBox="0 0 800 28" preserveAspectRatio="none">
          <line x1="400" y1="0" x2="400" y2="14"
            stroke="rgba(139,92,246,0.35)" strokeWidth="1" strokeDasharray="3 4" />
          {cards.map((_card: SubsystemCardData, i: number) => {
            const x = 100 + (600 / Math.max(cards.length - 1, 1)) * i;
            return (
              <g key={i}>
                <line x1="400" y1="14" x2={x} y2="26"
                  stroke="rgba(139,92,246,0.2)" strokeWidth="1" />
                <circle cx={x} cy="26" r="2.5" fill="rgba(139,92,246,0.5)" />
              </g>
            );
          })}
        </svg>
      </div>

      <div className="subsystem-strip-head">
        <span className="subsystem-strip-title">递归子系统</span>
        <span className="subsystem-strip-sub">平行微缩宇宙 · 结构固定，无限递归</span>
        {dimLinkedSubsystems.size > 0 && (
          <span className="subsystem-strip-dim-badge">
            🔗 {dimLinkedSubsystems.size} 个已关联维度
          </span>
        )}
      </div>

      <div className="subsystem-strip-grid">
        {cards.map((sub: SubsystemCardData) => {
          const isLinked = dimLinkedSubsystems.has(sub.id);
          return (
            <button
              key={sub.id}
              type="button"
              className={`subsystem-card-v2${isLinked ? ' subsystem-card-v2--dim-linked' : ''}`}
              style={{ '--sub-col': sub.col } as any}
              onClick={() => handleCardClick(sub.id)}
              title={isLinked ? '此子系统已关联到当前节点的知识维度' : undefined}
            >
              {/* 维度关联徽章 */}
              {isLinked && (
                <div className="subsystem-card-v2-link-badge">
                  <span>🔗</span>
                  <span>维度已关联</span>
                </div>
              )}

              <svg
                className="subsystem-mini-canvas"
                viewBox="0 0 162 65"
                preserveAspectRatio="xMidYMid meet"
              >
                {sub.es.map(([i, j]: [number, number], k: number) => {
                  const [x1, y1] = sub.pts[i] ?? [81, 32];
                  const [x2, y2] = sub.pts[j] ?? [81, 32];
                  return (
                    <line
                      key={k}
                      x1={x1} y1={y1}
                      x2={x2} y2={y2}
                      stroke={sub.col}
                      strokeWidth="0.9"
                      strokeOpacity={isLinked ? 0.7 : 0.4}
                    />
                  );
                })}
                {sub.pts.map(([x, y]: [number, number], i: number) => (
                  <circle
                    key={i}
                    cx={x} cy={y}
                    r={i === 0 ? 6 : 4.5}
                    fill="var(--bg-card, #09090f)"
                    stroke={sub.col}
                    strokeWidth={isLinked ? 1.2 : 0.8}
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
          );
        })}
      </div>
    </div>
  );
}
