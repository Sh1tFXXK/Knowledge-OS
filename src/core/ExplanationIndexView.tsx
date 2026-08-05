import { Plus, X } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  buildExplanationIndex,
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
import {
  collectDirectContainmentRelations,
  CONTAINMENT_EDGE_LABEL,
  CONTAINMENT_EDGE_TYPE,
  isManagedContainmentEdge,
} from '../knowledge/containment';
import { normalizeSupertag } from '../knowledge/supertags';
import {
  collectDirectTypeRelations,
  resolveTypeRelationGraph,
  typeRelationLabel,
} from '../knowledge/typeRelations';
import { collectTreeReferencesByNodeRef, findTreeNodeById } from '../knowledge/treeUtils';
import { useGraphStore } from '../store/useGraph';
import {
  ExplanationSelectionKind,
  TypeRelationKind,
  type ExplanationIndexSelection,
  type ExplanationSelection,
  type KnowledgeNode,
} from '../types';
import { UnifiedIndexGraph } from './explanation-index/UnifiedIndexGraph';
import { buildUnifiedIndexGraph } from './explanation-index/indexGraphLayout';

enum MatrixSplitDirection {
  UpDown = 'up-down',
  LeftRight = 'left-right',
}

function splitDirectionForDepth(depth: number): MatrixSplitDirection {
  return depth % 2 === 0 ? MatrixSplitDirection.UpDown : MatrixSplitDirection.LeftRight;
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

enum ExplanationIndexRelationKind {
  Contains = 'contains',
}

type EditableExplanationIndexRelationKind = TypeRelationKind | ExplanationIndexRelationKind;

function findRelationTargetByQuery(
  nodePool: Record<string, KnowledgeNode>,
  query: string,
  excludeId: string | null,
  preferredIds: ReadonlySet<string> = new Set(),
): string | null {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return null;

  const exactMatches = (Object.values(nodePool) as KnowledgeNode[]).filter(
    (candidate) => candidate.id !== excludeId && candidate.label.toLowerCase() === normalized,
  );
  const exact = exactMatches.find((candidate) => preferredIds.has(candidate.id)) ?? exactMatches[0];
  if (exact) return exact.id;

  const matches = (Object.values(nodePool) as KnowledgeNode[]).filter(
    (candidate) => candidate.id !== excludeId && candidate.label.toLowerCase().includes(normalized),
  );
  if (matches.length > 1) {
    const preferred = matches.filter((candidate) => preferredIds.has(candidate.id));
    if (preferred.length === 1) return preferred[0].id;
  }
  return matches.length === 1 ? matches[0].id : null;
}

function relationTargetRank(label: string, query: string): number {
  const normalizedLabel = label.toLowerCase();
  if (normalizedLabel === query) return 0;
  if (normalizedLabel.startsWith(query)) return 1;
  return 2;
}

export default function ExplanationIndexView() {
  const selectedNodeId = useGraphStore((state) => state.selectedNodeId);
  const selectedTreeNodeId = useGraphStore((state) => state.selectedTreeNodeId);
  const treeData = useGraphStore((state) => state.treeData);
  const nodePool = useGraphStore((state) => state.nodePool);
  const knowledgeEdges = useGraphStore((state) => state.knowledgeEdges);
  const node = useGraphStore((state) =>
    state.selectedNodeId ? state.nodePool[state.selectedNodeId] : undefined,
  );
  const activeSelection = useGraphStore((state) => state.activeExplanationSelection);
  const setActiveSelection = useGraphStore((state) => state.setActiveExplanationSelection);
  const openCard = useGraphStore((state) => state.openCard);
  const addNotification = useGraphStore((state) => state.addNotification);
  const addKnowledgeNode = useGraphStore((state) => state.addKnowledgeNode);
  const addKnowledgeEdge = useGraphStore((state) => state.addKnowledgeEdge);
  const removeKnowledgeEdge = useGraphStore((state) => state.removeKnowledgeEdge);
  const removeKnowledgeNode = useGraphStore((state) => state.removeKnowledgeNode);
  const removeKnowledgeNodeKeepTree = useGraphStore((state) => state.removeKnowledgeNodeKeepTree);
  const addTreeEntry = useGraphStore((state) => state.addTreeEntry);
  const createKnowledgeAndLink = useGraphStore((state) => state.createKnowledgeAndLink);
  const renameTreeNode = useGraphStore((state) => state.renameTreeNode);
  const applyOperation = useGraphStore((state) => state.applyExplanationIndexOperation);
  const setIndexTags = useGraphStore((state) => state.setExplanationIndexTags);
  const addTypeRelation = useGraphStore((state) => state.addTypeRelation);
  const removeTypeRelation = useGraphStore((state) => state.removeTypeRelation);
  const addContainmentRelation = useGraphStore((state) => state.addContainmentRelation);
  const removeContainmentRelation = useGraphStore((state) => state.removeContainmentRelation);
  const [titleDraft, setTitleDraft] = useState('');
  const [tagDraft, setTagDraft] = useState('');
  const [relationTargetQuery, setRelationTargetQuery] = useState('');
  const [relationTargetId, setRelationTargetId] = useState('');
  const [relationKind, setRelationKind] = useState<EditableExplanationIndexRelationKind>(
    TypeRelationKind.Implements,
  );
  const [splitCount, setSplitCount] = useState('1');
  const [weightDraft, setWeightDraft] = useState('1');
  const [isEditing, setIsEditing] = useState(false);
  const [childDraft, setChildDraft] = useState<{ parentId: string; label: string } | null>(null);
  const [diagramOwnerId, setDiagramOwnerId] = useState<string | null>(selectedNodeId);
  const titleInputRef = useRef<HTMLInputElement>(null);

  const treeDiagramOwnerId = useMemo(
    () => (selectedTreeNodeId
      ? findTreeNodeById(treeData, selectedTreeNodeId)?.nodeRef ?? null
      : null),
    [selectedTreeNodeId, treeData],
  );
  const diagramOwnerNode = diagramOwnerId ? nodePool[diagramOwnerId] : node;

  useEffect(() => {
    if (treeDiagramOwnerId) {
      setDiagramOwnerId(treeDiagramOwnerId);
      return;
    }
    if (!diagramOwnerId && selectedNodeId) setDiagramOwnerId(selectedNodeId);
  }, [diagramOwnerId, selectedNodeId, treeDiagramOwnerId]);

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
    () => (node ? buildExplanationIndex(node.card) : null),
    [node],
  );
  const diagramIndex = useMemo(
    () => (diagramOwnerNode ? buildExplanationIndex(diagramOwnerNode.card) : null),
    [diagramOwnerNode],
  );
  const relationRootId = diagramOwnerNode?.relationIndex?.rootNodeId ?? diagramOwnerId;
  const relationRootNode = relationRootId ? nodePool[relationRootId] : undefined;
  const editingRelationRootId = node?.relationIndex?.rootNodeId ?? selectedNodeId;
  const editingRelationRootNode = editingRelationRootId ? nodePool[editingRelationRootId] : undefined;
  const relationGraph = useMemo(
    () => relationRootId
      ? resolveTypeRelationGraph(relationRootId, knowledgeEdges)
      : { nodes: [], edges: [], maxDepth: 0 },
    [knowledgeEdges, relationRootId],
  );
  const directTypeRelations = useMemo(
    () => (editingRelationRootId ? collectDirectTypeRelations(knowledgeEdges, editingRelationRootId) : []),
    [editingRelationRootId, knowledgeEdges],
  );
  const directContainmentRelations = useMemo(
    () => (editingRelationRootId
      ? collectDirectContainmentRelations(knowledgeEdges, editingRelationRootId).filter(
          ({ edge }) => !isManagedContainmentEdge(edge),
        )
      : []),
    [editingRelationRootId, knowledgeEdges],
  );
  const diagramLayout = useMemo(
    () => (diagramOwnerNode && diagramIndex && relationRootId
      ? buildUnifiedIndexGraph({
          ownerId: diagramOwnerNode.id,
          ownerLabel: diagramOwnerNode.label,
          index: diagramIndex,
          relationRootId,
          relationRootLabel: relationRootNode?.label ?? node.label,
          relationGraph,
          knowledgeEdges,
          nodePool,
        })
      : null),
    [diagramIndex, diagramOwnerNode, knowledgeEdges, nodePool, relationGraph, relationRootId, relationRootNode?.label],
  );
  const diagramNodeCount = diagramLayout?.nodes.length ?? 0;
  const diagramRelationCount = diagramLayout?.edges.length ?? 0;
  const diagramVisibleKnowledgeIds = useMemo(
    () => new Set(diagramLayout?.nodes.map((node) => node.knowledgeNodeId) ?? []),
    [diagramLayout],
  );
  const relationTargetSuggestions = useMemo(() => {
    const query = relationTargetQuery.trim().toLowerCase();
    if (!query) return [];

    return (Object.values(nodePool) as KnowledgeNode[])
      .filter((candidate) =>
        candidate.id !== editingRelationRootId && candidate.label.toLowerCase().includes(query),
      )
      .sort((left, right) => {
        const rankDiff = relationTargetRank(left.label, query) - relationTargetRank(right.label, query);
        if (rankDiff !== 0) return rankDiff;
        const visibleDiff = (
          Number(diagramVisibleKnowledgeIds.has(right.id))
          - Number(diagramVisibleKnowledgeIds.has(left.id))
        );
        if (visibleDiff !== 0) return visibleDiff;
        const lengthDiff = left.label.length - right.label.length;
        if (lengthDiff !== 0) return lengthDiff;
        return left.label.localeCompare(right.label, 'zh-CN');
      })
      .slice(0, 12);
  }, [diagramVisibleKnowledgeIds, editingRelationRootId, nodePool, relationTargetQuery]);
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

  useEffect(() => {
    setRelationTargetQuery('');
    setRelationTargetId('');
    setChildDraft(null);
  }, [selectedNodeId]);

  useEffect(() => {
    if (!isEditing) setChildDraft(null);
  }, [isEditing]);

  if (!node || !index || !diagramOwnerNode || !diagramIndex || !diagramOwnerId || !selectedNodeId || !currentSelection || !selectedIndexNode) {
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
  const canRemove =
    !locked && canRemoveExplanationIndexSelection(node.card, currentSelection);
  const canAdjustWeight = !locked && !isRoot;
  const splitDirection = splitDirectionForDepth(selectedDepth ?? 0);
  const splitLabel =
    splitDirection === MatrixSplitDirection.UpDown ? '上下分裂' : '左右分裂';

  const runOperation = (operation: ExplanationIndexOperation) => {
    return applyOperation(currentSelection, operation);
  };

  const renameGraphSelection = (
    selection: ExplanationIndexSelection,
    nextLabel: string,
  ): boolean => {
    const targetNode = nodePool[selection.nodeId];
    const label = nextLabel.trim();
    if (!targetNode || targetNode.locked || !label) return false;
    const targetIndexNode = findExplanationIndexNode(
      buildExplanationIndex(targetNode.card),
      selection,
    );
    if (!targetIndexNode || targetIndexNode.label === label) return false;

    const changed = applyOperation(selection, {
      kind: ExplanationIndexOperationKind.Rename,
      label,
    });
    if (changed && selection.kind === ExplanationSelectionKind.Root) {
      const references = selection.nodeId === selectedNodeId
        ? contextReferences
        : collectTreeReferencesByNodeRef(treeData, selection.nodeId);
      for (const reference of references) renameTreeNode(reference.treeNodeId, label);
    }
    return changed;
  };

  const canRemoveGraphSelection = (selection: ExplanationIndexSelection): boolean => {
    const targetNode = nodePool[selection.nodeId];
    return Boolean(
      targetNode
      && !targetNode.locked
      && canRemoveExplanationIndexSelection(targetNode.card, selection),
    );
  };

  const removeGraphSelection = (selection: ExplanationIndexSelection): boolean => {
    if (!canRemoveGraphSelection(selection)) return false;
    return applyOperation(selection, { kind: ExplanationIndexOperationKind.Remove });
  };

  const addGraphIndexChild = (
    selection: ExplanationIndexSelection,
    label: string,
  ): boolean => {
    const targetNode = nodePool[selection.nodeId];
    if (!targetNode || targetNode.locked || !label.trim()) return false;
    return applyOperation(selection, {
      kind: ExplanationIndexOperationKind.AddChild,
      label,
    });
  };

  const commitTitle = () => {
    const label = titleDraft.trim();
    if (!label || label === selectedIndexNode.label) {
      setTitleDraft(selectedIndexNode.label);
      return;
    }
    renameGraphSelection(currentSelection, label);
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
    setIndexTags(currentSelection, [...(node?.tags ?? []), tag]);
    setTagDraft('');
  };

  const handleRemoveTag = (tag: string) => {
    setIndexTags(
      currentSelection,
      (node?.tags ?? []).filter((item) => item !== tag),
    );
  };

  const handleSplit = () => {
    const childCount = Number(splitCount);
    if (!canSplit || !Number.isInteger(childCount) || childCount < 1) return;
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

  const openRelatedNode = (nodeId: string) => {
    setIsEditing(false);
    openCard(nodeId);
  };

  const createGraphChild = (
    parentId: string,
    label: string,
    existingNodeId?: string | null,
  ): string | null => {
    if (!parentId || nodePool[parentId]?.locked) return null;
    const trimmedLabel = label.trim();
    if (!trimmedLabel) return null;
    const parentReferences = parentId === selectedNodeId
      ? contextReferences
      : collectTreeReferencesByNodeRef(treeData, parentId);
    const parentTreeId = parentReferences[0]?.treeNodeId ?? null;

    if (existingNodeId) {
      const existing = nodePool[existingNodeId];
      if (!existing || existing.locked || existingNodeId === parentId) return null;
      if (parentTreeId) {
        addTreeEntry(parentTreeId, trimmedLabel, existingNodeId);
        return existingNodeId;
      }
      addKnowledgeEdge(
        parentId,
        existingNodeId,
        CONTAINMENT_EDGE_TYPE,
        CONTAINMENT_EDGE_LABEL,
      );
      return existingNodeId;
    }

    if (parentTreeId) {
      return createKnowledgeAndLink(parentTreeId, trimmedLabel) || null;
    }
    const newId = addKnowledgeNode(trimmedLabel);
    if (newId) {
      addKnowledgeEdge(parentId, newId, CONTAINMENT_EDGE_TYPE, CONTAINMENT_EDGE_LABEL);
    }
    return newId || null;
  };

  const handleAddGraphChild = (parentId: string) => {
    if (!parentId || nodePool[parentId]?.locked) return;
    setChildDraft({ parentId, label: '' });
  };

  const submitChildDraft = () => {
    if (!childDraft) return;
    const newId = createGraphChild(childDraft.parentId, childDraft.label);
    if (!newId) return;
    setChildDraft(null);

    editGraphSelection({
      kind: ExplanationSelectionKind.Root,
      nodeId: newId,
    });
  };

  const handleCreateGraphNodeAt = (
    parentId: string,
    label: string,
    existingNodeId?: string | null,
  ): string | null => {
    return createGraphChild(parentId, label, existingNodeId);
  };

  const handleCreateGraphGroup = (
    memberKnowledgeIds: readonly string[],
    label: string,
  ): string | null => {
    const memberIds = [...new Set(memberKnowledgeIds)].filter((id) => !!nodePool[id]);
    if (memberIds.length === 0) return null;
    const trimmedLabel = label.trim();
    if (!trimmedLabel) return null;
    const groupId = addKnowledgeNode(trimmedLabel);
    if (!groupId) return null;
    for (const memberId of memberIds) {
      addKnowledgeEdge(groupId, memberId, CONTAINMENT_EDGE_TYPE, CONTAINMENT_EDGE_LABEL);
    }
    return groupId;
  };

  const handleUngroupGraphNodes = (groupKnowledgeId: string) => {
    if (!groupKnowledgeId || nodePool[groupKnowledgeId]?.locked) return;
    removeKnowledgeNode(groupKnowledgeId);
  };

  const handleRemoveGraphNodes = (knowledgeNodeIds: readonly string[]) => {
    const removableNodeIds = new Set(
      knowledgeNodeIds.filter((id) => nodePool[id] && !nodePool[id]?.locked),
    );
    if (removableNodeIds.size === 0) return;
    const edgeIds = knowledgeEdges
      .filter((edge) => (
        (removableNodeIds.has(edge.source) || removableNodeIds.has(edge.target))
        && !nodePool[edge.source]?.locked
      ))
      .map((edge) => edge.id);
    for (const edgeId of edgeIds) removeKnowledgeEdge(edgeId);
  };

  const handleDeleteGraphNodes = (knowledgeNodeIds: readonly string[]) => {
    const removableNodeIds = knowledgeNodeIds.filter(
      (id) => nodePool[id] && !nodePool[id]?.locked,
    );
    if (removableNodeIds.length === 0) return;
    for (const id of removableNodeIds) removeKnowledgeNodeKeepTree(id);
    addNotification(`已删除 ${removableNodeIds.length} 个节点（子目录保留）`, 'warning');
  };

  const handleRemoveGraphEdges = (knowledgeEdgeIds: readonly string[]) => {
    const requestedIds = new Set(knowledgeEdgeIds);
    const edgeIds = knowledgeEdges
      .filter((edge) => requestedIds.has(edge.id) && !nodePool[edge.source]?.locked)
      .map((edge) => edge.id);
    for (const edgeId of edgeIds) removeKnowledgeEdge(edgeId);
  };

  const editGraphSelection = (selection: ExplanationIndexSelection) => {
    if (nodePool[selection.nodeId]?.locked) return;
    openCard(selection.nodeId);
    setActiveSelection(selection);
    setIsEditing(true);
  };

  const handleAddTypeRelation = () => {
    if (!editingRelationRootId) return;
    const targetId = relationTargetId
      ?? findRelationTargetByQuery(
        nodePool,
        relationTargetQuery,
        editingRelationRootId,
        diagramVisibleKnowledgeIds,
      );
    if (!targetId) {
      addNotification(`未找到节点：${relationTargetQuery.trim() || '空'}`, 'warning');
      return;
    }
    const changed = relationKind === ExplanationIndexRelationKind.Contains
      ? addContainmentRelation(editingRelationRootId, targetId)
      : addTypeRelation(editingRelationRootId, targetId, relationKind);
    if (!changed) return;
    setRelationTargetQuery('');
    setRelationTargetId('');
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

      {isRoot && (
        <>
          <div className="explanation-index-editor-tags">
            {(node?.tags ?? []).length > 0 && (
              <div className="explanation-index-editor-tag-list" aria-label="当前 super tags">
                {(node?.tags ?? []).map((tag) => (
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

          <div className="explanation-index-editor-relations">
            <div className="explanation-index-editor-relations-head">
              <span>索引关系 · {editingRelationRootNode?.label ?? node.label}</span>
              <span>{directTypeRelations.length + directContainmentRelations.length}</span>
            </div>
            {directTypeRelations.map((relation) => {
              const targetLabel = nodePool[relation.edge.target]?.label ?? relation.edge.target;
              return (
                <div className="explanation-index-editor-relation" key={relation.edge.id}>
                  <button
                    type="button"
                    className="explanation-index-editor-relation-target"
                    onClick={() => openRelatedNode(relation.edge.target)}
                    title={`Open ${targetLabel}`}
                  >
                    {targetLabel}
                  </button>
                  <span>{typeRelationLabel(relation.kind)}</span>
                  <button
                    type="button"
                    className="explanation-index-editor-relation-remove"
                    aria-label={`Remove ${typeRelationLabel(relation.kind)} relation to ${targetLabel}`}
                    title="Remove type relation"
                    disabled={locked}
                    onClick={() => removeTypeRelation(relation.edge.id)}
                  >
                    <X size={13} aria-hidden="true" />
                  </button>
                </div>
              );
            })}
            {directContainmentRelations.map(({ edge }) => {
              const targetLabel = nodePool[edge.target]?.label ?? edge.target;
              return (
                <div className="explanation-index-editor-relation is-containment" key={edge.id}>
                  <button
                    type="button"
                    className="explanation-index-editor-relation-target"
                    onClick={() => openRelatedNode(edge.target)}
                    title={`Open ${targetLabel}`}
                  >
                    {targetLabel}
                  </button>
                  <span>包含</span>
                  <button
                    type="button"
                    className="explanation-index-editor-relation-remove"
                    aria-label={`移除到 ${targetLabel} 的包含关系`}
                    title="移除包含关系"
                    disabled={locked}
                    onClick={() => removeContainmentRelation(edge.id)}
                  >
                    <X size={13} aria-hidden="true" />
                  </button>
                </div>
              );
            })}
            <div className="explanation-index-relation-add">
              <select
                className="input"
                value={relationKind}
                aria-label="Type relation"
                disabled={locked}
                onChange={(event) => setRelationKind(
                  event.target.value as EditableExplanationIndexRelationKind,
                )}
              >
                <option value={TypeRelationKind.Implements}>implements</option>
                <option value={TypeRelationKind.Extends}>extends</option>
                <option value={ExplanationIndexRelationKind.Contains}>包含（矩阵）</option>
              </select>
              <input
                className="input"
                value={relationTargetQuery}
                disabled={locked}
                aria-label="Relation target"
                placeholder="Target"
                onChange={(event) => {
                  setRelationTargetQuery(event.target.value);
                  setRelationTargetId('');
                }}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') handleAddTypeRelation();
                  if (event.key === 'Escape') {
                    setRelationTargetQuery('');
                    setRelationTargetId('');
                  }
                }}
              />
              <button
                type="button"
                aria-label="Add type relation"
                title="Add type relation"
                disabled={locked || !relationTargetId}
                onClick={handleAddTypeRelation}
              >
                <Plus size={14} aria-hidden="true" />
              </button>
            </div>
            {relationTargetSuggestions.length > 0 && (
              <div className="explanation-index-relation-suggestions">
                {relationTargetSuggestions.map((candidate) => (
                  <button
                    key={candidate.id}
                    type="button"
                    onClick={() => {
                      setRelationTargetId(candidate.id);
                      setRelationTargetQuery(candidate.label);
                    }}
                  >
                    {candidate.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </>
      )}

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
              min="1"
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
        {childDraft && (
          <form
            className="explanation-index-child-create"
            onSubmit={(event) => {
              event.preventDefault();
              submitChildDraft();
            }}
          >
            <input
              autoFocus
              className="input"
              value={childDraft.label}
              aria-label="子节点名称"
              placeholder="子节点名称"
              onChange={(event) => {
                const label = event.target.value;
                setChildDraft((current) => (current ? { ...current, label } : current));
              }}
              onKeyDown={(event) => {
                if (event.key === 'Escape') setChildDraft(null);
              }}
            />
            <button
              type="submit"
              className="btn btn-primary btn-sm"
              aria-label="确认添加子节点"
              title="确认"
              disabled={!childDraft.label.trim()}
            >
              <Plus size={13} aria-hidden="true" />
            </button>
            <button
              type="button"
              className="btn btn-sm"
              aria-label="取消添加子节点"
              title="取消"
              onClick={() => setChildDraft(null)}
            >
              <X size={13} aria-hidden="true" />
            </button>
          </form>
        )}
        {!locked && !childDraft && (
          <button
            type="button"
            className="btn btn-sm"
            onClick={() => handleAddGraphChild(selectedNodeId)}
          >
            ＋子方格
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
          <span className="explanation-index-kicker">知识点图表</span>
          <strong>{diagramOwnerNode.label}</strong>
        </div>
        <div className="explanation-index-header-actions">
          {!locked && (
            <button
              type="button"
              className="btn btn-sm explanation-index-header-edit"
              title="编辑当前项的详细设置"
              onClick={() => editGraphSelection(currentSelection)}
            >
              编辑
            </button>
          )}
          <span className="explanation-index-count">
            {diagramNodeCount} 节点 · {diagramRelationCount} 类型关系
          </span>
        </div>
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

      <div className="explanation-index-stage">
        <UnifiedIndexGraph
          ownerId={diagramOwnerNode.id}
          ownerLabel={diagramOwnerNode.label}
          index={diagramIndex}
          relationRootId={relationRootId ?? diagramOwnerNode.id}
          relationRootLabel={relationRootNode?.label ?? diagramOwnerNode.label}
          relationGraph={relationGraph}
          knowledgeEdges={knowledgeEdges}
          nodePool={nodePool}
          activeSelection={
            activeSelection?.kind === ExplanationSelectionKind.Path ? null : currentSelection
          }
          editable
          isEditing={isEditing}
          onOpenNode={openRelatedNode}
          onSelectTitle={handleSelect}
          onRenameSelection={renameGraphSelection}
          onSetSelectionTags={setIndexTags}
          onAddChildSelection={addGraphIndexChild}
          canRemoveSelection={canRemoveGraphSelection}
          onRemoveSelection={removeGraphSelection}
          onCreateNodeAt={handleCreateGraphNodeAt}
          onCreateGroup={handleCreateGraphGroup}
          onUngroup={handleUngroupGraphNodes}
          onRemoveNodes={handleRemoveGraphNodes}
          onDeleteNodes={handleDeleteGraphNodes}
          onRemoveEdges={handleRemoveGraphEdges}
        />
        {isEditing && editor}
      </div>
    </div>
  );
}
