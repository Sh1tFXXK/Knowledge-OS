import { useGraphStore } from '../store/useGraph';

const SEMANTIC_RELATIONS = [
  { type: 'depends-on', label: '依赖 (depends-on)', color: '#ff6b6b' },
  { type: 'belongs-to', label: '属于 (belongs-to)', color: '#4ecdc4' },
  { type: 'leads-to', label: '导致 (leads-to)', color: '#feca57' },
  { type: 'needs', label: '需要 (needs-for)', color: '#a855f7' },
  { type: 'contradicts', label: '矛盾 (contradicts)', color: '#ff9ff3' },
  { type: 'enables', label: '支撑 (enables)', color: '#54a0ff' },
];

export default function RelationNetwork() {
  const selectedNodeId = useGraphStore((s) => s.selectedNodeId);
  const edges = useGraphStore((s) => s.edges);
  const getAllNodes = useGraphStore((s) => s.getAllNodes);

  const allNodes = getAllNodes();
  const nodeMap = new Map(allNodes.map((n) => [n.id, n]));

  const relatedEdges = selectedNodeId
    ? edges.filter((e) => e.source === selectedNodeId || e.target === selectedNodeId)
    : [];

  return (
    <>
      {/* Header */}
      <div className="right-section-header">
        <div className="right-section-title">
          <span>🌐</span><span>关系网</span>
          <span className="title-en">(Relation Network)</span>
        </div>
        <div className="right-section-actions">
          <button className="btn btn-sm" id="btn-fullscreen-network">全局视图</button>
        </div>
      </div>

      <div className="relation-network-mini">
        <div className="relation-network-canvas">
          <canvas id="relation-mini-canvas" style={{ width: '100%', height: '100%' }}></canvas>
        </div>
        <div className="relation-network-footer">
          <span>发现更多</span><span style={{ cursor: 'pointer' }} id="btn-network-fullscreen">查看全屏</span>
        </div>
      </div>

      {/* Semantic Legend */}
      <div style={{ marginTop: 8 }}>
        <div style={{ fontSize: 10, color: 'var(--text-tertiary)', marginBottom: 6 }}>关系语义图例</div>
        <div className="semantic-list">
          {SEMANTIC_RELATIONS.map((r) => (
            <div key={r.type} className="semantic-item">
              <span className="semantic-dot" style={{ background: r.color, boxShadow: `0 0 4px ${r.color}` }}></span>
              <span>{r.label}</span>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
