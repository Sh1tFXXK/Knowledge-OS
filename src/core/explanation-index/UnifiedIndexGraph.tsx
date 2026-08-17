import { Check, ChevronDown, ChevronRight, Package, Pencil, Plus, SquarePlus, Tags, Trash2, X } from 'lucide-react';
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from 'react';
import {
  type ExplanationIndexNode,
} from '../../knowledge/explanationIndex';
import type { TypeRelationGraph } from '../../knowledge/typeRelations';
import {
  TypeRelationKind,
  type ExplanationIndexSelection,
  type ExplanationSelection,
  type KnowledgeEdge,
  type KnowledgeNode,
} from '../../types';
import { CONTAINMENT_EDGE_TYPE } from '../../knowledge/containment';
import {
  collectCuttingHits,
  type CuttingEdgeTarget,
  type CuttingHits,
  type CuttingNodeTarget,
  type CuttingPoint,
  type CuttingSegment,
} from './cuttingGesture';
import {
  IndexCanvas,
  type CanvasFocusTarget,
  type CanvasOverviewLabel,
  type CanvasSize,
  type WorldRect,
} from './IndexCanvas';
import {
  computeEdgeRoutingPlan,
  type EdgeRoutingMode,
  type EdgeRoutingPlan,
} from './edgeRouting';
import { canvasContentAspectRatio } from './indexCanvasCamera';
import {
  buildUnifiedIndexGraph,
  UnifiedIndexEdgeKind,
  UnifiedIndexMemberKind,
  type UnifiedIndexGraphEdge,
} from './indexGraphLayout';

interface Props {
  ownerId: string;
  ownerLabel: string;
  index: ExplanationIndexNode;
  relationRootId: string;
  relationRootLabel: string;
  relationGraph: TypeRelationGraph;
  knowledgeEdges: readonly KnowledgeEdge[];
  containmentEdges?: readonly KnowledgeEdge[];
  nodePool: Record<string, KnowledgeNode>;
  activeSelection: ExplanationSelection | null;
  editable: boolean;
  isEditing: boolean;
  onOpenNode: (nodeId: string) => void;
  onSelectTitle: (selection: ExplanationIndexSelection) => void;
  onRenameSelection: (selection: ExplanationIndexSelection, label: string) => boolean;
  onSetSelectionTags: (selection: ExplanationIndexSelection, tags: readonly string[]) => boolean;
  onAddChildSelection: (selection: ExplanationIndexSelection, label: string) => boolean;
  canRemoveSelection: (selection: ExplanationIndexSelection) => boolean;
  onRemoveSelection: (selection: ExplanationIndexSelection) => boolean;
  /** 创建或引用节点：existingNodeId 存在时引用现成知识点，否则新建 */
  onCreateNodeAt: (parentId: string, label: string, existingNodeId?: string | null) => string | null;
  /** 打包：用选中成员创建分组节点，返回分组知识节点 id */
  onCreateGroup: (memberKnowledgeIds: readonly string[], label: string) => string | null;
  /** 解散分组（删分组节点及其 belongs-to 边，成员保留） */
  onUngroup: (groupKnowledgeId: string) => void;
  /** 右键滑删节点：删除触及这些知识节点的关联边（不删知识本体） */
  onRemoveNodes: (knowledgeNodeIds: readonly string[]) => void;
  /** 右键/Shift 滑删节点：删除知识节点本体，目录节点保留 */
  onDeleteNodes: (knowledgeNodeIds: readonly string[]) => void;
  /** 右键滑删边：按 KnowledgeEdge.id 删除 */
  onRemoveEdges: (knowledgeEdgeIds: readonly string[]) => void;
}

interface ActiveGraphContext {
  activeNodeId: string | null;
  nodeIds: ReadonlySet<string>;
  edgeIds: ReadonlySet<string>;
}

interface NodeDragGesture {
  pointerId: number;
  nodeId: string;
  startClientX: number;
  startClientY: number;
  startX: number;
  startY: number;
  scale: number;
  moved: boolean;
}

interface CuttingGesture {
  pointerId: number;
  startClientX: number;
  startClientY: number;
  line: CuttingSegment;
  moved: boolean;
}

type GraphActionDraft =
  | {
      kind: 'node';
      label: string;
      parentId: string;
      worldX: number;
      worldY: number;
      existingNodeId: string | null;
    }
  | {
      kind: 'group';
      label: string;
      memberKnowledgeIds: readonly string[];
    };

interface InlineEditDraft {
  targetId: string;
  selection: ExplanationIndexSelection;
  originalLabel: string;
  label: string;
}

interface InlineTagDraft {
  targetId: string;
  selection: ExplanationIndexSelection;
  value: string;
}

interface InlineChildDraft {
  targetId: string;
  selection: ExplanationIndexSelection;
  label: string;
}

function parseTagDraft(value: string): string[] {
  return value
    .split(/[,，\n]/)
    .map((tag) => tag.trim())
    .filter(Boolean);
}

function collectActiveContext(
  activeNodeId: string | null,
  edges: readonly UnifiedIndexGraphEdge[],
): ActiveGraphContext {
  if (!activeNodeId) {
    return { activeNodeId: null, nodeIds: new Set(), edgeIds: new Set() };
  }
  const nodeIds = new Set<string>([activeNodeId]);
  const edgeIds = new Set<string>();
  for (const edge of edges) {
    if (edge.sourceId !== activeNodeId && edge.targetId !== activeNodeId) continue;
    edgeIds.add(edge.id);
    nodeIds.add(edge.sourceId);
    nodeIds.add(edge.targetId);
  }
  return { activeNodeId, nodeIds, edgeIds };
}

function edgeMarker(kind: UnifiedIndexGraphEdge['kind']): string {
  switch (kind) {
    case TypeRelationKind.Extends:
      return 'url(#index-diagram-extends-arrow)';
    case TypeRelationKind.Implements:
      return 'url(#index-diagram-implements-arrow)';
    case UnifiedIndexEdgeKind.Dependency:
      return 'url(#index-diagram-dependency-arrow)';
    case UnifiedIndexEdgeKind.Association:
      return 'url(#index-diagram-association-arrow)';
    case UnifiedIndexEdgeKind.Projection:
      return 'url(#index-diagram-projection-arrow)';
  }
}

function edgeLabel(kind: UnifiedIndexGraphEdge['kind']): string {
  switch (kind) {
    case TypeRelationKind.Extends:
      return '继承';
    case TypeRelationKind.Implements:
      return '实现';
    case UnifiedIndexEdgeKind.Dependency:
      return '依赖';
    case UnifiedIndexEdgeKind.Association:
      return '关联';
    case UnifiedIndexEdgeKind.Projection:
      return '投影';
  }
}

function setsEqual(left: ReadonlySet<string>, right: ReadonlySet<string>): boolean {
  return left.size === right.size && [...left].every((item) => right.has(item));
}

function routingModeForSurface(surface: HTMLElement): EdgeRoutingMode {
  const canvas = surface.closest('.index-canvas');
  if (canvas?.classList.contains('is-overview')) return 'overview';
  if (canvas?.classList.contains('is-compact')) return 'compact';
  return 'detail';
}

function edgeCuttingTargets(
  plan: EdgeRoutingPlan,
  deletableEdgeIds: ReadonlySet<string>,
): CuttingEdgeTarget[] {
  const targets: CuttingEdgeTarget[] = plan.routes.map((route) => ({
    id: route.edgeId,
    segments: route.segments,
    deletable: deletableEdgeIds.has(route.edgeId),
  }));

  for (const bundle of plan.bundles) {
    for (const branch of bundle.branches) {
      targets.push({
        id: branch.edgeId,
        segments: [...bundle.trunkSegments, ...branch.segments],
        deletable: deletableEdgeIds.has(branch.edgeId),
      });
    }
  }
  return targets;
}

export function UnifiedIndexGraph({
  ownerId,
  ownerLabel,
  index,
  relationRootId,
  relationRootLabel,
  relationGraph,
  knowledgeEdges,
  containmentEdges,
  nodePool,
  activeSelection,
  editable,
  isEditing,
  onOpenNode,
  onSelectTitle,
  onRenameSelection,
  onSetSelectionTags,
  onAddChildSelection,
  canRemoveSelection,
  onRemoveSelection,
  onCreateNodeAt,
  onCreateGroup,
  onUngroup,
  onRemoveNodes,
  onDeleteNodes,
  onRemoveEdges,
}: Props) {
  const [canvasViewportSize, setCanvasViewportSize] = useState<CanvasSize>({
    width: 0,
    height: 0,
  });
  const [focusedNodeId, setFocusedNodeId] = useState<string | null>(null);
  const [collapsedNodeIds, setCollapsedNodeIds] = useState<ReadonlySet<string>>(new Set());
  const [nodePositions, setNodePositions] = useState<Record<string, { x: number; y: number }>>({});
  const [draggingNodeId, setDraggingNodeId] = useState<string | null>(null);
  const [selectedNodeIds, setSelectedNodeIds] = useState<ReadonlySet<string>>(new Set());
  const [pendingDeleteNodeIds, setPendingDeleteNodeIds] = useState<ReadonlySet<string>>(new Set());
  const [pendingDeleteEdgeIds, setPendingDeleteEdgeIds] = useState<ReadonlySet<string>>(new Set());
  const [cuttingLine, setCuttingLine] = useState<CuttingSegment | null>(null);
  const [actionDraft, setActionDraft] = useState<GraphActionDraft | null>(null);
  const [inlineEditDraft, setInlineEditDraft] = useState<InlineEditDraft | null>(null);
  const [inlineTagDraft, setInlineTagDraft] = useState<InlineTagDraft | null>(null);
  const [inlineChildDraft, setInlineChildDraft] = useState<InlineChildDraft | null>(null);
  const dragGestureRef = useRef<NodeDragGesture | null>(null);
  const cuttingGestureRef = useRef<CuttingGesture | null>(null);
  const cuttingHitsRef = useRef<CuttingHits>({ nodeIds: [], edgeIds: [] });
  const suppressClickRef = useRef(false);
  const physicalContainmentEdges = containmentEdges ?? knowledgeEdges;
  const targetAspectRatio = canvasViewportSize.width > 0 && canvasViewportSize.height > 0
    ? Math.round(canvasContentAspectRatio(canvasViewportSize) * 100) / 100
    : undefined;
  const layout = useMemo(() => buildUnifiedIndexGraph({
    ownerId,
    ownerLabel,
    index,
    relationRootId,
    relationRootLabel,
    relationGraph,
    knowledgeEdges,
    containmentEdges: physicalContainmentEdges,
    nodePool,
    collapsedNodeIds,
    targetAspectRatio,
  }), [
    collapsedNodeIds,
    index,
    knowledgeEdges,
    nodePool,
    ownerId,
    ownerLabel,
    relationGraph,
    relationRootId,
    relationRootLabel,
    targetAspectRatio,
    physicalContainmentEdges,
  ]);
  // 拖动后的位置覆盖层：布局结果 + 用户手动拖动的位移
  const effectiveNodes = useMemo(
    () => layout.nodes.map((node) => {
      const override = nodePositions[node.id];
      return override ? { ...node, position: override } : node;
    }),
    [layout, nodePositions],
  );
  const nodeById = useMemo(
    () => new Map(effectiveNodes.map((node) => [node.id, node])),
    [effectiveNodes],
  );
  const containmentChildrenById = useMemo(() => {
    const graphIdByKnowledgeId = new Map<string, string>(
      effectiveNodes.map((node) => [node.knowledgeNodeId, node.id]),
    );
    const children = new Map<string, string[]>();
    for (const edge of physicalContainmentEdges) {
      if (edge.type !== CONTAINMENT_EDGE_TYPE) continue;
      const sourceId = graphIdByKnowledgeId.get(edge.source);
      const targetId = graphIdByKnowledgeId.get(edge.target);
      if (!sourceId || !targetId || sourceId === targetId) continue;
      const list = children.get(sourceId) ?? [];
      if (!list.includes(targetId)) list.push(targetId);
      children.set(sourceId, list);
    }
    return children;
  }, [effectiveNodes, physicalContainmentEdges]);
  const containmentSubtreeIds = useMemo(() => {
    const ids = new Set<string>();
    const visit = (nodeId: string) => {
      if (ids.has(nodeId)) return;
      ids.add(nodeId);
      for (const childId of containmentChildrenById.get(nodeId) ?? []) {
        visit(childId);
      }
    };
    const owner = effectiveNodes.find((node) => node.owner);
    if (owner && (containmentChildrenById.get(owner.id) ?? []).length > 0) {
      visit(owner.id);
    }
    return ids;
  }, [containmentChildrenById, effectiveNodes]);
  const containmentDescendantsById = useMemo(() => {
    const descendants = new Map<string, Set<string>>();
    const collect = (nodeId: string, seen: ReadonlySet<string>): Set<string> => {
      const result = new Set<string>();
      for (const childId of containmentChildrenById.get(nodeId) ?? []) {
        if (seen.has(childId)) continue;
        result.add(childId);
        const nextSeen = new Set(seen);
        nextSeen.add(childId);
        for (const descendant of collect(childId, nextSeen)) {
          result.add(descendant);
        }
      }
      return result;
    };
    for (const nodeId of containmentSubtreeIds) {
      descendants.set(nodeId, collect(nodeId, new Set([nodeId])));
    }
    return descendants;
  }, [containmentChildrenById, containmentSubtreeIds]);
  const containmentDepthById = useMemo(() => {
    const depths = new Map<string, number>();
    const visit = (nodeId: string, depth: number) => {
      if (depths.has(nodeId)) return;
      depths.set(nodeId, depth);
      for (const childId of containmentChildrenById.get(nodeId) ?? []) {
        visit(childId, depth + 1);
      }
    };
    const owner = effectiveNodes.find((node) => node.owner);
    if (owner && (containmentChildrenById.get(owner.id) ?? []).length > 0) {
      visit(owner.id, 0);
    }
    return depths;
  }, [containmentChildrenById, effectiveNodes]);
  const matrixHostKnowledgeIds = useMemo(
    () => new Set(
      [...containmentChildrenById.keys()]
        .map((nodeId) => nodeById.get(nodeId)?.knowledgeNodeId)
        .filter((nodeId): nodeId is string => !!nodeId),
    ),
    [containmentChildrenById, nodeById],
  );
  const overviewLabels = useMemo<CanvasOverviewLabel[]>(() => [
    ...layout.containmentFrames.map((frame) => ({
      id: `overview:${frame.id}`,
      entityId: frame.nodeId,
      label: nodePool[frame.knowledgeNodeId]?.label ?? frame.knowledgeNodeId,
      kind: 'group' as const,
      x: frame.left,
      y: frame.top,
      width: frame.width,
      height: frame.height,
      priority: 160 - Math.min(frame.depth, 100),
    })),
    ...effectiveNodes.map((node) => ({
      id: `overview:${node.id}`,
      entityId: node.id,
      label: node.label,
      kind: 'node' as const,
      x: node.position.x - node.size.width / 2,
      y: node.position.y - node.size.height / 2,
      width: node.size.width,
      height: node.size.height,
      priority: node.owner
        ? 220
        : node.relationRoot
          ? 200
          : matrixHostKnowledgeIds.has(node.knowledgeNodeId)
            ? 120 - Math.min(containmentDepthById.get(node.id) ?? 0, 100)
            : 20,
    })),
  ], [
    containmentDepthById,
    effectiveNodes,
    layout.containmentFrames,
    matrixHostKnowledgeIds,
    nodePool,
  ]);
  const orderedEffectiveNodes = useMemo(
    () => [...effectiveNodes].sort((left, right) => {
      const leftDepth = containmentDepthById.get(left.id) ?? Number.POSITIVE_INFINITY;
      const rightDepth = containmentDepthById.get(right.id) ?? Number.POSITIVE_INFINITY;
      return leftDepth - rightDepth;
    }),
    [containmentDepthById, effectiveNodes],
  );
  const edgeRoutingPlans = useMemo<Record<EdgeRoutingMode, EdgeRoutingPlan>>(() => ({
    detail: computeEdgeRoutingPlan(effectiveNodes, layout.edges, 'detail'),
    compact: computeEdgeRoutingPlan(effectiveNodes, layout.edges, 'compact'),
    overview: computeEdgeRoutingPlan(effectiveNodes, layout.edges, 'overview'),
  }), [effectiveNodes, layout.edges]);
  const edgeById = useMemo(
    () => new Map(layout.edges.map((edge) => [edge.id, edge])),
    [layout.edges],
  );
  const knowledgeEdgeById = useMemo(
    () => new Map(knowledgeEdges.map((edge) => [edge.id, edge])),
    [knowledgeEdges],
  );
  const deletableEdgeIds = useMemo(() => new Set(
    knowledgeEdges
      .filter((edge) => !nodePool[edge.source]?.locked)
      .map((edge) => edge.id),
  ), [knowledgeEdges, nodePool]);
  const cuttingNodeTargets = useMemo<CuttingNodeTarget[]>(
    () => effectiveNodes.map((graphNode) => ({
      id: graphNode.id,
      rect: {
        left: graphNode.position.x - graphNode.size.width / 2,
        top: graphNode.position.y - graphNode.size.height / 2,
        right: graphNode.position.x + graphNode.size.width / 2,
        bottom: graphNode.position.y + graphNode.size.height / 2,
      },
      deletable: !nodePool[graphNode.knowledgeNodeId]?.locked,
    })),
    [effectiveNodes, nodePool],
  );
  const cuttingEdgeTargets = useMemo<Record<EdgeRoutingMode, CuttingEdgeTarget[]>>(() => ({
    detail: edgeCuttingTargets(edgeRoutingPlans.detail, deletableEdgeIds),
    compact: edgeCuttingTargets(edgeRoutingPlans.compact, deletableEdgeIds),
    overview: edgeCuttingTargets(edgeRoutingPlans.overview, deletableEdgeIds),
  }), [deletableEdgeIds, edgeRoutingPlans]);
  const ownerGraphNode = effectiveNodes.find((node) => node.owner) ?? null;
  const focusedGraphNode = effectiveNodes.find((node) => node.id === focusedNodeId)
    ?? ownerGraphNode
    ?? effectiveNodes[0]
    ?? null;
  const activeContext = collectActiveContext(focusedNodeId, layout.edges);
  const focusTarget: CanvasFocusTarget | undefined = focusedGraphNode
    ? {
        id: focusedGraphNode.id,
        x: focusedGraphNode.position.x,
        y: focusedGraphNode.position.y,
        width: focusedGraphNode.size.width,
        height: focusedGraphNode.size.height,
      }
    : undefined;
  useEffect(() => {
    setFocusedNodeId(null);
    setCollapsedNodeIds(new Set());
    setNodePositions({});
    setSelectedNodeIds(new Set());
    setPendingDeleteNodeIds(new Set());
    setPendingDeleteEdgeIds(new Set());
    cuttingGestureRef.current = null;
    cuttingHitsRef.current = { nodeIds: [], edgeIds: [] };
    setCuttingLine(null);
    setActionDraft(null);
    setInlineEditDraft(null);
    setInlineTagDraft(null);
    setInlineChildDraft(null);
    // 清理窗口级切割监听器
    if (cuttingCleanupRef.current) {
      cuttingCleanupRef.current();
      cuttingCleanupRef.current = null;
    }
  }, [ownerId]);

  // ESC 退出高亮与框选
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setFocusedNodeId(null);
        setSelectedNodeIds(new Set());
        setActionDraft(null);
        setInlineEditDraft(null);
        setInlineTagDraft(null);
        setInlineChildDraft(null);
      }
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, []);

  // 组件卸载时清理窗口级切割监听器
  useEffect(() => {
    return () => {
      if (cuttingCleanupRef.current) {
        cuttingCleanupRef.current();
        cuttingCleanupRef.current = null;
      }
    };
  }, []);

  // ---- 分组框：非 owner、非目录绑定的 belongs-to 边 → 分组 ----
  const groupFrames = useMemo(() => {
    interface Frame {
      groupId: string;
      label: string;
      locked: boolean;
      left: number;
      top: number;
      width: number;
      height: number;
    }
    const membersByGroup = new Map<string, Set<string>>();
    for (const edge of physicalContainmentEdges) {
      if (edge.type !== CONTAINMENT_EDGE_TYPE) continue;
      if (edge.id.startsWith('treebind:') || edge.id.startsWith('treeprojection:')) continue;
      if (edge.source === ownerId) continue;
      let members = membersByGroup.get(edge.source);
      if (!members) {
        members = new Set();
        membersByGroup.set(edge.source, members);
      }
      members.add(edge.target);
    }
    const frames: Frame[] = [];
    const PAD_X = 26;
    const PAD_TOP = 48;
    const PAD_BOTTOM = 26;
    for (const [groupId, members] of membersByGroup) {
      const memberNodes = effectiveNodes.filter((node) => members.has(node.knowledgeNodeId));
      if (memberNodes.length === 0) continue;
      let x0 = Infinity;
      let y0 = Infinity;
      let x1 = -Infinity;
      let y1 = -Infinity;
      for (const node of memberNodes) {
        x0 = Math.min(x0, node.position.x - node.size.width / 2);
        y0 = Math.min(y0, node.position.y - node.size.height / 2);
        x1 = Math.max(x1, node.position.x + node.size.width / 2);
        y1 = Math.max(y1, node.position.y + node.size.height / 2);
      }
      frames.push({
        groupId,
        label: nodePool[groupId]?.label ?? '分组',
        locked: !!nodePool[groupId]?.locked,
        left: x0 - PAD_X,
        top: y0 - PAD_TOP,
        width: x1 - x0 + PAD_X * 2,
        height: y1 - y0 + PAD_TOP + PAD_BOTTOM,
      });
    }
    return frames;
  }, [physicalContainmentEdges, ownerId, effectiveNodes, nodePool]);

  // ---- 框选 ----
  const handleMarqueeSelect = (rect: WorldRect, additive: boolean) => {
    const hit = effectiveNodes
      .filter((node) => {
        const nx0 = node.position.x - node.size.width / 2;
        const nx1 = node.position.x + node.size.width / 2;
        const ny0 = node.position.y - node.size.height / 2;
        const ny1 = node.position.y + node.size.height / 2;
        return nx0 < rect.x + rect.width && nx1 > rect.x
          && ny0 < rect.y + rect.height && ny1 > rect.y;
      })
      .map((node) => node.id);
    setSelectedNodeIds((current) => (
      additive ? new Set([...current, ...hit]) : new Set(hit)
    ));
  };

  const handleBlankClick = () => {
    setFocusedNodeId(null);
    setSelectedNodeIds(new Set());
  };

  const selectedKnowledgeNodeIds = useMemo(
    () => effectiveNodes
      .filter((node) => selectedNodeIds.has(node.id))
      .map((node) => node.knowledgeNodeId),
    [effectiveNodes, selectedNodeIds],
  );
  const existingNodeSuggestions = useMemo(() => {
    if (actionDraft?.kind !== 'node') return [];
    const query = actionDraft.label.trim().toLowerCase();
    if (!query) return [];
    const rank = (label: string) => {
      const normalized = label.toLowerCase();
      if (normalized === query) return 0;
      if (normalized.startsWith(query)) return 1;
      return 2;
    };
    return (Object.values(nodePool) as KnowledgeNode[])
      .filter((candidate) => (
        candidate.id !== actionDraft.parentId
        && candidate.label.toLowerCase().includes(query)
      ))
      .sort((left, right) => {
        const rankDiff = rank(left.label) - rank(right.label);
        if (rankDiff !== 0) return rankDiff;
        return left.label.localeCompare(right.label, 'zh-CN');
      })
      .slice(0, 8);
  }, [actionDraft, nodePool]);

  // ---- 空白双击打开内联新建，并把节点固定到双击位置 ----
  const handleBlankDoubleClick = (worldX: number, worldY: number) => {
    if (!editable) return;
    setActionDraft({
      kind: 'node',
      label: '',
      parentId: ownerId,
      worldX,
      worldY,
      existingNodeId: null,
    });
  };

  const requestSelectedGroup = () => {
    if (!editable || selectedKnowledgeNodeIds.length === 0) return;
    setActionDraft({
      kind: 'group',
      label: '新分组',
      memberKnowledgeIds: selectedKnowledgeNodeIds,
    });
  };

  const submitActionDraft = () => {
    if (!actionDraft) return;
    const label = actionDraft.label.trim();
    if (!label) return;
    if (actionDraft.kind === 'node') {
      const newId = onCreateNodeAt(actionDraft.parentId, label, actionDraft.existingNodeId);
      if (!newId) return;
      setNodePositions((current) => ({
        ...current,
        [`knowledge:${newId}`]: { x: actionDraft.worldX, y: actionDraft.worldY },
      }));
    } else {
      const groupId = onCreateGroup(actionDraft.memberKnowledgeIds, label);
      if (!groupId) return;
      setSelectedNodeIds(new Set());
    }
    setActionDraft(null);
  };

  const removeSelectedNodeRelations = () => {
    if (!editable || selectedKnowledgeNodeIds.length === 0) return;
    onRemoveNodes(selectedKnowledgeNodeIds);
    setSelectedNodeIds(new Set());
  };

  // ---- Ctrl+G / Cmd+G：把选中节点打包进分组框 ----
  useEffect(() => {
    const handleGroupHotkey = (event: KeyboardEvent) => {
      if (!(event.ctrlKey || event.metaKey) || event.key.toLowerCase() !== 'g') return;
      if (!editable || selectedKnowledgeNodeIds.length === 0) return;
      event.preventDefault();
      setActionDraft({
        kind: 'group',
        label: '新分组',
        memberKnowledgeIds: selectedKnowledgeNodeIds,
      });
    };
    window.addEventListener('keydown', handleGroupHotkey);
    return () => window.removeEventListener('keydown', handleGroupHotkey);
  }, [editable, selectedKnowledgeNodeIds]);

  // ---- Project Graph 风格切割：窗口级原生监听，几何命中，松手提交 ----
  const setCuttingHits = (hits: CuttingHits) => {
    cuttingHitsRef.current = hits;
    const nodeIds = new Set(hits.nodeIds);
    const edgeIds = new Set(hits.edgeIds);
    setPendingDeleteNodeIds((current) => (setsEqual(current, nodeIds) ? current : nodeIds));
    setPendingDeleteEdgeIds((current) => (setsEqual(current, edgeIds) ? current : edgeIds));
  };

  const clearCuttingGesture = () => {
    cuttingGestureRef.current = null;
    cuttingHitsRef.current = { nodeIds: [], edgeIds: [] };
    setCuttingLine(null);
    setPendingDeleteNodeIds(new Set());
    setPendingDeleteEdgeIds(new Set());
  };

  const surfaceWorldPoint = (
    surface: HTMLDivElement,
    clientX: number,
    clientY: number,
  ): CuttingPoint => {
    const rect = surface.getBoundingClientRect();
    const scale = rect.width > 0 && layout.width > 0 ? rect.width / layout.width : 1;
    return {
      x: (clientX - rect.left) / scale,
      y: (clientY - rect.top) / scale,
    };
  };

  const updateCuttingHits = (
    surface: HTMLDivElement,
    line: CuttingSegment,
  ): CuttingHits => {
    const mode = routingModeForSurface(surface);
    const hits = collectCuttingHits(line, cuttingNodeTargets, cuttingEdgeTargets[mode]);
    setCuttingHits(hits);
    return hits;
  };

  // 窗口级原生监听器清理函数：组件卸载或 owner 切换时移除
  const cuttingCleanupRef = useRef<(() => void) | null>(null);

  const handleCuttingPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!editable) return;
    // 右键拖拽 或 Shift+左键拖拽 = 切割删除
    if (!(event.button === 2 || (event.button === 0 && event.shiftKey))) return;
    if (
      event.target instanceof Element
      && event.target.closest('.explanation-index-group-frame')
    ) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();

    // 清理上一次手势（安全网）
    if (cuttingCleanupRef.current) {
      cuttingCleanupRef.current();
      cuttingCleanupRef.current = null;
    }

    const surface = event.currentTarget;

    // 尝试 pointer capture（非关键路径，窗口监听器是主要来源）
    try { surface.setPointerCapture(event.pointerId); } catch { /* noop */ }

    const start = surfaceWorldPoint(surface, event.clientX, event.clientY);
    const line: CuttingSegment = { start, end: start };
    cuttingGestureRef.current = {
      pointerId: event.pointerId,
      startClientX: event.clientX,
      startClientY: event.clientY,
      line,
      moved: false,
    };
    setCuttingLine(line);
    setCuttingHits({ nodeIds: [], edgeIds: [] });

    // ── 窗口级原生监听器（capture 阶段，先于任何元素处理） ──
    // 不依赖 setPointerCapture，即使光标经过子元素也能持续追踪
    const onMove = (e: PointerEvent) => {
      const gesture = cuttingGestureRef.current;
      if (!gesture || gesture.pointerId !== e.pointerId) return;
      e.preventDefault();
      const movedDistance = (
        Math.abs(e.clientX - gesture.startClientX)
        + Math.abs(e.clientY - gesture.startClientY)
      );
      if (movedDistance > 3) gesture.moved = true;
      const newLine: CuttingSegment = {
        start: gesture.line.start,
        end: surfaceWorldPoint(surface, e.clientX, e.clientY),
      };
      gesture.line = newLine;
      setCuttingLine(newLine);
      if (gesture.moved) updateCuttingHits(surface, newLine);
    };

    const onUp = (e: PointerEvent) => {
      const gesture = cuttingGestureRef.current;
      if (!gesture || gesture.pointerId !== e.pointerId) return;
      e.preventDefault();

      try {
        if (surface.hasPointerCapture(e.pointerId)) {
          surface.releasePointerCapture(e.pointerId);
        }
      } catch { /* noop */ }

      const finalLine: CuttingSegment = {
        start: gesture.line.start,
        end: surfaceWorldPoint(surface, e.clientX, e.clientY),
      };
      const hits = gesture.moved
        ? updateCuttingHits(surface, finalLine)
        : { nodeIds: [], edgeIds: [] };
      const knowledgeNodeIds = [...new Set(hits.nodeIds
        .map((id) => nodeById.get(id)?.knowledgeNodeId)
        .filter((id): id is string => !!id))];
      const removedNodeIds = new Set(knowledgeNodeIds);
      const knowledgeEdgeIds = hits.edgeIds.filter((edgeId) => {
        const edge = knowledgeEdgeById.get(edgeId);
        return !!edge && !removedNodeIds.has(edge.source) && !removedNodeIds.has(edge.target);
      });

      clearCuttingGesture();
      if (knowledgeNodeIds.length > 0) onDeleteNodes(knowledgeNodeIds);
      if (knowledgeEdgeIds.length > 0) onRemoveEdges(knowledgeEdgeIds);

      // 移除窗口级监听器
      window.removeEventListener('pointermove', onMove, true);
      window.removeEventListener('pointerup', onUp, true);
      window.removeEventListener('pointercancel', onUp, true);
      cuttingCleanupRef.current = null;
    };

    window.addEventListener('pointermove', onMove, true);
    window.addEventListener('pointerup', onUp, true);
    window.addEventListener('pointercancel', onUp, true);
    cuttingCleanupRef.current = () => {
      window.removeEventListener('pointermove', onMove, true);
      window.removeEventListener('pointerup', onUp, true);
      window.removeEventListener('pointercancel', onUp, true);
    };
  };

  // 从 DOM 读取当前画布缩放（world 元素实际渲染宽度 / 内容逻辑宽度），
  // 拖动时把屏幕像素位移换算成世界坐标位移
  const resolveWorldScale = (element: HTMLElement): number => {
    const world = element.closest('.index-canvas-world');
    if (!world || layout.width <= 0) return 1;
    const rect = world.getBoundingClientRect();
    return rect.width > 0 ? rect.width / layout.width : 1;
  };

  const handleNodePointerDown = (event: ReactPointerEvent<HTMLElement>, nodeId: string) => {
    if (event.button !== 0) return;
    // Shift 优先启动切割手势，不参与节点拖动。
    if (event.shiftKey) return;
    // 只有右上角的 +/- 和编辑动作按钮不参与拖动；
    // 标题主按钮（header-main，占据节点大部分面积）允许拖动
    if (event.target instanceof Element
      && event.target.closest([
        '.explanation-index-class-header-actions',
        '.explanation-index-class-collapse',
        '.explanation-index-class-members',
        '.explanation-index-inline-editor',
        '.explanation-index-inline-tag-editor',
        '.explanation-index-inline-child-editor',
      ].join(', '))) return;
    const node = nodeById.get(nodeId);
    if (!node) return;
    // 阻止冒泡到画布，避免触发画布平移。
    // 注意：这里不能 preventDefault，也不能立即 setPointerCapture，
    // 否则原生 click（标题按钮的打开行为、双击编辑）会被抑制。
    // 等移动超过阈值后再 capture；松开时的 click 由 suppressClickRef 拦截。
    event.stopPropagation();
    dragGestureRef.current = {
      pointerId: event.pointerId,
      nodeId,
      startClientX: event.clientX,
      startClientY: event.clientY,
      startX: node.position.x,
      startY: node.position.y,
      scale: resolveWorldScale(event.currentTarget),
      moved: false,
    };
  };

  const handleNodePointerMove = (event: ReactPointerEvent<HTMLElement>) => {
    const gesture = dragGestureRef.current;
    if (!gesture || gesture.pointerId !== event.pointerId) return;
    const deltaX = (event.clientX - gesture.startClientX) / gesture.scale;
    const deltaY = (event.clientY - gesture.startClientY) / gesture.scale;
    if (!gesture.moved) {
      if (Math.abs(deltaX) + Math.abs(deltaY) <= 3) return;
      gesture.moved = true;
      event.currentTarget.setPointerCapture(event.pointerId);
      setDraggingNodeId(gesture.nodeId);
    }
    setNodePositions((current) => {
      const next = {
        ...current,
        [gesture.nodeId]: { x: gesture.startX + deltaX, y: gesture.startY + deltaY },
      };
      for (const descendantId of containmentDescendantsById.get(gesture.nodeId) ?? []) {
        const descendant = nodeById.get(descendantId);
        if (!descendant) continue;
        next[descendantId] = {
          x: descendant.position.x + deltaX,
          y: descendant.position.y + deltaY,
        };
      }
      return next;
    });
  };

  const handleNodePointerEnd = (event: ReactPointerEvent<HTMLElement>) => {
    const gesture = dragGestureRef.current;
    if (!gesture || gesture.pointerId !== event.pointerId) return;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    dragGestureRef.current = null;
    setDraggingNodeId(null);
    if (gesture.moved) {
      // 拖动结束后的 click 会落在标题按钮上，需要拦截，
      // 否则拖完会误触发"打开节点"
      suppressClickRef.current = true;
      window.setTimeout(() => {
        suppressClickRef.current = false;
      }, 150);
    }
  };

  const toggleCollapsed = (nodeId: string) => {
    setCollapsedNodeIds((current) => {
      const next = new Set(current);
      if (next.has(nodeId)) next.delete(nodeId);
      else next.add(nodeId);
      return next;
    });
  };

  const beginInlineEdit = (
    targetId: string,
    selection: ExplanationIndexSelection,
    label: string,
  ) => {
    if (!editable || nodePool[selection.nodeId]?.locked) return;
    onSelectTitle(selection);
    setInlineTagDraft(null);
    setInlineChildDraft(null);
    setInlineEditDraft({ targetId, selection, originalLabel: label, label });
  };

  const commitInlineEdit = () => {
    if (!inlineEditDraft) return;
    const label = inlineEditDraft.label.trim();
    if (!label) return;
    if (
      label !== inlineEditDraft.originalLabel
      && !onRenameSelection(inlineEditDraft.selection, label)
    ) {
      return;
    }
    setInlineEditDraft(null);
  };

  const beginInlineTagEdit = (
    targetId: string,
    selection: ExplanationIndexSelection,
    tags: readonly string[],
  ) => {
    if (!editable || nodePool[selection.nodeId]?.locked) return;
    onSelectTitle(selection);
    setInlineEditDraft(null);
    setInlineChildDraft(null);
    setInlineTagDraft({ targetId, selection, value: tags.join(', ') });
  };

  const commitInlineTagEdit = () => {
    if (!inlineTagDraft) return;
    onSetSelectionTags(inlineTagDraft.selection, parseTagDraft(inlineTagDraft.value));
    setInlineTagDraft(null);
  };

  const renderInlineTagEditor = (
    placement: 'header' | 'member',
    ariaLabel: string,
    iconSize: number,
  ) => {
    if (!inlineTagDraft) return null;
    return (
      <form
        className={`explanation-index-inline-tag-editor is-${placement}`}
        onPointerDown={(event) => event.stopPropagation()}
        onClick={(event) => event.stopPropagation()}
        onBlur={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
            commitInlineTagEdit();
          }
        }}
        onSubmit={(event) => {
          event.preventDefault();
          commitInlineTagEdit();
        }}
      >
        <Tags size={iconSize} aria-hidden="true" />
        <input
          autoFocus
          value={inlineTagDraft.value}
          aria-label={ariaLabel}
          placeholder="tag1, tag2"
          onChange={(event) => {
            const value = event.target.value;
            setInlineTagDraft((current) => current ? { ...current, value } : current);
          }}
          onKeyDown={(event) => {
            if (event.key === 'Escape') {
              event.stopPropagation();
              setInlineTagDraft(null);
            }
          }}
        />
        <button type="submit" title="保存 tags" aria-label="保存 tags">
          <Check size={iconSize} aria-hidden="true" />
        </button>
        <button type="button" title="取消" aria-label="取消" onClick={() => setInlineTagDraft(null)}>
          <X size={iconSize} aria-hidden="true" />
        </button>
      </form>
    );
  };

  const beginInlineChildEdit = (
    targetId: string,
    selection: ExplanationIndexSelection,
  ) => {
    if (!editable || nodePool[selection.nodeId]?.locked) return;
    onSelectTitle(selection);
    setInlineEditDraft(null);
    setInlineTagDraft(null);
    setInlineChildDraft({ targetId, selection, label: '' });
  };

  const commitInlineChildEdit = () => {
    if (!inlineChildDraft) return;
    const label = inlineChildDraft.label.trim();
    if (!label || !onAddChildSelection(inlineChildDraft.selection, label)) return;
    setInlineChildDraft(null);
  };

  const renderInlineChildEditor = (
    placement: 'header' | 'member',
    ariaLabel: string,
    iconSize: number,
  ) => {
    if (!inlineChildDraft) return null;
    return (
      <form
        className={`explanation-index-inline-child-editor is-${placement}`}
        onPointerDown={(event) => event.stopPropagation()}
        onClick={(event) => event.stopPropagation()}
        onSubmit={(event) => {
          event.preventDefault();
          commitInlineChildEdit();
        }}
      >
        <SquarePlus size={iconSize} aria-hidden="true" />
        <input
          autoFocus
          value={inlineChildDraft.label}
          aria-label={ariaLabel}
          placeholder="子方框名称"
          onChange={(event) => {
            const label = event.target.value;
            setInlineChildDraft((current) => current ? { ...current, label } : current);
          }}
          onKeyDown={(event) => {
            if (event.key === 'Escape') {
              event.stopPropagation();
              setInlineChildDraft(null);
            }
          }}
        />
        <button
          type="submit"
          title="新增子方框"
          aria-label="新增子方框"
          disabled={!inlineChildDraft.label.trim()}
        >
          <Check size={iconSize} aria-hidden="true" />
        </button>
        <button type="button" title="取消" aria-label="取消" onClick={() => setInlineChildDraft(null)}>
          <X size={iconSize} aria-hidden="true" />
        </button>
      </form>
    );
  };

  const renderRoutingLayer = (mode: EdgeRoutingMode, plan: EdgeRoutingPlan) => (
    <g className={`explanation-index-routing-layer is-${mode}`} key={mode}>
      {plan.routes.map((route) => {
        const edge = edgeById.get(route.edgeId);
        if (!edge) return null;
        const isActive = activeContext.edgeIds.has(edge.id);
        const isMuted = !!activeContext.activeNodeId && !isActive;
        const isPendingDelete = pendingDeleteEdgeIds.has(edge.id);
        return (
          <g
            key={edge.id}
            data-edge-id={edge.id}
            className={`${isMuted ? 'is-muted' : ''}${isActive ? ' is-active' : ''}${isPendingDelete ? ' is-delete-pending' : ''}`}
          >
            <path
              className="edge-halo"
              d={route.d}
            />
            <path
              className={`is-${edge.kind}`}
              d={route.d}
              markerEnd={edgeMarker(edge.kind)}
            />
            <text
              className={`explanation-index-edge-label is-${edge.kind}`}
              x={route.labelX}
              y={route.labelY}
              textAnchor="middle"
            >
              {edgeLabel(edge.kind)}
            </text>
          </g>
        );
      })}

      {plan.bundles.map((bundle) => {
        const isActive = bundle.edgeIds.some((edgeId) => activeContext.edgeIds.has(edgeId));
        const isMuted = !!activeContext.activeNodeId && !isActive;
        const isPendingDelete = (
          bundle.edgeIds.length > 0
          && bundle.edgeIds.every((edgeId) => pendingDeleteEdgeIds.has(edgeId))
        );
        return (
          <g
            key={bundle.id}
            className={`explanation-index-edge-bundle${isMuted ? ' is-muted' : ''}${isActive ? ' is-active' : ''}${isPendingDelete ? ' is-delete-pending' : ''}`}
          >
            <path className="edge-halo edge-bundle-trunk-halo" d={bundle.trunkD} />
            <path className={`edge-bundle-trunk is-${bundle.kind}`} d={bundle.trunkD} />
            <text
              className={`explanation-index-edge-label is-${bundle.kind}`}
              x={bundle.labelX}
              y={bundle.labelY}
              textAnchor="middle"
            >
              {edgeLabel(bundle.kind)} ×{bundle.edgeIds.length}
            </text>
            {bundle.branches.map((branch) => {
              const branchActive = activeContext.edgeIds.has(branch.edgeId);
              const branchMuted = !!activeContext.activeNodeId && !branchActive;
              const isPendingDelete = pendingDeleteEdgeIds.has(branch.edgeId);
              return (
                <g
                  key={branch.edgeId}
                  data-edge-id={branch.edgeId}
                  className={`explanation-index-edge-branch${branchMuted ? ' is-muted' : ''}${branchActive ? ' is-active' : ''}${isPendingDelete ? ' is-delete-pending' : ''}`}
                >
                  <path
                    className="edge-halo"
                    d={branch.d}
                  />
                  <path
                    className={`is-${bundle.kind}`}
                    d={branch.d}
                    markerEnd={edgeMarker(bundle.kind)}
                  />
                </g>
              );
            })}
          </g>
        );
      })}
    </g>
  );

  const overlay = (
    <div className="explanation-index-diagram-overlay">
      <div className="explanation-index-unified-legend" aria-label="关系图例">
        <span className="is-extends">继承</span>
        <span className="is-implements">实现</span>
        <span className="is-dependency">依赖</span>
        <span className="is-association">关联</span>
        <span className="is-containment">包含（矩阵）</span>
        {ownerId !== relationRootId && <span className="is-projection">投影</span>}
      </div>
      <div className="explanation-index-graph-hints" aria-hidden="true">
        左键空白框选 · 双击空白新建 · Ctrl+G 打包分组 · 右键拖拽 / Shift+拖拽切割删除 · 中键/空格拖动平移
      </div>
      {editable && (
        <div className="explanation-index-graph-actions" role="toolbar" aria-label="选中节点操作">
          <output aria-label="已选节点数">{selectedKnowledgeNodeIds.length}</output>
          <button
            type="button"
            title="打包选中节点"
            aria-label="打包选中节点"
            disabled={selectedKnowledgeNodeIds.length === 0}
            onClick={requestSelectedGroup}
          >
            <Package size={14} aria-hidden="true" />
          </button>
          <button
            type="button"
            title="删除选中节点的关系"
            aria-label="删除选中节点的关系"
            disabled={selectedKnowledgeNodeIds.length === 0}
            onClick={removeSelectedNodeRelations}
          >
            <Trash2 size={14} aria-hidden="true" />
          </button>
        </div>
      )}
    </div>
  );

  return (
    <div className="explanation-index-unified-graph">
      <IndexCanvas
        ariaLabel={`${ownerLabel} IDEA 类型关系图`}
        contentSize={{ width: layout.width, height: layout.height }}
        focusTarget={focusTarget}
        overlay={overlay}
        overviewLabels={overviewLabels}
        onViewportSizeChange={setCanvasViewportSize}
        onMarqueeSelect={handleMarqueeSelect}
        onBlankClick={handleBlankClick}
        onBlankDoubleClick={handleBlankDoubleClick}
      >
        <div
          className={`explanation-index-unified-surface${cuttingLine ? ' is-cutting' : ''}`}
          style={{ width: layout.width, height: layout.height }}
          onPointerDown={handleCuttingPointerDown}
          onContextMenu={(event) => event.preventDefault()}
        >
          {layout.containmentFrames.map((frame) => (
            <div
              key={frame.id}
              className="explanation-index-containment-matrix"
              aria-hidden="true"
              style={{
                left: frame.left,
                top: frame.top,
                width: frame.width,
                height: frame.height,
                ['--containment-depth' as string]: frame.depth,
              }}
            />
          ))}

          <svg className="explanation-index-unified-edges" aria-hidden="true">
            <defs>
              <marker id="index-diagram-extends-arrow" viewBox="0 0 12 12" refX="11" refY="6" markerWidth="12" markerHeight="12" orient="auto" markerUnits="userSpaceOnUse">
                <path d="M 1 1 L 11 6 L 1 11 Z" className="is-extends" />
              </marker>
              <marker id="index-diagram-implements-arrow" viewBox="0 0 12 12" refX="11" refY="6" markerWidth="12" markerHeight="12" orient="auto" markerUnits="userSpaceOnUse">
                <path d="M 1 1 L 11 6 L 1 11 Z" className="is-implements" />
              </marker>
              <marker id="index-diagram-dependency-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="10" markerHeight="10" orient="auto" markerUnits="userSpaceOnUse">
                <path d="M 1 1 L 9 5 L 1 9" className="is-dependency" />
              </marker>
              <marker id="index-diagram-association-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="10" markerHeight="10" orient="auto" markerUnits="userSpaceOnUse">
                <path d="M 1 1 L 9 5 L 1 9" className="is-association" />
              </marker>
              <marker id="index-diagram-projection-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="10" markerHeight="10" orient="auto" markerUnits="userSpaceOnUse">
                <path d="M 1 1 L 9 5 L 1 9" className="is-projection" />
              </marker>
            </defs>

            {renderRoutingLayer('detail', edgeRoutingPlans.detail)}
            {renderRoutingLayer('compact', edgeRoutingPlans.compact)}
            {renderRoutingLayer('overview', edgeRoutingPlans.overview)}
            {cuttingLine && (
              <line
                className="explanation-index-cutting-line"
                x1={cuttingLine.start.x}
                y1={cuttingLine.start.y}
                x2={cuttingLine.end.x}
                y2={cuttingLine.end.y}
              />
            )}
          </svg>

          {groupFrames
            .filter((frame) => !matrixHostKnowledgeIds.has(frame.groupId))
            .map((frame) => (
            <div
              key={frame.groupId}
              className="explanation-index-group-frame"
              style={{
                left: frame.left,
                top: frame.top,
                width: frame.width,
                height: frame.height,
              }}
            >
              <button
                type="button"
                className="explanation-index-group-frame-label"
                title={`打开分组 ${frame.label}`}
                onClick={(event) => {
                  event.stopPropagation();
                  onOpenNode(frame.groupId);
                }}
              >
                {frame.label}
              </button>
              {editable && !frame.locked && (
                <button
                  type="button"
                  className="explanation-index-group-frame-close"
                  title="解散分组（成员保留）"
                  aria-label={`解散分组 ${frame.label}`}
                  onClick={(event) => {
                    event.stopPropagation();
                    onUngroup(frame.groupId);
                  }}
                >
                  <X size={12} aria-hidden="true" />
                </button>
              )}
            </div>
            ))}

          {orderedEffectiveNodes.map((graphNode) => {
            const isActive = graphNode.id === activeContext.activeNodeId;
            const isContext = activeContext.nodeIds.has(graphNode.id);
            const isMuted = !!activeContext.activeNodeId && !isContext;
            const isDragging = graphNode.id === draggingNodeId;
            const isSelected = selectedNodeIds.has(graphNode.id);
            const isPendingDelete = pendingDeleteNodeIds.has(graphNode.id);
            const isMatrixHost = graphNode.containerHost;
            const isLeaf = !isMatrixHost && graphNode.memberCount === 0;
            const nodeEditTargetId = `node:${graphNode.id}`;
            const nodeTagEditTargetId = `node-tags:${graphNode.id}`;
            const nodeChildEditTargetId = `node-child:${graphNode.id}`;
            const isEditingNodeLabel = inlineEditDraft?.targetId === nodeEditTargetId;
            const isEditingNodeTags = inlineTagDraft?.targetId === nodeTagEditTargetId;
            const isAddingNodeChild = inlineChildDraft?.targetId === nodeChildEditTargetId;
            const handleHeaderClick = () => {
              setFocusedNodeId(graphNode.id);
              onOpenNode(graphNode.knowledgeNodeId);
              if (graphNode.owner) onSelectTitle(graphNode.rootSelection);
            };

            return (
              <article
                key={graphNode.id}
                data-graph-node-id={graphNode.id}
                className={`explanation-index-class-node${isMatrixHost ? ' is-matrix-host is-container-header' : ''}${isLeaf ? ' is-leaf' : ''}${graphNode.owner ? ' is-owner' : ''}${graphNode.relationRoot ? ' is-relation-root' : ''}${graphNode.containedChild ? ' is-contained-child' : ''}${graphNode.logicalReference ? ' is-logical-reference' : ''}${graphNode.collapsed ? ' is-collapsed' : ''}${isActive ? ' is-active' : ''}${isContext ? ' is-context' : ''}${isMuted ? ' is-muted' : ''}${isDragging ? ' is-dragging' : ''}${isSelected ? ' is-selected' : ''}${isPendingDelete ? ' is-delete-pending' : ''}`}
                style={{
                  left: graphNode.position.x,
                  top: graphNode.position.y,
                  width: graphNode.size.width,
                  height: graphNode.size.height,
                }}
                onPointerDown={(event) => handleNodePointerDown(event, graphNode.id)}
                onPointerMove={handleNodePointerMove}
                onPointerUp={handleNodePointerEnd}
                onPointerCancel={handleNodePointerEnd}
                onClickCapture={(event) => {
                  // 拖动结束后的那一次 click 拦截掉，避免误触发标题按钮的打开行为
                  if (!suppressClickRef.current) return;
                  event.preventDefault();
                  event.stopPropagation();
                  suppressClickRef.current = false;
                }}
                onClick={(event) => {
                  event.stopPropagation();
                  setFocusedNodeId(graphNode.id);
                }}
              >
                <div className="explanation-index-class-header">
                  {graphNode.memberCount > 0 && (
                    <button
                      type="button"
                      className="explanation-index-class-collapse"
                      aria-expanded={!graphNode.collapsed}
                      aria-label={`${graphNode.collapsed ? '展开' : '折叠'} ${graphNode.label} 的成员`}
                      title={graphNode.collapsed ? '展开成员' : '折叠成员'}
                      onPointerDown={(event) => event.stopPropagation()}
                      onClick={(event) => {
                        event.stopPropagation();
                        toggleCollapsed(graphNode.id);
                      }}
                    >
                      {graphNode.collapsed
                        ? <ChevronRight size={15} aria-hidden="true" />
                        : <ChevronDown size={15} aria-hidden="true" />}
                    </button>
                  )}
                  {isAddingNodeChild ? (
                    renderInlineChildEditor('header', `为 ${graphNode.label} 新增子方框`, 13)
                  ) : isEditingNodeTags ? (
                    renderInlineTagEditor('header', `编辑 ${graphNode.label} 的 tags`, 13)
                  ) : isEditingNodeLabel && inlineEditDraft ? (
                    <form
                      className="explanation-index-inline-editor is-header"
                      onPointerDown={(event) => event.stopPropagation()}
                      onClick={(event) => event.stopPropagation()}
                      onBlur={(event) => {
                        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
                          commitInlineEdit();
                        }
                      }}
                      onSubmit={(event) => {
                        event.preventDefault();
                        commitInlineEdit();
                      }}
                    >
                      <input
                        autoFocus
                        value={inlineEditDraft.label}
                        aria-label={`编辑 ${graphNode.label}`}
                        onChange={(event) => {
                          const label = event.target.value;
                          setInlineEditDraft((current) => current ? { ...current, label } : current);
                        }}
                        onKeyDown={(event) => {
                          if (event.key === 'Escape') {
                            event.stopPropagation();
                            setInlineEditDraft(null);
                          }
                        }}
                      />
                      <button type="submit" title="保存" aria-label="保存" disabled={!inlineEditDraft.label.trim()}>
                        <Check size={13} aria-hidden="true" />
                      </button>
                      <button type="button" title="取消" aria-label="取消" onClick={() => setInlineEditDraft(null)}>
                        <X size={13} aria-hidden="true" />
                      </button>
                    </form>
                  ) : (
                    <button
                      type="button"
                      className="explanation-index-class-header-main"
                      title={`查看 ${graphNode.label}`}
                      onClick={handleHeaderClick}
                      onDoubleClick={(event) => {
                        event.stopPropagation();
                        beginInlineEdit(nodeEditTargetId, graphNode.rootSelection, graphNode.label);
                      }}
                    >
                      <strong>{graphNode.label}</strong>
                         {graphNode.content && (
                           <span className="explanation-index-class-definition">{graphNode.content}</span>
                         )}
                      {graphNode.tags.length > 0 && (
                        <span className="explanation-index-class-stereotypes">
                          {graphNode.tags.slice(0, 3).map((tag) => `#${tag}`).join('  ')}
                        </span>
                      )}
                    </button>
                  )}
                  <div className="explanation-index-class-header-actions">
                    {editable && !nodePool[graphNode.knowledgeNodeId]?.locked && (
                      <button
                        type="button"
                        aria-label={`编辑 ${graphNode.label} 的 tags`}
                        title={`编辑 ${graphNode.label} 的 tags`}
                        onClick={(event) => {
                          event.stopPropagation();
                          beginInlineTagEdit(
                            nodeTagEditTargetId,
                            graphNode.rootSelection,
                            graphNode.tags,
                          );
                        }}
                      >
                        <Tags size={13} aria-hidden="true" />
                      </button>
                    )}
                    {editable && !nodePool[graphNode.knowledgeNodeId]?.locked && (
                      <button
                        type="button"
                        aria-label={`为 ${graphNode.label} 添加包含节点`}
                        title="添加包含节点"
                        onClick={(event) => {
                          event.stopPropagation();
                          setActionDraft({
                            kind: 'node',
                            label: '',
                            parentId: graphNode.knowledgeNodeId,
                            worldX: graphNode.position.x,
                            worldY: graphNode.position.y + graphNode.size.height / 2 + 96,
                            existingNodeId: null,
                          });
                        }}
                      >
                        <Plus size={13} aria-hidden="true" />
                      </button>
                    )}
                    {graphNode.owner && editable && !nodePool[graphNode.knowledgeNodeId]?.locked && (
                      <button
                        type="button"
                        aria-label={`为 ${graphNode.label} 新增内部子方框`}
                        title="新增内部子方框"
                        onClick={(event) => {
                          event.stopPropagation();
                          beginInlineChildEdit(nodeChildEditTargetId, graphNode.rootSelection);
                        }}
                      >
                        <SquarePlus size={13} aria-hidden="true" />
                      </button>
                    )}
                    {editable && !nodePool[graphNode.knowledgeNodeId]?.locked && (
                      <button
                        type="button"
                        aria-label={`编辑 ${graphNode.label}`}
                        title={`编辑 ${graphNode.label}`}
                        onClick={(event) => {
                          event.stopPropagation();
                          beginInlineEdit(nodeEditTargetId, graphNode.rootSelection, graphNode.label);
                        }}
                      >
                        <Pencil size={13} aria-hidden="true" />
                      </button>
                    )}
                  </div>
                </div>
                {!graphNode.containerHost && graphNode.members.length > 0 && (
                  <div className="explanation-index-class-members">
                    <header>
                      <button
                        type="button"
                        className="explanation-index-class-member-collapse"
                        aria-label={`折叠 ${graphNode.label} 的成员列表`}
                        title="折叠成员"
                        onClick={(event) => {
                          event.stopPropagation();
                          toggleCollapsed(graphNode.id);
                        }}
                      >
                        <span>成员 {graphNode.memberCount}</span>
                        <span className="explanation-index-class-member-collapse-meta">
                          {graphNode.hiddenMemberCount > 0 && `+${graphNode.hiddenMemberCount} 更多`}
                          <ChevronDown size={13} aria-hidden="true" />
                        </span>
                      </button>
                      {editable && !nodePool[graphNode.knowledgeNodeId]?.locked && (
                        <button
                          type="button"
                          className="explanation-index-class-member-root-add"
                          aria-label={`为 ${graphNode.label} 新增内部子方框`}
                          title="新增内部子方框"
                          onClick={(event) => {
                            event.stopPropagation();
                            beginInlineChildEdit(nodeChildEditTargetId, graphNode.rootSelection);
                          }}
                        >
                          <SquarePlus size={12} aria-hidden="true" />
                        </button>
                      )}
                    </header>
                    <div className="explanation-index-class-member-list">
                      {graphNode.members.map((member) => {
                        const memberEditTargetId = `member:${member.id}`;
                        const memberTagEditTargetId = `member-tags:${member.id}`;
                        const memberChildEditTargetId = `member-child:${member.id}`;
                        const isEditingMember = inlineEditDraft?.targetId === memberEditTargetId;
                        const isEditingMemberTags = inlineTagDraft?.targetId === memberTagEditTargetId;
                        const isAddingMemberChild = inlineChildDraft?.targetId === memberChildEditTargetId;
                        const canEditMember = editable && !nodePool[member.selection.nodeId]?.locked;
                        const canDeleteMember = canEditMember && canRemoveSelection(member.selection);
                        return (
                          <div
                            key={member.id}
                            className="explanation-index-class-member"
                            role="button"
                             tabIndex={0}
                             onClick={() => {
                               onOpenNode(member.selection.nodeId);
                               onSelectTitle(member.selection);
                             }}
                             onKeyDown={(event) => {
                               if (event.key === 'Enter' || event.key === ' ') {
                                 event.preventDefault();
                                 onOpenNode(member.selection.nodeId);
                                 onSelectTitle(member.selection);
                               }
                             }}
                             style={{ ['--member-depth' as string]: member.depth }}
                          >
                            {isAddingMemberChild ? (
                              renderInlineChildEditor('member', `为 ${member.label} 新增子方框`, 11)
                            ) : isEditingMemberTags ? (
                              renderInlineTagEditor('member', `编辑 ${member.label} 的 tags`, 11)
                            ) : isEditingMember && inlineEditDraft ? (
                              <form
                                className="explanation-index-inline-editor is-member"
                                onPointerDown={(event) => event.stopPropagation()}
                                onClick={(event) => event.stopPropagation()}
                                onBlur={(event) => {
                                  if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
                                    commitInlineEdit();
                                  }
                                }}
                                onSubmit={(event) => {
                                  event.preventDefault();
                                  commitInlineEdit();
                                }}
                              >
                                <input
                                  autoFocus
                                  value={inlineEditDraft.label}
                                  aria-label={`编辑 ${member.label}`}
                                  onChange={(event) => {
                                    const label = event.target.value;
                                    setInlineEditDraft((current) => current ? { ...current, label } : current);
                                  }}
                                  onKeyDown={(event) => {
                                    if (event.key === 'Escape') {
                                      event.stopPropagation();
                                      setInlineEditDraft(null);
                                    }
                                  }}
                                />
                                <button type="submit" title="保存" aria-label="保存" disabled={!inlineEditDraft.label.trim()}>
                                  <Check size={11} aria-hidden="true" />
                                </button>
                                <button type="button" title="取消" aria-label="取消" onClick={() => setInlineEditDraft(null)}>
                                  <X size={11} aria-hidden="true" />
                                </button>
                              </form>
                            ) : (
                              <>
                                <button
                                  type="button"
                                  className="explanation-index-class-member-main"
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    onSelectTitle(member.selection);
                                  }}
                                  onDoubleClick={(event) => {
                                    event.stopPropagation();
                                    beginInlineEdit(memberEditTargetId, member.selection, member.label);
                                  }}
                                >
                                  <span className={`explanation-index-member-icon${member.kind === UnifiedIndexMemberKind.Tab ? ' is-tab' : ''}`}>
                                    {member.kind === UnifiedIndexMemberKind.Tab ? 'T' : 'P'}
                                  </span>
                                  <span className="explanation-index-class-member-copy">
                                    <span>{member.label || '未命名'}</span>
                                     {member.content && (
                                       <span className="explanation-index-class-member-definition">{member.content}</span>
                                     )}
                                    {member.tags.length > 0 && (
                                      <span className="explanation-index-class-member-tags">
                                        {member.tags.map((tag) => `#${tag}`).join(' ')}
                                      </span>
                                    )}
                                  </span>
                                </button>
                                {canEditMember && (
                                  <button
                                    type="button"
                                    className="explanation-index-class-member-child-add"
                                    aria-label={`为 ${member.label} 新增子方框`}
                                    title={`为 ${member.label} 新增子方框`}
                                    onClick={(event) => {
                                      event.stopPropagation();
                                      beginInlineChildEdit(
                                        memberChildEditTargetId,
                                        member.selection,
                                      );
                                    }}
                                  >
                                    <SquarePlus size={11} aria-hidden="true" />
                                  </button>
                                )}
                                {canEditMember && (
                                  <button
                                    type="button"
                                    className="explanation-index-class-member-edit"
                                    aria-label={`编辑 ${member.label}`}
                                    title={`编辑 ${member.label}`}
                                    onClick={(event) => {
                                      event.stopPropagation();
                                      beginInlineEdit(memberEditTargetId, member.selection, member.label);
                                    }}
                                  >
                                    <Pencil size={11} aria-hidden="true" />
                                  </button>
                                )}
                                {canEditMember && (
                                  <button
                                    type="button"
                                    className="explanation-index-class-member-tag-edit"
                                    aria-label={`编辑 ${member.label} 的 tags`}
                                    title={`编辑 ${member.label} 的 tags`}
                                    onClick={(event) => {
                                      event.stopPropagation();
                                      beginInlineTagEdit(
                                        memberTagEditTargetId,
                                        member.selection,
                                        member.tags,
                                      );
                                    }}
                                  >
                                    <Tags size={11} aria-hidden="true" />
                                  </button>
                                )}
                                {canDeleteMember && (
                                  <button
                                    type="button"
                                    className="explanation-index-class-member-delete"
                                    aria-label={`删除 ${member.label || '未命名'}`}
                                    title={`删除 ${member.label || '未命名'}`}
                                    onClick={(event) => {
                                      event.stopPropagation();
                                      if (!window.confirm(`删除“${member.label || '未命名'}”及其子项？`)) return;
                                      if (onRemoveSelection(member.selection)) {
                                        setInlineEditDraft((current) => (
                                          current?.targetId === memberEditTargetId ? null : current
                                        ));
                                      }
                                    }}
                                  >
                                    <Trash2 size={11} aria-hidden="true" />
                                  </button>
                                )}
                              </>
                            )}
                          </div>
                        );
                      })}
                      {graphNode.hiddenMemberCount > 0 && (
                        <div className="explanation-index-class-member-more">
                          还有 {graphNode.hiddenMemberCount} 项
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </article>
            );
          })}
        </div>
      </IndexCanvas>
      {actionDraft && (
        <form
          className="explanation-index-graph-action-editor"
          onSubmit={(event) => {
            event.preventDefault();
            submitActionDraft();
          }}
        >
          <span>{actionDraft.kind === 'node' ? '新建节点' : '打包分组'}</span>
          <input
            autoFocus
            value={actionDraft.label}
            aria-label={actionDraft.kind === 'node' ? '新节点名称' : '分组名称'}
            placeholder={actionDraft.kind === 'node' ? '节点名称' : '分组名称'}
            onChange={(event) => {
              const label = event.target.value;
              setActionDraft((current) => {
                if (!current) return current;
                if (current.kind === 'node') return { ...current, label, existingNodeId: null };
                return { ...current, label };
              });
            }}
            onKeyDown={(event) => {
              if (event.key === 'Escape') setActionDraft(null);
            }}
          />
          {actionDraft.kind === 'node' && existingNodeSuggestions.length > 0 && (
            <div
              className="explanation-index-graph-node-suggestions"
              role="listbox"
              aria-label="引用现成知识点"
            >
              {existingNodeSuggestions.map((candidate) => (
                <button
                  type="button"
                  key={candidate.id}
                  role="option"
                  aria-selected={actionDraft.existingNodeId === candidate.id}
                  onClick={() => {
                    setActionDraft((current) => (
                      current && current.kind === 'node'
                        ? { ...current, existingNodeId: candidate.id, label: candidate.label }
                        : current
                    ));
                  }}
                >
                  {candidate.label}
                </button>
              ))}
            </div>
          )}
          <button
            type="submit"
            title="确认"
            aria-label="确认"
            disabled={!actionDraft.label.trim()}
          >
            <Check size={14} aria-hidden="true" />
          </button>
          <button
            type="button"
            title="取消"
            aria-label="取消"
            onClick={() => setActionDraft(null)}
          >
            <X size={14} aria-hidden="true" />
          </button>
        </form>
      )}
      {isEditing && <span className="explanation-index-unified-editing" aria-hidden="true" />}
    </div>
  );
}
