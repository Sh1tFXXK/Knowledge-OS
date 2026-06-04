import { useState, useMemo, useCallback, useRef, CSSProperties } from 'react';
import { useGraphStore } from '../store/useGraph';
import { BUILTIN_DIMENSIONS } from '../knowledge/defaults';
import { resolvePoolIdFromTreeNode } from '../knowledge/treeSelection';
import { countTreeNodes } from '../knowledge/treeUtils';
import type { TreeNode } from '../types';

type AddKind = 'folder' | 'knowledge' | 'link';

/* ---- Context Menu ---- */
function ContextMenu({
  x, y, nodeId, hasChildren, onClose,
  onAdd, onRename, onDelete,
}: {
  x: number; y: number; nodeId: string; hasChildren: boolean;
  onClose: () => void;
  onAdd: () => void; onRename: () => void; onDelete: () => void;
}) {
  return (
    <div
      style={{
        position: 'fixed', left: x, top: y, zIndex: 10000,
        background: 'var(--bg-card, #141e3a)', border: '1px solid rgba(120,160,255,0.3)',
        borderRadius: 8, padding: '4px 0', minWidth: 140,
        boxShadow: '0 8px 30px rgba(0,0,0,0.5)', fontSize: 12,
      }}
      onClick={(e) => e.stopPropagation()}
    >
      <div style={{ padding: '6px 14px', cursor: 'pointer', color: '#dfe7f5' }}
        onClick={() => { onAdd(); onClose(); }}>
        ＋ 新建子节点
      </div>
      <div style={{ padding: '6px 14px', cursor: 'pointer', color: '#dfe7f5' }}
        onClick={() => { onRename(); onClose(); }}>
        ✎ 重命名
      </div>
      {!hasChildren && (
        <div style={{ padding: '6px 14px', cursor: 'pointer', color: '#ef4444' }}
          onClick={() => { onDelete(); onClose(); }}>
          ✕ 删除
        </div>
      )}
    </div>
  );
}

/* ---- Recursive Tree Item ---- */
const TreeItem = ({
  node,
  level = 0,
  selectedNodeId,
  onSelect,
  searchQuery,
  onAddChild,
  onRename,
  onDelete,
}: {
  node: TreeNode;
  level?: number;
  selectedNodeId: string | null;
  onSelect: (treeId: string) => void;
  searchQuery: string;
  onAddChild: (parentId: string) => void;
  onRename: (nodeId: string) => void;
  onDelete: (nodeId: string) => void;
}) => {
  const [isOpen, setIsOpen] = useState(level < 5);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);
  const [editing, setEditing] = useState(false);
  const [editValue, setEditValue] = useState(node.name);
  const hasChildren = !!(node.children && node.children.length > 0);
  const poolId = resolvePoolIdFromTreeNode(node);
  const isKnowledgeLeaf = !!poolId;
  const isSelected = poolId === selectedNodeId;
  const isSearchMatch = !!(searchQuery && node.name.toLowerCase().includes(searchQuery.toLowerCase()));

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({ x: e.clientX, y: e.clientY });
  };

  const handleRename = useCallback(() => {
    setEditing(true);
    setEditValue(node.name);
  }, [node.name]);

  const submitRename = () => {
    if (editValue.trim() && editValue.trim() !== node.name) {
      onRename(node.id);
      // Actual rename done via store
      useGraphStore.getState().renameTreeNode(node.id, editValue.trim());
    }
    setEditing(false);
  };

  return (
    <div className="tree-node">
      <div
        className={['tree-node-row', isSelected ? 'active' : '', isSearchMatch ? 'search-match' : ''].filter(Boolean).join(' ')}
        style={{ '--depth': level } as CSSProperties}
        onClick={() => { if (hasChildren) setIsOpen(!isOpen); onSelect(node.id); }}
        onContextMenu={handleContextMenu}
      >
        <span className={`tree-node-toggle ${hasChildren ? (isOpen ? 'expanded' : '') : 'empty'}`}>▶</span>
        <span className="tree-node-icon">{node.icon}</span>
        {editing ? (
          <input
            className="input"
            value={editValue}
            onChange={e => setEditValue(e.target.value)}
            onBlur={submitRename}
            onKeyDown={e => { if (e.key === 'Enter') submitRename(); if (e.key === 'Escape') setEditing(false); }}
            autoFocus
            style={{ flex: 1, fontSize: 11, padding: '1px 4px', height: 18 }}
            onClick={e => e.stopPropagation()}
          />
        ) : (
          <span className="tree-node-label">
            {node.name}
            {isKnowledgeLeaf && (
              <span className="tree-node-ref" title="引用节点池"> ·⛓</span>
            )}
          </span>
        )}
        {node.count != null && <span className="tree-node-count">{node.count}</span>}
      </div>

      {hasChildren && (
        <div className={`tree-node-children${isOpen ? '' : ' collapsed'}`}>
          {node.children!.map(child => (
            <TreeItem key={child.id} node={child} level={level + 1}
              selectedNodeId={selectedNodeId} onSelect={onSelect}
              searchQuery={searchQuery} onAddChild={onAddChild}
              onRename={onRename} onDelete={onDelete} />
          ))}
        </div>
      )}

      {contextMenu && (
        <>
          <div style={{ position: 'fixed', inset: 0, zIndex: 9999 }} onClick={() => setContextMenu(null)} />
          <ContextMenu x={contextMenu.x} y={contextMenu.y} nodeId={node.id}
            hasChildren={hasChildren}
            onClose={() => setContextMenu(null)}
            onAdd={() => onAddChild(node.id)}
            onRename={handleRename}
            onDelete={() => onDelete(node.id)}
          />
        </>
      )}
    </div>
  );
};

/* ---- Main Component ---- */
export default function UniverseTree() {
  const treeData = useGraphStore(s => s.treeData);
  const selectedNodeId = useGraphStore(s => s.selectedNodeId);
  const selectTreeEntry = useGraphStore(s => s.selectTreeEntry);
  const addNotification = useGraphStore(s => s.addNotification);
  const setCurrentPerspective = useGraphStore(s => s.setCurrentPerspective);
  const currentPerspective = useGraphStore(s => s.currentPerspective);
  const addTreeFolder = useGraphStore(s => s.addTreeFolder);
  const addTreeRef = useGraphStore(s => s.addTreeRef);
  const createKnowledgeAndLink = useGraphStore(s => s.createKnowledgeAndLink);
  const listKnowledgeNodes = useGraphStore(s => s.listKnowledgeNodes);
  const removeTreeNode = useGraphStore(s => s.removeTreeNode);
  const exportKnowledgeJson = useGraphStore(s => s.exportKnowledgeJson);
  const importKnowledgeJson = useGraphStore(s => s.importKnowledgeJson);
  const resetAllKnowledge = useGraphStore(s => s.resetAllKnowledge);
  const loadDemoData = useGraphStore(s => s.loadDemoData);
  const perspectives = useGraphStore(s => s.perspectives);
  const dimensionLenses = perspectives.length > 0 ? perspectives : BUILTIN_DIMENSIONS;

  const [search, setSearch] = useState('');
  const [showPerspectives, setShowPerspectives] = useState(false);
  const [showTreeTools, setShowTreeTools] = useState(false);
  const [showAddRoot, setShowAddRoot] = useState(false);
  const [newRootName, setNewRootName] = useState('');
  const [modal, setModal] = useState<{ type: 'add' | 'delete'; targetId: string; targetName: string } | null>(null);
  const [modalInput, setModalInput] = useState('');
  const [addKind, setAddKind] = useState<AddKind>('folder');
  const [linkKnowledgeId, setLinkKnowledgeId] = useState('');
  const poolNodes = listKnowledgeNodes();
  const importInputRef = useRef<HTMLInputElement>(null);

  const handleExport = () => {
    const json = exportKnowledgeJson();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `knowledge-os-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    addNotification('已导出 JSON', 'success');
  };

  const handleImportFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      const ok = importKnowledgeJson(String(reader.result ?? ''));
      addNotification(ok ? '导入成功' : 'JSON 格式无效', ok ? 'success' : 'error');
    };
    reader.readAsText(file);
  };

  const filteredTree = useMemo(() => {
    if (!search.trim()) return treeData;
    const q = search.toLowerCase();
    const filterNode = (n: TreeNode): TreeNode | null => {
      const nameMatch = n.name.toLowerCase().includes(q);
      const filteredChildren = n.children
        ? (n.children.map(filterNode).filter(Boolean) as TreeNode[])
        : [];
      if (nameMatch || filteredChildren.length > 0) {
        return { ...n, children: filteredChildren.length > 0 ? filteredChildren : n.children };
      }
      return null;
    };
    return filterNode(treeData) || treeData;
  }, [search, treeData]);

  const handleSelect = (treeId: string) => {
    selectTreeEntry(treeId);
  };

  const handleAddChild = (parentId: string) => {
    const parent = findNodeName(treeData, parentId);
    setModal({ type: 'add', targetId: parentId, targetName: parent });
    setModalInput('');
    setAddKind('folder');
    setLinkKnowledgeId(poolNodes[0]?.id ?? '');
  };

  const handleRename = (_nodeId: string) => {};

  const handleDelete = (nodeId: string) => {
    const node = findNodeName(treeData, nodeId);
    setModal({ type: 'delete', targetId: nodeId, targetName: node });
  };

  const confirmModal = () => {
    if (!modal) return;
    if (modal.type === 'add' && modalInput.trim()) {
      const name = modalInput.trim();
      if (addKind === 'folder') {
        addTreeFolder(modal.targetId, name);
        addNotification(`已添加文件夹: ${name}`, 'success');
      } else if (addKind === 'knowledge') {
        createKnowledgeAndLink(modal.targetId, name);
        addNotification(`已创建知识并引用: ${name}`, 'success');
      } else if (addKind === 'link' && linkKnowledgeId) {
        addTreeRef(modal.targetId, name, linkKnowledgeId);
        addNotification(`已引用节点池: ${name}`, 'success');
      }
    } else if (modal.type === 'delete') {
      removeTreeNode(modal.targetId);
      addNotification(`已删除: ${modal.targetName}`, 'warning');
    }
    setModal(null);
    setModalInput('');
  };

  const submitRootNode = () => {
    if (newRootName.trim()) {
      addTreeFolder(treeData.id, newRootName.trim());
      addNotification(`已添加分类: ${newRootName.trim()}`, 'success');
      setNewRootName('');
      setShowAddRoot(false);
    }
  };

  return (
    <>
      <div className="left-panel-header">
        <h3><span>📂</span><span>目录</span></h3>
        <span className="count">{countTreeNodes(treeData)}</span>
        <button
          type="button"
          className="btn btn-sm tree-tools-btn"
          onClick={() => setShowTreeTools((v) => !v)}
          title="工具"
        >
          ⋯
        </button>
      </div>

      {showTreeTools && (
        <div className="tree-tools-bar">
          <button type="button" className="btn btn-sm" onClick={() => setShowAddRoot(!showAddRoot)}>＋</button>
          <button type="button" className="btn btn-sm" onClick={() => {
            if (window.confirm('加载演示数据将覆盖当前内容？')) loadDemoData();
          }}>演示</button>
          <button type="button" className="btn btn-sm" onClick={handleExport}>导出</button>
          <button type="button" className="btn btn-sm" onClick={() => importInputRef.current?.click()}>导入</button>
          <button type="button" className="btn btn-sm" style={{ color: '#ef4444' }} onClick={() => {
            if (window.confirm('清空全部数据？')) resetAllKnowledge();
          }}>清空</button>
          <input ref={importInputRef} type="file" accept=".json,application/json" hidden
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleImportFile(file);
              e.target.value = '';
            }} />
        </div>
      )}

      {showAddRoot && (
        <div style={{ display: 'flex', gap: 4, padding: '4px 8px' }}>
          <input className="input" value={newRootName} onChange={e => setNewRootName(e.target.value)}
            placeholder="新分类名称..." style={{ flex: 1, fontSize: 11 }}
            onKeyDown={e => { if (e.key === 'Enter') submitRootNode(); if (e.key === 'Escape') setShowAddRoot(false); }} />
          <button className="btn btn-primary btn-sm" onClick={submitRootNode}>添加</button>
        </div>
      )}

      <div className="tree-search">
        <div className="tree-search-wrap">
          <span className="tree-search-icon">🔍</span>
          <input className="input" id="tree-search-input" value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="搜索宇宙中的任何知识..." style={{ paddingLeft: 28 }} />
        </div>
      </div>

      <div className="tree-container" id="tree-container">
        <TreeItem node={filteredTree} level={0}
          selectedNodeId={selectedNodeId} onSelect={handleSelect}
          searchQuery={search} onAddChild={handleAddChild}
          onRename={handleRename} onDelete={handleDelete} />
      </div>

      <div className="perspectives-section perspectives-section--enhanced">
        <div className="perspectives-header">
          <span className="perspectives-label">🔮 多维视图 (Perspectives)</span>
        </div>
        <div className="perspectives-grid">
          {dimensionLenses.map((p) => {
            const isActive = currentPerspective?.id === p.id;
            return (
              <button
                key={p.id}
                className={`perspective-orb${isActive ? ' active' : ''}`}
                onClick={() => setCurrentPerspective(isActive ? null : p)}
                style={{
                  '--orb-color': p.color,
                } as React.CSSProperties}
                title={`${p.name} (${p.nameEn})${(p as any).description ? '\n' + (p as any).description : ''}`}
              >
                <span className="orb-label">{p.name}</span>
              </button>
            );
          })}
        </div>

        {/* 坐标系统显示 */}
        <div className="coordinate-system">
          <div className="coordinate-header">
            <span>📍 当前位置 (You are here)</span>
          </div>
          <div className="coordinate-display">
            <div className="coordinate-item">
              <span className="coord-label">X</span>
              <span className="coord-value">12.38</span>
            </div>
            <div className="coordinate-item">
              <span className="coord-label">Y</span>
              <span className="coord-value">9.46</span>
            </div>
            <div className="coordinate-item">
              <span className="coord-label">Z</span>
              <span className="coord-value">2.57</span>
            </div>
          </div>
        </div>
      </div>

      {/* Custom Modal */}
      {modal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 11000, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.5)' }}
          onClick={() => { setModal(null); setModalInput(''); }}>
          <div style={{
            background: 'var(--bg-card, #141e3a)', border: '1px solid rgba(120,160,255,0.3)', borderRadius: 12,
            padding: 20, minWidth: 320, maxWidth: 420, boxShadow: '0 20px 60px rgba(0,0,0,0.5)'
          }} onClick={e => e.stopPropagation()}>
            <h3 style={{ fontSize: 14, fontWeight: 600, color: '#dfe7f5', marginBottom: 12 }}>
              {modal.type === 'add' ? `新建子节点 → ${modal.targetName}` : `删除确认`}
            </h3>
            {modal.type === 'add' ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {([
                    ['folder', '文件夹'],
                    ['knowledge', '新建知识'],
                    ['link', '引用已有'],
                  ] as const).map(([kind, label]) => (
                    <button
                      key={kind}
                      type="button"
                      className={`btn btn-sm${addKind === kind ? ' btn-primary' : ''}`}
                      onClick={() => setAddKind(kind)}
                    >
                      {label}
                    </button>
                  ))}
                </div>
                <input
                  className="input"
                  value={modalInput}
                  onChange={e => setModalInput(e.target.value)}
                  placeholder={addKind === 'link' ? '目录显示名称' : '名称'}
                  autoFocus
                  onKeyDown={e => {
                    if (e.key === 'Enter') confirmModal();
                    if (e.key === 'Escape') { setModal(null); setModalInput(''); }
                  }}
                />
                {addKind === 'link' && (
                  <select
                    className="input"
                    value={linkKnowledgeId}
                    onChange={e => setLinkKnowledgeId(e.target.value)}
                  >
                    {poolNodes.length === 0 ? (
                      <option value="">节点池为空，请先「新建知识」</option>
                    ) : (
                      poolNodes.map(n => (
                        <option key={n.id} value={n.id}>{n.label} ({n.id})</option>
                      ))
                    )}
                  </select>
                )}
                <p style={{ fontSize: 11, color: '#8a98ba', margin: 0 }}>
                  {addKind === 'folder' && '仅导航分类，不含解释卡。'}
                  {addKind === 'knowledge' && '在节点池创建一份知识，并在此路径添加引用。'}
                  {addKind === 'link' && '同一知识可被多条目录路径引用（多对多）。'}
                </p>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button className="btn btn-primary btn-sm" onClick={confirmModal}>确认</button>
                  <button className="btn btn-sm" onClick={() => { setModal(null); setModalInput(''); }}>取消</button>
                </div>
              </div>
            ) : (              <>
                <p style={{ fontSize: 12, color: '#8a98ba', marginBottom: 16 }}>
                  确定删除 <strong style={{ color: '#ef4444' }}>{modal.targetName}</strong> 及其所有子节点吗？此操作不可撤销。
                </p>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button className="btn btn-sm" style={{ color: '#ef4444', borderColor: '#ef4444' }} onClick={confirmModal}>确认删除</button>
                  <button className="btn btn-primary btn-sm" onClick={() => setModal(null)}>取消</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}

/* ---- Helpers ---- */
function findNodeName(root: TreeNode, id: string): string {
  if (root.id === id) return root.name;
  if (root.children) {
    for (const c of root.children) {
      const found = findNodeName(c, id);
      if (found) return found;
    }
  }
  return id;
}
