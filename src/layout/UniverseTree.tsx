import { useState, useMemo, useCallback, useEffect, useRef, CSSProperties } from 'react';
import { useGraphStore } from '../store/useGraph';

import { countTreeNodes, findTreeNodeById, findTreeParent } from '../knowledge/treeUtils';
import type { TreeNode } from '../types';

type AddKind = 'knowledge' | 'link';
type DirectoryTransferAction = 'move' | 'copy';
type DirectoryTransferDialogState = {
  action: DirectoryTransferAction;
  sourceIds: string[];
  sourceQuery: string;
  targetQuery: string;
  targetId: string;
};

interface TreeDirectoryOption {
  id: string;
  name: string;
  path: string;
  depth: number;
}

const TREE_NODE_DRAG_TYPE = 'application/x-knowledge-os-tree-node';

interface UniverseTreeProps {
  isCollapsed: boolean;
  onToggleCollapsed: () => void;
}

/* ---- Context Menu ---- */
function ContextMenu({
  x, y, nodeId, hasChildren, onClose,
  onAdd, onRename, onDelete, onAddQuestion, onMove, onCopy,
  canDelete = true, canMove = true, canCopy = true,
}: {
  x: number; y: number; nodeId: string; hasChildren: boolean;
  onClose: () => void;
  onAdd: () => void; onRename: () => void; onDelete: () => void;
  onMove: () => void;
  onCopy: () => void;
  onAddQuestion: () => void;
  canDelete?: boolean; canMove?: boolean; canCopy?: boolean;
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
      {canMove && (
        <div style={{ padding: '6px 14px', cursor: 'pointer', color: '#dfe7f5' }}
          onClick={() => { onMove(); onClose(); }}>
          移动到...
        </div>
      )}
      {canCopy && (
        <div style={{ padding: '6px 14px', cursor: 'pointer', color: '#dfe7f5' }}
          onClick={() => { onCopy(); onClose(); }}>
          复制到...
        </div>
      )}
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
  selectedTreeIds,
  onSelect,
  onToggleSelection,
  searchQuery,
  onAddChild,
  onRename,
  onDelete,
  onMove,
  onCopy,
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
  selectedTreeIds: ReadonlySet<string>;
  onSelect: (treeId: string) => void;
  onToggleSelection: (treeId: string) => void;
  searchQuery: string;
  onAddChild: (parentId: string) => void;
  onRename: (nodeId: string) => void;
  onDelete: (nodeId: string, label: string) => void;
  onMove: (nodeId: string, label: string) => void;
  onCopy: (nodeId: string, label: string) => void;
  onAddQuestion: (treeNodeId: string, label: string) => void;
  draggingTreeNodeId: string | null;
  dropTargetTreeNodeId: string | null;
  onDragStartNode: (nodeId: string) => void;
  onDragEndNode: () => void;
  onDragOverNode: (nodeId: string) => void;
  onDropNode: (nodeId: string, nextParentId: string) => void;
}) => {
  const [isOpen, setIsOpen] = useState(node.expanded ?? level < 5);
  const [openedByDrag, setOpenedByDrag] = useState(false);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);
  const [editing, setEditing] = useState(false);
  const [editValue, setEditValue] = useState(node.name);
  const dragCloseTimerRef = useRef<number | null>(null);
  const hasChildren = !!(node.children && node.children.length > 0);
  const poolId = node.nodeRef;
  const isSelected = poolId === selectedNodeId;
  const isBulkSelected = selectedTreeIds.has(node.id);
  const isSearchMatch = !!(searchQuery && node.name.toLowerCase().includes(searchQuery.toLowerCase()));
  const isDragging = draggingTreeNodeId === node.id;
  const isDropTarget = dropTargetTreeNodeId === node.id && draggingTreeNodeId !== node.id;
  const canDrag = level > 0 && !editing;
  const canBulkSelect = level > 0;

  useEffect(() => {
    if (node.expanded) setIsOpen(true);
  }, [node.expanded]);

  useEffect(() => {
    if (draggingTreeNodeId) return;
    if (dragCloseTimerRef.current !== null) {
      window.clearTimeout(dragCloseTimerRef.current);
      dragCloseTimerRef.current = null;
    }
    if (openedByDrag) {
      setIsOpen(false);
      setOpenedByDrag(false);
    }
  }, [draggingTreeNodeId, openedByDrag]);

  useEffect(() => () => {
    if (dragCloseTimerRef.current !== null) window.clearTimeout(dragCloseTimerRef.current);
  }, []);

  const openForDragFocus = () => {
    if (!hasChildren || isOpen) return;
    setIsOpen(true);
    setOpenedByDrag(true);
  };

  const cancelDragAutoClose = () => {
    if (dragCloseTimerRef.current === null) return;
    window.clearTimeout(dragCloseTimerRef.current);
    dragCloseTimerRef.current = null;
  };

  const scheduleDragAutoClose = () => {
    if (!openedByDrag) return;
    cancelDragAutoClose();
    dragCloseTimerRef.current = window.setTimeout(() => {
      setIsOpen(false);
      setOpenedByDrag(false);
      dragCloseTimerRef.current = null;
    }, 120);
  };

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

  const handleDragEnter = (e: React.DragEvent<HTMLDivElement>) => {
    if (!draggingTreeNodeId || draggingTreeNodeId === node.id) return;
    e.preventDefault();
    e.stopPropagation();
    cancelDragAutoClose();
    openForDragFocus();
    onDragOverNode(node.id);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    if (!draggingTreeNodeId || draggingTreeNodeId === node.id) return;
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'move';
    cancelDragAutoClose();
    openForDragFocus();
    onDragOverNode(node.id);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    if (!draggingTreeNodeId || draggingTreeNodeId === node.id) return;
    if (e.currentTarget.contains(e.relatedTarget as Node | null)) return;
    e.stopPropagation();
    scheduleDragAutoClose();
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    cancelDragAutoClose();
    setOpenedByDrag(false);
    const draggedId = e.dataTransfer.getData(TREE_NODE_DRAG_TYPE) || draggingTreeNodeId;
    if (draggedId) onDropNode(draggedId, node.id);
  };

  return (
    <div
      className="tree-node"
      onDragEnter={handleDragEnter}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <div
        className={[
          'tree-node-row',
          isSelected ? 'active' : '',
          isBulkSelected ? 'bulk-selected' : '',
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
        onDragEnd={onDragEndNode}
      >
        {canBulkSelect && (
          <input
            type="checkbox"
            className="tree-node-select"
            checked={isBulkSelected}
            aria-label={`选择 ${node.name}`}
            onChange={(e) => {
              e.stopPropagation();
              onToggleSelection(node.id);
            }}
            onClick={(e) => e.stopPropagation()}
          />
        )}
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
              selectedNodeId={selectedNodeId}
              selectedTreeIds={selectedTreeIds}
              onSelect={onSelect}
              onToggleSelection={onToggleSelection}
              searchQuery={searchQuery} onAddChild={onAddChild}
              onAddQuestion={onAddQuestion}
              onRename={onRename} onDelete={onDelete} onMove={onMove} onCopy={onCopy}
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
            canMove={level > 0}
            canCopy={level > 0}
            onClose={() => setContextMenu(null)}
            onAdd={() => onAddChild(node.id)}
            onAddQuestion={() => onAddQuestion(node.id, node.name)}
            onRename={handleRename}
            onDelete={() => onDelete(node.id, node.name)}
            onMove={() => onMove(node.id, node.name)}
            onCopy={() => onCopy(node.id, node.name)}
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
  const copyTreeNode = useGraphStore(s => s.copyTreeNode);
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
  const [transferDialog, setTransferDialog] = useState<DirectoryTransferDialogState | null>(null);
  const [selectedTreeNodeIds, setSelectedTreeNodeIds] = useState<Set<string>>(() => new Set());
  const [draggingTreeNodeId, setDraggingTreeNodeId] = useState<string | null>(null);
  const [dropTargetTreeNodeId, setDropTargetTreeNodeId] = useState<string | null>(null);
  const poolNodes = listKnowledgeNodes();
  const importInputRef = useRef<HTMLInputElement>(null);
  const directoryOptions = useMemo(() => collectDirectoryOptions(treeData), [treeData]);

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

  const selectedTreeIds = useMemo(
    () => normalizeSelectedTreeIds(treeData, [...selectedTreeNodeIds]),
    [selectedTreeNodeIds, treeData],
  );
  const selectedTreeIdSet = useMemo(() => new Set(selectedTreeIds), [selectedTreeIds]);
  const selectedTreeCount = selectedTreeIds.length;

  useEffect(() => {
    setSelectedTreeNodeIds((current) => {
      const normalized = normalizeSelectedTreeIds(treeData, [...current]);
      return areSetsEqual(current, normalized) ? current : new Set(normalized);
    });
  }, [treeData]);

  const transferSourceIds = useMemo(
    () => transferDialog ? normalizeSelectedTreeIds(treeData, transferDialog.sourceIds) : [],
    [transferDialog, treeData],
  );
  const transferActionLabel = transferDialog?.action === 'copy' ? '复制' : '移动';

  const transferSourceOptions = useMemo(() => {
    if (!transferDialog) return [];
    return filterDirectoryOptions(
      directoryOptions.filter((option) => option.depth > 0),
      transferDialog.sourceQuery,
    ).slice(0, 60);
  }, [directoryOptions, transferDialog]);

  const transferTargetOptions = useMemo(() => {
    if (!transferDialog || transferSourceIds.length === 0) return [];
    return filterDirectoryOptions(
      directoryOptions.filter((option) =>
        !isInvalidDirectoryTransferTarget(
          treeData,
          transferDialog.action,
          transferSourceIds,
          option.id,
        ),
      ),
      transferDialog.targetQuery,
    ).slice(0, 80);
  }, [directoryOptions, transferDialog, transferSourceIds, treeData]);

  const selectedTransferSources = transferSourceIds
    .map((sourceId) => directoryOptions.find((option) => option.id === sourceId))
    .filter((option): option is TreeDirectoryOption => Boolean(option));
  const selectedTransferTarget = transferDialog?.targetId
    ? directoryOptions.find((option) => option.id === transferDialog.targetId) ?? null
    : null;

  const handleSelect = (treeId: string) => {
    selectTreeEntry(treeId);
  };

  const handleToggleTreeSelection = useCallback((treeId: string) => {
    setSelectedTreeNodeIds((current) => {
      const next = new Set(current);
      if (next.has(treeId)) next.delete(treeId);
      else next.add(treeId);
      return new Set(normalizeSelectedTreeIds(treeData, [...next]));
    });
  }, [treeData]);

  const clearTreeSelection = useCallback(() => {
    setSelectedTreeNodeIds(new Set());
  }, []);

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

  const handleCopy = useCallback((nodeId: string) => {
    setTransferDialog({
      action: 'copy',
      sourceIds: normalizeSelectedTreeIds(treeData, [nodeId]),
      sourceQuery: '',
      targetQuery: '',
      targetId: '',
    });
  }, [treeData]);

  const handleOpenTransferDialog = useCallback((
    action: DirectoryTransferAction,
    sourceIds: string[],
  ) => {
    setTransferDialog({
      action,
      sourceIds: normalizeSelectedTreeIds(treeData, sourceIds),
      sourceQuery: '',
      targetQuery: '',
      targetId: '',
    });
  }, [treeData]);

  const handleOpenMoveDialog = useCallback((sourceId = '') => {
    handleOpenTransferDialog('move', sourceId ? [sourceId] : []);
  }, [handleOpenTransferDialog]);

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

  const handleConfirmTransfer = useCallback(() => {
    if (!transferDialog?.targetId || transferSourceIds.length === 0) return;
    if (isInvalidDirectoryTransferTarget(
      treeData,
      transferDialog.action,
      transferSourceIds,
      transferDialog.targetId,
    )) {
      addNotification(`无法${transferActionLabel}到该目录位置`, 'warning');
      return;
    }

    const targetName = findNodeName(treeData, transferDialog.targetId);
    let changedCount = 0;
    for (const sourceId of transferSourceIds) {
      const changed = transferDialog.action === 'copy'
        ? copyTreeNode(sourceId, transferDialog.targetId)
        : moveTreeNode(sourceId, transferDialog.targetId);
      if (changed) changedCount += 1;
    }

    if (changedCount > 0) {
      addNotification(`已${transferActionLabel} ${changedCount} 个目录到: ${targetName}`, 'success');
      setTransferDialog(null);
      clearTreeSelection();
      return;
    }

    addNotification(`无法${transferActionLabel}到该目录位置`, 'warning');
  }, [
    addNotification,
    clearTreeSelection,
    copyTreeNode,
    moveTreeNode,
    transferActionLabel,
    transferDialog,
    transferSourceIds,
    treeData,
  ]);

  const handleDeleteSelected = useCallback(() => {
    if (selectedTreeIds.length === 0) return;
    const confirmed = window.confirm(`删除选中的 ${selectedTreeIds.length} 个目录及其所有子目录吗？此操作不可撤销。`);
    if (!confirmed) return;

    for (const sourceId of selectedTreeIds) removeTreeNode(sourceId);
    addNotification(`已删除 ${selectedTreeIds.length} 个目录`, 'warning');
    clearTreeSelection();
  }, [addNotification, clearTreeSelection, removeTreeNode, selectedTreeIds]);

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
          <button type="button" className="btn btn-sm" onClick={() => handleOpenTransferDialog('move', selectedTreeIds)}>移动目录</button>
          <button type="button" className="btn btn-sm" disabled={selectedTreeCount === 0} onClick={() => handleOpenTransferDialog('copy', selectedTreeIds)}>复制目录</button>
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

      {selectedTreeCount > 0 && (
        <div className="tree-selection-bar">
          <span className="tree-selection-count">已选 {selectedTreeCount} 个目录</span>
          <button type="button" className="btn btn-sm" onClick={() => handleOpenTransferDialog('move', selectedTreeIds)}>移动</button>
          <button type="button" className="btn btn-sm" onClick={() => handleOpenTransferDialog('copy', selectedTreeIds)}>复制</button>
          <button type="button" className="btn btn-sm tree-selection-danger" onClick={handleDeleteSelected}>删除</button>
          <button type="button" className="btn btn-sm" onClick={clearTreeSelection}>清除</button>
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
          selectedNodeId={selectedNodeId}
          selectedTreeIds={selectedTreeIdSet}
          onSelect={handleSelect}
          onToggleSelection={handleToggleTreeSelection}
          searchQuery={search} onAddChild={handleAddChild}
          onAddQuestion={handleAddQuestionToNode}
          onRename={handleRename} onDelete={handleDelete}
          onMove={handleOpenMoveDialog}
          onCopy={handleCopy}
          draggingTreeNodeId={draggingTreeNodeId}
          dropTargetTreeNodeId={dropTargetTreeNodeId}
          onDragStartNode={handleDragStartNode}
          onDragEndNode={handleDragEndNode}
          onDragOverNode={setDropTargetTreeNodeId}
          onDropNode={handleDropNode} />
      </div>

      {transferDialog && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 11000, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.5)' }}
          onClick={() => setTransferDialog(null)}>
          <div style={{
            background: 'var(--bg-card, #141e3a)', border: '1px solid rgba(120,160,255,0.3)', borderRadius: 12,
            padding: 20, width: 520, maxWidth: 'calc(100vw - 32px)', boxShadow: '0 20px 60px rgba(0,0,0,0.5)'
          }} onClick={e => e.stopPropagation()}>
            <h3 style={{ fontSize: 14, fontWeight: 600, color: '#dfe7f5', marginBottom: 12 }}>
              {transferActionLabel}目录
            </h3>
            <div style={{ display: 'grid', gap: 14 }}>
              <div style={{ display: 'grid', gap: 6 }}>
                <label style={{ fontSize: 11, color: '#8a98ba' }}>源目录</label>
                {selectedTransferSources.length > 0 && (
                  <div style={{ display: 'grid', gap: 4, fontSize: 12, color: '#dfe7f5', lineHeight: 1.5 }}>
                    {selectedTransferSources.slice(0, 4).map((option) => (
                      <div key={option.id}>{option.path}</div>
                    ))}
                    {selectedTransferSources.length > 4 && (
                      <div style={{ color: '#8a98ba' }}>还有 {selectedTransferSources.length - 4} 个目录</div>
                    )}
                  </div>
                )}
                <input
                  className="input"
                  value={transferDialog.sourceQuery}
                  onChange={e => setTransferDialog((state) => state ? {
                    ...state,
                    sourceQuery: e.target.value,
                  } : state)}
                  placeholder={`搜索要${transferActionLabel}的目录`}
                  autoFocus={transferSourceIds.length === 0}
                />
                <div style={{ maxHeight: 132, overflow: 'auto', border: '1px solid rgba(120,160,255,0.16)', borderRadius: 8 }}>
                  {transferSourceOptions.length === 0 ? (
                    <div style={{ padding: 10, fontSize: 12, color: '#8a98ba' }}>无匹配目录</div>
                  ) : transferSourceOptions.map((option) => (
                    <button
                      key={option.id}
                      type="button"
                      className={`btn btn-sm${transferSourceIds.includes(option.id) ? ' btn-primary' : ''}`}
                      style={{ width: '100%', justifyContent: 'flex-start', border: 0, borderRadius: 0 }}
                      onClick={() => setTransferDialog((state) => {
                        if (!state) return state;
                        const nextSourceIds = state.sourceIds.includes(option.id)
                          ? state.sourceIds.filter((sourceId) => sourceId !== option.id)
                          : [...state.sourceIds, option.id];
                        return {
                          ...state,
                          sourceIds: normalizeSelectedTreeIds(treeData, nextSourceIds),
                          sourceQuery: option.name,
                          targetId: '',
                        };
                      })}
                    >
                      {option.path}
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ display: 'grid', gap: 6 }}>
                <label style={{ fontSize: 11, color: '#8a98ba' }}>目标父目录</label>
                {selectedTransferTarget && (
                  <div style={{ fontSize: 12, color: '#dfe7f5', lineHeight: 1.5 }}>
                    {selectedTransferTarget.path}
                  </div>
                )}
                <input
                  className="input"
                  value={transferDialog.targetQuery}
                  onChange={e => setTransferDialog((state) => state ? {
                    ...state,
                    targetQuery: e.target.value,
                    targetId: '',
                  } : state)}
                  placeholder="搜索目标父目录"
                  disabled={transferSourceIds.length === 0}
                />
                <div style={{ maxHeight: 160, overflow: 'auto', border: '1px solid rgba(120,160,255,0.16)', borderRadius: 8 }}>
                  {transferSourceIds.length === 0 ? (
                    <div style={{ padding: 10, fontSize: 12, color: '#8a98ba' }}>先选择源目录</div>
                  ) : transferTargetOptions.length === 0 ? (
                    <div style={{ padding: 10, fontSize: 12, color: '#8a98ba' }}>无可用目标</div>
                  ) : transferTargetOptions.map((option) => (
                    <button
                      key={option.id}
                      type="button"
                      className={`btn btn-sm${transferDialog.targetId === option.id ? ' btn-primary' : ''}`}
                      style={{ width: '100%', justifyContent: 'flex-start', border: 0, borderRadius: 0 }}
                      onClick={() => setTransferDialog((state) => state ? {
                        ...state,
                        targetId: option.id,
                        targetQuery: option.name,
                      } : state)}
                    >
                      {option.path}
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                <button className="btn btn-sm" onClick={() => setTransferDialog(null)}>取消</button>
                <button
                  className="btn btn-primary btn-sm"
                  disabled={transferSourceIds.length === 0 || !transferDialog.targetId}
                  onClick={handleConfirmTransfer}
                >
                  确认{transferActionLabel}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

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

function collectDirectoryOptions(root: TreeNode): TreeDirectoryOption[] {
  const options: TreeDirectoryOption[] = [];
  const walk = (node: TreeNode, trail: string[], depth: number) => {
    const path = [...trail, node.name];
    options.push({
      id: node.id,
      name: node.name,
      path: path.join(' / '),
      depth,
    });
    for (const child of node.children ?? []) walk(child, path, depth + 1);
  };
  walk(root, [], 0);
  return options;
}

function filterDirectoryOptions(
  options: TreeDirectoryOption[],
  query: string,
): TreeDirectoryOption[] {
  const q = query.trim().toLowerCase();
  if (!q) return options;
  return options.filter((option) =>
    option.name.toLowerCase().includes(q) || option.path.toLowerCase().includes(q),
  );
}

function normalizeSelectedTreeIds(root: TreeNode, ids: string[]): string[] {
  const selected = new Set(ids.filter((id) => id !== root.id));
  const normalized: string[] = [];

  const walk = (node: TreeNode, hasSelectedAncestor: boolean) => {
    const isSelected = selected.has(node.id);
    if (isSelected && !hasSelectedAncestor) normalized.push(node.id);
    for (const child of node.children ?? []) walk(child, hasSelectedAncestor || isSelected);
  };

  walk(root, false);
  return normalized;
}

function areSetsEqual(set: ReadonlySet<string>, values: string[]): boolean {
  if (set.size !== values.length) return false;
  return values.every((value) => set.has(value));
}

function isInvalidDirectoryTransferTarget(
  root: TreeNode,
  action: DirectoryTransferAction,
  sourceIds: string[],
  targetId: string,
): boolean {
  const normalizedSourceIds = normalizeSelectedTreeIds(root, sourceIds);
  if (!targetId || normalizedSourceIds.length === 0) return true;

  let hasEffectiveMove = action === 'copy';
  for (const sourceId of normalizedSourceIds) {
    if (sourceId === targetId) return true;
    const source = findTreeNodeById(root, sourceId);
    if (!source) return true;
    if (findTreeNodeById(source, targetId)) return true;

    const currentParent = findTreeParent(root, sourceId);
    if (action === 'move' && currentParent?.id !== targetId) {
      hasEffectiveMove = true;
    }
  }

  return !hasEffectiveMove;
}

function isInvalidManualMoveTarget(
  root: TreeNode,
  sourceId: string,
  targetId: string,
): boolean {
  return isInvalidDirectoryTransferTarget(root, 'move', [sourceId], targetId);
}
