import { useMemo } from 'react';
import { useGraphStore } from '../store/useGraph';
import { extractSubgraph } from '../knowledge/extractSubgraph';
import { getTreePathNames } from '../knowledge/treeUtils';

export default function SubsystemDeck() {
  const focusNodeId = useGraphStore((s) => s.focusNodeId);
  const selectedTreeNodeId = useGraphStore((s) => s.selectedTreeNodeId);
  const treeData = useGraphStore((s) => s.treeData);
  const nodePool = useGraphStore((s) => s.nodePool);
  const knowledgeEdges = useGraphStore((s) => s.knowledgeEdges);
  const dimension = useGraphStore((s) => s.currentPerspective?.id ?? 'all');
  const openCard = useGraphStore((s) => s.openCard);

  const neighborPack = useMemo(
    () =>
      extractSubgraph(nodePool, knowledgeEdges, {
        focus: focusNodeId,
        scope: 'neighbor',
        dimension,
      }),
    [nodePool, knowledgeEdges, focusNodeId, dimension],
  );

  const neighbors = useMemo(() => {
    if (!focusNodeId) return [];
    return neighborPack.nodes
      .filter((n) => n.id !== focusNodeId)
      .slice(0, 3);
  }, [neighborPack.nodes, focusNodeId]);

  const locationPath =
    selectedTreeNodeId && treeData
      ? getTreePathNames(treeData, selectedTreeNodeId).join(' › ')
      : focusNodeId && nodePool[focusNodeId]
        ? nodePool[focusNodeId].label
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
              onClick={() => openCard(n.id)}
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
