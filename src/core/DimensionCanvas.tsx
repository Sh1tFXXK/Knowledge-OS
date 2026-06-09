import { useEffect, useState } from 'react';
import { useGraphStore } from '../store/useGraph';
import type { KnowledgeNode, KnowledgeRole } from '../types';

interface DimChild {
  label: string;
  desc?: string;
  nodeId?: string;
}

interface DimDef {
  id: string;
  name: string;
  color: string;
  hint?: string;
  children?: DimChild[];
}

interface Props {
  node: KnowledgeNode;
  viewDimensions: DimDef[];
}

const EDITABLE_ROLES: KnowledgeRole[] = ['axiom', 'mechanism', 'conclusion', 'subsystem', 'plain'];

export default function DimensionCanvas({ node, viewDimensions }: Props) {
  const nodePool = useGraphStore((s) => s.nodePool);
  const selectedNodeId = useGraphStore((s) => s.selectedNodeId);
  const openCard = useGraphStore((s) => s.openCard);
  const updateKnowledgeNodeLabel = useGraphStore((s) => s.updateKnowledgeNodeLabel);
  const updateKnowledgeNodeMeta = useGraphStore((s) => s.updateKnowledgeNodeMeta);
  const updateKnowledgeTab = useGraphStore((s) => s.updateKnowledgeTab);
  const updateKnowledgeViewDimensions = useGraphStore((s) => s.updateKnowledgeViewDimensions);
  const addKnowledgeNode = useGraphStore((s) => s.addKnowledgeNode);
  const removeKnowledgeNode = useGraphStore((s) => s.removeKnowledgeNode);

  const [activeDim, setActiveDim] = useState(viewDimensions[0]?.id ?? '');
  const [dims, setDims] = useState<DimDef[]>(viewDimensions);
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState('');
  const [hoveredChild, setHoveredChild] = useState<number | null>(null);
  const [editing, setEditing] = useState(false);
  const [draftLabel, setDraftLabel] = useState(node.label);
  const [draftRole, setDraftRole] = useState<KnowledgeRole>(node.role ?? 'mechanism');
  const [draftDimensions, setDraftDimensions] = useState((node.dimensions ?? []).join(', '));
  const [draftDefinition, setDraftDefinition] = useState(node.card.tabs[0]?.content ?? '');
  const [editingDimId, setEditingDimId] = useState<string | null>(null);
  const [draftDimName, setDraftDimName] = useState('');
  const [draftDimHint, setDraftDimHint] = useState('');
  const [editingChild, setEditingChild] = useState<{ dimId: string; index: number } | null>(null);
  const [draftChildLabel, setDraftChildLabel] = useState('');
  const [draftChildDesc, setDraftChildDesc] = useState('');
  const [boundNodeId, setBoundNodeId] = useState<string>('');
  const [bindSearch, setBindSearch] = useState<string>('');
  const [showSuggestions, setShowSuggestions] = useState<boolean>(false);

  // 联动：外部 viewDimensions 变化时同步本地状态
  useEffect(() => {
    setDims(viewDimensions);
    if (!activeDim || !viewDimensions.find((d) => d.id === activeDim)) {
      setActiveDim(viewDimensions[0]?.id ?? '');
    }
  }, [viewDimensions]);

  // 联动：外部 node 变化时同步编辑态
  useEffect(() => {
    setDraftLabel(node.label);
    setDraftRole(node.role ?? 'mechanism');
    setDraftDimensions((node.dimensions ?? []).join(', '));
    setDraftDefinition(node.card.tabs[0]?.content ?? '');
  }, [node]);

  const PALETTE = ['#E58522', '#58B2DC', '#B481BB', '#00AA90', '#F17C67', '#FFB11B', '#86C166'];
  let colorIdx = dims.length;
  const nextColor = () => PALETTE[colorIdx++ % PALETTE.length];

  const cur = dims.find((d) => d.id === activeDim);

  const handleAdd = () => {
    const name = newName.trim();
    if (!name) return;
    const id = 'dim_' + Date.now();
    const newDim: DimDef = { id, name, color: nextColor(), children: [] };
    const next = [...dims, newDim];
    setDims(next);
    updateKnowledgeViewDimensions(node.id, next);
    setActiveDim(id);
    setNewName('');
    setAdding(false);
  };

  const handleDelete = (id: string) => {
    const next = dims.filter((d) => d.id !== id);
    setDims(next);
    updateKnowledgeViewDimensions(node.id, next);
    if (activeDim === id) setActiveDim(next[0]?.id ?? '');
  };

  const handleChildClick = (child: DimChild) => {
    const targetId = child.nodeId ?? resolveNodeIdByLabel(child.label, nodePool);
    if (!targetId || !nodePool[targetId]) return;
    // 仅切换右侧解释卡，不改变中心视图焦点（焦点由左侧目录决定）
    openCard(selectedNodeId === targetId ? null : targetId);
  };

  const startEdit = () => {
    setDraftLabel(node.label);
    setDraftRole(node.role ?? 'mechanism');
    setDraftDimensions((node.dimensions ?? []).join(', '));
    setDraftDefinition(node.card.tabs[0]?.content ?? '');
    setEditing(true);
  };

  const cancelEdit = () => {
    setEditing(false);
  };

  const saveEdit = () => {
    const label = draftLabel.trim();
    if (!label) return;

    updateKnowledgeNodeLabel(node.id, label);
    updateKnowledgeNodeMeta(node.id, {
      role: draftRole,
      dimensions: draftDimensions
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean),
    });

    const firstTabId = node.card.tabs[0]?.id;
    if (firstTabId) {
      updateKnowledgeTab(node.id, firstTabId, draftDefinition);
    }

    setEditing(false);
  };

  const startDimEdit = (dim: DimDef) => {
    setEditingDimId(dim.id);
    setDraftDimName(dim.name);
    setDraftDimHint(dim.hint ?? '');
  };

  const cancelDimEdit = () => {
    setEditingDimId(null);
    setDraftDimName('');
    setDraftDimHint('');
  };

  const saveDimEdit = () => {
    if (!editingDimId) return;
    const name = draftDimName.trim();
    if (!name) return;
    const next = dims.map((dim) =>
      dim.id === editingDimId
        ? { ...dim, name, hint: draftDimHint.trim() || undefined }
        : dim,
    );
    setDims(next);
    updateKnowledgeViewDimensions(node.id, next);
    cancelDimEdit();
  };

  const startChildEdit = (dimId: string, index: number, child: DimChild) => {
    setEditingChild({ dimId, index });
    const isPlaceholder = child.label === '（空）' || child.label === '＋ 新增子项';
    setDraftChildLabel(isPlaceholder ? '' : child.label);
    setDraftChildDesc(isPlaceholder ? '' : (child.desc ?? ''));
    setBoundNodeId(child.nodeId ?? '');

    // 初始化搜索词与下拉态
    const boundNode = child.nodeId ? nodePool[child.nodeId] : null;
    setBindSearch(boundNode ? boundNode.label : '');
    setShowSuggestions(false);
  };

  const cancelChildEdit = () => {
    setEditingChild(null);
    setDraftChildLabel('');
    setDraftChildDesc('');
    setBoundNodeId('');
    setBindSearch('');
    setShowSuggestions(false);
  };

  const saveChildEdit = () => {
    if (!editingChild) return;
    const label = draftChildLabel.trim();
    if (!label) return;
    const desc = draftChildDesc.trim();

    const activeDimDef = dims.find((d) => d.id === editingChild.dimId);
    if (!activeDimDef) return;

    const children = [...(activeDimDef.children ?? [])];
    const existing = children[editingChild.index];

    // 优先使用用户选择绑定的现有节点 ID，如果是空字符串，则表示创建全新独立节点
    let targetNodeId = boundNodeId;

    if (targetNodeId) {
      // 联动节点库：已存在对应节点，更新名称与内容
      updateKnowledgeNodeLabel(targetNodeId, label);
      updateKnowledgeTab(targetNodeId, 'def', desc);
    } else {
      // 联动节点库：若不存在，则在节点库中创建全新节点
      const newId = addKnowledgeNode(label);
      if (newId) {
        targetNodeId = newId;
        updateKnowledgeTab(targetNodeId, 'def', desc);
      }
    }

    if (!targetNodeId) return;

    const next = dims.map((dim) => {
      if (dim.id !== editingChild.dimId) return dim;
      const nextChildren = [...(dim.children ?? [])];
      const updatedChild = {
        label,
        desc: desc || undefined,
        nodeId: targetNodeId,
      };
      if (existing) {
        nextChildren[editingChild.index] = updatedChild;
      } else {
        nextChildren.push(updatedChild);
      }
      return { ...dim, children: nextChildren };
    });

    setDims(next);
    updateKnowledgeViewDimensions(node.id, next);
    cancelChildEdit();
  };

  const deleteChild = () => {
    if (!editingChild) return;
    const activeDimDef = dims.find((d) => d.id === editingChild.dimId);
    if (activeDimDef) {
      const existing = (activeDimDef.children ?? [])[editingChild.index];
      // 联动节点库：级联从节点库中删除该节点，保持数据整洁一致
      if (existing?.nodeId) {
        removeKnowledgeNode(existing.nodeId);
      }
    }

    const next = dims.map((dim) => {
      if (dim.id !== editingChild.dimId) return dim;
      const children = (dim.children ?? []).filter((_, i) => i !== editingChild.index);
      return { ...dim, children };
    });
    setDims(next);
    updateKnowledgeViewDimensions(node.id, next);
    cancelChildEdit();
  };

  return (
    <div className="dimension-canvas">
      <div className="dc-head">
        <div className="dc-title-block">
          <span className="dc-node-name">{node.label}</span>
          <span className="dc-hint">点击子节点查看解释卡</span>
        </div>
        <button type="button" className="dc-edit-action" onClick={startEdit}>
          编辑
        </button>
      </div>

      {editing && (
        <div className="dc-edit-row">
          <input
            className="input dc-edit-input"
            value={draftLabel}
            onChange={(e) => setDraftLabel(e.target.value)}
            placeholder="节点名称"
          />
          <select
            className="input dc-edit-role"
            value={draftRole}
            onChange={(e) => setDraftRole(e.target.value as KnowledgeRole)}
          >
            {EDITABLE_ROLES.map((role) => (
              <option key={role} value={role}>{role}</option>
            ))}
          </select>
          <input
            className="input dc-edit-input"
            value={draftDimensions}
            onChange={(e) => setDraftDimensions(e.target.value)}
            placeholder="维度，用英文逗号分隔"
          />
          <textarea
            className="input dc-edit-textarea"
            value={draftDefinition}
            onChange={(e) => setDraftDefinition(e.target.value)}
            placeholder="核心说明"
            rows={2}
          />
          <div className="dc-edit-actions">
            <button type="button" className="btn btn-primary btn-sm" onClick={saveEdit}>保存</button>
            <button type="button" className="btn btn-sm" onClick={cancelEdit}>取消</button>
          </div>
        </div>
      )}

      <div className="dc-dimbar">
        {dims.map((d) => (
          <div
            key={d.id}
            className={`dc-chip ${d.id === activeDim ? 'on' : ''}`}
            style={d.id === activeDim
              ? { background: d.color, borderColor: d.color }
              : {}}
            onClick={() => setActiveDim(d.id)}
          >
            <span
              className="dc-dot"
              style={{ background: d.id === activeDim ? '#fff' : d.color }}
            />
            <span>{d.name}</span>
            {d.id === activeDim && (
              <>
                <span
                  className="dc-chip-edit"
                  onClick={(e) => { e.stopPropagation(); startDimEdit(d); }}
                >编辑</span>
                <span
                  className="dc-del"
                  onClick={(e) => { e.stopPropagation(); handleDelete(d.id); }}
                >×</span>
              </>
            )}
          </div>
        ))}
        <button
          className="dc-add-chip"
          onClick={() => setAdding(true)}
        >＋ 维度</button>
      </div>

      {editingDimId && (
        <div className="dc-dim-edit-row">
          <input
            className="input dc-edit-input"
            value={draftDimName}
            onChange={(e) => setDraftDimName(e.target.value)}
            placeholder="维度名称"
          />
          <textarea
            className="input dc-dim-hint-input"
            value={draftDimHint}
            onChange={(e) => setDraftDimHint(e.target.value)}
            placeholder="维度说明"
            rows={2}
          />
          <div className="dc-edit-actions">
            <button type="button" className="btn btn-primary btn-sm" onClick={saveDimEdit}>保存维度</button>
            <button type="button" className="btn btn-sm" onClick={cancelDimEdit}>取消</button>
          </div>
        </div>
      )}

      {adding && (
        <div className="dc-addrow">
          <input
            className="input"
            value={newName}
            placeholder="新维度名，如 按加锁阶段"
            maxLength={12}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleAdd();
              if (e.key === 'Escape') { setAdding(false); setNewName(''); }
            }}
            autoFocus
          />
          <button className="btn btn-primary" onClick={handleAdd}>添加</button>
          <button className="btn btn-ghost" onClick={() => { setAdding(false); setNewName(''); }}>取消</button>
        </div>
      )}

      <div className="dc-stage">
        <div className="dc-cap">
          <span className="dc-cap-name">{cur?.name ?? '—'}</span>
          <span className="dc-cap-shape">图形语言：分类树</span>
        </div>
        {cur ? (
          <DimTree
            dim={cur}
            rootLabel={node.label}
            selectedNodeId={selectedNodeId}
            hoveredChild={hoveredChild}
            onHover={setHoveredChild}
            onChildClick={handleChildClick}
            onChildEdit={(index, child) => startChildEdit(cur.id, index, child)}
            nodePool={nodePool}
          />
        ) : (
          <div className="dc-empty">
            该知识点还没有维度，点 ＋ 维度 添加
          </div>
        )}
        {cur?.hint && (
          <div className="dc-hint-bar">{cur.hint}</div>
        )}
        {editingChild && editingChild.dimId === activeDim && (() => {
          const activeDimDef = dims.find(d => d.id === editingChild.dimId);
          const children = activeDimDef?.children ?? [];
          const existing = children[editingChild.index];
          const isEdit = editingChild.index < children.length;

          return (
            <div className="dc-child-edit-panel">
              <div className="dc-child-edit-title">
                {isEdit ? '编辑分类节点' : '添加分类节点'}
              </div>

              {/* 🔗 Existing Node Binding Dropdown */}
              <div
                className="dc-child-bind-row"
                style={{
                  gridColumn: '1 / -1',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '6px',
                  marginBottom: '4px',
                  background: 'rgba(255, 255, 255, 0.02)',
                  padding: '10px',
                  borderRadius: '6px',
                  border: '1px dashed var(--border-secondary)',
                  position: 'relative',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '6px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 600 }}>
                      🔗 搜索并关联目录中的现有知识节点
                    </span>
                    <span style={{ fontSize: '10px', color: 'var(--text-tertiary)' }}>
                      (输入关键字模糊搜索，支持万级节点秒级极速过滤)
                    </span>
                  </div>
                  {boundNodeId ? (
                    <span
                      style={{
                        fontSize: '9px',
                        padding: '2px 6px',
                        borderRadius: '4px',
                        background: 'rgba(229, 133, 34, 0.15)',
                        color: 'var(--primary)',
                        border: '1px solid rgba(229, 133, 34, 0.3)',
                        fontWeight: 600,
                      }}
                    >
                      已关联目录节点: {nodePool[boundNodeId]?.label ?? '已关联'}
                    </span>
                  ) : (
                    <span
                      style={{
                        fontSize: '9px',
                        padding: '2px 6px',
                        borderRadius: '4px',
                        background: 'rgba(255, 255, 255, 0.05)',
                        color: 'var(--text-secondary)',
                        border: '1px solid var(--border-secondary)',
                        fontWeight: 600,
                      }}
                    >
                      创建新独立节点
                    </span>
                  )}
                </div>

                <div style={{ position: 'relative', width: '100%' }}>
                  <input
                    type="text"
                    className="input"
                    style={{
                      fontSize: '12px',
                      height: '28px',
                      padding: '0 28px 0 24px',
                      width: '100%',
                      background: 'var(--bg-card)',
                      color: 'var(--text-primary)',
                      borderColor: 'var(--border-secondary)',
                      borderRadius: '4px',
                      outline: 'none',
                    }}
                    placeholder="🔍 输入名称搜索目录页节点（如：InnoDB Page, Transaction 等）"
                    value={bindSearch}
                    onChange={(e) => {
                      setBindSearch(e.target.value);
                      setShowSuggestions(true);
                    }}
                    onFocus={() => setShowSuggestions(true)}
                  />
                  <span style={{ position: 'absolute', left: '8px', top: '7px', fontSize: '11px', color: 'var(--text-tertiary)' }}>🔍</span>
                  {bindSearch && (
                    <button
                      type="button"
                      style={{
                        position: 'absolute',
                        right: '8px',
                        top: '6px',
                        background: 'none',
                        border: 'none',
                        color: 'var(--text-tertiary)',
                        cursor: 'pointer',
                        fontSize: '12px',
                        padding: '0 4px',
                      }}
                      onClick={() => {
                        setBindSearch('');
                        setBoundNodeId('');
                        setShowSuggestions(true);
                      }}
                    >
                      ×
                    </button>
                  )}
                </div>

                {showSuggestions && (
                  <>
                    <div
                      style={{
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        zIndex: 998,
                      }}
                      onClick={() => setShowSuggestions(false)}
                    />
                    <div
                      style={{
                        position: 'absolute',
                        top: '100%',
                        left: '10px',
                        right: '10px',
                        maxHeight: '180px',
                        overflowY: 'auto',
                        background: 'var(--bg-secondary, #1d1d28)',
                        border: '1px solid var(--border-secondary)',
                        borderRadius: '4px',
                        marginTop: '4px',
                        boxShadow: '0 8px 24px rgba(0,0,0,0.6)',
                        zIndex: 999,
                      }}
                    >
                      {(() => {
                        const query = bindSearch.trim().toLowerCase();
                        const filtered = Object.values(nodePool)
                          .filter((n) => n.id !== node.id) // 不能绑定自己
                          .filter((n) => {
                            if (!query) return true;
                            return n.label.toLowerCase().includes(query);
                          })
                          .sort((a, b) => a.label.localeCompare(b.label, 'zh-CN'))
                          .slice(0, 50); // 截取前 50 项，保证万级节点也拥有极佳的流畅度与性能

                        if (filtered.length === 0) {
                          return (
                            <div style={{ padding: '8px 10px', fontSize: '11px', color: 'var(--text-tertiary)' }}>
                              没有找到匹配的目录节点
                            </div>
                          );
                        }

                        return (
                          <>
                            {!query && (
                              <div
                                style={{
                                  padding: '6px 10px',
                                  fontSize: '10px',
                                  color: 'var(--primary)',
                                  borderBottom: '1px solid var(--border-secondary)',
                                  background: 'rgba(255,255,255,0.01)',
                                  fontWeight: 600,
                                }}
                              >
                                💡 请在上方输入框搜索，或从推荐的前 50 个节点中选择：
                              </div>
                            )}
                            {filtered.map((n) => {
                              const isSelected = n.id === boundNodeId;
                              return (
                                <div
                                  key={n.id}
                                  style={{
                                    padding: '8px 10px',
                                    fontSize: '11px',
                                    cursor: 'pointer',
                                    background: isSelected ? 'rgba(229, 133, 34, 0.12)' : 'transparent',
                                    color: isSelected ? 'var(--primary)' : 'var(--text-primary)',
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    borderBottom: '1px solid rgba(255,255,255,0.02)',
                                    transition: 'background 0.1s ease',
                                  }}
                                  onMouseEnter={(e) => {
                                    if (!isSelected) e.currentTarget.style.background = 'rgba(255,255,255,0.04)';
                                  }}
                                  onMouseLeave={(e) => {
                                    if (!isSelected) e.currentTarget.style.background = 'transparent';
                                  }}
                                  onClick={() => {
                                    setBoundNodeId(n.id);
                                    setBindSearch(n.label);
                                    setDraftChildLabel(n.label);
                                    setDraftChildDesc(n.card.tabs[0]?.content ?? '');
                                    setShowSuggestions(false);
                                  }}
                                >
                                  <span style={{ fontWeight: isSelected ? 600 : 400 }}>
                                    {n.label}
                                  </span>
                                  <span style={{ fontSize: '9px', color: 'var(--text-tertiary)', opacity: 0.8 }}>
                                    {n.role ? `[${n.role}]` : ''}
                                  </span>
                                </div>
                              );
                            })}
                          </>
                        );
                      })()}
                    </div>
                  </>
                )}
              </div>

              <input
                className="input dc-edit-input"
                value={draftChildLabel}
                onChange={(e) => setDraftChildLabel(e.target.value)}
                placeholder="分类节点名称"
              />
              <textarea
                className="input dc-child-desc-input"
                value={draftChildDesc}
                onChange={(e) => setDraftChildDesc(e.target.value)}
                placeholder="分类节点描述"
                rows={2}
              />
              <div className="dc-edit-actions">
                <button type="button" className="btn btn-primary btn-sm" onClick={saveChildEdit}>
                  保存分类节点
                </button>
                {isEdit && (
                  <button
                    type="button"
                    className="btn btn-sm"
                    style={{
                      background: 'rgba(239, 68, 68, 0.15)',
                      color: '#ef4444',
                      borderColor: 'rgba(239, 68, 68, 0.35)',
                      transition: 'all 0.15s ease',
                    }}
                    onClick={deleteChild}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = '#ef4444';
                      e.currentTarget.style.color = '#fff';
                      e.currentTarget.style.borderColor = '#ef4444';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'rgba(239, 68, 68, 0.15)';
                      e.currentTarget.style.color = '#ef4444';
                      e.currentTarget.style.borderColor = 'rgba(239, 68, 68, 0.35)';
                    }}
                  >
                    删除子项
                  </button>
                )}
                <button type="button" className="btn btn-sm" onClick={cancelChildEdit}>
                  取消
                </button>
              </div>
            </div>
          );
        })()}
      </div>
    </div>
  );
}

function resolveNodeIdByLabel(
  label: string,
  nodePool: Record<string, KnowledgeNode>,
): string | null {
  const key = label.split('/')[0].trim();
  for (const [id, kn] of Object.entries(nodePool)) {
    if (kn.label === key || kn.label === label.trim()) return id;
  }
  for (const [id, kn] of Object.entries(nodePool)) {
    if (label.includes(kn.label) || kn.label.includes(key)) return id;
  }
  return null;
}

function DimTree({
  dim,
  rootLabel,
  selectedNodeId,
  hoveredChild,
  onHover,
  onChildClick,
  onChildEdit,
  nodePool,
}: {
  dim: DimDef;
  rootLabel: string;
  selectedNodeId: string | null;
  hoveredChild: number | null;
  onHover: (i: number | null) => void;
  onChildClick: (child: DimChild) => void;
  onChildEdit: (index: number, child: DimChild) => void;
  nodePool: Record<string, KnowledgeNode>;
}) {
  const col = dim.color;
  // 过滤掉 nodeId 指向不存在节点的 children（防御悬空引用）
  const kids: DimChild[] = dim.children?.length
    ? dim.children.filter(c => !c.nodeId || nodePool[c.nodeId])
    : [];
  const isEmpty = kids.length === 0;
  if (isEmpty) {
    kids.push({ label: '（空）', desc: '补充子项' });
  } else {
    kids.push({ label: '＋ 新增子项', desc: '添加新的分类' });
  }
  const n = kids.length;

  const MIN_SLOT = 200;
  const boxW = 156;
  const boxH = 72;
  const W = Math.max(720, n * MIN_SLOT + 80);
  const H = 320;
  const padX = 40;
  const innerW = W - padX * 2;
  const slot = innerW / n;
  const rootX = W / 2;
  const rootY = 56;
  const my = 148;
  const cy = 232;

  return (
    <div className="dc-tree-scroll">
      <svg
        width={W}
        height={H}
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="xMidYMid meet"
        style={{ display: 'block' }}
      >
        <rect
          x={rootX - 58} y={rootY - 22} width={116} height={44}
          rx={9}
          fill={`color-mix(in srgb, ${col} 22%, transparent)`}
          stroke={col} strokeWidth={1.2}
        />
        <text x={rootX} y={rootY + 5} textAnchor="middle"
          fontSize={13} fontWeight={600} fill="currentColor">
          {rootLabel}
        </text>
        <text x={rootX} y={rootY + 38} textAnchor="middle"
          fontSize={10.5} fill={col}>
          {dim.name}
        </text>

        {kids.map((c, i) => {
          const cx = padX + slot * (i + 0.5);
          const isFallback = c.label === '（空）';
          const isAddPlaceholder = c.label === '＋ 新增子项';
          const clickable = !!(c.nodeId || (!isFallback && !isAddPlaceholder));
          const isHover = hoveredChild === i;
          const isSelected = !!(c.nodeId && c.nodeId === selectedNodeId);
          const active = isHover || isSelected;
          return (
            <g
              key={i}
              style={{ cursor: (clickable || isFallback || isAddPlaceholder) ? 'pointer' : 'default' }}
              onMouseEnter={() => onHover(i)}
              onMouseLeave={() => onHover(null)}
              onClick={() => {
                if (isFallback || isAddPlaceholder) {
                  onChildEdit(i, c);
                } else if (clickable) {
                  onChildClick(c);
                }
              }}
            >
              <path
                d={`M${rootX} ${rootY + 22} L${rootX} ${my} L${cx} ${my} L${cx} ${cy - boxH / 2}`}
                fill="none"
                stroke={`color-mix(in srgb, ${col} ${active ? 70 : 45}%, transparent)`}
                strokeWidth={active ? 1.8 : 1.3}
              />
              <rect
                x={cx - boxW / 2} y={cy - boxH / 2} width={boxW} height={boxH}
                rx={9}
                fill={active
                  ? `color-mix(in srgb, ${col} 18%, var(--bg-card, #1d1d28))`
                  : 'var(--bg-card, #1d1d28)'}
                stroke={active ? col : `color-mix(in srgb, ${col} 55%, transparent)`}
                strokeWidth={isSelected ? 2 : active ? 1.8 : 1.2}
                strokeDasharray={(isFallback || isAddPlaceholder) ? "4 3" : undefined}
              />
              <text x={cx} y={cy - (c.desc ? 12 : 2)} textAnchor="middle"
                fontSize={12} fontWeight={600} fill="currentColor">
                {c.label}
              </text>
              {c.desc && (
                <text x={cx} y={cy + 14} textAnchor="middle"
                  fontSize={9.5} fill="var(--text-secondary, rgba(255,255,255,.55))">
                  {c.desc}
                </text>
              )}
              {isAddPlaceholder ? (
                <title>点击添加分类子项</title>
              ) : isFallback ? (
                <title>点击编辑以补充子项</title>
              ) : clickable ? (
                <title>{c.label}{c.desc ? ` — ${c.desc}` : ''}（点击查看解释卡）</title>
              ) : (
                <title>{c.label}{c.desc ? ` — ${c.desc}` : ''}</title>
              )}
              {!isAddPlaceholder && active && (
                <g
                  transform={`translate(${cx + boxW / 2 - 34},${cy - boxH / 2 + 8})`}
                  onClick={(e) => {
                    e.stopPropagation();
                    onChildEdit(i, c);
                  }}
                >
                  <rect width={26} height={16} rx={5} fill={col} fillOpacity={0.92} />
                  <text x={13} y={11} textAnchor="middle" fontSize={9} fill="#fff">编辑</text>
                </g>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
}
