import { Workflow } from 'lucide-react';
import { useMemo } from 'react';
import {
  buildSystemConnectionGraph,
  SystemConnectionDirection,
  type ConnectedSystem,
  type SystemConnectionGraph,
} from '../knowledge/systemConnectionGraph';
import { useGraphStore } from '../store/useGraph';

const VIEWBOX_WIDTH = 360;
const VIEWBOX_HEIGHT = 238;
const CENTER_X = VIEWBOX_WIDTH / 2;
const CENTER_Y = VIEWBOX_HEIGHT / 2;
const ORBIT_X = 128;
const ORBIT_Y = 84;
const SYSTEM_WIDTH = 94;
const SYSTEM_HEIGHT = 42;
const CURRENT_WIDTH = 108;
const CURRENT_HEIGHT = 48;

interface SystemPosition {
  system: ConnectedSystem;
  x: number;
  y: number;
}

function positionConnectedSystems(systems: readonly ConnectedSystem[]): SystemPosition[] {
  if (systems.length === 0) return [];
  if (systems.length === 1) {
    return [{ system: systems[0], x: CENTER_X + ORBIT_X, y: CENTER_Y }];
  }

  return systems.map((system, index) => {
    const angle = -Math.PI / 2 + (index / systems.length) * Math.PI * 2;
    return {
      system,
      x: CENTER_X + Math.cos(angle) * ORBIT_X,
      y: CENTER_Y + Math.sin(angle) * ORBIT_Y,
    };
  });
}

function relationSummary(system: ConnectedSystem): string {
  const visibleTypes = system.relationTypes.slice(0, 2);
  const hiddenCount = system.relationTypes.length - visibleTypes.length;
  const suffix = hiddenCount > 0 ? ` +${hiddenCount}` : '';
  return `${visibleTypes.join(' / ')}${suffix}` || `${system.edgeIds.length} 条关系`;
}

function markerProps(direction: SystemConnectionDirection) {
  if (direction === SystemConnectionDirection.Incoming) {
    return { markerStart: 'url(#system-map-arrow)' };
  }
  if (direction === SystemConnectionDirection.Bidirectional) {
    return {
      markerStart: 'url(#system-map-arrow)',
      markerEnd: 'url(#system-map-arrow)',
    };
  }
  return { markerEnd: 'url(#system-map-arrow)' };
}

export default function SystemConnectionMap() {
  const selectedNodeId = useGraphStore((state) => state.selectedNodeId);
  const nodePool = useGraphStore((state) => state.nodePool);
  const knowledgeEdges = useGraphStore((state) => state.knowledgeEdges);
  const openCard = useGraphStore((state) => state.openCard);
  const graph: SystemConnectionGraph | null = useMemo(
    () => buildSystemConnectionGraph(selectedNodeId, nodePool, knowledgeEdges),
    [knowledgeEdges, nodePool, selectedNodeId],
  );
  const positions: readonly SystemPosition[] = useMemo(
    () => positionConnectedSystems(graph?.connectedSystems ?? []),
    [graph?.connectedSystems],
  );
  const omittedCount = graph
    ? graph.totalSystemCount - graph.connectedSystems.length
    : 0;

  return (
    <section className="right-section system-connection-panel" aria-label="系统连接图">
      <header className="system-connection-header">
        <div className="system-connection-title">
          <Workflow size={14} aria-hidden="true" />
          <span>系统连接</span>
          <span className="title-en">(Systems)</span>
        </div>
        <span className="system-connection-count">
          {graph?.totalSystemCount ?? 0}
        </span>
      </header>

      <div className="system-connection-canvas">
        {!graph ? (
          <div className="system-connection-empty">选择一个索引节点</div>
        ) : (
          <>
            <svg
              viewBox={`0 0 ${VIEWBOX_WIDTH} ${VIEWBOX_HEIGHT}`}
              role="img"
              aria-label={`${graph.currentSystem.label} 的系统连接图`}
              preserveAspectRatio="xMidYMid meet"
            >
              <defs>
                <marker
                  id="system-map-arrow"
                  viewBox="0 0 8 8"
                  refX="6"
                  refY="4"
                  markerWidth="5"
                  markerHeight="5"
                  orient="auto-start-reverse"
                >
                  <path d="M 0 0 L 8 4 L 0 8 z" />
                </marker>
              </defs>

              <g className="system-connection-edges" aria-hidden="true">
                {positions.map(({ system, x, y }) => {
                  const midX = CENTER_X + (x - CENTER_X) * 0.68;
                  const midY = CENTER_Y + (y - CENTER_Y) * 0.68;
                  return (
                    <g key={system.id}>
                      <line
                        x1={CENTER_X}
                        y1={CENTER_Y}
                        x2={x}
                        y2={y}
                        {...markerProps(system.direction)}
                      />
                      <text x={midX} y={midY - 5} textAnchor="middle">
                        {relationSummary(system)}
                      </text>
                    </g>
                  );
                })}
              </g>

              <foreignObject
                x={CENTER_X - CURRENT_WIDTH / 2}
                y={CENTER_Y - CURRENT_HEIGHT / 2}
                width={CURRENT_WIDTH}
                height={CURRENT_HEIGHT}
              >
                <div className="system-map-node system-map-node--current" title={graph.currentSystem.label}>
                  <strong>{graph.currentSystem.label}</strong>
                  <span>
                    {graph.currentSystem.anchorId === graph.currentSystem.id
                      ? '当前系统'
                      : `基于 ${graph.currentSystem.anchorLabel}`}
                  </span>
                </div>
              </foreignObject>

              {positions.map(({ system, x, y }) => (
                <foreignObject
                  key={system.id}
                  x={x - SYSTEM_WIDTH / 2}
                  y={y - SYSTEM_HEIGHT / 2}
                  width={SYSTEM_WIDTH}
                  height={SYSTEM_HEIGHT}
                >
                  <button
                    type="button"
                    className="system-map-node system-map-node--external"
                    title={`打开 ${system.label}`}
                    onClick={() => openCard(system.id)}
                  >
                    <strong>{system.label}</strong>
                    <span>{system.edgeIds.length} 条连接</span>
                  </button>
                </foreignObject>
              ))}
            </svg>

            {graph.connectedSystems.length === 0 && (
              <div className="system-connection-empty system-connection-empty--overlay">
                暂无外部系统连接
              </div>
            )}
          </>
        )}
      </div>

      {graph && (
        <footer className="system-connection-meta">
          <span>{graph.totalEdgeCount} 条关系</span>
          {omittedCount > 0 && <span>另有 {omittedCount} 个系统</span>}
        </footer>
      )}
    </section>
  );
}
