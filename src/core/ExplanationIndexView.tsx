import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import {
  buildExplanationIndex,
  countExplanationIndexNodes,
  defaultExplanationSelection,
  findExplanationIndexNode,
  isExplanationSelectionActive,
  type ExplanationIndexNode,
} from '../knowledge/explanationIndex';
import {
  canRemoveExplanationIndexSelection,
  ExplanationIndexOperationKind,
  type ExplanationIndexOperation,
} from '../knowledge/explanationIndexMutations';
import { normalizeSupertag } from '../knowledge/supertags';
import { collectTreeReferencesByNodeRef } from '../knowledge/treeUtils';
import { useGraphStore } from '../store/useGraph';
import {
  ExplanationSelectionKind,
  type ExplanationIndexSelection,
  type ExplanationSelection,
} from '../types';

enum MatrixSplitDirection {
  UpDown = 'up-down',
  LeftRight = 'left-right',
}

function splitDirectionForDepth(depth: number): MatrixSplitDirection {
  return depth % 2 === 0 ? MatrixSplitDirection.UpDown : MatrixSplitDirection.LeftRight;
}

function containsActiveSelection(
  node: ExplanationIndexNode,
  activeSelection: ExplanationSelection | null,
): boolean {
  if (isExplanationSelectionActive(activeSelection, node.selection)) return true;
  return node.children.some((child) => containsActiveSelection(child, activeSelection));
}

function findSelectionDepth(
  node: ExplanationIndexNode,
  selection: ExplanationIndexSelection,
  depth = 0,
): number | null {
  if (isExplanationSelectionActive(selection, node.selection)) return depth;
  for (const child of node.children) {
    const found = findSelectionDepth(child, selection, depth + 1);
    if (found !== null) return found;
  }
  return null;
}

function IndexNode({
  node,
  depth,
  activeSelection,
  editable,
  editor,
  isEditing,
  onBeginEdit,
  onSelect,
}: {
  node: ExplanationIndexNode;
  depth: number;
  activeSelection: ExplanationSelection | null;
  editable: boolean;
  editor: ReactNode;
  isEditing: boolean;
  onBeginEdit: () => void;
  onSelect: (selection: ExplanationIndexSelection) => void;
}) {
  const isActive = isExplanationSelectionActive(activeSelection, node.selection);
  const containsActive = containsActiveSelection(node, activeSelection);
  const hasChildren = node.children.length > 0;
  const visibleTags = node.tags.slice(0, 2);
  const hiddenTagCount = node.tags.length - visibleTags.length;
  const nodeTitle = node.tags.length > 0
    ? `${node.label || '未命名'}\n${node.tags.map((tag) => `#${tag}`).join(' ')}`
    : node.label || '未命名';

  const title = (
    <div
      className={`explanation-index-title-surface${hasChildren ? '' : ' is-leaf'}${isActive ? ' is-active' : ''}`}
    >
      <button
        type="button"
        className={`${hasChildren ? 'explanation-index-parent-title' : 'explanation-index-leaf'}${node.tags.length > 0 ? ' has-tags' : ''}`}
        aria-current={isActive ? 'page' : undefined}
        title={nodeTitle}
        onClick={() => onSelect(node.selection)}
        onDoubleClick={() => {
          if (!editable) return;
          onSelect(node.selection);
          onBeginEdit();
        }}
      >
        <span className="explanation-index-label">{node.label || '未命名'}</span>
        {hasChildren && node.tags.length > 0 && (
          <span className="explanation-index-tag-count" aria-label={`${node.tags.length} 个 super tag`}>
            #{node.tags.length}
          </span>
        )}
        {!hasChildren && node.tags.length > 0 && (
          <span className="explanation-index-cell-tags" aria-label={`Super tags: ${node.tags.join(', ')}`}>
            {visibleTags.map((tag) => (
              <span className="explanation-index-cell-tag" key={tag}>{tag}</span>
            ))}
            {hiddenTagCount > 0 && (
              <span className="explanation-index-cell-tag explanation-index-cell-tag--more">
                +{hiddenTagCount}
              </span>
            )}
          </span>
        )}
      </button>
      {editable && isActive && !isEditing && (
        <button
          type="button"
          className="explanation-index-edit-trigger"
          aria-label={`编辑${node.label || '未命名'}`}
          title="编辑标题结构"
          onClick={(event) => {
            event.stopPropagation();
            onBeginEdit();
          }}
        >
          ⋯
        </button>
      )}
    </div>
  );

  if (!hasChildren) {
    return (
      <div
        role="treeitem"
        className="explanation-index-leaf-node"
      >
        {title}
        {isActive && isEditing && editor}
      </div>
    );
  }

  const direction = splitDirectionForDepth(depth);
  const isUpDown = direction === MatrixSplitDirection.UpDown;

  return (
    <div
      className={`explanation-index-node explanation-index-node--${direction}${containsActive ? ' contains-active' : ''}`}
      role="treeitem"
      aria-expanded="true"
    >
      <div
        className={`explanation-index-parent-surface${isUpDown ? ' is-vertical' : ' is-horizontal'}`}
      >
        {title}
      </div>
      <div
        className={`explanation-index-children${isUpDown ? ' is-column' : ' is-row'}`}
        role="group"
      >
        {node.children.map((child) => (
          <div
            className="explanation-index-child"
            key={child.id}
            style={{ flexGrow: child.weight }}
          >
            <IndexNode
              node={child}
              depth={depth + 1}
              activeSelection={activeSelection}
              editable={editable}
              editor={editor}
              isEditing={isEditing}
              onBeginEdit={onBeginEdit}
              onSelect={onSelect}
            />
          </div>
        ))}
      </div>
      {isActive && isEditing && editor}
    </div>
  );
}

export default function ExplanationIndexView() {
  const selectedNodeId = useGraphStore((state) => state.selectedNodeId);
  const selectedTreeNodeId = useGraphStore((state) => state.selectedTreeNodeId);
  const treeData = useGraphStore((state) => state.treeData);
  const node = useGraphStore((state) =>
    state.selectedNodeId ? state.nodePool[state.selectedNodeId] : undefined,
  );
  const activeSelection = useGraphStore((state) => state.activeExplanationSelection);
  const setActiveSelection = useGraphStore((state) => state.setActiveExplanationSelection);
  const applyOperation = useGraphStore((state) => state.applyExplanationIndexOperation);
  const setIndexTags = useGraphStore((state) => state.setExplanationIndexTags);
  const [titleDraft, setTitleDraft] = useState('');
  const [tagDraft, setTagDraft] = useState('');
  const [splitCount, setSplitCount] = useState('2');
  const [weightDraft, setWeightDraft] = useState('1');
  const [isEditing, setIsEditing] = useState(false);
  const titleInputRef = useRef<HTMLInputElement>(null);

  const contextReferences = useMemo(
    () => (selectedNodeId ? collectTreeReferencesByNodeRef(treeData, selectedNodeId) : []),
    [selectedNodeId, treeData],
  );
  const activePathContext = useMemo(() => {
    if (activeSelection?.kind === ExplanationSelectionKind.Path) {
      const selected = contextReferences.find(
        (context) => context.treeNodeId === activeSelection.treeNodeId,
      );
      if (selected) return selected;
    }
    return (
      contextReferences.find((context) => context.treeNodeId === selectedTreeNodeId) ??
      contextReferences[0] ??
      null
    );
  }, [activeSelection, contextReferences, selectedTreeNodeId]);
  const pathTabs = activePathContext?.supplement?.tabs ?? [];
  const index = useMemo(
    () => (node ? buildExplanationIndex(node.card, node.tags ?? []) : null),
    [node],
  );
  const titleCount = useMemo(
    () => (index ? countExplanationIndexNodes(index) + pathTabs.length : 0),
    [index, pathTabs.length],
  );
  const currentSelection = useMemo<ExplanationIndexSelection | null>(() => {
    if (!node || !index || !selectedNodeId) return null;
    if (
      activeSelection?.nodeId === selectedNodeId &&
      activeSelection.kind !== ExplanationSelectionKind.Path
    ) {
      return activeSelection;
    }
    return defaultExplanationSelection(node.card) ?? index.selection;
  }, [activeSelection, index, node, selectedNodeId]);
  const selectedIndexNode = useMemo(
    () => (index && currentSelection ? findExplanationIndexNode(index, currentSelection) : null),
    [currentSelection, index],
  );
  const selectedDepth = useMemo(
    () => (index && currentSelection ? findSelectionDepth(index, currentSelection) : null),
    [currentSelection, index],
  );

  useEffect(() => {
    if (!selectedIndexNode) {
      setIsEditing(false);
      return;
    }
    setTitleDraft(selectedIndexNode.label);
    setTagDraft('');
    setWeightDraft(String(selectedIndexNode.weight));
    if (isEditing && !selectedIndexNode.label) {
      const frame = window.requestAnimationFrame(() => titleInputRef.current?.focus());
      return () => window.cancelAnimationFrame(frame);
    }
  }, [isEditing, selectedIndexNode]);

  if (!node || !index || !selectedNodeId || !currentSelection || !selectedIndexNode) {
    return (
      <div className="explanation-index-empty">
        <strong>标题索引</strong>
        <span>从左侧目录选择知识节点</span>
      </div>
    );
  }

  const locked = Boolean(node.locked);
  const isRoot = currentSelection.kind === ExplanationSelectionKind.Root;
  const isLeaf = selectedIndexNode.children.length === 0;
  const canSplit = !locked && isLeaf;
  const canMerge = !locked && !isLeaf;
  const canAddSibling = !locked && !isRoot;
  const canRemove =
    !locked && canRemoveExplanationIndexSelection(node.card, currentSelection);
  const canAdjustWeight = !locked && !isRoot;
  const splitDirection = splitDirectionForDepth(selectedDepth ?? 0);
  const splitLabel =
    splitDirection === MatrixSplitDirection.UpDown ? '上下分裂' : '左右分裂';

  const runOperation = (operation: ExplanationIndexOperation) => {
    return applyOperation(currentSelection, operation);
  };

  const commitTitle = () => {
    const label = titleDraft.trim();
    if (!label || label === selectedIndexNode.label) {
      setTitleDraft(selectedIndexNode.label);
      return;
    }
    runOperation({ kind: ExplanationIndexOperationKind.Rename, label });
  };

  const commitWeight = () => {
    const weight = Number(weightDraft);
    if (!canAdjustWeight || !Number.isFinite(weight) || weight <= 0) {
      setWeightDraft(String(selectedIndexNode.weight));
      return;
    }
    runOperation({ kind: ExplanationIndexOperationKind.SetWeight, weight });
  };

  const handleAddTag = () => {
    const tag = normalizeSupertag(tagDraft);
    if (!tag) return;
    setIndexTags(currentSelection, [...selectedIndexNode.tags, tag]);
    setTagDraft('');
  };

  const handleRemoveTag = (tag: string) => {
    setIndexTags(
      currentSelection,
      selectedIndexNode.tags.filter((item) => item !== tag),
    );
  };

  const handleSplit = () => {
    const childCount = Number(splitCount);
    if (!canSplit || !Number.isInteger(childCount) || childCount < 2) return;
    runOperation({ kind: ExplanationIndexOperationKind.Split, childCount });
  };

  const handleRemove = () => {
    if (!canRemove || !window.confirm(`删除“${selectedIndexNode.label || '未命名'}”及其子项？`)) {
      return;
    }
    runOperation({ kind: ExplanationIndexOperationKind.Remove });
    setIsEditing(false);
  };

  const handleMerge = () => {
    if (!canMerge || !window.confirm(`合并“${selectedIndexNode.label || '未命名'}”并删除全部子项？`)) {
      return;
    }
    runOperation({ kind: ExplanationIndexOperationKind.Merge });
    setIsEditing(false);
  };

  const handleSelect = (selection: ExplanationIndexSelection) => {
    if (!isExplanationSelectionActive(currentSelection, selection)) {
      setIsEditing(false);
    }
    setActiveSelection(selection);
  };

  const handleSelectPath = (tabId: string) => {
    if (!selectedNodeId || !activePathContext) return;
    setIsEditing(false);
    setActiveSelection({
      kind: ExplanationSelectionKind.Path,
      nodeId: selectedNodeId,
      treeNodeId: activePathContext.treeNodeId,
      tabId,
    });
  };

  const editor = (
    <div className="explanation-index-editor" aria-label="编辑当前标题">
      <div className="explanation-index-editor-heading">
        <input
          ref={titleInputRef}
          className="input explanation-index-title-input"
          value={titleDraft}
          disabled={locked}
          aria-label="标题"
          placeholder="未命名"
          onChange={(event) => setTitleDraft(event.target.value)}
          onBlur={commitTitle}
          onKeyDown={(event) => {
            if (event.key === 'Enter') event.currentTarget.blur();
            if (event.key === 'Escape') {
              setTitleDraft(selectedIndexNode.label);
              setIsEditing(false);
            }
          }}
        />
        <button
          type="button"
          className="explanation-index-editor-close"
          aria-label="关闭标题编辑"
          title="关闭"
          onClick={() => setIsEditing(false)}
        >
          ×
        </button>
      </div>

      <div className="explanation-index-editor-tags">
        {selectedIndexNode.tags.length > 0 && (
          <div className="explanation-index-editor-tag-list" aria-label="当前 super tags">
            {selectedIndexNode.tags.map((tag) => (
              <span className="explanation-index-editor-tag" key={tag}>
                <span>{tag}</span>
                <button
                  type="button"
                  aria-label={`移除 super tag: ${tag}`}
                  title={`移除 super tag: ${tag}`}
                  disabled={locked}
                  onClick={() => handleRemoveTag(tag)}
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        )}
        <div className="explanation-index-tag-add">
          <input
            className="input"
            value={tagDraft}
            disabled={locked}
            aria-label="新 super tag"
            placeholder="super tag"
            onChange={(event) => setTagDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') handleAddTag();
              if (event.key === 'Escape') setTagDraft('');
            }}
          />
          <button
            type="button"
            aria-label="添加 super tag"
            title="添加 super tag"
            disabled={locked || !normalizeSupertag(tagDraft)}
            onClick={handleAddTag}
          >
            +
          </button>
        </div>
      </div>

      {canAdjustWeight && (
        <label className="explanation-index-editor-field">
          <span>比例</span>
          <input
            className="input"
            type="number"
            min="0.1"
            step="0.1"
            inputMode="decimal"
            value={weightDraft}
            aria-label="比例"
            onChange={(event) => setWeightDraft(event.target.value)}
            onBlur={commitWeight}
            onKeyDown={(event) => {
              if (event.key === 'Enter') event.currentTarget.blur();
              if (event.key === 'Escape') {
                setWeightDraft(String(selectedIndexNode.weight));
                event.currentTarget.blur();
              }
            }}
          />
        </label>
      )}

      <div className="explanation-index-editor-actions">
        {canSplit && (
          <div className="explanation-index-split-action">
            <input
              className="input"
              type="number"
              min="2"
              step="1"
              inputMode="numeric"
              value={splitCount}
              aria-label="分裂子格数"
              onChange={(event) => setSplitCount(event.target.value)}
            />
            <button type="button" className="btn btn-primary btn-sm" onClick={handleSplit}>
              {splitLabel}
            </button>
          </div>
        )}
        {canAddSibling && (
          <button
            type="button"
            className="btn btn-sm"
            onClick={() => runOperation({ kind: ExplanationIndexOperationKind.AddSibling })}
          >
            ＋同级
          </button>
        )}
        {canMerge && (
          <button type="button" className="btn btn-sm" onClick={handleMerge}>
            合并子项
          </button>
        )}
        {canRemove && (
          <button
            type="button"
            className="btn btn-sm explanation-index-delete"
            onClick={handleRemove}
          >
            删除
          </button>
        )}
      </div>
    </div>
  );

  return (
    <div className="explanation-index-shell">
      <header className="explanation-index-header">
        <div>
          <span className="explanation-index-kicker">标题索引</span>
          <strong>{node.label}</strong>
        </div>
        <span className="explanation-index-count">{titleCount}</span>
      </header>

      {pathTabs.length > 0 && activePathContext && (
        <nav className="explanation-index-paths" aria-label="路径标题索引">
          {pathTabs.map((tab) => {
            const tabId = tab.id || tab.label;
            const isActive =
              activeSelection?.kind === ExplanationSelectionKind.Path &&
              activeSelection.treeNodeId === activePathContext.treeNodeId &&
              activeSelection.tabId === tabId;
            const label = tab.label.startsWith('路径·') ? tab.label : `路径·${tab.label}`;
            return (
              <button
                type="button"
                key={tabId}
                className={`explanation-index-path${isActive ? ' is-active' : ''}`}
                aria-current={isActive ? 'page' : undefined}
                onClick={() => handleSelectPath(tabId)}
              >
                {label}
              </button>
            );
          })}
        </nav>
      )}

      <div className="explanation-index-stage" role="tree" aria-label={`${node.label}的解释标题索引`}>
        <IndexNode
          node={index}
          depth={0}
          activeSelection={
            activeSelection?.kind === ExplanationSelectionKind.Path ? null : currentSelection
          }
          editable={!locked}
          editor={editor}
          isEditing={isEditing}
          onBeginEdit={() => setIsEditing(true)}
          onSelect={handleSelect}
        />
      </div>
    </div>
  );
}
