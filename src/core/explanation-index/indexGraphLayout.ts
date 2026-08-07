import { explicitPagesForTab, type ExplanationIndexNode } from '../../knowledge/explanationIndex';
import { findPage, findTab } from '../../knowledge/explanationTree';
import { collectDirectContainmentRelations } from '../../knowledge/containment';
import type { TypeRelationGraph } from '../../knowledge/typeRelations';
import {
  TypeRelationKind,
  type ExplanationIndexSelection,
  type KnowledgeEdge,
  type KnowledgeNode,
  type NodeExplanation,
} from '../../types';

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
}

export interface UnifiedIndexGraphNode {
  id: string;
  kind: UnifiedIndexNodeKind;
  label: string;
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
  collapsed: boolean;
}

export interface UnifiedIndexGraphEdge {
  id: string;
  sourceId: string;
  targetId: string;
  kind: TypeRelationKind | UnifiedIndexEdgeKind;
}

export interface UnifiedIndexGraphLayout {
  nodes: readonly UnifiedIndexGraphNode[];
  edges: readonly UnifiedIndexGraphEdge[];
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
  nodePool: Record<string, KnowledgeNode>;
  collapsedNodeIds?: ReadonlySet<string>;
}

interface KnowledgeDraft {
  id: string;
  depth: number;
  label: string;
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

const ROOT_SELECTION_KIND = 'root' as const;
const MIN_CLASS_WIDTH = 224;
const HEADER_HEIGHT = 64;
const MEMBER_HEADER_HEIGHT = 25;
const MEMBER_ROW_HEIGHT = 25;
const MEMBER_VERTICAL_PADDING = 8;
const MAX_VISIBLE_MEMBERS = 60;
const NODE_GAP = 84;
const LEVEL_GAP = 112;
const OUTER_PADDING = 72;
/** 头部左侧折叠按钮预留 + 右侧操作按钮预留 */
const HEADER_HORIZONTAL_PADDING = 42 + 116;
/** 层内单条视觉行的最大内容宽度，超过则把该层均衡拆成多行 */
const MAX_ROW_WIDTH = 1480;
/** 同一层内相邻视觉行之间的垂直间距（小于层间距 LEVEL_GAP） */
const SUB_ROW_GAP = 64;
const MIN_CANVAS_WIDTH = 660;
const MIN_CANVAS_HEIGHT = 460;
const DEPENDENCY_EDGE_TYPES = new Set(['uses', 'depends-on', 'needs-for']);
const ASSOCIATION_EDGE_TYPES = new Set(['enables', 'leads-to', 'compares', 'relates-to']);

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
      members.push({
        id: node.id,
        kind: memberKindFor(node),
        label: node.label || '未命名',
        tags: tagsForSelection(explanation, node.selection),
        depth,
        selection: node.selection,
      });
      visit(node.children, depth + 1);
    }
  };
  visit(index.children, 0);
  return members;
}

function collectDirectContainedChildren(
  ownerId: string,
  knowledgeEdges: readonly KnowledgeEdge[],
): readonly string[] {
  return collectDirectContainmentRelations(knowledgeEdges, ownerId).map(
    ({ edge }) => edge.target,
  );
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
  nodePool,
  collapsedNodeIds = new Set(),
}: BuildUnifiedIndexGraphParams): UnifiedIndexGraphLayout {
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
  const containedChildIds = collectDirectContainedChildren(ownerId, knowledgeEdges);
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
  const layers = new Map<number, SizedKnowledgeDraft[]>();
  for (const draft of sizedDrafts) {
    const layer = layers.get(draft.depth) ?? [];
    layer.push(draft);
    layers.set(draft.depth, layer);
  }
  for (const layer of layers.values()) {
    layer.sort((left, right) => {
      if (left.owner !== right.owner) return left.owner ? -1 : 1;
      if (left.logicalReference !== right.logicalReference) return left.logicalReference ? 1 : -1;
      return left.label.localeCompare(right.label, 'zh-CN');
    });
  }

  minimizeLayerCrossings(layers, edges);

  const orderedDepths = [...layers.keys()].sort((left, right) => right - left);
  const rowsByDepth = orderedDepths.map((depth) => ({
    depth,
    rows: splitLayerIntoRows(layers.get(depth) ?? []),
  }));
  const rowWidth = (row: readonly SizedKnowledgeDraft[]) => (
    row.reduce((width, node) => width + node.size.width, 0)
      + NODE_GAP * Math.max(0, row.length - 1)
  );
  const width = Math.max(
    MIN_CANVAS_WIDTH,
    ...rowsByDepth.flatMap(({ rows }) => rows.map(
      (row) => rowWidth(row) + OUTER_PADDING * 2,
    )),
  );
  const nodes: UnifiedIndexGraphNode[] = [];
  let cursorY = OUTER_PADDING;

  for (const { rows } of rowsByDepth) {
    rows.forEach((row, rowIndex) => {
      const rowHeight = Math.max(...row.map((node) => node.size.height));
      let cursorX = (width - rowWidth(row)) / 2;
      const centerY = cursorY + rowHeight / 2;

      for (const draft of row) {
        nodes.push({
          id: draft.id,
          kind: UnifiedIndexNodeKind.Knowledge,
          label: draft.label,
          position: { x: cursorX + draft.size.width / 2, y: centerY },
          size: draft.size,
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
          collapsed: draft.collapsed,
        });
        cursorX += draft.size.width + NODE_GAP;
      }
      cursorY += rowHeight + (rowIndex === rows.length - 1 ? LEVEL_GAP : SUB_ROW_GAP);
    });
  }

  return {
    nodes,
    edges,
    width,
    height: Math.max(MIN_CANVAS_HEIGHT, cursorY - LEVEL_GAP + OUTER_PADDING),
  };
}
