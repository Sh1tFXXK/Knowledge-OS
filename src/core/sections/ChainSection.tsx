import type { SectionProps } from './SectionRenderer';
import { useAtomRect } from './useAtomRect';

export function ChainSection({
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
    <div className="dc-section-body dc-chain-section">
      {atoms.map((atom, index) => {
        const node = nodePool[atom.nodeId];
        if (!node) return null;
        return (
          <ChainAtom
            key={atom.nodeId}
            atomId={atom.nodeId}
            label={node.label}
            desc={atom.desc ?? node.card.tabs[0]?.content ?? ''}
            color={dimension.color}
            selected={selectedNodeId === atom.nodeId}
            groupSelected={groupSelectedIds.has(atom.nodeId)}
            isLast={index === atoms.length - 1}
            onOpen={() => onAtomClick(atom.nodeId)}
            onEdit={() => onAtomEdit(section.id, atom.nodeId)}
            onToggleGroup={() => onToggleGroupAtom(atom.nodeId)}
            registerAtomRect={registerAtomRect}
          />
        );
      })}
      <button type="button" className="dc-chain-add" onClick={() => onAtomEdit(section.id)}>+ Add atom</button>
    </div>
  );
}

function ChainAtom({
  atomId,
  label,
  desc,
  color,
  selected,
  groupSelected,
  isLast,
  onOpen,
  onEdit,
  onToggleGroup,
  registerAtomRect,
}: {
  key?: string;
  atomId: string;
  label: string;
  desc: string;
  color: string;
  selected: boolean;
  groupSelected: boolean;
  isLast: boolean;
  onOpen: () => void;
  onEdit: () => void;
  onToggleGroup: () => void;
  registerAtomRect: SectionProps['registerAtomRect'];
}) {
  const ref = useAtomRect(atomId, registerAtomRect);
  return (
    <>
      <div
        ref={ref}
        className={`dc-chain-node${selected ? ' is-selected' : ''}${groupSelected ? ' is-grouped' : ''}`}
        style={{ borderColor: selected ? color : undefined }}
      >
        <button type="button" className="dc-chain-main" onClick={onOpen}>
          <span className="dc-chain-label">{label}</span>
          {desc && <span className="dc-chain-desc">{desc.slice(0, 80)}</span>}
        </button>
        <div className="dc-chain-actions">
          <button type="button" onClick={onToggleGroup}>{groupSelected ? 'Ungroup' : 'Group'}</button>
          <button type="button" onClick={onEdit}>Edit</button>
        </div>
      </div>
      {!isLast && <div className="dc-chain-arrow" aria-hidden>→</div>}
    </>
  );
}
