import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useGraphStore } from '../store/useGraph';
import type {
  AtomAttrValue,
  AtomBinding,
  KnowledgeNode,
  SectionLayout,
  ViewDimension,
  ViewSection,
} from '../types';
import { resolveSectionAtoms } from '../knowledge/projection';
import { SectionRenderer, type AtomRectMap } from './sections/SectionRenderer';
import { GroupOverlay } from './sections/GroupOverlay';

interface Props {
  node: KnowledgeNode;
  viewDimensions: ViewDimension[];
}

interface AtomEditTarget {
  sectionId: string;
  nodeId?: string;
}

const LAYOUT_OPTIONS: SectionLayout[] = ['stack', 'grid', 'tree', 'chain', 'matrix'];
const PALETTE = ['#E58522', '#58B2DC', '#B481BB', '#00AA90', '#F17C67', '#FFB11B', '#86C166'];

function parseAttrValue(value: string): AtomAttrValue {
  const trimmed = value.trim();
  if (trimmed === '') return '';
  const numeric = Number(trimmed);
  return Number.isFinite(numeric) && String(numeric) === trimmed ? numeric : trimmed;
}

function attrsToDraft(attrs: AtomBinding['attrs']): Record<string, string> {
  return Object.fromEntries(
    Object.entries(attrs ?? {}).map(([key, value]) => [key, String(value)]),
  );
}

function draftToAttrs(draft: Record<string, string>): AtomBinding['attrs'] {
  const entries = Object.entries(draft)
    .map(([key, value]) => [key.trim(), parseAttrValue(value)] as const)
    .filter(([key, value]) => key && value !== '');
  return entries.length ? Object.fromEntries(entries) : undefined;
}

export default function DimensionCanvas({ node, viewDimensions }: Props) {
  const nodePool = useGraphStore((s) => s.nodePool);
  const selectedNodeId = useGraphStore((s) => s.selectedNodeId);
  const openCard = useGraphStore((s) => s.openCard);
  const updateKnowledgeViewDimensions = useGraphStore((s) => s.updateKnowledgeViewDimensions);
  const updateKnowledgeNodeLabel = useGraphStore((s) => s.updateKnowledgeNodeLabel);
  const updateKnowledgeTab = useGraphStore((s) => s.updateKnowledgeTab);
  const addKnowledgeNode = useGraphStore((s) => s.addKnowledgeNode);
  const addNotification = useGraphStore((s) => s.addNotification);

  const [dims, setDims] = useState(viewDimensions as ViewDimension[]);
  const [activeDimId, setActiveDimId] = useState(viewDimensions[0]?.id ?? '');
  const [addingDim, setAddingDim] = useState(false);
  const [newDimName, setNewDimName] = useState('');
  const [renamingDimId, setRenamingDimId] = useState(null as string | null);
  const [renameDimName, setRenameDimName] = useState('');
  const [addingSection, setAddingSection] = useState(false);
  const [newSectionTitle, setNewSectionTitle] = useState('');
  const [newSectionLayout, setNewSectionLayout] = useState('grid' as SectionLayout);
  const [editingAtom, setEditingAtom] = useState(null as AtomEditTarget | null);
  const [draftLabel, setDraftLabel] = useState('');
  const [draftDesc, setDraftDesc] = useState('');
  const [draftNodeId, setDraftNodeId] = useState('');
  const [draftSearch, setDraftSearch] = useState('');
  const [draftAttrs, setDraftAttrs] = useState({} as Record<string, string>);
  const [groupSelectedIds, setGroupSelectedIds] = useState(new Set() as Set<string>);
  const [groupLabel, setGroupLabel] = useState('');
  const [groupNodeSearch, setGroupNodeSearch] = useState('');
  const [groupNodeId, setGroupNodeId] = useState('');
  const [atomRects, setAtomRects] = useState(() => new Map() as AtomRectMap);

  const overlayRef = useRef(null) as { current: HTMLDivElement | null };
  const dimsList = dims as ViewDimension[];

  useEffect(() => {
    setDims(viewDimensions);
    setActiveDimId((current: string) =>
      current && viewDimensions.some((dim: ViewDimension) => dim.id === current)
        ? current
        : viewDimensions[0]?.id ?? '',
    );
    setGroupSelectedIds(new Set() as Set<string>);
    setAtomRects(new Map());
  }, [node.id, viewDimensions]);

  const activeDim = dimsList.find((dim) => dim.id === activeDimId) ?? dimsList[0] ?? null;

  const commitDims = (next: ViewDimension[]) => {
    setDims(next);
    updateKnowledgeViewDimensions(node.id, next);
  };

  const handleStartRenameDim = (dim: ViewDimension) => {
    setRenamingDimId(dim.id);
    setRenameDimName(dim.name);
  };

  const handleCommitRenameDim = () => {
    const name = renameDimName.trim();
    if (name && renamingDimId) {
      commitDims(dimsList.map((dim: ViewDimension) =>
        dim.id === renamingDimId ? { ...dim, name } : dim,
      ));
    }
    setRenamingDimId(null);
    setRenameDimName('');
  };

  const updateActiveDim = (updater: (dim: ViewDimension) => ViewDimension) => {
    if (!activeDim) return;
    commitDims(dimsList.map((dim: ViewDimension) => (dim.id === activeDim.id ? updater(dim) : dim)));
  };

  const handleAddDimension = () => {
    const name = newDimName.trim();
    if (!name) return;
    const id = `dim_${Date.now()}`;
    const nextDim: ViewDimension = {
      id,
      name,
      color: PALETTE[dimsList.length % PALETTE.length],
      sections: [
        {
          id: `${id}_main`,
          title: name,
          layout: 'grid',
          atoms: [],
        },
      ],
    };
    const next = [...dimsList, nextDim];
    commitDims(next);
    setActiveDimId(id);
    setNewDimName('');
    setAddingDim(false);
  };

  const handleDeleteDimension = (id: string) => {
    const next = dimsList.filter((dim: ViewDimension) => dim.id !== id);
    commitDims(next);
    if (activeDimId === id) setActiveDimId(next[0]?.id ?? '');
  };

  const handleAddSection = () => {
    if (!activeDim) return;
    const title = newSectionTitle.trim() || newSectionLayout;
    const id = `sec_${Date.now()}`;
    const section: ViewSection = {
      id,
      title,
      layout: newSectionLayout,
      atoms: [],
      config: newSectionLayout === 'matrix'
        ? { columns: [{ key: 'value', label: 'Value' }] }
        : newSectionLayout === 'stack'
          ? { unit: 'B' }
          : undefined,
    };
    updateActiveDim((dim) => ({ ...dim, sections: [...dim.sections, section] }));
    setAddingSection(false);
    setNewSectionTitle('');
    setNewSectionLayout('grid');
  };

  const updateSection = (sectionId: string, patch: Partial<ViewSection>) => {
    updateActiveDim((dim) => ({
      ...dim,
      sections: dim.sections.map((section) =>
        section.id === sectionId ? { ...section, ...patch } : section,
      ),
    }));
  };

  const deleteSection = (sectionId: string) => {
    updateActiveDim((dim) => ({
      ...dim,
      sections: dim.sections.filter((section) => section.id !== sectionId),
      groups: dim.groups?.map((group) => {
        const removed = dim.sections.find((section) => section.id === sectionId)?.atoms.map((atom) => atom.nodeId) ?? [];
        return {
          ...group,
          members: group.members.filter((memberId) => !removed.includes(memberId)),
        };
      }),
    }));
  };

  const handleAtomClick = (nodeId: string) => {
    openCard(selectedNodeId === nodeId ? null : nodeId);
  };

  const startAtomEdit = (sectionId: string, nodeId?: string) => {
    const section = activeDim?.sections.find((item) => item.id === sectionId);
    const existing = nodeId ? section?.atoms.find((atom) => atom.nodeId === nodeId) : undefined;
    const poolNode = nodeId ? nodePool[nodeId] : undefined;
    setEditingAtom({ sectionId, nodeId });
    setDraftNodeId(nodeId ?? '');
    setDraftLabel(poolNode?.label ?? '');
    setDraftSearch(poolNode?.label ?? '');
    setDraftDesc(existing?.desc ?? poolNode?.card.tabs[0]?.content ?? '');
    setDraftAttrs(attrsToDraft(existing?.attrs));
  };

  const saveAtomEdit = () => {
    if (!editingAtom || !activeDim) return;
    const label = draftLabel.trim();
    if (!label) return;

    let nodeId = draftNodeId;
    if (nodeId && nodePool[nodeId]) {
      // Existing pool node: only update the binding, never mutate the global node.
    } else {
      // New node: create it with the typed label and initial def tab.
      nodeId = addKnowledgeNode(label);
      if (!nodeId) return;
      const firstTabId = nodePool[nodeId]?.card.tabs[0]?.id ?? 'def';
      updateKnowledgeTab(nodeId, firstTabId, draftDesc);
    }

    const nextAtom: AtomBinding = {
      nodeId,
      desc: draftDesc.trim() || undefined,
      attrs: draftToAttrs(draftAttrs),
    };

    updateActiveDim((dim) => ({
      ...dim,
      sections: dim.sections.map((section) => {
        if (section.id !== editingAtom.sectionId) return section;
        const existingIndex = section.atoms.findIndex((atom) => atom.nodeId === editingAtom.nodeId);
        if (existingIndex === -1) {
          return { ...section, atoms: [...section.atoms, nextAtom] };
        }
        const atoms = [...section.atoms];
        atoms[existingIndex] = nextAtom;
        return { ...section, atoms };
      }),
    }));

    setEditingAtom(null);
    setDraftNodeId('');
    setDraftLabel('');
    setDraftSearch('');
    setDraftDesc('');
    setDraftAttrs({});
  };

  const removeAtomBinding = () => {
    if (!editingAtom?.nodeId) return;
    updateActiveDim((dim) => ({
      ...dim,
      sections: dim.sections.map((section) =>
        section.id === editingAtom.sectionId
          ? { ...section, atoms: section.atoms.filter((atom) => atom.nodeId !== editingAtom.nodeId) }
          : section,
      ),
      groups: dim.groups?.map((group) => ({
        ...group,
        members: group.members.filter((memberId) => memberId !== editingAtom.nodeId),
      })),
    }));
    setEditingAtom(null);
  };

  const toggleGroupAtom = (nodeId: string) => {
    setGroupSelectedIds((prev: Set<string>) => {
      const next = new Set(prev);
      if (next.has(nodeId)) next.delete(nodeId);
      else next.add(nodeId);
      return next;
    });
  };

  const createGroup = () => {
    if (!activeDim || groupSelectedIds.size === 0) return;
    const label = groupLabel.trim();
    if (!label) return;
    const group = {
      id: `grp_${Date.now()}`,
      label,
      nodeId: groupNodeId || undefined,
      members: [...groupSelectedIds],
    };
    updateActiveDim((dim) => ({ ...dim, groups: [...(dim.groups ?? []), group] }));
    setGroupSelectedIds(new Set() as Set<string>);
    setGroupLabel('');
    setGroupNodeSearch('');
    setGroupNodeId('');
    addNotification('Semantic group created', 'success');
  };

  const registerAtomRect = useCallback((nodeId: string, rect: DOMRect | null) => {
    setAtomRects((prev: AtomRectMap) => {
      const next = new Map(prev);
      if (rect) next.set(nodeId, rect);
      else next.delete(nodeId);
      return next;
    });
  }, []);

  const suggestions = useMemo(() => {
    const query = draftSearch.trim().toLowerCase();
    return (Object.values(nodePool) as KnowledgeNode[])
      .filter((item) => !query || item.label.toLowerCase().includes(query))
      .sort((a, b) => a.label.localeCompare(b.label, 'zh-CN'))
      .slice(0, 10);
  }, [draftSearch, nodePool]);

  const groupSuggestions = useMemo(() => {
    const query = groupNodeSearch.trim().toLowerCase();
    return (Object.values(nodePool) as KnowledgeNode[])
      .filter((item) => !query || item.label.toLowerCase().includes(query))
      .sort((a, b) => a.label.localeCompare(b.label, 'zh-CN'))
      .slice(0, 8);
  }, [groupNodeSearch, nodePool]);

  return (
    <div className="dimension-canvas">
      <div className="dc-head">
        <div className="dc-title-block">
          <span className="dc-node-name">{node.label}</span>
          <span className="dc-hint">Dimensions are ordered section containers.</span>
        </div>
      </div>

      <div className="dc-control-bar">
        <div className="dc-dimbar">
          {dimsList.map((dim: ViewDimension) => (
            <button
              key={dim.id}
              type="button"
              className={`dc-chip ${dim.id === activeDim?.id ? 'on' : ''}`}
              style={dim.id === activeDim?.id ? { background: dim.color, borderColor: dim.color } : {}}
              onClick={() => setActiveDimId(dim.id)}
            >
              <span className="dc-dot" style={{ background: dim.id === activeDim?.id ? '#fff' : dim.color }} />
              <span>{dim.name}</span>
              {dim.id === activeDim?.id && (
                <span
                  className="dc-rename"
                  title="重命名维度"
                  onClick={(event: any) => {
                    event.stopPropagation();
                    handleStartRenameDim(dim);
                  }}
                >
                  ✎
                </span>
              )}
              {dim.id === activeDim?.id && (
                <span
                  className="dc-del"
                  onClick={(event: any) => {
                    event.stopPropagation();
                    handleDeleteDimension(dim.id);
                  }}
                >
                  x
                </span>
              )}
            </button>
          ))}
          <button type="button" className="dc-add-chip" onClick={() => setAddingDim(true)}>+ Dimension</button>
        </div>
      </div>

      {addingDim && (
        <div className="dc-addrow">
          <input className="input" value={newDimName} onChange={(event: any) => setNewDimName(event.target.value)} placeholder="Dimension name" />
          <button type="button" className="btn btn-primary" onClick={handleAddDimension}>Add</button>
          <button type="button" className="btn btn-ghost" onClick={() => setAddingDim(false)}>Cancel</button>
        </div>
      )}

      {renamingDimId && (
        <div className="dc-addrow">
          <input
            className="input"
            value={renameDimName}
            autoFocus
            onChange={(event: any) => setRenameDimName(event.target.value)}
            onKeyDown={(event: any) => { if (event.key === 'Enter') handleCommitRenameDim(); if (event.key === 'Escape') { setRenamingDimId(null); setRenameDimName(''); } }}
            placeholder="维度名称"
          />
          <button type="button" className="btn btn-primary" onClick={handleCommitRenameDim}>Rename</button>
          <button type="button" className="btn btn-ghost" onClick={() => { setRenamingDimId(null); setRenameDimName(''); }}>Cancel</button>
        </div>
      )}

      {activeDim ? (
        <div className="dc-sections-wrap" ref={overlayRef}>
          <div className="dc-dimension-intro">
            <span className="dc-cap-name">{activeDim.name}</span>
            {activeDim.hint && <span className="dc-cap-shape">{activeDim.hint}</span>}
            <button type="button" className="btn btn-sm" onClick={() => setAddingSection(true)}>+ Section</button>
          </div>

          {addingSection && (
            <div className="dc-section-create">
              <input className="input" value={newSectionTitle} onChange={(event: any) => setNewSectionTitle(event.target.value)} placeholder="Section title" />
              <select className="input" value={newSectionLayout} onChange={(event: any) => setNewSectionLayout(event.target.value as SectionLayout)}>
                {LAYOUT_OPTIONS.map((layout) => <option key={layout} value={layout}>{layout}</option>)}
              </select>
              <button type="button" className="btn btn-primary btn-sm" onClick={handleAddSection}>Add section</button>
              <button type="button" className="btn btn-sm" onClick={() => setAddingSection(false)}>Cancel</button>
            </div>
          )}

          {groupSelectedIds.size > 0 && (
            <div className="dc-group-create">
              <span>{groupSelectedIds.size} selected</span>
              <input className="input" value={groupLabel} onChange={(event: any) => setGroupLabel(event.target.value)} placeholder="Group label" />
              <input className="input" value={groupNodeSearch} onChange={(event: any) => setGroupNodeSearch(event.target.value)} placeholder="Optional logic node" />
              {groupNodeSearch && (
                <div className="dc-inline-suggestions">
                  {groupSuggestions.map((item: KnowledgeNode) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        setGroupNodeId(item.id);
                        setGroupNodeSearch(item.label);
                      }}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              )}
              <button type="button" className="btn btn-primary btn-sm" onClick={createGroup}>Create group</button>
              <button type="button" className="btn btn-sm" onClick={() => setGroupSelectedIds(new Set() as Set<string>)}>Clear</button>
            </div>
          )}

          {activeDim.sections.map((section: ViewSection) => {
            const atoms = resolveSectionAtoms(section, nodePool);
            return (
              <section key={section.id} className="dc-section">
                <div className="dc-section-head" style={{ borderColor: activeDim.color }}>
                  <input
                    className="dc-section-title-input"
                    value={section.title ?? ''}
                    placeholder={section.layout}
                    onChange={(event: any) => updateSection(section.id, { title: event.target.value })}
                  />
                  <span className="dc-section-layout">{section.layout}</span>
                  <button type="button" className="dc-section-delete" onClick={() => deleteSection(section.id)}>Delete</button>
                </div>
                <SectionRenderer
                  section={section}
                  atoms={atoms}
                  dimension={activeDim}
                  nodePool={nodePool}
                  selectedNodeId={selectedNodeId}
                  groupSelectedIds={groupSelectedIds}
                  onAtomClick={handleAtomClick}
                  onAtomEdit={startAtomEdit}
                  onToggleGroupAtom={toggleGroupAtom}
                  registerAtomRect={registerAtomRect}
                />
              </section>
            );
          })}

          <GroupOverlay
            groups={activeDim.groups ?? []}
            atomRects={atomRects}
            containerRef={overlayRef}
            onGroupClick={handleAtomClick}
          />
        </div>
      ) : (
        <div className="dc-empty">No dimensions yet.</div>
      )}

      {editingAtom && (
        <div className="dc-child-edit-panel">
          <div className="dc-child-edit-title">{editingAtom.nodeId ? 'Edit projection atom' : 'Bind atom'}</div>
          <input
            className="input"
            value={draftSearch}
            onChange={(event: any) => {
              setDraftSearch(event.target.value);
              setDraftNodeId('');
              setDraftLabel(event.target.value);
            }}
            placeholder="Search node pool or type new atom"
          />
          {draftSearch && (
            <div className="dc-suggestions">
              {suggestions.map((item: KnowledgeNode) => (
                <button
                  key={item.id}
                  type="button"
                  className={`dc-suggestion-item${draftNodeId === item.id ? ' dc-suggestion-item--active' : ''}`}
                  onClick={() => {
                    setDraftNodeId(item.id);
                    setDraftSearch(item.label);
                    setDraftLabel(item.label);
                    setDraftDesc(item.card.tabs[0]?.content ?? '');
                  }}
                >
                  <span>{item.label}</span>
                  <span>{item.role ?? 'plain'}</span>
                </button>
              ))}
            </div>
          )}
          <input
            className="input"
            value={draftLabel}
            onChange={(event: any) => setDraftLabel(event.target.value)}
            placeholder="Atom label"
            disabled={!!(draftNodeId && nodePool[draftNodeId])}
            title={draftNodeId && nodePool[draftNodeId] ? '池节点本体请在解释卡中编辑' : undefined}
          />
          <textarea className="input dc-child-desc-input" value={draftDesc} onChange={(event: any) => setDraftDesc(event.target.value)} rows={2} placeholder="投影特化描述（仅本视图）" />

          {(() => {
            const section = activeDim?.sections.find((item: ViewSection) => item.id === editingAtom.sectionId);
            if (!section) return null;
            if (section.layout === 'stack') {
              return (
                <div className="dc-attrs-grid">
                  <label>Offset <input className="input" value={draftAttrs.offset ?? ''} onChange={(event: any) => setDraftAttrs((prev: Record<string, string>) => ({ ...prev, offset: event.target.value }))} /></label>
                  <label>Size <input className="input" value={draftAttrs.size ?? ''} onChange={(event: any) => setDraftAttrs((prev: Record<string, string>) => ({ ...prev, size: event.target.value }))} /></label>
                </div>
              );
            }
            if (section.layout === 'matrix') {
              const columns = section.config?.columns ?? [];
              return (
                <div className="dc-attrs-grid">
                  {columns.map((column: { key: string; label: string }) => (
                    <label key={column.key}>
                      {column.label}
                      <input className="input" value={draftAttrs[column.key] ?? ''} onChange={(event: any) => setDraftAttrs((prev: Record<string, string>) => ({ ...prev, [column.key]: event.target.value }))} />
                    </label>
                  ))}
                </div>
              );
            }
            return null;
          })()}

          <div className="dc-edit-actions">
            <button type="button" className="btn btn-primary btn-sm" onClick={saveAtomEdit}>Save binding</button>
            {editingAtom.nodeId && <button type="button" className="btn btn-sm dc-btn-danger" onClick={removeAtomBinding}>Remove binding</button>}
            <button type="button" className="btn btn-sm" onClick={() => setEditingAtom(null)}>Cancel</button>
          </div>
        </div>
      )}
    </div>
  );
}
