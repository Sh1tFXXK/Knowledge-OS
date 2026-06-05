import { useMemo } from 'react';
import { useGraphStore } from '../store/useGraph';
import { extractSubgraph } from '../knowledge/extractSubgraph';
import { getTreePathNames } from '../knowledge/treeUtils';

export default function SubsystemDeck() {
  const selectedNodeId = useGraphStore((s) => s.selectedNodeId);
  const selectedTreeNodeId = useGraphStore((s) => s.selectedTreeNodeId);
  const treeData = useGraphStore((s) => s.treeData);
  const nodePool = useGraphStore((s) => s.nodePool);
  const knowledgeEdges = useGraphStore((s) => s.knowledgeEdges);
  const dimension = useGraphStore((s) => s.currentPerspective?.id ?? 'all');
  const setSelectedNode = useGraphStore((s) => s.setSelectedNode);

  const neighborPack = useMemo(
    () =>
      extractSubgraph(nodePool, knowledgeEdges, {
        focus: selectedNodeId,
        scope: 'neighbor',
        dimension,
      }),
    [nodePool, knowledgeEdges, selectedNodeId, dimension],
  );

  const neighbors = useMemo(() => {
    if (!selectedNodeId) return [];
    return neighborPack.nodes
      .filter((n) => n.id !== selectedNodeId)
      .slice(0, 3);
  }, [neighborPack.nodes, selectedNodeId]);

  const locationPath =
    selectedTreeNodeId && treeData
      ? getTreePathNames(treeData, selectedTreeNodeId).join(' › ')
      : selectedNodeId && nodePool[selectedNodeId]
        ? nodePool[selectedNodeId].label
        : treeData.name;

  return (
    <div className="subsystem-deck">
      <span className="subsystem-deck-label">📍</span>
      <span className="subsystem-deck-path" title={locationPath}>
        {locationPath}
      </span>
      {neighbors.length > 0 ? (
        <div className="subsystem-deck-chips">
          {neighbors.map((n) => (
            <button
              key={n.id}
              type="button"
              className="subsystem-chip"
              onClick={() => setSelectedNode(n.id)}
            >
              {n.label}
            </button>
          ))}
        </div>
      ) : (
        <span className="text-muted subsystem-deck-hint">邻域关系将显示于此</span>
      )}
    </div>
  );
}
