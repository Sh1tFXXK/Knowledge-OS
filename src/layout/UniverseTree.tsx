import { useState, useMemo, useRef, useCallback, CSSProperties } from 'react';
import { useGraphStore } from '../store/useGraph';
import { perspectives } from '../data';
import type { TreeNode } from '../types';

const TREE_TO_GRAPH: Record<string, string> = {
  'visibility': 'n-visibility',
  'read-view': 'n-readview',
  'version-chain': 'n-vchain',
  'undo-log': 'n-version',
  'isolation': 'n-isolation',
  'acid': 'n-transaction',
};

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
  const graphId = TREE_TO_GRAPH[node.id] || null;
  const isSelected = graphId === selectedNodeId;
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
          <span className="tree-node-label">{node.name}</span>
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
  const setSelectedNode = useGraphStore(s => s.setSelectedNode);
  const addNotification = useGraphStore(s => s.addNotification);
  const setCurrentPerspective = useGraphStore(s => s.setCurrentPerspective);
  const currentPerspective = useGraphStore(s => s.currentPerspective);
  const addChildNode = useGraphStore(s => s.addChildNode);
  const removeTreeNode = useGraphStore(s => s.removeTreeNode);
  const renameTreeNode = useGraphStore(s => s.renameTreeNode);

  const [search, setSearch] = useState('');
  const [showAddRoot, setShowAddRoot] = useState(false);
  const [newRootName, setNewRootName] = useState('');
  const [modal, setModal] = useState<{ type: 'add' | 'delete'; targetId: string; targetName: string } | null>(null);
  const [modalInput, setModalInput] = useState('');

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
    const graphId = TREE_TO_GRAPH[treeId];
    if (graphId) {
      setSelectedNode(graphId);
    }
  };

  const handleAddChild = (parentId: string) => {
    const parent = findNodeName(treeData, parentId);
    setModal({ type: 'add', targetId: parentId, targetName: parent });
    setModalInput('');
  };

  const handleRename = (_nodeId: string) => {};

  const handleDelete = (nodeId: string) => {
    const node = findNodeName(treeData, nodeId);
    setModal({ type: 'delete', targetId: nodeId, targetName: node });
  };

  const confirmModal = () => {
    if (!modal) return;
    if (modal.type === 'add' && modalInput.trim()) {
      addChildNode(modal.targetId, modalInput.trim());
      addNotification(`已添加: ${modalInput.trim()}`, 'success');
    } else if (modal.type === 'delete') {
      removeTreeNode(modal.targetId);
      addNotification(`已删除: ${modal.targetName}`, 'warning');
    }
    setModal(null);
    setModalInput('');
  };

  const submitRootNode = () => {
    if (newRootName.trim()) {
      addChildNode(treeData.id, newRootName.trim());
      addNotification(`已添加根节点: ${newRootName.trim()}`, 'success');
      setNewRootName('');
      setShowAddRoot(false);
    }
  };

  return (
    <>
      <div className="left-panel-header">
        <h3><span>📂</span><span>宇宙目录</span><span className="text-xs text-muted">(Universe Tree)</span></h3>
        <span className="count">{countNodes(treeData)}</span>
        <button className="btn btn-sm" style={{ marginLeft: 8, fontSize: 14, padding: '0 6px' }}
          onClick={() => setShowAddRoot(!showAddRoot)} title="新建根节点">＋</button>
      </div>

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

      <div className="perspectives-section">
        <div className="left-panel-header">
          <h3><span>🔮</span><span>多维投影面</span><span className="text-xs text-muted">(Perspectives)</span></h3>
        </div>
        <div id="perspectives-container">
          {perspectives.map(p => {
            const isActive = currentPerspective?.id === p.id;
            return (
              <div key={p.id} className={`perspective-item${isActive ? ' active' : ''}`}
                onClick={() => { setCurrentPerspective(isActive ? null : p); }}
                style={{ color: isActive ? p.color : undefined }}>
                <span className="perspective-dot" style={{ background: p.color }} />
                <span className="perspective-name">{p.name}</span>
                <span className="perspective-count">{Math.floor(Math.random() * 30 + 5)}</span>
              </div>
            );
          })}
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
              <div style={{ display: 'flex', gap: 8 }}>
                <input className="input" value={modalInput} onChange={e => setModalInput(e.target.value)}
                  placeholder="输入节点名称..." autoFocus style={{ flex: 1 }}
                  onKeyDown={e => { if (e.key === 'Enter') confirmModal(); if (e.key === 'Escape') { setModal(null); setModalInput(''); } }} />
                <button className="btn btn-primary btn-sm" onClick={confirmModal}>确认</button>
                <button className="btn btn-sm" onClick={() => { setModal(null); setModalInput(''); }}>取消</button>
              </div>
            ) : (
              <>
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

function countNodes(node: TreeNode): number {
  let count = 1;
  if (node.children) {
    node.children.forEach(c => { count += countNodes(c); });
  }
  return count;
}
