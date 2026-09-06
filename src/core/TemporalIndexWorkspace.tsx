import { Maximize2, Minimize2, Plus, X } from 'lucide-react';
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
import { hasSupertag, normalizeSupertag } from '../knowledge/supertags';
import {
  collectDirectTypeRelations,
  resolveTypeRelationGraph,
  typeRelationLabel,
} from '../knowledge/typeRelations';
import { collectTreeReferencesByNodeRef, findTreeNodeById, findTreeParent, getTreePathNames } from '../knowledge/treeUtils';
import { buildTreeProjectionContainmentEdges } from '../knowledge/treeBinding';
import {
  eventsForIndexScope,
  buildTemporalIndexProjection,
  resolveTemporalContext,
} from '../knowledge/indexEvolution';
import { loadLastSelectedEventByScope, saveLastSelectedEvent } from '../knowledge/temporalPreferences';
import { useGraphStore } from '../store/useGraph';
import {
  ExplanationSelectionKind,
  TypeRelationKind,
  type ExplanationIndexSelection,
  type ExplanationSelection,
  type KnowledgeEdge,
  type KnowledgeNode,
  type TreeNode,
} from '../types';
import { UnifiedIndexGraph } from './explanation-index/UnifiedIndexGraph';
import { buildUnifiedIndexGraph } from './explanation-index/indexGraphLayout';
import { TemporalRail } from './temporal/TemporalRail';
import { EventDrawer } from './temporal/EventDrawer';

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

/** 事件作用域的根：优先当前画布宿主节点，其次事件自身声明的作用域根。 */
function resolveEventScopeRootId(
  diagramOwnerId: string | null,
  scopeEvents: ReturnType<typeof eventsForIndexScope>,
): string | null {
  if (diagramOwnerId) return diagramOwnerId;
  const declared = scopeEvents.find((event) => event.scopeRootId)?.scopeRootId;
  return declared ?? null;
}

interface TemporalIndexWorkspaceProps {
  isFocusMode: boolean;
  onToggleFocusMode: () => void;
}

export default function TemporalIndexWorkspace({
  isFocusMode,
  onToggleFocusMode,
}: TemporalIndexWorkspaceProps) {
  const selectedNodeId = useGraphStore((state) => state.selectedNodeId);
  const selectedTreeNodeId = useGraphStore((state) => state.selectedTreeNodeId);
  const treeData = useGraphStore((state) => state.treeData);
  const nodePool = useGraphStore((state) => state.nodePool);
  const knowledgeEdges = useGraphStore((state) => state.knowledgeEdges);
  const evolutionEvents = useGraphStore((state) => state.evolutionEvents);
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
  const activeEventId = useGraphStore((state) => state.activeEventId);
  const setActiveEvent = useGraphStore((state) => state.setActiveEvent);
  const followSelection = useGraphStore((state) => state.followSelection);
  const setFollowSelection = useGraphStore((state) => state.setFollowSelection);
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
  const [evolutionRevision, setEvolutionRevision] = useState(0);
  const [childDraft, setChildDraft] = useState<{ parentId: string; label: string } | null>(null);
  const [diagramOwnerId, setDiagramOwnerId] = useState<string | null>(selectedNodeId);
  const titleInputRef = useRef<HTMLInputElement>(null);
  const evolutionPlaybackTimersRef = useRef<number[]>([]);
  const lastSelectedEventByScopeRef = useRef(loadLastSelectedEventByScope());

  const treeDiagramOwnerId = useMemo(
    () => (selectedTreeNodeId
      ? findTreeNodeById(treeData, selectedTreeNodeId)?.nodeRef ?? null
      : null),
    [selectedTreeNodeId, treeData],
  );
  const diagramOwnerNode = diagramOwnerId ? nodePool[diagramOwnerId] : node;
  const diagramTreeContext = useMemo(() => {
    if (!diagramOwnerId) return null;
    const selectedContext = selectedTreeNodeId
      ? findTreeNodeById(treeData, selectedTreeNodeId)
      : null;
    if (selectedContext?.nodeRef === diagramOwnerId) return selectedContext;
    const reference = collectTreeReferencesByNodeRef(treeData, diagramOwnerId)[0];
    return reference ? findTreeNodeById(treeData, reference.treeNodeId) : null;
  }, [diagramOwnerId, selectedTreeNodeId, treeData]);

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
  const diagramContainmentEdges = useMemo(() => {
    if (!diagramTreeContext?.nodeRef) return knowledgeEdges;
    const treeEdges = buildTreeProjectionContainmentEdges(diagramTreeContext);
    const structuralKnowledgeIds = new Set([
      diagramTreeContext.nodeRef,
      ...treeEdges.map((edge) => edge.target),
    ]);
    const supplementalEdges = knowledgeEdges.filter((edge) => (
      edge.type === CONTAINMENT_EDGE_TYPE
      && !isManagedContainmentEdge(edge)
      && !structuralKnowledgeIds.has(edge.target)
    ));
    return [...treeEdges, ...supplementalEdges];
  }, [diagramTreeContext, knowledgeEdges]);
  const diagramScopeNodeIds = useMemo(() => new Set([
    ...(diagramOwnerId ? [diagramOwnerId] : []),
    ...(relationRootId ? [relationRootId] : []),
    ...relationGraph.nodes.map((item) => item.nodeId),
    ...diagramContainmentEdges.flatMap((edge) => [edge.source, edge.target]),
  ]), [diagramContainmentEdges, diagramOwnerId, relationGraph.nodes, relationRootId]);

  // ── 时态上下文 ──
  // 先按画布作用域收集事件；若当前宿主不在任何事件作用域，从选中节点的目录
  // 引用向上找命中事件的祖先 nodeRef（点击"Spring 4 新特性"等来源节点时定位到
  // Spring 根作用域）。
  const diagramScopeEvents = useMemo(
    () => eventsForIndexScope(diagramScopeNodeIds, evolutionEvents),
    [diagramScopeNodeIds, evolutionEvents],
  );
  const scopeFallbackRootId = useMemo(() => {
    if (diagramScopeEvents.length > 0 || !selectedNodeId) return null;
    const hasScopeEvent = (nodeRef: string) =>
      eventsForIndexScope(new Set([nodeRef]), evolutionEvents).length > 0;
    for (const reference of contextReferences) {
      const path = getTreePathNames(treeData, reference.treeNodeId);
      if (path.length === 0) continue;
      // 沿目录祖先逐级向上，找第一个命中事件作用域的 nodeRef
      let current: TreeNode | null = findTreeNodeById(treeData, reference.treeNodeId);
      while (current) {
        if (current.nodeRef && hasScopeEvent(current.nodeRef)) return current.nodeRef;
        current = current.id ? findTreeParent(treeData, current.id) : null;
      }
    }
    return null;
  }, [contextReferences, diagramScopeEvents.length, evolutionEvents, selectedNodeId, treeData]);
  const effectiveScopeRootId = useMemo(
    () => resolveEventScopeRootId(diagramOwnerId, diagramScopeEvents),
    [diagramOwnerId, diagramScopeEvents],
  );
  const scopedForFallback = useMemo(
    () => (scopeFallbackRootId
      ? eventsForIndexScope(new Set([scopeFallbackRootId]), evolutionEvents)
      : []),
    [evolutionEvents, scopeFallbackRootId],
  );
  const temporalEvents = diagramScopeEvents.length > 0 ? diagramScopeEvents : scopedForFallback;
  const effectiveScopeRootIdForContext = diagramScopeEvents.length > 0
    ? effectiveScopeRootId
    : scopeFallbackRootId;

  const resolvedTemporalContext = useMemo(
    () => resolveTemporalContext({
      events: temporalEvents,
      scopeRootId: effectiveScopeRootIdForContext,
      selectedNodeId,
      lastActiveEventId: activeEventId
        ?? (effectiveScopeRootIdForContext
          ? lastSelectedEventByScopeRef.current[effectiveScopeRootIdForContext] ?? null
          : null),
      followSelection,
    }),
    [activeEventId, effectiveScopeRootIdForContext, followSelection, selectedNodeId, temporalEvents],
  );
  const scopeEvents = resolvedTemporalContext.scopeEvents;
  const resolvedActiveEventId = resolvedTemporalContext.activeEventId;
  const indexEvolution = useMemo(
    () => buildTemporalIndexProjection(scopeEvents, resolvedActiveEventId),
    [resolvedActiveEventId, scopeEvents],
  );
  // 跟随解析出的上下文（store 的 activeEventId 只承载用户显式选择；
  // resolveTemporalContext 派生的结果在事件或作用域变化时同步回来，避免越界残留）。
  useEffect(() => {
    if (indexEvolution.activeEvent && indexEvolution.activeEvent.id !== activeEventId) {
      setActiveEvent(indexEvolution.activeEvent.id);
    }
    if (!indexEvolution.activeEvent && activeEventId && scopeEvents.length > 0) {
      setActiveEvent(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [indexEvolution.activeEvent?.id]);

  const temporalContainmentEdges = useMemo<KnowledgeEdge[]>(() => {
    const introducedNodeIds = new Set(
      indexEvolution.allIntroducedNodes.map((introduced) => introduced.nodeId),
    );
    const stableEdges = diagramContainmentEdges.filter((edge) => (
      !indexEvolution.excludedNodeIds.has(edge.source)
      && !indexEvolution.excludedNodeIds.has(edge.target)
      && !introducedNodeIds.has(edge.target)
    ));
    const introducedEdges = indexEvolution.allIntroducedNodes
      .filter((introduced) => (
        diagramScopeNodeIds.has(introduced.parentNodeId)
        && nodePool[introduced.nodeId]
        && nodePool[introduced.parentNodeId]
      ))
      .map((introduced): KnowledgeEdge => ({
        id: `timeline:${introduced.parentNodeId}:${introduced.nodeId}`,
        source: introduced.parentNodeId,
        target: introduced.nodeId,
        type: CONTAINMENT_EDGE_TYPE,
        label: CONTAINMENT_EDGE_LABEL,
      }));
    return [...stableEdges, ...introducedEdges];
  }, [diagramContainmentEdges, diagramScopeNodeIds, indexEvolution, nodePool]);
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
          relationRootLabel: relationRootNode?.label ?? diagramOwnerNode.label,
          relationGraph,
          knowledgeEdges,
          containmentEdges: temporalContainmentEdges,
          excludedKnowledgeNodeIds: indexEvolution.excludedNodeIds,
          nodePool,
        })
      : null),
    [diagramIndex, diagramOwnerNode, indexEvolution.excludedNodeIds, knowledgeEdges, nodePool, relationGraph, relationRootId, relationRootNode?.label, temporalContainmentEdges],
  );
  const hiddenGraphNodeIds = useMemo(() => new Set(
    diagramLayout?.nodes
      .filter((item) => indexEvolution.hiddenIntroducedNodeIds.has(item.knowledgeNodeId))
      .map((item) => item.id) ?? [],
  ), [diagramLayout?.nodes, indexEvolution.hiddenIntroducedNodeIds]);
  const diagramNodeCount = diagramLayout?.nodes.filter(
    (item) => !indexEvolution.hiddenIntroducedNodeIds.has(item.knowledgeNodeId),
  ).length ?? 0;
  const diagramRelationCount = diagramLayout?.edges.filter(
    (edge) => !hiddenGraphNodeIds.has(edge.sourceId) && !hiddenGraphNodeIds.has(edge.targetId),
  ).length ?? 0;
  const diagramVisibleKnowledgeIds = useMemo(
    () => new Set(diagramLayout?.nodes
      .filter((item) => !indexEvolution.hiddenIntroducedNodeIds.has(item.knowledgeNodeId))
      .map((item) => item.knowledgeNodeId) ?? []),
    [diagramLayout, indexEvolution.hiddenIntroducedNodeIds],
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

  useEffect(() => {
    if (indexEvolution.activeEvent) setIsEditing(false);
  }, [indexEvolution.activeEvent]);

  useEffect(() => () => {
    evolutionPlaybackTimersRef.current.forEach((timer) => window.clearTimeout(timer));
  }, []);

  const selectEvolutionStage = (eventId: string | null) => {
    evolutionPlaybackTimersRef.current.forEach((timer) => window.clearTimeout(timer));
    evolutionPlaybackTimersRef.current = [];
    setActiveEvent(eventId);
    // 显式选择（含「稳定知识」）按作用域记忆，下次进入该作用域时恢复。
    if (effectiveScopeRootIdForContext) {
      lastSelectedEventByScopeRef.current[effectiveScopeRootIdForContext] = eventId;
      saveLastSelectedEvent(effectiveScopeRootIdForContext, eventId);
    }
    setEvolutionRevision((current) => current + 1);
  };

  const playEvolution = () => {
    evolutionPlaybackTimersRef.current.forEach((timer) => window.clearTimeout(timer));
    evolutionPlaybackTimersRef.current = [];
    setActiveEvent(null);
    if (effectiveScopeRootIdForContext) {
      lastSelectedEventByScopeRef.current[effectiveScopeRootIdForContext] = null;
      saveLastSelectedEvent(effectiveScopeRootIdForContext, null);
    }
    setEvolutionRevision((current) => current + 1);
    scopeEvents.forEach((event, index) => {
      const timer = window.setTimeout(() => {
        setActiveEvent(event.id);
        if (effectiveScopeRootIdForContext) {
          lastSelectedEventByScopeRef.current[effectiveScopeRootIdForContext] = event.id;
          saveLastSelectedEvent(effectiveScopeRootIdForContext, event.id);
        }
        setEvolutionRevision((current) => current + 1);
      }, 700 * (index + 1));
      evolutionPlaybackTimersRef.current.push(timer);
    });
  };

  if (!node || !index || !diagramOwnerNode || !diagramIndex || !diagramOwnerId || !selectedNodeId || !currentSelection || !selectedIndexNode) {
    return (
      <div className="explanation-index-empty">
        <strong>标题索引</strong>
        <span>从左侧目录选择知识节点</span>
      </div>
    );
  }

  const timelineReadOnly = Boolean(indexEvolution.activeEvent);
  const locked = Boolean(node.locked) || timelineReadOnly;
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
      (node?.tags ?? []).filter((item) => !hasSupertag([item], tag)),
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
    openCard(selection.nodeId);
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
          <button
            type="button"
            className="btn btn-sm explanation-index-focus-toggle"
            title={isFocusMode ? '恢复目录和详情栏' : '索引视图占满屏幕'}
            aria-label={isFocusMode ? '恢复目录和详情栏' : '索引视图占满屏幕'}
            onClick={onToggleFocusMode}
          >
            {isFocusMode
              ? <Minimize2 size={14} aria-hidden="true" />
              : <Maximize2 size={14} aria-hidden="true" />}
          </button>
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

      <TemporalRail
        events={scopeEvents}
        activeEvent={indexEvolution.activeEvent}
        followSelection={followSelection}
        onSelect={selectEvolutionStage}
        onToggleFollow={setFollowSelection}
        onPlay={playEvolution}
      />

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
          containmentEdges={temporalContainmentEdges}
          excludedKnowledgeNodeIds={indexEvolution.excludedNodeIds}
          nodePool={nodePool}
          activeSelection={
            activeSelection?.kind === ExplanationSelectionKind.Path ? null : currentSelection
          }
          editable={!timelineReadOnly}
          isEditing={isEditing}
          timelineAppearingNodeIds={indexEvolution.currentIntroducedNodeIds}
          timelineChangedNodeIds={indexEvolution.currentChangedNodeIds}
          timelineHiddenNodeIds={indexEvolution.hiddenIntroducedNodeIds}
          timelineRevision={evolutionRevision}
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

      <EventDrawer
        event={indexEvolution.activeEvent}
        nodePool={nodePool}
        onOpenNode={openRelatedNode}
      />
    </div>
  );
}
