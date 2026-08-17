import { explicitPagesForTab, type ExplanationIndexNode } from '../../knowledge/explanationIndex';
import { findPage, findTab } from '../../knowledge/explanationTree';
import {
  collectDirectContainmentRelations,
  CONTAINMENT_EDGE_TYPE,
} from '../../knowledge/containment';
import type { TypeRelationGraph } from '../../knowledge/typeRelations';
import {
  TypeRelationKind,
  type ExplanationSelectionKind,
  type ExplanationIndexSelection,
  type KnowledgeEdge,
  type KnowledgeNode,
  type NodeExplanation,
} from '../../types';

const ROOT_SELECTION_KIND = 'root' as ExplanationSelectionKind.Root;

export const UnifiedIndexNodeKind = {
  Knowledge: 'knowledge',
} as const;

export type UnifiedIndexNodeKind = typeof UnifiedIndexNodeKind[keyof typeof UnifiedIndexNodeKind];

export const UnifiedIndexMemberKind = {
  Tab: 'tab',
  Page: 'page',
} as const;

export type UnifiedIndexMemberKind =
  typeof UnifiedIndexMemberKind[keyof typeof UnifiedIndexMemberKind];

export const UnifiedIndexEdgeKind = {
  Projection: 'projection',
  Dependency: 'dependency',
  Association: 'association',
} as const;

export type UnifiedIndexEdgeKind = typeof UnifiedIndexEdgeKind[keyof typeof UnifiedIndexEdgeKind];

export interface UnifiedIndexNodePosition {
  x: number;
  y: number;
}

export interface UnifiedIndexNodeSize {
  width: number;
  height: number;
}

export interface UnifiedIndexMember {
  id: string;
  kind: UnifiedIndexMemberKind;
  label: string;
  tags: readonly string[];
  depth: number;
  selection: ExplanationIndexSelection;
  content?: string;
}

export interface UnifiedIndexGraphNode {
  id: string;
  kind: UnifiedIndexNodeKind;
  label: string;
  content: string;
  position: UnifiedIndexNodePosition;
  size: UnifiedIndexNodeSize;
  knowledgeNodeId: string;
  members: readonly UnifiedIndexMember[];
  memberCount: number;
  hiddenMemberCount: number;
  tags: readonly string[];
  rootSelection: ExplanationIndexSelection;
  owner: boolean;
  relationRoot: boolean;
  logicalReference: boolean;
  containedChild: boolean;
  containerHost: boolean;
  collapsed: boolean;
}

export interface UnifiedIndexGraphEdge {
  id: string;
  sourceId: string;
  targetId: string;
  kind: TypeRelationKind | UnifiedIndexEdgeKind;
}

export interface UnifiedIndexContainmentFrame {
  id: string;
  nodeId: string;
  knowledgeNodeId: string;
  left: number;
  top: number;
  width: number;
  height: number;
  depth: number;
}

export interface UnifiedIndexGraphLayout {
  nodes: readonly UnifiedIndexGraphNode[];
  edges: readonly UnifiedIndexGraphEdge[];
  containmentFrames: readonly UnifiedIndexContainmentFrame[];
  width: number;
  height: number;
}

interface BuildUnifiedIndexGraphParams {
  ownerId: string;
  ownerLabel: string;
  index: ExplanationIndexNode;
  relationRootId: string;
  relationRootLabel: string;
  relationGraph: TypeRelationGraph;
  knowledgeEdges: readonly KnowledgeEdge[];
  containmentEdges?: readonly KnowledgeEdge[];
  nodePool: Record<string, KnowledgeNode>;
  collapsedNodeIds?: ReadonlySet<string>;
  targetAspectRatio?: number;
}

interface KnowledgeDraft {
  id: string;
  depth: number;
  label: string;
  content: string;
  knowledgeNodeId: string;
  members: readonly UnifiedIndexMember[];
  tags: readonly string[];
  rootSelection: ExplanationIndexSelection;
  owner: boolean;
  relationRoot: boolean;
  logicalReference: boolean;
  containedChild: boolean;
}

interface SizedKnowledgeDraft extends KnowledgeDraft {
  visibleMembers: readonly UnifiedIndexMember[];
  hiddenMemberCount: number;
  collapsed: boolean;
  size: UnifiedIndexNodeSize;
}

const MIN_CLASS_WIDTH = 224;
const HEADER_HEIGHT = 64;
const MEMBER_HEADER_HEIGHT = 25;
const MEMBER_ROW_HEIGHT = 25;
const MEMBER_VERTICAL_PADDING = 8;
// Keep a large knowledge card readable without letting one member list push
// every sibling card below the fold. The header still reports the full count.
const MAX_VISIBLE_MEMBERS = 12;
const NODE_GAP = 56;
const LEVEL_GAP = 76;
const OUTER_PADDING = 40;
/** 头部左侧折叠按钮预留 + 右侧操作按钮预留 */
const HEADER_HORIZONTAL_PADDING = 42 + 116;
/** 层内单条视觉行的最大内容宽度，超过则把该层均衡拆成多行 */
const MAX_ROW_WIDTH = 1480;
/** 同一层内相邻视觉行之间的垂直间距（小于层间距 LEVEL_GAP） */
const SUB_ROW_GAP = 44;
const MIN_CANVAS_WIDTH = 660;
const MIN_CANVAS_HEIGHT = 460;
const DEPENDENCY_EDGE_TYPES = new Set(['uses', 'depends-on', 'needs-for']);
const ASSOCIATION_EDGE_TYPES = new Set(['enables', 'leads-to', 'compares', 'relates-to']);
const MATRIX_PAD_X = 28;
const MATRIX_PAD_TOP = 18;
const MATRIX_PAD_BOTTOM = 26;
const MATRIX_CHILD_GAP = 28;
const MIN_MATRIX_INNER_WIDTH = 280;
const MAX_MATRIX_INNER_WIDTH = MAX_ROW_WIDTH;
const MOSAIC_CANVAS_WIDTH = 1480;
const MOSAIC_MIN_HEIGHT = 840;
const MOSAIC_AREA_EXPANSION = 1.35;
const MOSAIC_GROUP_PADDING = 14;
const MOSAIC_CELL_GAP = 12;
const MOSAIC_CONTAINER_HEADER_HEIGHT = 42;
const MIN_MOSAIC_ASPECT_RATIO = 0.35;
const MAX_MOSAIC_ASPECT_RATIO = 2.8;
const DEFAULT_MOSAIC_ASPECT_RATIO = MOSAIC_CANVAS_WIDTH / MOSAIC_MIN_HEIGHT;

interface Rect {
  left: number;
  top: number;
  width: number;
  height: number;
}

interface ContainmentPlacement {
  frame: Rect;
  placements: Map<string, Rect>;
}

interface PackedContainmentChild {
  child: ContainmentPlacement;
  left: number;
  top: number;
}

interface MosaicTreeNode {
  draft: SizedKnowledgeDraft;
  children: MosaicTreeNode[];
  ownWeight: number;
  weight: number;
}

interface WeightedMosaicItem<T> {
  value: T;
  weight: number;
}

function insetRect(rect: Rect, amount: number): Rect {
  const safeX = Math.min(amount, rect.width / 4);
  const safeY = Math.min(amount, rect.height / 4);
  return {
    left: rect.left + safeX,
    top: rect.top + safeY,
    width: Math.max(1, rect.width - safeX * 2),
    height: Math.max(1, rect.height - safeY * 2),
  };
}

function mosaicCanvasSize(
  totalWeight: number,
  targetAspectRatio: number | undefined,
): UnifiedIndexNodeSize {
  const requestedAspectRatio = Number.isFinite(targetAspectRatio)
    ? targetAspectRatio as number
    : DEFAULT_MOSAIC_ASPECT_RATIO;
  const aspectRatio = Math.min(
    MAX_MOSAIC_ASPECT_RATIO,
    Math.max(MIN_MOSAIC_ASPECT_RATIO, requestedAspectRatio),
  );
  const area = Math.max(
    MOSAIC_CANVAS_WIDTH * MOSAIC_MIN_HEIGHT,
    totalWeight * MOSAIC_AREA_EXPANSION,
  );
  let width = Math.sqrt(area * aspectRatio);
  let height = area / width;

  if (width < MIN_CANVAS_WIDTH) {
    width = MIN_CANVAS_WIDTH;
    height = Math.max(MIN_CANVAS_HEIGHT, area / width);
  }
  if (height < MIN_CANVAS_HEIGHT) {
    height = MIN_CANVAS_HEIGHT;
    width = Math.max(MIN_CANVAS_WIDTH, area / height);
  }

  return {
    width: Math.ceil(width),
    height: Math.ceil(height),
  };
}

function splitWeightedMosaic<T>(
  items: readonly WeightedMosaicItem<T>[],
  rect: Rect,
  onPlace: (item: T, rect: Rect) => void,
  axis: 'x' | 'y' = rect.width >= rect.height ? 'x' : 'y',
): void {
  if (items.length === 0) return;
  if (items.length === 1) {
    onPlace(items[0].value, rect);
    return;
  }

  const totalWeight = items.reduce((sum, item) => sum + item.weight, 0);
  let leftWeight = 0;
  let splitIndex = 1;
  let bestDifference = Number.POSITIVE_INFINITY;
  for (let index = 1; index < items.length; index += 1) {
    leftWeight += items[index - 1].weight;
    const difference = Math.abs(totalWeight / 2 - leftWeight);
    if (difference < bestDifference) {
      bestDifference = difference;
      splitIndex = index;
    }
  }

  const leftItems = items.slice(0, splitIndex);
  const rightItems = items.slice(splitIndex);
  const resolvedLeftWeight = leftItems.reduce((sum, item) => sum + item.weight, 0);
  const ratio = totalWeight > 0 ? resolvedLeftWeight / totalWeight : 0.5;

  if (axis === 'x') {
    const leftWidth = rect.width * ratio;
    splitWeightedMosaic(leftItems, { ...rect, width: leftWidth }, onPlace, 'y');
    splitWeightedMosaic(rightItems, {
      left: rect.left + leftWidth,
      top: rect.top,
      width: rect.width - leftWidth,
      height: rect.height,
    }, onPlace, 'y');
    return;
  }

  const topHeight = rect.height * ratio;
  splitWeightedMosaic(leftItems, { ...rect, height: topHeight }, onPlace, 'x');
  splitWeightedMosaic(rightItems, {
    left: rect.left,
    top: rect.top + topHeight,
    width: rect.width,
    height: rect.height - topHeight,
  }, onPlace, 'x');
}

function buildMosaicTree(
  graphId: string,
  sizedById: ReadonlyMap<string, SizedKnowledgeDraft>,
  childrenByGraphId: ReadonlyMap<string, readonly string[]>,
  path = new Set<string>(),
  assignedGraphIds = new Set<string>(),
): MosaicTreeNode | null {
  const draft = sizedById.get(graphId);
  if (!draft || path.has(graphId) || assignedGraphIds.has(graphId)) return null;

  assignedGraphIds.add(graphId);
  const nextPath = new Set(path);
  nextPath.add(graphId);
  const children = (childrenByGraphId.get(graphId) ?? [])
    .map((childId) => buildMosaicTree(
      childId,
      sizedById,
      childrenByGraphId,
      nextPath,
      assignedGraphIds,
    ))
    .filter((child): child is MosaicTreeNode => !!child);
  const ownWeight = Math.max(
    MIN_CLASS_WIDTH * HEADER_HEIGHT,
    draft.size.width * draft.size.height,
  );
  return {
    draft,
    children,
    ownWeight,
    weight: ownWeight + children.reduce((sum, child) => sum + child.weight, 0),
  };
}

function layoutMosaicTree(
  tree: MosaicTreeNode,
  rect: Rect,
  nodeRects: Map<string, Rect>,
  frames: UnifiedIndexContainmentFrame[],
  containerNodeIds: Set<string>,
  depth: number,
): void {
  if (tree.children.length === 0) {
    nodeRects.set(tree.draft.id, insetRect(rect, MOSAIC_CELL_GAP / 2));
    return;
  }

  const frameRect = insetRect(rect, MOSAIC_CELL_GAP / 2);
  containerNodeIds.add(tree.draft.id);
  frames.push({
    id: `containment:${tree.draft.id}`,
    nodeId: tree.draft.id,
    knowledgeNodeId: tree.draft.knowledgeNodeId,
    left: frameRect.left,
    top: frameRect.top,
    width: frameRect.width,
    height: frameRect.height,
    depth,
  });
  const innerRect = insetRect(frameRect, MOSAIC_GROUP_PADDING);
  const headerHeight = Math.min(
    MOSAIC_CONTAINER_HEADER_HEIGHT,
    Math.max(1, innerRect.height - 1),
  );
  const headerGap = Math.min(
    MOSAIC_CELL_GAP,
    Math.max(0, innerRect.height - headerHeight - 1),
  );
  nodeRects.set(tree.draft.id, {
    left: innerRect.left,
    top: innerRect.top,
    width: innerRect.width,
    height: headerHeight,
  });
  const childrenRect = {
    left: innerRect.left,
    top: innerRect.top + headerHeight + headerGap,
    width: innerRect.width,
    height: Math.max(1, innerRect.height - headerHeight - headerGap),
  };
  const items: WeightedMosaicItem<MosaicTreeNode>[] = tree.children.map((child) => ({
    value: child,
    weight: child.weight,
  }));
  items.sort((left, right) => right.weight - left.weight);
  splitWeightedMosaic(items, childrenRect, (child, itemRect) => {
    layoutMosaicTree(child, itemRect, nodeRects, frames, containerNodeIds, depth + 1);
  });
}

function containmentTargetInnerWidth(children: readonly ContainmentPlacement[]): number {
  if (children.length === 0) return MIN_MATRIX_INNER_WIDTH;

  const widths = children.map((child) => child.frame.width).sort((left, right) => left - right);
  const medianWidth = widths[Math.floor(widths.length / 2)] ?? MIN_CLASS_WIDTH;
  const widestWidth = widths[widths.length - 1] ?? MIN_CLASS_WIDTH;
  const desiredColumns = Math.max(1, Math.ceil(Math.sqrt(children.length)));
  const desiredWidth = desiredColumns * medianWidth
    + MATRIX_CHILD_GAP * Math.max(0, desiredColumns - 1);
  const heterogeneousWidth = widestWidth + medianWidth + MATRIX_CHILD_GAP;
  const cappedWidth = Math.min(
    MAX_MATRIX_INNER_WIDTH,
    Math.max(MIN_MATRIX_INNER_WIDTH, desiredWidth, heterogeneousWidth),
  );
  return Math.max(widestWidth, cappedWidth);
}

function containmentRectsOverlap(
  left: PackedContainmentChild,
  right: PackedContainmentChild,
): boolean {
  return !(
    left.left + left.child.frame.width + MATRIX_CHILD_GAP <= right.left
    || right.left + right.child.frame.width + MATRIX_CHILD_GAP <= left.left
    || left.top + left.child.frame.height + MATRIX_CHILD_GAP <= right.top
    || right.top + right.child.frame.height + MATRIX_CHILD_GAP <= left.top
  );
}

/**
 * Bottom-left rectangle packing for containment subtrees. Unlike shelf rows,
 * this lets later small boxes occupy the space below a short sibling while a
 * taller subtree continues beside them.
 */
function packContainmentChildren(
  children: readonly ContainmentPlacement[],
  targetWidth: number,
  occupied: readonly PackedContainmentChild[] = [],
): PackedContainmentChild[] {
  const packed: PackedContainmentChild[] = [...occupied];
  const reservedCount = packed.length;

  for (const child of children) {
    const candidateLefts = new Set<number>([0]);
    const candidateTops = new Set<number>([0]);
    for (const placed of packed) {
      candidateLefts.add(placed.left);
      candidateLefts.add(placed.left + placed.child.frame.width + MATRIX_CHILD_GAP);
      candidateTops.add(placed.top);
      candidateTops.add(placed.top + placed.child.frame.height + MATRIX_CHILD_GAP);
    }

    const candidates = [...candidateTops]
      .flatMap((top) => [...candidateLefts].map((left) => ({ left, top })))
      .filter(({ left }) => left + child.frame.width <= targetWidth + 0.5)
      .sort((left, right) => left.top - right.top || left.left - right.left);

    const position = candidates.find(({ left, top }) => {
      const candidate = { child, left, top };
      return packed.every((placed) => !containmentRectsOverlap(candidate, placed));
    }) ?? {
      left: 0,
      top: packed.reduce(
        (bottom, placed) => Math.max(
          bottom,
          placed.top + placed.child.frame.height + MATRIX_CHILD_GAP,
        ),
        0,
      ),
    };

    packed.push({ child, ...position });
  }

  return packed.slice(reservedCount);
}

function estimatedTextWidth(text: string): number {
  let width = 0;
  for (const character of Array.from(text.trim())) {
    if (/\s/.test(character)) width += 4;
    else if (/[\u2e80-\u9fff\uf900-\ufaff\u3040-\u30ff\uac00-\ud7af]/.test(character)) {
      width += 12;
    } else if (/[A-Z0-9]/.test(character)) width += 7.6;
    else width += 6.7;
  }
  return width;
}

function memberKindFor(node: ExplanationIndexNode): UnifiedIndexMemberKind {
  return 'pageId' in node.selection && node.selection.pageId !== null
    ? UnifiedIndexMemberKind.Page
    : UnifiedIndexMemberKind.Tab;
}

function tagsForSelection(
  explanation: NodeExplanation | undefined,
  selection: ExplanationIndexSelection,
): readonly string[] {
  if (!explanation || !('tabId' in selection)) return [];
  const tab = findTab(explanation.tabs, selection.tabId);
  if (!tab) return [];
  if (selection.pageId === null) return tab.tags ?? [];
  return findPage(explicitPagesForTab(explanation, tab), selection.pageId)?.tags ?? [];
}

export function collectIndexMembers(
  index: ExplanationIndexNode,
  explanation?: NodeExplanation,
): UnifiedIndexMember[] {
  const members: UnifiedIndexMember[] = [];
  const visit = (nodes: readonly ExplanationIndexNode[], depth: number) => {
    for (const node of nodes) {
      const isDefinitionMember =
        node.label.trim() === '定义' ||
        ('tabId' in node.selection && node.selection.tabId === 'def');
      if (!isDefinitionMember) {
        members.push({
          id: node.id,
          kind: memberKindFor(node),
          label: node.label || '未命名',
          content: node.content ?? '',
          tags: tagsForSelection(explanation, node.selection),
          depth,
          selection: node.selection,
        });
      }
      visit(node.children, depth + 1);
    }
  };
  visit(index.children, 0);
  return members;
}

function collectContainedSubtreeIds(
  ownerId: string,
  knowledgeEdges: readonly KnowledgeEdge[],
): readonly string[] {
  const seen = new Set<string>([ownerId]);
  const queue = [ownerId];
  while (queue.length > 0) {
    const current = queue.shift();
    if (!current) continue;
    for (const { edge } of collectDirectContainmentRelations(knowledgeEdges, current)) {
      if (seen.has(edge.target)) continue;
      seen.add(edge.target);
      queue.push(edge.target);
    }
  }
  return [...seen].filter((nodeId) => nodeId !== ownerId);
}

function containmentChildrenByGraphId(
  drafts: readonly KnowledgeDraft[],
  knowledgeEdges: readonly KnowledgeEdge[],
): Map<string, string[]> {
  const graphIdByKnowledgeId = new Map(
    drafts.map((draft) => [draft.knowledgeNodeId, draft.id]),
  );
  const children = new Map<string, string[]>();
  for (const edge of knowledgeEdges) {
    if (edge.type !== CONTAINMENT_EDGE_TYPE) continue;
    const sourceId = graphIdByKnowledgeId.get(edge.source);
    const targetId = graphIdByKnowledgeId.get(edge.target);
    if (!sourceId || !targetId || sourceId === targetId) continue;
    const list = children.get(sourceId) ?? [];
    list.push(targetId);
    children.set(sourceId, list);
  }
  return children;
}

function layoutContainmentNode(
  graphId: string,
  sizedById: Map<string, SizedKnowledgeDraft>,
  childrenByGraphId: Map<string, string[]>,
  visited = new Set<string>(),
): ContainmentPlacement {
  const draft = sizedById.get(graphId);
  const placements = new Map<string, Rect>();
  if (!draft || visited.has(graphId)) {
    return { frame: { left: 0, top: 0, width: 0, height: 0 }, placements };
  }

  const childIds = childrenByGraphId.get(graphId) ?? [];
  if (childIds.length === 0) {
    const frame = {
      left: 0,
      top: 0,
      width: draft.size.width,
      height: draft.size.height,
    };
    placements.set(graphId, frame);
    return { frame, placements };
  }

  const nextVisited = new Set(visited);
  nextVisited.add(graphId);
  const innerLeft = MATRIX_PAD_X;
  const children = childIds.map(
    (childId) => layoutContainmentNode(childId, sizedById, childrenByGraphId, nextVisited),
  );
  const targetInnerWidth = containmentTargetInnerWidth(children);
  const frameWidth = Math.max(
    draft.size.width + MATRIX_PAD_X * 2,
    targetInnerWidth + MATRIX_PAD_X * 2,
  );
  const nodeLeft = MATRIX_PAD_X;
  const nodeTop = MATRIX_PAD_TOP;
  placements.set(graphId, {
    left: nodeLeft,
    top: nodeTop,
    width: draft.size.width,
    height: draft.size.height,
  });
  const reservedParent: PackedContainmentChild = {
    child: {
      frame: { left: 0, top: 0, width: draft.size.width, height: draft.size.height },
      placements: new Map(),
    },
    left: 0,
    top: 0,
  };
  const packedChildren = packContainmentChildren(children, targetInnerWidth, [reservedParent]);
  let contentRight = innerLeft;
  let contentBottom = nodeTop + draft.size.height;

  for (const { child, left, top } of packedChildren) {
    const childLeft = innerLeft + left;
    const childTop = nodeTop + top;
    for (const [id, rect] of child.placements) {
      placements.set(id, {
        left: rect.left + childLeft,
        top: rect.top + childTop,
        width: rect.width,
        height: rect.height,
      });
    }
    contentRight = Math.max(contentRight, childLeft + child.frame.width);
    contentBottom = Math.max(contentBottom, childTop + child.frame.height);
  }

  const width = Math.max(frameWidth, contentRight + MATRIX_PAD_X);
  const frame = {
    left: 0,
    top: 0,
    width,
    height: contentBottom + MATRIX_PAD_BOTTOM,
  };
  return { frame, placements };
}

function typeRelationKindFor(edge: KnowledgeEdge): TypeRelationKind | null {
  switch (edge.type) {
    case TypeRelationKind.Implements:
      return TypeRelationKind.Implements;
    case TypeRelationKind.Extends:
      return TypeRelationKind.Extends;
    default:
      return null;
  }
}

function collectTypeEdgesForNodes(
  nodeIds: ReadonlySet<string>,
  knowledgeEdges: readonly KnowledgeEdge[],
): UnifiedIndexGraphEdge[] {
  const edges: UnifiedIndexGraphEdge[] = [];
  const edgeIds = new Set<string>();
  for (const edge of knowledgeEdges) {
    const kind = typeRelationKindFor(edge);
    if (!kind) continue;
    if (!nodeIds.has(edge.source) || !nodeIds.has(edge.target)) continue;
    if (edgeIds.has(edge.id)) continue;
    edgeIds.add(edge.id);
    edges.push({
      id: edge.id,
      sourceId: edge.source,
      targetId: edge.target,
      kind,
    });
  }
  return edges;
}

function logicalRelationKind(edge: KnowledgeEdge): UnifiedIndexEdgeKind | null {
  if (DEPENDENCY_EDGE_TYPES.has(edge.type)) return UnifiedIndexEdgeKind.Dependency;
  if (ASSOCIATION_EDGE_TYPES.has(edge.type)) return UnifiedIndexEdgeKind.Association;
  return null;
}

function graphIdForKnowledge(nodeId: string, ownerId: string, splitRoots: boolean): string {
  if (splitRoots && nodeId === ownerId) return `knowledge:${nodeId}:owner`;
  return `knowledge:${nodeId}`;
}

function definitionForKnowledge(node?: KnowledgeNode): string {
  const root = String(node?.card?.rootContent ?? '').trim();
  if (root) return root;
  const definition = node?.card?.tabs?.find((tab) => tab.id === 'def')?.content;
  if (String(definition ?? '').trim()) return String(definition);
  return String(node?.card?.tabs?.find((tab) => String(tab.content ?? '').trim())?.content ?? '');
}

function draftForKnowledge(
  nodeId: string,
  depth: number,
  ownerId: string,
  ownerLabel: string,
  ownerIndex: ExplanationIndexNode,
  relationRootId: string,
  relationRootLabel: string,
  nodePool: Record<string, KnowledgeNode>,
  splitRoots: boolean,
  logicalReference = false,
  containedChild = false,
): KnowledgeDraft {
  const knowledgeNode = nodePool[nodeId];
  const isOwner = nodeId === ownerId;
  return {
    id: graphIdForKnowledge(nodeId, ownerId, splitRoots),
    depth,
    label: isOwner
      ? ownerLabel
      : nodeId === relationRootId
        ? relationRootLabel
        : knowledgeNode?.label ?? nodeId,
     content: isOwner ? ownerIndex.content ?? '' : definitionForKnowledge(knowledgeNode),
    knowledgeNodeId: nodeId,
    members: isOwner ? collectIndexMembers(ownerIndex, knowledgeNode?.card) : [],
    tags: knowledgeNode?.tags ?? [],
    rootSelection: isOwner
      ? ownerIndex.selection
      : { kind: ROOT_SELECTION_KIND, nodeId },
    owner: isOwner,
    relationRoot: nodeId === relationRootId,
    logicalReference,
    containedChild,
  };
}

function sizeDraft(
  draft: KnowledgeDraft,
  collapsedNodeIds: ReadonlySet<string>,
): SizedKnowledgeDraft {
  const collapsed = collapsedNodeIds.has(draft.id);
  const visibleMembers = collapsed ? [] : draft.members.slice(0, MAX_VISIBLE_MEMBERS);
  const hiddenMemberCount = collapsed
    ? 0
    : Math.max(0, draft.members.length - visibleMembers.length);
  const widestMember = visibleMembers.reduce(
    (width, member) => Math.max(width, estimatedTextWidth(member.label) + member.depth * 14),
    0,
  );
  const width = Math.max(
    MIN_CLASS_WIDTH,
    Math.ceil(Math.max(
      estimatedTextWidth(draft.label) + HEADER_HORIZONTAL_PADDING,
      estimatedTextWidth(draft.tags.slice(0, 3).join('  ')) + 52,
      widestMember + 160,
    )),
  );
  const visibleRowCount = visibleMembers.length + (hiddenMemberCount > 0 ? 1 : 0);
  const memberHeight = collapsed || draft.members.length === 0
    ? 0
    : MEMBER_HEADER_HEIGHT + visibleRowCount * MEMBER_ROW_HEIGHT + MEMBER_VERTICAL_PADDING;
  return {
    ...draft,
    visibleMembers,
    hiddenMemberCount,
    collapsed,
    size: { width, height: HEADER_HEIGHT + memberHeight },
  };
}

/**
 * IDEA 类图风格：基于连接关系对每层节点做 barycenter 启发式排序，
 * 迭代双向 sweep 以减少跨层边的交叉数量。
 * 保留 owner 优先、logicalReference 靠后的分组约束。
 */
function minimizeLayerCrossings(
  layers: Map<number, SizedKnowledgeDraft[]>,
  edges: readonly UnifiedIndexGraphEdge[],
): void {
  const adjacency = new Map<string, Set<string>>();
  for (const edge of edges) {
    let sourceSet = adjacency.get(edge.sourceId);
    if (!sourceSet) {
      sourceSet = new Set();
      adjacency.set(edge.sourceId, sourceSet);
    }
    sourceSet.add(edge.targetId);
    let targetSet = adjacency.get(edge.targetId);
    if (!targetSet) {
      targetSet = new Set();
      adjacency.set(edge.targetId, targetSet);
    }
    targetSet.add(edge.sourceId);
  }

  const groupRank = (draft: SizedKnowledgeDraft): number => {
    if (draft.owner) return 0;
    if (draft.logicalReference) return 2;
    return 1;
  };

  const indexOfLayer = (layer: readonly SizedKnowledgeDraft[]) => (
    new Map(layer.map((draft, index) => [draft.id, index]))
  );

  const sortByBarycenter = (
    layer: SizedKnowledgeDraft[],
    refIndex: Map<string, number>,
  ) => {
    const barycenter = new Map<string, number>();
    layer.forEach((draft, index) => {
      const neighbors = adjacency.get(draft.id);
      if (!neighbors) {
        barycenter.set(draft.id, index);
        return;
      }
      let sum = 0;
      let count = 0;
      for (const neighborId of neighbors) {
        const position = refIndex.get(neighborId);
        if (position === undefined) continue;
        sum += position;
        count += 1;
      }
      barycenter.set(draft.id, count > 0 ? sum / count : index);
    });
    layer.sort((left, right) => {
      const groupDiff = groupRank(left) - groupRank(right);
      if (groupDiff !== 0) return groupDiff;
      const baryDiff = (barycenter.get(left.id) ?? 0) - (barycenter.get(right.id) ?? 0);
      if (baryDiff !== 0) return baryDiff;
      return left.label.localeCompare(right.label, 'zh-CN');
    });
  };

  const sortedDepths = [...layers.keys()].sort((left, right) => right - left);
  for (let iteration = 0; iteration < 6; iteration += 1) {
    for (let k = 1; k < sortedDepths.length; k += 1) {
      const refLayer = layers.get(sortedDepths[k - 1]);
      const layer = layers.get(sortedDepths[k]);
      if (!refLayer || !layer) continue;
      sortByBarycenter(layer, indexOfLayer(refLayer));
    }
    for (let k = sortedDepths.length - 2; k >= 0; k -= 1) {
      const refLayer = layers.get(sortedDepths[k + 1]);
      const layer = layers.get(sortedDepths[k]);
      if (!refLayer || !layer) continue;
      sortByBarycenter(layer, indexOfLayer(refLayer));
    }
  }
}

/**
 * 把一层的节点按当前顺序（barycenter 排序后）均衡拆成多条视觉行：
 * - 总宽不超过 MAX_ROW_WIDTH 时保持单行；
 * - 超宽时行数 = ceil(总宽 / MAX_ROW_WIDTH)，节点数按行数均匀分配
 *   （余数分摊到前几行），避免贪心塞满导致最后一行过窄、视觉失衡。
 */
function splitLayerIntoRows(layer: readonly SizedKnowledgeDraft[]): SizedKnowledgeDraft[][] {
  if (layer.length <= 1) return [layer as SizedKnowledgeDraft[]];
  const totalWidth = layer.reduce((width, node) => width + node.size.width, 0)
    + NODE_GAP * Math.max(0, layer.length - 1);
  if (totalWidth <= MAX_ROW_WIDTH) return [layer as SizedKnowledgeDraft[]];
  const rowCount = Math.min(layer.length, Math.ceil(totalWidth / MAX_ROW_WIDTH));
  const baseSize = Math.floor(layer.length / rowCount);
  let remainder = layer.length % rowCount;
  const rows: SizedKnowledgeDraft[][] = [];
  let cursor = 0;
  for (let rowIndex = 0; rowIndex < rowCount; rowIndex += 1) {
    const size = baseSize + (remainder > 0 ? 1 : 0);
    remainder = Math.max(0, remainder - 1);
    rows.push(layer.slice(cursor, cursor + size));
    cursor += size;
  }
  return rows.filter((row) => row.length > 0);
}

export function buildUnifiedIndexGraph({
  ownerId,
  ownerLabel,
  index,
  relationRootId,
  relationRootLabel,
  relationGraph,
  knowledgeEdges,
  containmentEdges,
  nodePool,
  collapsedNodeIds = new Set(),
  targetAspectRatio,
}: BuildUnifiedIndexGraphParams): UnifiedIndexGraphLayout {
  const physicalContainmentEdges = containmentEdges ?? knowledgeEdges;
  const splitRoots = ownerId !== relationRootId;
  const drafts = new Map<string, KnowledgeDraft>();
  const relationDepths = new Map(
    relationGraph.nodes.map((node) => [node.nodeId, node.depth]),
  );
  if (!relationDepths.has(relationRootId)) relationDepths.set(relationRootId, 0);

  for (const [nodeId, depth] of relationDepths) {
    const draft = draftForKnowledge(
      nodeId,
      depth,
      ownerId,
      ownerLabel,
      index,
      relationRootId,
      relationRootLabel,
      nodePool,
      splitRoots,
    );
    drafts.set(draft.id, draft);
  }

  if (splitRoots) {
    const ownerDraft = draftForKnowledge(
      ownerId,
      0,
      ownerId,
      ownerLabel,
      index,
      relationRootId,
      relationRootLabel,
      nodePool,
      splitRoots,
    );
    drafts.set(ownerDraft.id, ownerDraft);
  }

  const ownerGraphId = graphIdForKnowledge(ownerId, ownerId, splitRoots);
  const containedChildIds = collectContainedSubtreeIds(ownerId, physicalContainmentEdges);
  for (const childId of containedChildIds) {
    const childGraphId = graphIdForKnowledge(childId, ownerId, splitRoots);
    if (!drafts.has(childGraphId)) {
      const childDraft = draftForKnowledge(
        childId,
        0,
        ownerId,
        ownerLabel,
        index,
        relationRootId,
        relationRootLabel,
        nodePool,
        splitRoots,
        false,
        true,
      );
      drafts.set(childDraft.id, childDraft);
    } else {
      const existing = drafts.get(childGraphId);
      if (existing) {
        drafts.set(childGraphId, { ...existing, containedChild: true });
      }
    }
  }

  const ownerDraft = drafts.get(ownerGraphId);
  if (ownerDraft && containedChildIds.length > 0 && !relationDepths.has(ownerId)) {
    drafts.set(ownerGraphId, { ...ownerDraft, depth: Math.max(ownerDraft.depth, 1) });
  }
  for (const childId of containedChildIds) {
    const childGraphId = graphIdForKnowledge(childId, ownerId, splitRoots);
    const childDraft = drafts.get(childGraphId);
    if (childDraft && !relationDepths.has(childId)) {
      drafts.set(childGraphId, { ...childDraft, depth: 0 });
    }
  }

  for (const edge of knowledgeEdges) {
    if (edge.source !== ownerId || edge.target === ownerId) continue;
    const kind = logicalRelationKind(edge);
    if (!kind) continue;
    const targetGraphId = graphIdForKnowledge(edge.target, ownerId, splitRoots);
    if (!drafts.has(targetGraphId)) {
      const draft = draftForKnowledge(
        edge.target,
        1,
        ownerId,
        ownerLabel,
        index,
        relationRootId,
        relationRootLabel,
        nodePool,
        splitRoots,
        true,
      );
      drafts.set(draft.id, draft);
    }
  }

  const knowledgeNodeIds = new Set(
    [...drafts.values()].map((draft) => draft.knowledgeNodeId),
  );
  const edges: UnifiedIndexGraphEdge[] = relationGraph.edges.map((edge) => ({
    id: edge.edgeId,
    sourceId: graphIdForKnowledge(edge.sourceId, ownerId, splitRoots),
    targetId: graphIdForKnowledge(edge.targetId, ownerId, splitRoots),
    kind: edge.kind,
  }));
  const edgeIds = new Set(edges.map((edge) => edge.id));
  for (const edge of collectTypeEdgesForNodes(knowledgeNodeIds, knowledgeEdges)) {
    if (edgeIds.has(edge.id)) continue;
    edgeIds.add(edge.id);
    edges.push({
      ...edge,
      sourceId: graphIdForKnowledge(edge.sourceId, ownerId, splitRoots),
      targetId: graphIdForKnowledge(edge.targetId, ownerId, splitRoots),
    });
  }

  for (const edge of knowledgeEdges) {
    if (edge.source !== ownerId || edge.target === ownerId) continue;
    const kind = logicalRelationKind(edge);
    if (!kind) continue;
    edges.push({
      id: edge.id,
      sourceId: ownerGraphId,
      targetId: graphIdForKnowledge(edge.target, ownerId, splitRoots),
      kind,
    });
  }

  if (splitRoots) {
    edges.push({
      id: `projection:${ownerId}:${relationRootId}`,
      sourceId: ownerGraphId,
      targetId: graphIdForKnowledge(relationRootId, ownerId, splitRoots),
      kind: UnifiedIndexEdgeKind.Projection,
    });
  }

  const sizedDrafts = [...drafts.values()].map((draft) => sizeDraft(draft, collapsedNodeIds));
  const sizedById = new Map(sizedDrafts.map((draft) => [draft.id, draft]));
  const childrenByGraphId = containmentChildrenByGraphId(
    [...drafts.values()],
    physicalContainmentEdges,
  );
  const childGraphIds = new Set(
    [...childrenByGraphId.values()].flatMap((childIds) => childIds),
  );
  let rootDrafts = sizedDrafts.filter((draft) => !childGraphIds.has(draft.id));
  if (rootDrafts.length === 0) rootDrafts = sizedDrafts;
  const assignedGraphIds = new Set<string>();
  const roots = [...rootDrafts]
    .sort((left, right) => {
      if (left.owner !== right.owner) return left.owner ? -1 : 1;
      return left.label.localeCompare(right.label, 'zh-CN');
    })
    .map((draft) => buildMosaicTree(
      draft.id,
      sizedById,
      childrenByGraphId,
      new Set(),
      assignedGraphIds,
    ))
    .filter((tree): tree is MosaicTreeNode => !!tree)
    .sort((left, right) => {
      if (left.draft.owner !== right.draft.owner) return left.draft.owner ? -1 : 1;
      return right.weight - left.weight;
    });
  const totalWeight = roots.reduce((sum, tree) => sum + tree.weight, 0);
  const { width, height } = mosaicCanvasSize(totalWeight, targetAspectRatio);
  const nodeRects = new Map<string, Rect>();
  const containmentFrames: UnifiedIndexContainmentFrame[] = [];
  const containerNodeIds = new Set<string>();
  const rootItems = roots.map((tree) => ({ value: tree, weight: tree.weight }));
  splitWeightedMosaic(
    rootItems,
    { left: 0, top: 0, width, height },
    (tree, rect) => layoutMosaicTree(
      tree,
      rect,
      nodeRects,
      containmentFrames,
      containerNodeIds,
      0,
    ),
  );
  const nodes: UnifiedIndexGraphNode[] = sizedDrafts.flatMap((draft) => {
    const rect = nodeRects.get(draft.id);
    if (!rect) return [];
    return [{
      id: draft.id,
      kind: UnifiedIndexNodeKind.Knowledge,
      label: draft.label,
       content: draft.content,
      position: {
        x: rect.left + rect.width / 2,
        y: rect.top + rect.height / 2,
      },
      size: { width: rect.width, height: rect.height },
      knowledgeNodeId: draft.knowledgeNodeId,
      members: draft.visibleMembers,
      memberCount: draft.members.length,
      hiddenMemberCount: draft.hiddenMemberCount,
      tags: draft.tags,
      rootSelection: draft.rootSelection,
      owner: draft.owner,
      relationRoot: draft.relationRoot,
      logicalReference: draft.logicalReference,
      containedChild: draft.containedChild,
      containerHost: containerNodeIds.has(draft.id),
      collapsed: draft.collapsed,
    }];
  });

  return {
    nodes,
    edges,
    containmentFrames,
    width,
    height,
  };
}
