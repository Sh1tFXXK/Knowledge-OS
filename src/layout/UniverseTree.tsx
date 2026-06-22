import { useState, useMemo, useCallback, useEffect, useRef, CSSProperties } from 'react';
import { useGraphStore } from '../store/useGraph';

import { countTreeNodes } from '../knowledge/treeUtils';
import type { TreeNode } from '../types';

type AddKind = 'knowledge' | 'link';
const TREE_NODE_DRAG_TYPE = 'application/x-knowledge-os-tree-node';

interface UniverseTreeProps {
  isCollapsed: boolean;
  onToggleCollapsed: () => void;
}

/* ---- Context Menu ---- */
function ContextMenu({
  x, y, nodeId, hasChildren, onClose,
  onAdd, onRename, onDelete, onAddQuestion,
  canDelete = true,
}: {
  x: number; y: number; nodeId: string; hasChildren: boolean;
  onClose: () => void;
  onAdd: () => void; onRename: () => void; onDelete: () => void;
  onAddQuestion: () => void;
  canDelete?: boolean;
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
        onClick={() => { onAddQuestion(); onClose(); }}>
        ❓ 添加问题
      </div>
      <div style={{ padding: '6px 14px', cursor: 'pointer', color: '#dfe7f5' }}
        onClick={() => { onRename(); onClose(); }}>
        ✎ 重命名
      </div>
      {canDelete && (
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
  onAddQuestion,
  draggingTreeNodeId,
  dropTargetTreeNodeId,
  onDragStartNode,
  onDragEndNode,
  onDragOverNode,
  onDropNode,
}: {
  node: TreeNode;
  level?: number;
  selectedNodeId: string | null;
  onSelect: (treeId: string) => void;
  searchQuery: string;
  onAddChild: (parentId: string) => void;
  onRename: (nodeId: string) => void;
  onDelete: (nodeId: string, label: string) => void;
  onAddQuestion: (treeNodeId: string, label: string) => void;
  draggingTreeNodeId: string | null;
  dropTargetTreeNodeId: string | null;
  onDragStartNode: (nodeId: string) => void;
  onDragEndNode: () => void;
  onDragOverNode: (nodeId: string) => void;
  onDropNode: (nodeId: string, nextParentId: string) => void;
}) => {
  const [isOpen, setIsOpen] = useState(node.expanded ?? level < 5);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);
  const [editing, setEditing] = useState(false);
  const [editValue, setEditValue] = useState(node.name);
  const hasChildren = !!(node.children && node.children.length > 0);
  const poolId = node.nodeRef;
  const isSelected = poolId === selectedNodeId;
  const isSearchMatch = !!(searchQuery && node.name.toLowerCase().includes(searchQuery.toLowerCase()));
  const isDragging = draggingTreeNodeId === node.id;
  const isDropTarget = dropTargetTreeNodeId === node.id && draggingTreeNodeId !== node.id;
  const canDrag = level > 0 && !editing;

  useEffect(() => {
    if (node.expanded) setIsOpen(true);
  }, [node.expanded]);

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

  const handleDragStart = (e: React.DragEvent<HTMLDivElement>) => {
    if (!canDrag) return;
    e.stopPropagation();
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData(TREE_NODE_DRAG_TYPE, node.id);
    e.dataTransfer.setData('text/plain', node.id);
    onDragStartNode(node.id);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    if (!draggingTreeNodeId || draggingTreeNodeId === node.id) return;
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'move';
    if (hasChildren) setIsOpen(true);
    onDragOverNode(node.id);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    const draggedId = e.dataTransfer.getData(TREE_NODE_DRAG_TYPE) || draggingTreeNodeId;
    if (draggedId) onDropNode(draggedId, node.id);
  };

  return (
    <div className="tree-node">
      <div
        className={[
          'tree-node-row',
          isSelected ? 'active' : '',
          isSearchMatch ? 'search-match' : '',
          isDragging ? 'dragging' : '',
          isDropTarget ? 'drop-target' : '',
        ].filter(Boolean).join(' ')}
        data-tree-node-id={node.id}
        draggable={canDrag}
        style={{ '--depth': level } as CSSProperties}
        onClick={() => { onSelect(node.id); }}
        onContextMenu={handleContextMenu}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onDragEnd={onDragEndNode}
      >
        <span
          className={`tree-node-toggle ${hasChildren ? (isOpen ? 'expanded' : '') : 'empty'}`}
          onClick={(e) => {
            if (hasChildren) {
              e.stopPropagation();
              setIsOpen(!isOpen);
            }
          }}
        >
          ▶
        </span>
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
              onAddQuestion={onAddQuestion}
              onRename={onRename} onDelete={onDelete}
              draggingTreeNodeId={draggingTreeNodeId}
              dropTargetTreeNodeId={dropTargetTreeNodeId}
              onDragStartNode={onDragStartNode}
              onDragEndNode={onDragEndNode}
              onDragOverNode={onDragOverNode}
              onDropNode={onDropNode} />
          ))}
        </div>
      )}

      {contextMenu && (
        <>
          <div style={{ position: 'fixed', inset: 0, zIndex: 9999 }} onClick={() => setContextMenu(null)} />
          <ContextMenu x={contextMenu.x} y={contextMenu.y} nodeId={node.id}
            hasChildren={hasChildren}
            canDelete={level > 0}
            onClose={() => setContextMenu(null)}
            onAdd={() => onAddChild(node.id)}
            onAddQuestion={() => onAddQuestion(node.id, node.name)}
            onRename={handleRename}
            onDelete={() => onDelete(node.id, node.name)}
          />
        </>
      )}
    </div>
  );
};

/* ---- Main Component ---- */
export default function UniverseTree({ isCollapsed, onToggleCollapsed }: UniverseTreeProps) {
  const treeData = useGraphStore(s => s.treeData);
  const selectedNodeId = useGraphStore(s => s.selectedNodeId);
  const selectTreeEntry = useGraphStore(s => s.selectTreeEntry);
  const addNotification = useGraphStore(s => s.addNotification);
  const addQuestion = useGraphStore(s => s.addQuestion);
  const addTreeEntry = useGraphStore(s => s.addTreeEntry);
  const createKnowledgeAndLink = useGraphStore(s => s.createKnowledgeAndLink);
  const listKnowledgeNodes = useGraphStore(s => s.listKnowledgeNodes);
  const removeTreeNode = useGraphStore(s => s.removeTreeNode);
  const moveTreeNode = useGraphStore(s => s.moveTreeNode);
  const exportKnowledgeJson = useGraphStore(s => s.exportKnowledgeJson);
  const importKnowledgeJson = useGraphStore(s => s.importKnowledgeJson);
  const resetAllKnowledge = useGraphStore(s => s.resetAllKnowledge);
  const loadDemoData = useGraphStore(s => s.loadDemoData);

  const [search, setSearch] = useState('');
  const [showPerspectives, setShowPerspectives] = useState(false);
  const [showTreeTools, setShowTreeTools] = useState(false);
  const [showAddRoot, setShowAddRoot] = useState(false);
  const [newRootName, setNewRootName] = useState('');
  const [modal, setModal] = useState<{ type: 'add' | 'delete'; targetId: string; targetName: string } | null>(null);
  const [modalInput, setModalInput] = useState('');
  const [addKind, setAddKind] = useState<AddKind>('knowledge');
  const [linkKnowledgeId, setLinkKnowledgeId] = useState('');
  const [draggingTreeNodeId, setDraggingTreeNodeId] = useState<string | null>(null);
  const [dropTargetTreeNodeId, setDropTargetTreeNodeId] = useState<string | null>(null);
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
    setAddKind('knowledge');
    setLinkKnowledgeId(poolNodes[0]?.id ?? '');
  };

  const handleAddQuestionToNode = (treeNodeId: string, label: string) => {
    const question = prompt(`为「${label}」添加问题：`);
    if (!question?.trim()) return;
    addQuestion(question.trim(), treeNodeId);
    addNotification(`问题已关联到「${label}」`, 'success');
  };

  const handleRename = (_nodeId: string) => { };

  const handleDelete = (nodeId: string, label: string) => {
    setModal({ type: 'delete', targetId: nodeId, targetName: label });
  };

  const handleDragStartNode = useCallback((nodeId: string) => {
    setDraggingTreeNodeId(nodeId);
    setDropTargetTreeNodeId(null);
  }, []);

  const handleDragEndNode = useCallback(() => {
    setDraggingTreeNodeId(null);
    setDropTargetTreeNodeId(null);
  }, []);

  const handleDropNode = useCallback((nodeId: string, nextParentId: string) => {
    const targetName = findNodeName(treeData, nextParentId);
    const moved = moveTreeNode(nodeId, nextParentId);
    setDraggingTreeNodeId(null);
    setDropTargetTreeNodeId(null);

    if (moved) {
      addNotification(`已移动到: ${targetName}`, 'success');
      return;
    }

    addNotification('无法移动到该目录位置', 'warning');
  }, [addNotification, moveTreeNode, treeData]);

  const confirmModal = () => {
    if (!modal) return;
    if (modal.type === 'add' && modalInput.trim()) {
      const name = modalInput.trim();
      if (addKind === 'knowledge') {
        createKnowledgeAndLink(modal.targetId, name);
        addNotification(`已创建知识并引用: ${name}`, 'success');
      } else if (addKind === 'link' && linkKnowledgeId) {
        addTreeEntry(modal.targetId, name, linkKnowledgeId);
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
      createKnowledgeAndLink(treeData.id, newRootName.trim());
      addNotification(`已添加子节点: ${newRootName.trim()}`, 'success');
      setNewRootName('');
      setShowAddRoot(false);
    }
  };

  if (isCollapsed) {
    return (
      <button
        type="button"
        className="left-panel-collapsed-toggle"
        onClick={onToggleCollapsed}
        title="展开目录"
      >
        目
      </button>
    );
  }

  return (
    <>
      <div className="left-panel-header">
        <h3><span>🧬</span><span>节点树</span></h3>
        <span className="count">{countTreeNodes(treeData)}</span>
        <button
          type="button"
          className="btn btn-sm tree-collapse-btn"
          onClick={onToggleCollapsed}
          title="收起目录"
        >
          ‹
        </button>
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
            if (window.confirm('将用内置知识库覆盖当前内容，是否继续？')) loadDemoData();
          }}>重置库</button>
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
            placeholder="新节点名称..." style={{ flex: 1, fontSize: 11 }}
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
          onAddQuestion={handleAddQuestionToNode}
          onRename={handleRename} onDelete={handleDelete}
          draggingTreeNodeId={draggingTreeNodeId}
          dropTargetTreeNodeId={dropTargetTreeNodeId}
          onDragStartNode={handleDragStartNode}
          onDragEndNode={handleDragEndNode}
          onDragOverNode={setDropTargetTreeNodeId}
          onDropNode={handleDropNode} />
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
                  placeholder={addKind === 'link' ? '节点显示名称' : '名称'}
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
                  {addKind === 'knowledge' && '在节点池创建一份知识，并在此路径添加引用。'}
                  {addKind === 'link' && '同一知识可被多条路径引用（多对多）。'}
                </p>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button className="btn btn-primary btn-sm" onClick={confirmModal}>确认</button>
                  <button className="btn btn-sm" onClick={() => { setModal(null); setModalInput(''); }}>取消</button>
                </div>
              </div>
            ) : (<>
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
