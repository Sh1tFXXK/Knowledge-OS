import type { KnowledgeNode } from '../../types';
import type { MatrixProjection } from '../../knowledge/projection';

export default function ProjectionReferences({
  currentNodeId,
  nodePool,
  projections,
  onOpenOwner,
}: {
  currentNodeId: string;
  nodePool: Record<string, KnowledgeNode>;
  projections: MatrixProjection[];
  onOpenOwner: (nodeId: string) => void;
}) {
  return (
    <div className="projection-ref-block">
      <div className="projection-ref-title">结论引用</div>
      {projections.map((projection) => {
        const columns = projection.section.config?.columns ?? [];
        return (
          <div key={`${projection.ownerId}:${projection.dimension.id}:${projection.section.id}`} className="projection-ref-card">
            <button type="button" className="projection-ref-owner" onClick={() => onOpenOwner(projection.ownerId)}>
              {projection.owner.label} / {projection.section.title ?? projection.dimension.name}
            </button>
            <table className="projection-ref-table">
              <thead>
                <tr>
                  <th>节点</th>
                  {columns.map((column) => <th key={column.key}>{column.label}</th>)}
                </tr>
              </thead>
              <tbody>
                {projection.section.atoms.map((atom) => {
                  const node = nodePool[atom.nodeId];
                  if (!node) return null;
                  const active = atom.nodeId === currentNodeId;
                  return (
                    <tr key={atom.nodeId} className={active ? 'is-active' : ''}>
                      <td>{node.label}</td>
                      {columns.map((column) => (
                        <td key={column.key}>{String(atom.attrs?.[column.key] ?? '—')}</td>
                      ))}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        );
      })}
    </div>
  );
}
