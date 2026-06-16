import { useState } from 'react';
import type { AtomBinding, KnowledgeNode, SemanticGroup, ViewDimension, ViewSection } from '../../types';
import { resolveSectionAtoms } from '../../knowledge/projection';
import {
  type SpanConfig,
  readExtent,
  readPosition,
  readSpanConfig,
} from '../../knowledge/physicalProjection';
import type { RegisterAtomRect } from './SectionRenderer';
import { useAtomRect } from './useAtomRect';

interface Props {
  dimension: ViewDimension;
  section: ViewSection;
  atoms: AtomBinding[];
  nodePool: Record<string, KnowledgeNode>;
  selectedNodeId: string | null;
  groupSelectedIds: Set<string>;
  onAtomClick: (nodeId: string) => void;
  onAtomEdit: (sectionId: string, nodeId?: string) => void;
  onToggleGroupAtom: (nodeId: string) => void;
  registerAtomRect: RegisterAtomRect;
}

interface SemanticStandard {
  id: string;
  label: string;
  subtitle: string;
  kind: 'composition' | 'projection';
  nodeId?: string;
  members: string[];
  color: string;
}

interface ClassificationTrack {
  id: string;
  label: string;
  standards: SemanticStandard[];
}

interface FieldTrack {
  id: string;
  label: string;
  standards: SemanticStandard[];
  color: string;
}

interface FieldCloud {
  id: string;
  trackId: string;
  trackLabel: string;
  standard: SemanticStandard;
  members: string[];
  semanticSize: number;
  left: number;
  top: number;
  width: number;
  height: number;
}

interface FieldConnection {
  id: string;
  color: string;
  active: boolean;
  path: string;
  sourceX: number;
  sourceY: number;
  targetX: number;
  targetY: number;
}

interface AtomFieldSpan {
  nodeId: string;
  left: number;
  width: number;
  lane: number;
}

const FIELD_COLORS = ['#58a6ff', '#b17cff', '#8ee37c', '#ffba3a', '#58d8e6', '#f4e85f', '#ff914d', '#ef7db6'];
const FIELD_CONTENT_LEFT = 22;
const FIELD_CONTENT_RIGHT = 96;
const FIELD_CONTENT_WIDTH = FIELD_CONTENT_RIGHT - FIELD_CONTENT_LEFT;

function compactText(text: string, max = 34): string {
  const normalized = text.replace(/\s+/g, ' ').trim();
  return normalized.length > max ? `${normalized.slice(0, max)}...` : normalized;
}

function buildCompositionStandards(
  groups: SemanticGroup[] | undefined,
  atoms: AtomBinding[],
  nodePool: Record<string, KnowledgeNode>,
): SemanticStandard[] {
  const atomIds = atoms.map((atom) => atom.nodeId);
  const atomIdSet = new Set(atomIds);
  const standards: SemanticStandard[] = [];

  for (const group of groups ?? []) {
    const members = group.members.filter((memberId) => atomIdSet.has(memberId));
    if (members.length === 0) continue;

    const boundLabel = group.nodeId ? nodePool[group.nodeId]?.label : '';
    const subtitle = boundLabel && boundLabel !== group.label
      ? boundLabel
      : `${members.length} 个原子`;

    standards.push({
        id: group.id,
        label: group.label,
        subtitle,
        kind: 'composition',
        nodeId: group.nodeId,
        members,
        color: FIELD_COLORS[standards.length % FIELD_COLORS.length],
    });
  }

  return standards.sort((a, b) => {
    const left = Math.min(...a.members.map((memberId) => atomIds.indexOf(memberId)).filter((index) => index >= 0));
    const right = Math.min(...b.members.map((memberId) => atomIds.indexOf(memberId)).filter((index) => index >= 0));
    return left - right;
  });
}

function tabText(node: KnowledgeNode | undefined): string {
  return node?.card.tabs.map((tab) => tab.content).join(' ') ?? '';
}

function atomAttrText(atom: AtomBinding): string {
  return Object.values(atom.attrs ?? {}).join(' ');
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function atomCenterPercent(index: number, atomTotal: number): number {
  return FIELD_CONTENT_LEFT + ((index + 0.5) / Math.max(atomTotal, 1)) * FIELD_CONTENT_WIDTH;
}

function memberSpanPercent(indexes: number[], atomTotal: number): { left: number; width: number } | null {
  if (indexes.length === 0) return null;
  const minIndex = Math.min(...indexes);
  const maxIndex = Math.max(...indexes);
  const left = FIELD_CONTENT_LEFT + (minIndex / Math.max(atomTotal, 1)) * FIELD_CONTENT_WIDTH;
  const right = FIELD_CONTENT_LEFT + ((maxIndex + 1) / Math.max(atomTotal, 1)) * FIELD_CONTENT_WIDTH;
  return { left, width: right - left };
}

function buildAtomFieldSpans(atoms: AtomBinding[], spanConfig: SpanConfig): AtomFieldSpan[] {
  const total = spanConfig.total;
  const hasCoordinates =
    !!total &&
    total > 0 &&
    atoms.some((atom) => readPosition(atom, spanConfig) !== null || readExtent(atom, spanConfig) !== null);
  const atomTotal = Math.max(atoms.length, 1);

  return atoms.map((atom, index) => {
    if (!hasCoordinates || !total) {
      return {
        nodeId: atom.nodeId,
        left: FIELD_CONTENT_LEFT + (index / atomTotal) * FIELD_CONTENT_WIDTH,
        width: FIELD_CONTENT_WIDTH / atomTotal,
        lane: 0,
      };
    }

    const fallbackOffset = (index / atomTotal) * total;
    const fallbackSize = total / atomTotal;
    const offset = readPosition(atom, spanConfig) ?? fallbackOffset;
    const size = readExtent(atom, spanConfig) ?? fallbackSize;
    const left = FIELD_CONTENT_LEFT + (clamp(offset, 0, total) / total) * FIELD_CONTENT_WIDTH;
    const right = FIELD_CONTENT_LEFT + (clamp(offset + Math.max(size, 1), 0, total) / total) * FIELD_CONTENT_WIDTH;

    return {
      nodeId: atom.nodeId,
      left,
      width: Math.max(right - left, 0.5),
      lane: index % 2,
    };
  });
}

function standardPhysicalSpan(
  memberIds: string[],
  atomSpanById: Map<string, AtomFieldSpan>,
): { left: number; width: number } | null {
  const spans = [...new Set(memberIds)]
    .map((memberId) => atomSpanById.get(memberId))
    .filter((span): span is AtomFieldSpan => !!span);
  if (spans.length === 0) return null;

  const left = Math.min(...spans.map((span) => span.left));
  const right = Math.max(...spans.map((span) => span.left + span.width));
  return { left, width: Math.max(right - left, 0.5) };
}

function standardPhysicalSegments(
  memberIds: string[],
  atomSpanById: Map<string, AtomFieldSpan>,
): Array<{ left: number; width: number; members: string[] }> {
  const spans = [...new Set(memberIds)]
    .map((memberId) => {
      const span = atomSpanById.get(memberId);
      return span ? { ...span, memberId } : null;
    })
    .filter((span): span is AtomFieldSpan & { memberId: string } => !!span)
    .sort((a, b) => a.left - b.left);
  if (spans.length === 0) return [];

  const gapTolerance = 0.9;
  const segments: Array<{ left: number; right: number; members: string[] }> = [];

  for (const span of spans) {
    const right = span.left + span.width;
    const last = segments[segments.length - 1];
    if (last && span.left <= last.right + gapTolerance) {
      last.right = Math.max(last.right, right);
      last.members.push(span.memberId);
    } else {
      segments.push({ left: span.left, right, members: [span.memberId] });
    }
  }

  return segments.map((segment) => ({
    left: segment.left,
    width: Math.max(segment.right - segment.left, 0.5),
    members: segment.members,
  }));
}

function inferProjectionMembers(
  atom: AtomBinding,
  node: KnowledgeNode | undefined,
  primaryAtoms: AtomBinding[],
  nodePool: Record<string, KnowledgeNode>,
): string[] {
  const directMember = primaryAtoms.some((primaryAtom) => primaryAtom.nodeId === atom.nodeId)
    ? [atom.nodeId]
    : [];
  const text = `${atom.desc ?? ''} ${atomAttrText(atom)} ${node?.label ?? ''} ${tabText(node)}`.toLowerCase();
  const matched = primaryAtoms
    .filter((primaryAtom) => {
      const primaryNode = nodePool[primaryAtom.nodeId];
      const label = primaryNode?.label;
      return !!label && text.includes(label.toLowerCase());
    })
    .map((primaryAtom) => primaryAtom.nodeId);

  if (matched.length > 0) return matched;
  return directMember;
}

function buildClassificationTracks(
  dimension: ViewDimension,
  primarySectionId: string,
  primaryAtoms: AtomBinding[],
  nodePool: Record<string, KnowledgeNode>,
  colorOffset: number,
): ClassificationTrack[] {
  let colorIndex = colorOffset;
  const tracks: ClassificationTrack[] = [];

  for (const item of dimension.sections) {
    if (item.id === primarySectionId || item.layout !== 'grid') continue;
    const sectionAtoms = resolveSectionAtoms(item, nodePool);
    if (sectionAtoms.length === 0) continue;

    const standards = sectionAtoms.map((atom) => {
      const node = nodePool[atom.nodeId];
      const subtitle = atom.desc
        ? compactText(atom.desc, 22)
        : compactText(node?.card.tabs[0]?.content ?? '分类项', 22);

      return {
        id: `${item.id}_${atom.nodeId}`,
        label: node?.label ?? atom.nodeId,
        subtitle,
        kind: 'projection' as const,
        nodeId: atom.nodeId,
        members: inferProjectionMembers(atom, node, primaryAtoms, nodePool),
        color: FIELD_COLORS[colorIndex++ % FIELD_COLORS.length],
      };
    });

    tracks.push({
      id: item.id,
      label: item.title ?? item.layout,
      standards,
    });
  }

  return tracks;
}

function buildFieldTracks(
  compositionStandards: SemanticStandard[],
  classificationTracks: ClassificationTrack[],
): FieldTrack[] {
  const tracks: FieldTrack[] = [];

  if (compositionStandards.length > 0) {
    tracks.push({
      id: 'composition',
      label: '组成分类',
      standards: compositionStandards,
      color: compositionStandards[0]?.color ?? FIELD_COLORS[0],
    });
  }

  for (const track of classificationTracks) {
    tracks.push({
      id: track.id,
      label: track.label,
      standards: track.standards,
      color: track.standards[0]?.color ?? FIELD_COLORS[tracks.length % FIELD_COLORS.length],
    });
  }

  return tracks;
}

function buildSemanticFieldClouds(
  tracks: FieldTrack[],
  atoms: AtomBinding[],
  atomSpans: AtomFieldSpan[],
): FieldCloud[] {
  const atomIdSet = new Set(atoms.map((atom) => atom.nodeId));
  const atomIndex = new Map(atoms.map((atom, index) => [atom.nodeId, index]));
  const atomSpanById = new Map(atomSpans.map((span) => [span.nodeId, span]));
  const atomTotal = Math.max(atoms.length, 1);
  const semanticSizeOf = (standard: SemanticStandard) =>
    new Set(standard.members.filter((memberId) => atomIdSet.has(memberId))).size;
  const allSizes = tracks.flatMap((track) => track.standards.map(semanticSizeOf));
  const maxSemanticSize = Math.max(1, ...allSizes);
  const trackTotal = Math.max(tracks.length, 1);

  return tracks.flatMap((track, trackIndex) => {
    const laneTop = (trackIndex / trackTotal) * 100;
    const laneHeight = 100 / trackTotal;
    const itemTotal = Math.max(track.standards.length, 1);
    const standardRowHeight = laneHeight / itemTotal;

    return track.standards.flatMap((standard, itemIndex) => {
      const semanticSize = semanticSizeOf(standard);
      const sizeRatio = semanticSize > 0 ? semanticSize / maxSemanticSize : 0.16;
      const sizeRoot = Math.sqrt(sizeRatio);
      const memberIndexes = [...new Set(standard.members
        .map((memberId) => atomIndex.get(memberId))
        .filter((index): index is number => typeof index === 'number'))];
      const fallbackCenter = itemTotal === 1
        ? FIELD_CONTENT_LEFT + FIELD_CONTENT_WIDTH / 2
        : FIELD_CONTENT_LEFT + (itemIndex / Math.max(itemTotal - 1, 1)) * FIELD_CONTENT_WIDTH;
      const fallbackSpan = standardPhysicalSpan(standard.members, atomSpanById) ?? memberSpanPercent(memberIndexes, atomTotal);
      const segments = standardPhysicalSegments(standard.members, atomSpanById);
      const visibleSegments = segments.length > 0
        ? segments
        : fallbackSpan
          ? [{ ...fallbackSpan, members: standard.members }]
          : [{ left: fallbackCenter, width: 0, members: standard.members }];
      const atomCellWidth = FIELD_CONTENT_WIDTH / atomTotal;
      const minWidth = memberIndexes.length <= 1
        ? clamp(atomCellWidth * 0.92, 8, 16)
        : 12 + sizeRoot * 3;
      const rowTop = laneTop + standardRowHeight * itemIndex;
      const rowPadding = Math.min(2.2, standardRowHeight * 0.16);
      const height = Math.min(
        Math.max(standardRowHeight * 0.64, 7.4),
        Math.max(7.4, standardRowHeight - rowPadding * 2),
        standard.kind === 'composition' ? 15 + sizeRoot * 4 : 14 + sizeRoot * 3,
      );
      const centerY = rowTop + standardRowHeight / 2;

      return visibleSegments.map((segment, segmentIndex) => {
        const centerX = segment.left + segment.width / 2;
        const width = clamp(Math.max(segment.width, minWidth), 8, FIELD_CONTENT_WIDTH);

        return {
          id: `${standard.id}_${segmentIndex}`,
          trackId: track.id,
          trackLabel: track.label,
          standard,
          members: segment.members,
          semanticSize: new Set(segment.members.filter((memberId) => atomIdSet.has(memberId))).size,
          left: clamp(centerX - width / 2, FIELD_CONTENT_LEFT, FIELD_CONTENT_RIGHT - width),
          top: clamp(centerY - height / 2, rowTop + rowPadding, rowTop + standardRowHeight - height - rowPadding),
          width,
          height,
        };
      });
    });
  });
}

function buildSemanticFieldConnections(
  clouds: FieldCloud[],
  atoms: AtomBinding[],
  atomSpans: AtomFieldSpan[],
  activeStandard: SemanticStandard | null,
): FieldConnection[] {
  const atomIndex = new Map(atoms.map((atom, index) => [atom.nodeId, index]));
  const atomSpanById = new Map(atomSpans.map((span) => [span.nodeId, span]));
  const atomTotal = Math.max(atoms.length, 1);

  return clouds.flatMap((cloud) => {
    const memberIds = [...new Set(cloud.members)].filter((memberId) => atomIndex.has(memberId));
    const sourceX = cloud.left + cloud.width / 2;
    const sourceY = cloud.top + cloud.height * 0.62;

    return memberIds.map((memberId, memberOrder) => {
      const index = atomIndex.get(memberId) ?? 0;
      const atomSpan = atomSpanById.get(memberId);
      const targetX = atomSpan ? atomSpan.left + atomSpan.width / 2 : atomCenterPercent(index, atomTotal);
      const targetY = 96;
      const midY = Math.min(88, Math.max(sourceY + 14, 62 + (memberOrder % 3) * 5));
      const path = `M ${sourceX.toFixed(2)} ${sourceY.toFixed(2)} C ${sourceX.toFixed(2)} ${midY.toFixed(2)}, ${targetX.toFixed(2)} ${midY.toFixed(2)}, ${targetX.toFixed(2)} ${targetY}`;

      return {
        id: `${cloud.standard.id}_${memberId}`,
        color: cloud.standard.color,
        active: activeStandard?.id === cloud.standard.id,
        path,
        sourceX,
        sourceY,
        targetX,
        targetY,
      };
    });
  });
}

export function SemanticFieldView({
  dimension,
  section,
  atoms,
  nodePool,
  selectedNodeId,
  groupSelectedIds,
  onAtomClick,
  onAtomEdit,
  onToggleGroupAtom,
  registerAtomRect,
}: Props) {
  const [focusedStandardId, setFocusedStandardId] = useState(null as string | null);
  const spanConfig = readSpanConfig(section);
  const total = spanConfig.total ?? 0;
  const hasTotal = spanConfig.total !== null && total > 0;
  const unit = section.config?.unit ?? '';
  const atomContext = hasTotal
    ? `${section.title ?? '原子布局'} · 0 - ${Math.round(total)}${unit}`
    : section.title ?? '原子顺序';

  const compositionStandards = buildCompositionStandards(dimension.groups, atoms, nodePool);
  const classificationTracks = buildClassificationTracks(
    dimension,
    section.id,
    atoms,
    nodePool,
    compositionStandards.length,
  );
  const visibleStandards = [
    ...compositionStandards,
    ...classificationTracks.flatMap((track) => track.standards),
  ];
  const fieldTracks = buildFieldTracks(compositionStandards, classificationTracks);
  const selectedStandard = visibleStandards.find((standard) =>
    !!selectedNodeId && (standard.nodeId === selectedNodeId || standard.members.includes(selectedNodeId)),
  );
  const activeStandard =
    visibleStandards.find((standard) => standard.id === focusedStandardId) ?? selectedStandard ?? null;
  const activeMembers = new Set(activeStandard?.members ?? []);
  const atomSpans = buildAtomFieldSpans(atoms, spanConfig);
  const fieldClouds = buildSemanticFieldClouds(fieldTracks, atoms, atomSpans);
  const fieldConnections = activeStandard
    ? buildSemanticFieldConnections(fieldClouds, atoms, atomSpans, activeStandard).filter((connection) => connection.active)
    : [];
  const atomStep = `${FIELD_CONTENT_WIDTH / Math.max(atoms.length, 1)}%`;
  const atomColor = (atom: AtomBinding, index: number) => {
    const coveringStandards = visibleStandards.filter((standard) => standard.members.includes(atom.nodeId));
    const owner = compositionStandards.find((standard) => standard.members.includes(atom.nodeId));
    return activeStandard && activeMembers.has(atom.nodeId)
      ? activeStandard.color
      : coveringStandards[0]?.color ?? owner?.color ?? FIELD_COLORS[index % FIELD_COLORS.length];
  };

  const openStandard = (standard: SemanticStandard) => {
    setFocusedStandardId(standard.id);
  };

  if (atoms.length === 0) return null;

  return (
    <section
      className={`dc-field-shell${activeStandard ? ' has-active-standard' : ''}`}
      aria-label={`${dimension.name} semantic field`}
      onMouseLeave={() => setFocusedStandardId(null)}
    >
      <div className="dc-field-layer dc-field-layer--projection">
        <div className="dc-field-rail">
          <strong>语义投影场</strong>
          <span>覆盖同一组原子</span>
        </div>
        <div className="dc-field-projection">
          <div
            className="dc-field-cloud-stack"
            aria-label="语义场视口"
            style={{
              '--field-track-count': fieldTracks.length,
              '--field-atom-count': atoms.length,
              '--field-atom-step': atomStep,
            } as any}
          >
            <div className="dc-field-track-grid" aria-hidden="true">
              {fieldTracks.map((track) => (
                <div key={track.id} className="dc-field-track-lane" style={{ '--field-color': track.color } as any}>
                  <span>{track.label}</span>
                </div>
              ))}
            </div>
            {fieldConnections.length > 0 && (
              <svg
                className="dc-field-projection-links has-active"
                viewBox="0 0 100 100"
                preserveAspectRatio="none"
                aria-hidden="true"
              >
                {fieldConnections.map((connection) => (
                  <g
                    key={connection.id}
                    className="dc-field-link is-active"
                    style={{ '--field-color': connection.color } as any}
                  >
                    <path className="dc-field-link-shadow" d={connection.path} />
                    <path className="dc-field-link-core" d={connection.path} />
                    <circle className="dc-field-link-dot dc-field-link-dot--source" cx={connection.sourceX} cy={connection.sourceY} r="0.72" />
                    <circle className="dc-field-link-dot dc-field-link-dot--target" cx={connection.targetX} cy={connection.targetY} r="0.9" />
                  </g>
                ))}
              </svg>
            )}
            {fieldClouds.map(({ id, standard, semanticSize, left, top, width, height }) => {
              const active = activeStandard?.id === standard.id;
              return (
                <button
                  key={id}
                  type="button"
                  className={`dc-field-cloud dc-field-cloud--${standard.kind}${active ? ' is-active' : ''}`}
                  aria-label={`${standard.label} 语义场，${semanticSize} 个原子`}
                  title={`${standard.label} · ${semanticSize} 个原子`}
                  onMouseEnter={() => setFocusedStandardId(standard.id)}
                  onFocus={() => setFocusedStandardId(standard.id)}
                  onClick={() => openStandard(standard)}
                  style={{
                    '--field-color': standard.color,
                    '--field-x': `${left}%`,
                    '--field-y': `${top}%`,
                    '--field-width': `${width}%`,
                    '--field-height': `${height}%`,
                  } as any}
                >
                  <span className="dc-field-cloud-label">{standard.label}</span>
                  <span className="dc-field-cloud-size">{semanticSize} 个原子</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="dc-field-layer dc-field-layer--physical">
        <div className="dc-field-rail">
          <strong>元知识原子</strong>
          <span>{atomContext}</span>
        </div>
        <div className="dc-field-physical-main">
          <div className="dc-field-atoms" style={{ '--field-atom-count': atoms.length, '--field-atom-step': atomStep } as any}>
            <div className="dc-field-physical-scale" aria-hidden="true">
              {atomSpans.map((span, index) => (
                <span
                  key={span.nodeId}
                  className="dc-field-atom-measure"
                  style={{
                    '--field-color': atomColor(atoms[index], index),
                    '--field-atom-x': `${span.left}%`,
                    '--field-atom-width': `${span.width}%`,
                  } as any}
                />
              ))}
            </div>
            <div className="dc-field-atom-grid">
              {atoms.map((atom, index) => (
                <SemanticFieldAtom
                  key={atom.nodeId}
                  atom={atom}
                  index={index}
                  sectionId={section.id}
                  unit={unit}
                  spanConfig={spanConfig}
                  node={nodePool[atom.nodeId]}
                  fieldSpan={atomSpans[index]}
                  selected={selectedNodeId === atom.nodeId}
                  groupSelected={groupSelectedIds.has(atom.nodeId)}
                  activeMembers={activeMembers}
                  activeStandard={activeStandard}
                  compositionStandards={compositionStandards}
                  visibleStandards={visibleStandards}
                  onAtomClick={onAtomClick}
                  onAtomEdit={onAtomEdit}
                  onToggleGroupAtom={onToggleGroupAtom}
                  setFocusedStandardId={setFocusedStandardId}
                  registerAtomRect={registerAtomRect}
                />
              ))}
            </div>
          </div>
          <div className="dc-field-physical-tools">
            <button type="button" onClick={() => onAtomEdit(section.id)}>+ 绑定原子</button>
          </div>
        </div>
      </div>
    </section>
  );
}

function SemanticFieldAtom({
  atom,
  index,
  sectionId,
  unit,
  spanConfig,
  node,
  fieldSpan,
  selected,
  groupSelected,
  activeMembers,
  activeStandard,
  compositionStandards,
  visibleStandards,
  onAtomClick,
  onAtomEdit,
  onToggleGroupAtom,
  setFocusedStandardId,
  registerAtomRect,
}: {
  atom: AtomBinding;
  index: number;
  sectionId: string;
  unit: string;
  spanConfig: SpanConfig;
  node: KnowledgeNode | undefined;
  fieldSpan: AtomFieldSpan;
  selected: boolean;
  groupSelected: boolean;
  activeMembers: Set<string>;
  activeStandard: SemanticStandard | null;
  compositionStandards: SemanticStandard[];
  visibleStandards: SemanticStandard[];
  onAtomClick: (nodeId: string) => void;
  onAtomEdit: (sectionId: string, nodeId?: string) => void;
  onToggleGroupAtom: (nodeId: string) => void;
  setFocusedStandardId: (standardId: string | null) => void;
  registerAtomRect: RegisterAtomRect;
}) {
  const ref = useAtomRect<HTMLElement>(atom.nodeId, registerAtomRect);
  const offset = readPosition(atom, spanConfig);
  const size = readExtent(atom, spanConfig);
  const coveringStandards = visibleStandards.filter((standard) => standard.members.includes(atom.nodeId));
  const owner = compositionStandards.find((standard) => standard.members.includes(atom.nodeId));
  const color = activeStandard && activeMembers.has(atom.nodeId)
    ? activeStandard.color
    : coveringStandards[0]?.color ?? owner?.color ?? FIELD_COLORS[index % FIELD_COLORS.length];
  const active = selected || activeMembers.has(atom.nodeId);
  const meta = offset !== null || size !== null
    ? [offset !== null ? `@${offset}${unit}` : null, size !== null ? `${size}${unit}` : null]
        .filter(Boolean)
        .join(' / ')
    : compactText(atom.desc ?? node?.card.tabs[0]?.content ?? '', 42);

  return (
    <article
      ref={ref}
      className={`dc-field-atom${active ? ' is-active' : ''}${selected ? ' is-selected' : ''}${groupSelected ? ' is-grouped' : ''}`}
      style={{ '--field-color': color } as any}
      onMouseEnter={() => {
        setFocusedStandardId(owner?.id ?? null);
      }}
    >
      <span className="dc-field-atom-scale" aria-hidden="true">
        <span
          className="dc-field-atom-scale-fill"
          style={{
            '--field-color': color,
            '--field-atom-x': `${fieldSpan.left}%`,
            '--field-atom-width': `${fieldSpan.width}%`,
          } as any}
        />
      </span>
      {coveringStandards.length > 0 && (
        <div className="dc-field-atom-membership" aria-hidden="true">
          {coveringStandards.slice(0, 4).map((standard) => (
            <span
              key={standard.id}
              className="dc-field-atom-field-mark"
              style={{ '--field-color': standard.color } as any}
            />
          ))}
        </div>
      )}
      <button type="button" className="dc-field-atom-main" onClick={() => onAtomClick(atom.nodeId)}>
        <span className="dc-field-atom-label">{node?.label ?? atom.nodeId}</span>
        {meta && <span className="dc-field-atom-meta">{meta}</span>}
      </button>
      <div className="dc-field-atom-actions">
        <button type="button" onClick={() => onToggleGroupAtom(atom.nodeId)}>
          {groupSelected ? '取消' : '成组'}
        </button>
        <button type="button" onClick={() => onAtomEdit(sectionId, atom.nodeId)}>编辑</button>
      </div>
    </article>
  );
}
