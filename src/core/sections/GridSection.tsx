import type { SectionProps } from './SectionRenderer';
import { useAtomRect } from './useAtomRect';

export function GridSection({
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
  return (
    <div className="dc-section-body dc-grid-section">
      {atoms.map((atom) => {
        const node = nodePool[atom.nodeId];
        if (!node) return null;
        return (
          <GridAtom
            key={atom.nodeId}
            atomId={atom.nodeId}
            title={node.label}
            desc={atom.desc ?? node.card.tabs[0]?.content ?? ''}
            role={node.role ?? 'plain'}
            color={dimension.color}
            selected={selectedNodeId === atom.nodeId}
            groupSelected={groupSelectedIds.has(atom.nodeId)}
            onOpen={() => onAtomClick(atom.nodeId)}
            onEdit={() => onAtomEdit(section.id, atom.nodeId)}
            onToggleGroup={() => onToggleGroupAtom(atom.nodeId)}
            registerAtomRect={registerAtomRect}
          />
        );
      })}
      <button type="button" className="dc-atom-card dc-atom-card--add" onClick={() => onAtomEdit(section.id)}>
        <span className="dc-add-symbol">+</span>
        <span>Add atom</span>
      </button>
    </div>
  );
}

function GridAtom({
  atomId,
  title,
  desc,
  role,
  color,
  selected,
  groupSelected,
  onOpen,
  onEdit,
  onToggleGroup,
  registerAtomRect,
}: {
  key?: string;
  atomId: string;
  title: string;
  desc: string;
  role: string;
  color: string;
  selected: boolean;
  groupSelected: boolean;
  onOpen: () => void;
  onEdit: () => void;
  onToggleGroup: () => void;
  registerAtomRect: SectionProps['registerAtomRect'];
}) {
  const ref = useAtomRect(atomId, registerAtomRect);
  return (
    <div
      ref={ref}
      className={`dc-atom-card${selected ? ' dc-atom-card--selected' : ''}${groupSelected ? ' dc-atom-card--grouped' : ''}`}
      style={{ borderColor: selected ? color : undefined }}
    >
      <div className="dc-atom-role">{role}</div>
      <button type="button" className="dc-atom-main" onClick={onOpen}>
        <span className="dc-atom-label">{title}</span>
        {desc && <span className="dc-atom-desc">{desc.slice(0, 96)}</span>}
      </button>
      <div className="dc-atom-actions">
        <button type="button" className="dc-atom-btn" onClick={onToggleGroup}>
          {groupSelected ? 'Ungroup' : 'Group'}
        </button>
        <button type="button" className="dc-atom-btn dc-atom-btn--edit" onClick={onEdit}>
          Edit
        </button>
      </div>
    </div>
  );
}
