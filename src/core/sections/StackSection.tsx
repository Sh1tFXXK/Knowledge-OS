import type { AtomBinding } from '../../types';
import type { SectionProps } from './SectionRenderer';
import { useAtomRect } from './useAtomRect';
import { readExtent, readPosition, readSpanConfig } from '../../knowledge/physicalProjection';

interface StackSegment {
  atom: AtomBinding;
  label: string;
  top: number;
  height: number;
  scaledTop: number;
  scaledHeight: number;
  isExpanded: boolean;
}

function resolveStackSegments(
  atoms: AtomBinding[],
  nodePool: SectionProps['nodePool'],
  total: number,
  spanConfig: ReturnType<typeof readSpanConfig>,
): { segments: StackSegment[]; canvasHeight: number } {
  const minReadable = 46;
  const minGap = 2;
  const baseHeight = 420;
  let cursor = 0;

  const segments = atoms.map((atom, index) => {
    const offset = readPosition(atom, spanConfig) ?? (index / Math.max(atoms.length, 1)) * total;
    const size = readExtent(atom, spanConfig) ?? total / Math.max(atoms.length, 1);
    const scaledTop = Math.max(0, (offset / total) * baseHeight);
    const scaledHeight = Math.max(1, (size / total) * baseHeight);
    const height = Math.max(minReadable, scaledHeight);
    const top = Math.max(scaledTop, cursor);
    cursor = top + height + minGap;

    return {
      atom,
      label: nodePool[atom.nodeId]?.label ?? atom.nodeId,
      top,
      height,
      scaledTop,
      scaledHeight,
      isExpanded: height > scaledHeight + 0.5,
    };
  });

  return {
    segments,
    canvasHeight: Math.max(baseHeight, cursor - minGap),
  };
}

export function StackSection({
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
  const spanConfig = readSpanConfig(section);
  const total = spanConfig.total ?? 0;
  const hasCoordinates =
    spanConfig.total !== null &&
    total > 0 &&
    atoms.some((atom) => readPosition(atom, spanConfig) !== null || readExtent(atom, spanConfig) !== null);

  if (!hasCoordinates) {
    return (
      <div className="dc-section-body dc-stack-section dc-stack-section--equal">
        {atoms.map((atom) => (
          <StackBlock
            key={atom.nodeId}
            atom={atom}
            label={nodePool[atom.nodeId]?.label ?? atom.nodeId}
            color={dimension.color}
            unit={section.config?.unit}
            spanConfig={spanConfig}
            selected={selectedNodeId === atom.nodeId}
            groupSelected={groupSelectedIds.has(atom.nodeId)}
            onOpen={() => onAtomClick(atom.nodeId)}
            onEdit={() => onAtomEdit(section.id, atom.nodeId)}
            onToggleGroup={() => onToggleGroupAtom(atom.nodeId)}
            registerAtomRect={registerAtomRect}
          />
        ))}
        <button type="button" className="dc-stack-add" onClick={() => onAtomEdit(section.id)}>+ Add atom</button>
      </div>
    );
  }

  const { segments, canvasHeight } = resolveStackSegments(atoms, nodePool, total, spanConfig);

  return (
    <div className="dc-section-body dc-stack-section">
      <div className="dc-stack-ruler">
        <span>0{section.config?.unit ?? ''}</span>
        <span>{total}{section.config?.unit ?? ''}</span>
      </div>
      <div className="dc-stack-canvas" style={{ minHeight: canvasHeight }}>
        {segments.map((segment) => {
          const atom = segment.atom;
          return (
            <StackBlock
              key={atom.nodeId}
              atom={atom}
              label={segment.label}
              color={dimension.color}
              unit={section.config?.unit}
              spanConfig={spanConfig}
              selected={selectedNodeId === atom.nodeId}
              groupSelected={groupSelectedIds.has(atom.nodeId)}
              onOpen={() => onAtomClick(atom.nodeId)}
              onEdit={() => onAtomEdit(section.id, atom.nodeId)}
              onToggleGroup={() => onToggleGroupAtom(atom.nodeId)}
              registerAtomRect={registerAtomRect}
              style={{ top: segment.top, height: segment.height }}
              expanded={segment.isExpanded}
            />
          );
        })}
      </div>
      <button type="button" className="dc-stack-add" onClick={() => onAtomEdit(section.id)}>+ Add atom</button>
    </div>
  );
}

function StackBlock({
  atom,
  label,
  color,
  unit,
  spanConfig,
  selected,
  groupSelected,
  onOpen,
  onEdit,
  onToggleGroup,
  registerAtomRect,
  style,
  expanded,
}: {
  key?: string;
  atom: AtomBinding;
  label: string;
  color: string;
  unit?: string;
  spanConfig: ReturnType<typeof readSpanConfig>;
  selected: boolean;
  groupSelected: boolean;
  onOpen: () => void;
  onEdit: () => void;
  onToggleGroup: () => void;
  registerAtomRect: SectionProps['registerAtomRect'];
  style?: any;
  expanded?: boolean;
}) {
  const ref = useAtomRect(atom.nodeId, registerAtomRect);
  const offset = readPosition(atom, spanConfig);
  const size = readExtent(atom, spanConfig);
  const meta = offset !== null || size !== null
    ? [offset !== null ? `@${offset}${unit ?? ''}` : null, size !== null ? `${size}${unit ?? ''}` : null]
        .filter(Boolean)
        .join(' / ')
    : atom.desc;

  return (
    <div
      ref={ref}
      className={`dc-stack-block${selected ? ' is-selected' : ''}${groupSelected ? ' is-grouped' : ''}`}
      style={{ '--section-color': color, ...style } as any}
    >
      <button type="button" className="dc-stack-main" onClick={onOpen}>
        <span className="dc-stack-label">{label}</span>
        {meta && <span className="dc-stack-meta">{meta}</span>}
        {expanded && <span className="dc-stack-meta">expanded for readability</span>}
      </button>
      <div className="dc-stack-actions">
        <button type="button" onClick={onToggleGroup}>{groupSelected ? 'Ungroup' : 'Group'}</button>
        <button type="button" onClick={onEdit}>Edit</button>
      </div>
    </div>
  );
}
