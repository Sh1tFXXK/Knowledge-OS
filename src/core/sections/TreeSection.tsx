import type { SectionProps } from './SectionRenderer';
import { useAtomRect } from './useAtomRect';

export function TreeSection({
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
    <div className="dc-section-body dc-tree-section">
      <div className="dc-tree-root" style={{ borderColor: dimension.color }}>
        <span>{section.title ?? dimension.name}</span>
      </div>
      <div className="dc-tree-branches">
        {atoms.map((atom) => {
          const node = nodePool[atom.nodeId];
          if (!node) return null;
          return (
            <TreeAtom
              key={atom.nodeId}
              atomId={atom.nodeId}
              label={node.label}
              desc={atom.desc ?? node.card.tabs[0]?.content ?? ''}
              selected={selectedNodeId === atom.nodeId}
              groupSelected={groupSelectedIds.has(atom.nodeId)}
              onOpen={() => onAtomClick(atom.nodeId)}
              onEdit={() => onAtomEdit(section.id, atom.nodeId)}
              onToggleGroup={() => onToggleGroupAtom(atom.nodeId)}
              registerAtomRect={registerAtomRect}
            />
          );
        })}
        <button type="button" className="dc-tree-add" onClick={() => onAtomEdit(section.id)}>+ Add atom</button>
      </div>
    </div>
  );
}

function TreeAtom({
  atomId,
  label,
  desc,
  selected,
  groupSelected,
  onOpen,
  onEdit,
  onToggleGroup,
  registerAtomRect,
}: {
  key?: string;
  atomId: string;
  label: string;
  desc: string;
  selected: boolean;
  groupSelected: boolean;
  onOpen: () => void;
  onEdit: () => void;
  onToggleGroup: () => void;
  registerAtomRect: SectionProps['registerAtomRect'];
}) {
  const ref = useAtomRect(atomId, registerAtomRect);
  return (
    <div ref={ref} className={`dc-tree-node${selected ? ' is-selected' : ''}${groupSelected ? ' is-grouped' : ''}`}>
      <button type="button" className="dc-tree-main" onClick={onOpen}>
        <span className="dc-tree-node-label">{label}</span>
        {desc && <span className="dc-tree-node-desc">{desc.slice(0, 72)}</span>}
      </button>
      <div className="dc-tree-node-actions">
        <button type="button" onClick={onToggleGroup}>{groupSelected ? 'Ungroup' : 'Group'}</button>
        <button type="button" onClick={onEdit}>Edit</button>
      </div>
    </div>
  );
}
