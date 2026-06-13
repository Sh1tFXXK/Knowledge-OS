import { useMemo, useState } from 'react';
import type { AtomBinding } from '../../types';
import type { SectionProps } from './SectionRenderer';
import { useAtomRect } from './useAtomRect';

export function MatrixSection({
  section,
  atoms,
  dimension,
  nodePool,
  selectedNodeId,
  groupSelectedIds,
  onAtomClick,
  onAtomEdit,
  onToggleGroupAtom,
  registerAtomRect,
}: SectionProps) {
  const [compareSet, setCompareSet] = useState(new Set() as Set<string>);

  const columns = useMemo((): Array<{ key: string; label: string }> => {
    if (section.config?.columns?.length) return section.config.columns;
    const keys = new Set<string>();
    for (const atom of atoms) {
      Object.keys(atom.attrs ?? {}).forEach((key) => keys.add(key));
    }
    return [...keys].map((key) => ({ key, label: key }));
  }, [atoms, section.config?.columns]);

  const toggleCompare = (nodeId: string) => {
    setCompareSet((prev: Set<string>) => {
      const next = new Set(prev);
      if (next.has(nodeId)) next.delete(nodeId);
      else next.add(nodeId);
      return next;
    });
  };

  return (
    <div className="dc-section-body dc-matrix-section">
      <div className="dc-matrix-scroll">
        <table className="dc-matrix-table">
          <thead>
            <tr>
              <th>Atom</th>
              {columns.map((column: { key: string; label: string }) => (
                <th key={column.key}>{column.label}</th>
              ))}
              {columns.length === 0 && <th>Definition</th>}
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {atoms.map((atom) => (
              <MatrixRow
                key={atom.nodeId}
                atom={atom}
                columns={columns}
                label={nodePool[atom.nodeId]?.label ?? atom.nodeId}
                fallback={atom.desc ?? nodePool[atom.nodeId]?.card.tabs[0]?.content ?? ''}
                selected={selectedNodeId === atom.nodeId}
                compared={compareSet.has(atom.nodeId)}
                groupSelected={groupSelectedIds.has(atom.nodeId)}
                color={dimension.color}
                onOpen={() => onAtomClick(atom.nodeId)}
                onEdit={() => onAtomEdit(section.id, atom.nodeId)}
                onToggleCompare={() => toggleCompare(atom.nodeId)}
                onToggleGroup={() => onToggleGroupAtom(atom.nodeId)}
                registerAtomRect={registerAtomRect}
              />
            ))}
          </tbody>
        </table>
      </div>
      <button type="button" className="dc-matrix-add" onClick={() => onAtomEdit(section.id)}>+ Add atom</button>

      {compareSet.size >= 2 && (
        <div className="dc-compare-panel">
          <div className="dc-compare-panel-title">Compared atoms</div>
          <div className="dc-compare-cards">
            {[...compareSet].map((nodeId) => {
              const atom = atoms.find((item) => item.nodeId === nodeId);
              const node = nodePool[nodeId];
              if (!atom || !node) return null;
              return (
                <div key={nodeId} className="dc-compare-card">
                  <div className="dc-compare-card-head">{node.label}</div>
                  {columns.map((column: { key: string; label: string }) => (
                    <div key={column.key} className="dc-compare-field">
                      <span>{column.label}</span>
                      <strong>{String(atom.attrs?.[column.key] ?? '-')}</strong>
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function MatrixRow({
  atom,
  columns,
  label,
  fallback,
  selected,
  compared,
  groupSelected,
  color,
  onOpen,
  onEdit,
  onToggleCompare,
  onToggleGroup,
  registerAtomRect,
}: {
  key?: string;
  atom: AtomBinding;
  columns: Array<{ key: string; label: string }>;
  label: string;
  fallback: string;
  selected: boolean;
  compared: boolean;
  groupSelected: boolean;
  color: string;
  onOpen: () => void;
  onEdit: () => void;
  onToggleCompare: () => void;
  onToggleGroup: () => void;
  registerAtomRect: SectionProps['registerAtomRect'];
}) {
  const ref = useAtomRect<HTMLTableRowElement>(atom.nodeId, registerAtomRect);
  return (
    <tr
      ref={ref}
      className={`${selected ? 'is-selected' : ''} ${groupSelected ? 'is-grouped' : ''}`}
      style={{ '--section-color': color } as any}
    >
      <td>
        <button type="button" className="dc-matrix-node-button" onClick={onOpen}>
          {label}
        </button>
      </td>
      {columns.map((column) => (
        <td key={column.key}>{String(atom.attrs?.[column.key] ?? '-')}</td>
      ))}
      {columns.length === 0 && <td>{fallback.slice(0, 120)}</td>}
      <td>
        <div className="dc-matrix-actions">
          <button type="button" onClick={onToggleCompare}>{compared ? 'Uncompare' : 'Compare'}</button>
          <button type="button" onClick={onToggleGroup}>{groupSelected ? 'Ungroup' : 'Group'}</button>
          <button type="button" onClick={onEdit}>Edit</button>
        </div>
      </td>
    </tr>
  );
}
