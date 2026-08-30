import { useMemo } from 'react';
import type {
  AtomBinding,
  ClassificationScopeMeta,
  KnowledgeNode,
  SemanticGroup,
  ViewDimension,
  ViewSection,
} from '../../types';
import { resolveSectionAtoms } from '../../knowledge/projection';
import type { RegisterAtomRect } from './SectionRenderer';
import { useAtomRect } from './useAtomRect';

export interface OrthogonalAtomEditTarget {
  dimensionId: string;
  sectionId: string;
  nodeId?: string;
  groupId?: string;
  secondaryDimensionId?: string;
  secondarySectionId?: string;
  secondaryGroupId?: string;
}

export interface OrthogonalCategoryEditTarget {
  dimensionId: string;
  sectionId: string;
  groupId?: string;
  label: string;
}

interface ClassificationCategory {
  id: string;
  label: string;
  color: string;
  dimensionId: string;
  sectionId: string;
  members: string[];
  group?: SemanticGroup;
}

interface ClassificationBandSegment {
  id: string;
  group: ClassificationCategory;
  start: number;
  span: number;
  memberIds: string[];
  atoms: AtomBinding[];
}

interface ClassificationBandRow {
  id: string;
  dimension: ViewDimension;
  section: ViewSection;
  groups: ClassificationCategory[];
  segments: ClassificationBandSegment[];
}

interface OverallCategoryChip {
  id: string;
  label: string;
  color: string;
  atom: AtomBinding;
}

interface OverallDimension {
  id: string;
  dimension: ViewDimension;
  section: ViewSection;
  categories: OverallCategoryChip[];
}

interface ClassificationScope {
  id: string;
  meta: ClassificationScopeMeta;
  name: string;
  target: ClassificationScopeMeta['target'];
  targetLabel?: string;
  dimensions: ViewDimension[];
  overallDimensions: OverallDimension[];
  orderedAtoms: AtomBinding[];
  rows: ClassificationBandRow[];
}

interface Props {
  dimensions: ViewDimension[];
  nodePool: Record<string, KnowledgeNode>;
  selectedNodeId: string | null;
  groupSelectedIds: Set<string>;
  onAtomClick: (nodeId: string) => void;
  onAtomEdit: (target: OrthogonalAtomEditTarget) => void;
  onAtomHeaderEdit: (target: OrthogonalAtomEditTarget) => void;
  onCategoryEdit: (target: OrthogonalCategoryEditTarget) => void;
  onAddRow: (scope?: ClassificationScopeMeta) => void;
  onRenameRow: (dimensionId: string) => void;
  onDeleteRow: (dimensionId: string) => void;
  onToggleGroupAtom: (nodeId: string) => void;
  registerAtomRect: RegisterAtomRect;
}

function primarySection(dimension: ViewDimension): ViewSection | null {
  return (
    dimension.sections.find((section) => section.atoms.length > 0) ??
    dimension.sections[0] ??
    null
  );
}

function defaultScopeFor(dimension: ViewDimension): ClassificationScopeMeta {
  return {
    id: 'default_parts',
    name: '分类矩阵',
    target: dimension.scope?.target ?? 'parts',
    targetLabel: dimension.scope?.targetLabel,
  };
}

function scopeMetaFor(dimension: ViewDimension): ClassificationScopeMeta {
  return dimension.scope ?? defaultScopeFor(dimension);
}

function buildOrderedAtoms(
  dimensions: ViewDimension[],
  nodePool: Record<string, KnowledgeNode>,
): AtomBinding[] {
  const atoms: AtomBinding[] = [];
  const seen = new Set<string>();

  for (const dimension of dimensions) {
    const section = primarySection(dimension);
    if (!section) continue;

    for (const atom of resolveSectionAtoms(section, nodePool)) {
      if (seen.has(atom.nodeId)) continue;
      seen.add(atom.nodeId);
      atoms.push(atom);
    }
  }

  return atoms;
}

function buildSemanticCategories(
  dimension: ViewDimension,
  section: ViewSection,
  orderById: Map<string, number>,
  nodePool: Record<string, KnowledgeNode>,
): ClassificationCategory[] {
  const categories: ClassificationCategory[] = [];

  for (const group of dimension.groups ?? []) {
    const members = group.members.filter((memberId) => orderById.has(memberId) && !!nodePool[memberId]);
    if (members.length === 0) continue;
    categories.push({
      id: group.id,
      label: group.label,
      color: dimension.color,
      dimensionId: dimension.id,
      sectionId: section.id,
      members,
      group,
    });
  }

  return categories;
}

function buildSectionCategories(
  dimension: ViewDimension,
  orderById: Map<string, number>,
  nodePool: Record<string, KnowledgeNode>,
): ClassificationCategory[] {
  return dimension.sections.flatMap((section) => {
    const members = resolveSectionAtoms(section, nodePool)
      .map((atom) => atom.nodeId)
      .filter((memberId) => orderById.has(memberId));

    if (members.length === 0) return [];

    return [{
      id: section.id,
      label: section.title ?? section.layout,
      color: dimension.color,
      dimensionId: dimension.id,
      sectionId: section.id,
      members,
    }];
  });
}

function buildContiguousSegments(
  group: ClassificationCategory,
  orderedAtoms: AtomBinding[],
  orderById: Map<string, number>,
): ClassificationBandSegment[] {
  const positions = [...new Set(group.members
    .map((memberId) => orderById.get(memberId))
    .filter((position): position is number => typeof position === 'number'))]
    .sort((left, right) => left - right);

  if (positions.length === 0) return [];

  const runs: number[][] = [];
  let currentRun: number[] = [];

  for (const position of positions) {
    const previous = currentRun[currentRun.length - 1];
    if (previous === undefined || position === previous + 1) {
      currentRun.push(position);
    } else {
      runs.push(currentRun);
      currentRun = [position];
    }
  }

  if (currentRun.length > 0) runs.push(currentRun);

  return runs.map((run, index) => {
    const start = run[0];
    const memberIds = run.map((position) => orderedAtoms[position].nodeId);

    return {
      id: `${group.id}_${index}`,
      group,
      start,
      span: run.length,
      memberIds,
      atoms: run.map((position) => orderedAtoms[position]),
    };
  });
}

function buildClassificationBandRows(
  dimensions: ViewDimension[],
  orderedAtoms: AtomBinding[],
  nodePool: Record<string, KnowledgeNode>,
): ClassificationBandRow[] {
  const orderById = new Map(orderedAtoms.map((atom, index) => [atom.nodeId, index]));

  return dimensions.flatMap((dimension) => {
    const section = primarySection(dimension);
    if (!section) return [];

    const semanticCategories = buildSemanticCategories(dimension, section, orderById, nodePool);
    const groups = semanticCategories.length > 0
      ? semanticCategories
      : buildSectionCategories(dimension, orderById, nodePool);
    const segments = groups.flatMap((group) => buildContiguousSegments(group, orderedAtoms, orderById));

    return [{
      id: dimension.id,
      dimension,
      section,
      groups,
      segments,
    }];
  });
}

function buildOverallDimensions(
  dimensions: ViewDimension[],
  nodePool: Record<string, KnowledgeNode>,
): OverallDimension[] {
  return dimensions.flatMap((dimension) => {
    const section = primarySection(dimension);
    if (!section) return [];

    const categories = resolveSectionAtoms(section, nodePool).map((atom) => ({
      id: atom.nodeId,
      label: nodePool[atom.nodeId]?.label ?? atom.nodeId,
      color: dimension.color,
      atom,
    }));

    return [{
      id: dimension.id,
      dimension,
      section,
      categories,
    }];
  });
}

function buildClassificationScopes(
  dimensions: ViewDimension[],
  nodePool: Record<string, KnowledgeNode>,
): ClassificationScope[] {
  const scopeOrder: string[] = [];
  const grouped = new Map<string, { meta: ClassificationScopeMeta; dimensions: ViewDimension[] }>();

  for (const dimension of dimensions) {
    const meta = scopeMetaFor(dimension);
    if (!grouped.has(meta.id)) {
      grouped.set(meta.id, { meta, dimensions: [] });
      scopeOrder.push(meta.id);
    }
    grouped.get(meta.id)?.dimensions.push(dimension);
  }

  return scopeOrder.flatMap<ClassificationScope>((scopeId): ClassificationScope[] => {
    const item = grouped.get(scopeId);
    if (!item) return [];

    if (item.meta.target === 'object') {
      return [{
        id: item.meta.id,
        meta: item.meta,
        name: item.meta.name,
        target: item.meta.target,
        targetLabel: item.meta.targetLabel,
        dimensions: item.dimensions,
        overallDimensions: buildOverallDimensions(item.dimensions, nodePool),
        orderedAtoms: [],
        rows: [],
      }];
    }

    const orderedAtoms = buildOrderedAtoms(item.dimensions, nodePool);
    const rows = buildClassificationBandRows(item.dimensions, orderedAtoms, nodePool);

    return [{
      id: item.meta.id,
      meta: item.meta,
      name: item.meta.name,
      target: item.meta.target,
      targetLabel: item.meta.targetLabel,
      dimensions: item.dimensions,
      overallDimensions: [],
      orderedAtoms,
      rows,
    }];
  });
}

function coveredIndexes(row: ClassificationBandRow): Set<number> {
  const indexes = new Set<number>();
  for (const segment of row.segments) {
    for (let offset = 0; offset < segment.span; offset += 1) {
      indexes.add(segment.start + offset);
    }
  }
  return indexes;
}

function findAtomHeaderEditTarget(
  atom: AtomBinding,
  rows: ClassificationBandRow[],
): OrthogonalAtomEditTarget | null {
  for (const row of rows) {
    if (row.section.atoms.some((item) => item.nodeId === atom.nodeId)) {
      return {
        dimensionId: row.dimension.id,
        sectionId: row.section.id,
        nodeId: atom.nodeId,
      };
    }
  }

  return null;
}

export function OrthogonalMatrixView({
  dimensions,
  nodePool,
  selectedNodeId,
  groupSelectedIds,
  onAtomClick,
  onAtomEdit,
  onAtomHeaderEdit,
  onCategoryEdit,
  onAddRow,
  onRenameRow,
  onDeleteRow,
  onToggleGroupAtom,
  registerAtomRect,
}: Props) {
  const scopes = useMemo(
    () => buildClassificationScopes(dimensions, nodePool),
    [dimensions, nodePool],
  );

  if (scopes.length === 0) return null;

  return (
    <section className="dc-band-shell" aria-label="Scoped classification matrix">
      <div className="dc-band-head">
        <div>
          <span className="dc-band-kicker">Scoped Classification Matrix</span>
          <strong>先确定分类对象，再放入对应矩阵</strong>
        </div>
        <div className="dc-band-head-actions">
          <span className="dc-band-summary">
            {scopes.length} scopes / {dimensions.length} standards
          </span>
          <button type="button" className="dc-band-head-action" onClick={() => onAddRow()}>
            + Row
          </button>
        </div>
      </div>

      <div className="dc-scope-list">
        {scopes.map((scope) => (
          <ClassificationScopeView
            key={scope.id}
            scope={scope}
            nodePool={nodePool}
            selectedNodeId={selectedNodeId}
            groupSelectedIds={groupSelectedIds}
            onAtomClick={onAtomClick}
            onAtomEdit={onAtomEdit}
            onAtomHeaderEdit={onAtomHeaderEdit}
            onCategoryEdit={onCategoryEdit}
            onAddRow={onAddRow}
            onRenameRow={onRenameRow}
            onDeleteRow={onDeleteRow}
            onToggleGroupAtom={onToggleGroupAtom}
            registerAtomRect={registerAtomRect}
          />
        ))}
      </div>
    </section>
  );
}

function ClassificationScopeView({
  scope,
  nodePool,
  selectedNodeId,
  groupSelectedIds,
  onAtomClick,
  onAtomEdit,
  onAtomHeaderEdit,
  onCategoryEdit,
  onAddRow,
  onRenameRow,
  onDeleteRow,
  onToggleGroupAtom,
  registerAtomRect,
}: {
  scope: ClassificationScope;
  nodePool: Record<string, KnowledgeNode>;
  selectedNodeId: string | null;
  groupSelectedIds: Set<string>;
  onAtomClick: (nodeId: string) => void;
  onAtomEdit: (target: OrthogonalAtomEditTarget) => void;
  onAtomHeaderEdit: (target: OrthogonalAtomEditTarget) => void;
  onCategoryEdit: (target: OrthogonalCategoryEditTarget) => void;
  onAddRow: (scope?: ClassificationScopeMeta) => void;
  onRenameRow: (dimensionId: string) => void;
  onDeleteRow: (dimensionId: string) => void;
  onToggleGroupAtom: (nodeId: string) => void;
  registerAtomRect: RegisterAtomRect;
}) {
  return (
    <section className="dc-scope-shell" data-scope-target={scope.target}>
      <div className="dc-scope-head">
        <div>
          <span className="dc-band-kicker">作用域</span>
          <strong>{scope.name}</strong>
        </div>
        <div className="dc-scope-head-actions">
          {scope.targetLabel && <span className="dc-scope-target">分类对象: {scope.targetLabel}</span>}
          <button
            type="button"
            className="dc-band-head-action"
            onClick={() => onAddRow(scope.meta)}
          >
            + Row
          </button>
        </div>
      </div>

      {scope.target === 'object' ? (
        <OverallScopeView
          scope={scope}
          selectedNodeId={selectedNodeId}
          onAtomClick={onAtomClick}
          onAtomEdit={onAtomEdit}
          onCategoryEdit={onCategoryEdit}
          onRenameRow={onRenameRow}
          onDeleteRow={onDeleteRow}
        />
      ) : (
        <BandScopeView
          scope={scope}
          nodePool={nodePool}
          selectedNodeId={selectedNodeId}
          groupSelectedIds={groupSelectedIds}
          onAtomClick={onAtomClick}
          onAtomEdit={onAtomEdit}
          onAtomHeaderEdit={onAtomHeaderEdit}
          onCategoryEdit={onCategoryEdit}
          onRenameRow={onRenameRow}
          onDeleteRow={onDeleteRow}
          onToggleGroupAtom={onToggleGroupAtom}
          registerAtomRect={registerAtomRect}
        />
      )}
    </section>
  );
}

function OverallScopeView({
  scope,
  selectedNodeId,
  onAtomClick,
  onAtomEdit,
  onCategoryEdit,
  onRenameRow,
  onDeleteRow,
}: {
  scope: ClassificationScope;
  selectedNodeId: string | null;
  onAtomClick: (nodeId: string) => void;
  onAtomEdit: (target: OrthogonalAtomEditTarget) => void;
  onCategoryEdit: (target: OrthogonalCategoryEditTarget) => void;
  onRenameRow: (dimensionId: string) => void;
  onDeleteRow: (dimensionId: string) => void;
}) {
  return (
    <div className="dc-scope-overall-categories">
      {scope.overallDimensions.map((item) => (
        <div key={item.id} className="dc-scope-overall-row" style={{ '--band-color': item.dimension.color } as any}>
          <div className="dc-band-row-head">
            <div className="dc-band-row-title">
              <strong>{item.dimension.name}</strong>
              <span>{item.categories.length} categories</span>
            </div>
            <div className="dc-band-row-actions">
              <button type="button" onClick={() => onRenameRow(item.dimension.id)}>
                Rename
              </button>
              <button
                type="button"
                onClick={() => onAtomEdit({
                  dimensionId: item.dimension.id,
                  sectionId: item.section.id,
                })}
              >
                Add category
              </button>
              <button type="button" className="is-danger" onClick={() => onDeleteRow(item.dimension.id)}>
                Delete
              </button>
            </div>
          </div>
          <div className="dc-scope-overall-chip-list">
            {item.categories.map((category) => (
              <button
                key={category.id}
                type="button"
                className={`dc-scope-overall-chip${selectedNodeId === category.atom.nodeId ? ' is-selected' : ''}`}
                style={{ '--band-color': category.color } as any}
                onClick={() => onAtomClick(category.atom.nodeId)}
              >
                <span>{category.label}</span>
              </button>
            ))}
            <button
              type="button"
              className="dc-scope-overall-chip dc-scope-overall-chip--add"
              onClick={() => onAtomEdit({
                dimensionId: item.dimension.id,
                sectionId: item.section.id,
              })}
            >
              Add
            </button>
            <button
              type="button"
              className="dc-scope-overall-edit"
              onClick={() => onCategoryEdit({
                dimensionId: item.dimension.id,
                sectionId: item.section.id,
                label: item.section.title ?? item.dimension.name,
              })}
            >
              Rename category row
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

function BandScopeView({
  scope,
  nodePool,
  selectedNodeId,
  groupSelectedIds,
  onAtomClick,
  onAtomEdit,
  onAtomHeaderEdit,
  onCategoryEdit,
  onRenameRow,
  onDeleteRow,
  onToggleGroupAtom,
  registerAtomRect,
}: {
  scope: ClassificationScope;
  nodePool: Record<string, KnowledgeNode>;
  selectedNodeId: string | null;
  groupSelectedIds: Set<string>;
  onAtomClick: (nodeId: string) => void;
  onAtomEdit: (target: OrthogonalAtomEditTarget) => void;
  onAtomHeaderEdit: (target: OrthogonalAtomEditTarget) => void;
  onCategoryEdit: (target: OrthogonalCategoryEditTarget) => void;
  onRenameRow: (dimensionId: string) => void;
  onDeleteRow: (dimensionId: string) => void;
  onToggleGroupAtom: (nodeId: string) => void;
  registerAtomRect: RegisterAtomRect;
}) {
  const hasAtomColumns = scope.orderedAtoms.length > 0;
  const gridStyle = {
    '--band-column-count': Math.max(scope.orderedAtoms.length, 1),
  } as any;

  const openBandEditor = (
    row: ClassificationBandRow,
    segment: ClassificationBandSegment,
    nodeId?: string,
  ) => {
    onAtomEdit({
      dimensionId: row.dimension.id,
      sectionId: segment.group.sectionId,
      nodeId,
      groupId: segment.group.group ? segment.group.id : undefined,
    });
  };

  const openSlotEditor = (row: ClassificationBandRow, atom: AtomBinding) => {
    onAtomEdit({
      dimensionId: row.dimension.id,
      sectionId: row.section.id,
      nodeId: atom.nodeId,
    });
  };

  const openRowAtomEditor = (row: ClassificationBandRow) => {
    onAtomEdit({
      dimensionId: row.dimension.id,
      sectionId: row.section.id,
    });
  };

  return (
    <div className="dc-band-scroll">
      <div className="dc-band-grid" style={gridStyle}>
        <div className="dc-band-corner">分类标准 / 元知识</div>
        {scope.orderedAtoms.map((atom) => (
          <BandAtomHeader
            key={atom.nodeId}
            atom={atom}
            node={nodePool[atom.nodeId]}
            selected={selectedNodeId === atom.nodeId}
            groupSelected={groupSelectedIds.has(atom.nodeId)}
            onAtomClick={onAtomClick}
            onAtomHeaderEdit={onAtomHeaderEdit}
            editTarget={findAtomHeaderEditTarget(atom, scope.rows)}
            onToggleGroupAtom={onToggleGroupAtom}
            registerAtomRect={registerAtomRect}
          />
        ))}
        {!hasAtomColumns && (
          <div className="dc-band-atom-wrap dc-band-atom-wrap--empty" aria-label="No atoms in this scope" />
        )}

        {scope.rows.map((row) => {
          const covered = coveredIndexes(row);
          return (
            <div key={row.id} className="dc-band-row">
              <div
                className="dc-band-row-head"
                style={{ '--band-color': row.dimension.color } as any}
              >
                <div className="dc-band-row-title">
                  <strong>{row.dimension.name}</strong>
                  <span>{row.groups.length} categories</span>
                </div>
                <div className="dc-band-row-actions">
                  <button type="button" onClick={() => onRenameRow(row.dimension.id)}>
                    Rename
                  </button>
                  <button type="button" onClick={() => openRowAtomEditor(row)}>
                    Add atom
                  </button>
                  <button type="button" className="is-danger" onClick={() => onDeleteRow(row.dimension.id)}>
                    Delete
                  </button>
                </div>
              </div>
              <div className="dc-band-track" style={gridStyle}>
                {hasAtomColumns ? (
                  scope.orderedAtoms.map((atom, index) => (
                    <button
                      key={`${row.id}_${atom.nodeId}`}
                      type="button"
                      className={`dc-band-slot${covered.has(index) ? ' is-covered' : ''}`}
                      style={{ gridColumn: `${index + 1}` }}
                      onClick={() => openSlotEditor(row, atom)}
                      title={`Bind ${nodePool[atom.nodeId]?.label ?? atom.nodeId} in ${row.dimension.name}`}
                    >
                      {!covered.has(index) && <span className="dc-band-slot-label">Bind</span>}
                    </button>
                  ))
                ) : (
                  <button
                    type="button"
                    className="dc-band-slot dc-band-slot--empty"
                    onClick={() => openRowAtomEditor(row)}
                  >
                    <span className="dc-band-slot-label">Add atom</span>
                  </button>
                )}
                {row.segments.map((segment) => (
                  <ClassificationBandBlock
                    key={segment.id}
                    row={row}
                    segment={segment}
                    nodePool={nodePool}
                    selected={segment.memberIds.some((memberId) => memberId === selectedNodeId)}
                    groupSelected={segment.memberIds.some((memberId) => groupSelectedIds.has(memberId))}
                    onAtomClick={onAtomClick}
                    onEdit={(nodeId) => openBandEditor(row, segment, nodeId)}
                    onCategoryEdit={onCategoryEdit}
                    onAdd={() => openBandEditor(row, segment)}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function BandAtomHeader({
  atom,
  node,
  selected,
  groupSelected,
  onAtomClick,
  onAtomHeaderEdit,
  editTarget,
  onToggleGroupAtom,
  registerAtomRect,
}: {
  atom: AtomBinding;
  node: KnowledgeNode | undefined;
  selected: boolean;
  groupSelected: boolean;
  onAtomClick: (nodeId: string) => void;
  onAtomHeaderEdit: (target: OrthogonalAtomEditTarget) => void;
  editTarget: OrthogonalAtomEditTarget | null;
  onToggleGroupAtom: (nodeId: string) => void;
  registerAtomRect: RegisterAtomRect;
}) {
  const ref = useAtomRect<HTMLButtonElement>(atom.nodeId, registerAtomRect);
  const label = node?.label ?? atom.nodeId;

  return (
    <div className={`dc-band-atom-wrap${selected ? ' is-selected' : ''}${groupSelected ? ' is-grouped' : ''}`}>
      <button
        ref={ref}
        type="button"
        className="dc-band-atom-head"
        onClick={() => onAtomClick(atom.nodeId)}
        title={label}
      >
        <span>{label}</span>
      </button>
      {editTarget && (
        <button
          type="button"
          className="dc-band-atom-edit"
          onClick={() => onAtomHeaderEdit(editTarget)}
          title={`Edit ${label} binding`}
        >
          Edit
        </button>
      )}
      <button
        type="button"
        className="dc-band-atom-group"
        onClick={() => onToggleGroupAtom(atom.nodeId)}
        title={groupSelected ? 'Remove from pending group' : 'Add to pending group'}
      >
        {groupSelected ? '-' : '+'}
      </button>
    </div>
  );
}

function ClassificationBandBlock({
  row,
  segment,
  nodePool,
  selected,
  groupSelected,
  onAtomClick,
  onEdit,
  onCategoryEdit,
  onAdd,
}: {
  row: ClassificationBandRow;
  segment: ClassificationBandSegment;
  nodePool: Record<string, KnowledgeNode>;
  selected: boolean;
  groupSelected: boolean;
  onAtomClick: (nodeId: string) => void;
  onEdit: (nodeId?: string) => void;
  onCategoryEdit: (target: OrthogonalCategoryEditTarget) => void;
  onAdd: () => void;
}) {
  const firstAtom = segment.atoms[0];
  const memberLabels = segment.memberIds
    .map((memberId) => nodePool[memberId]?.label ?? memberId)
    .join(', ');

  return (
    <div
      className={`dc-band-block${selected ? ' is-selected' : ''}${groupSelected ? ' is-grouped' : ''}`}
      style={{
        '--band-color': segment.group.color,
        gridColumn: `${segment.start + 1} / span ${segment.span}`,
      } as any}
      title={`${segment.group.label}: ${memberLabels}`}
    >
      <button
        type="button"
        className="dc-band-block-main"
        onClick={() => onEdit(firstAtom?.nodeId)}
      >
        <span>{segment.group.label}</span>
        <small>{segment.span} atoms</small>
      </button>
      <div className="dc-band-block-actions">
        <button type="button" onClick={() => firstAtom && onAtomClick(firstAtom.nodeId)}>Open</button>
        <button
          type="button"
          onClick={() => onCategoryEdit({
            dimensionId: row.dimension.id,
            sectionId: segment.group.sectionId,
            groupId: segment.group.group ? segment.group.id : undefined,
            label: segment.group.label,
          })}
        >
          Rename
        </button>
        <button type="button" onClick={() => onEdit(firstAtom?.nodeId)}>Bind</button>
        <button type="button" onClick={onAdd}>+</button>
      </div>
      <span className="dc-band-block-standard">{row.dimension.name}</span>
    </div>
  );
}
