import type { ExplanationTab, KnowledgeEdge, KnowledgeNode, TreeNode } from '../types';
import { KnowledgeNodeKind, KnowledgeRelationKind } from '../types';
import {
  collectTreeNodes,
  collectTreeReferencesByNodeRef,
  findTreeNodeById,
} from '../knowledge/treeUtils';
import { isManagedContainmentEdge } from '../knowledge/containment';
import {
  RelationKind,
  VisualTone,
  VisualWeight,
  entityId,
  processId,
  processStepId,
  relationId,
  type EntityId,
  type MechanismModel,
  type MechanismProcess,
  type Relation,
} from './core';
import { validateMechanismSpec, type MechanismValidationResult } from './validation';

const MECHANISM_RELATION_KINDS = new Set<KnowledgeRelationKind>([
  KnowledgeRelationKind.Structure,
  KnowledgeRelationKind.Causality,
  KnowledgeRelationKind.StateTransition,
  KnowledgeRelationKind.Constraint,
]);

const PROCESS_RELATION_KINDS = new Set<KnowledgeRelationKind>([
  KnowledgeRelationKind.Causality,
  KnowledgeRelationKind.StateTransition,
]);

const PROJECTED_RELATION_KINDS: Record<
  KnowledgeRelationKind.Structure
    | KnowledgeRelationKind.Causality
    | KnowledgeRelationKind.StateTransition
    | KnowledgeRelationKind.Constraint,
  RelationKind
> = {
  [KnowledgeRelationKind.Structure]: RelationKind.Contains,
  [KnowledgeRelationKind.Causality]: RelationKind.RoutesTo,
  [KnowledgeRelationKind.StateTransition]: RelationKind.RoutesTo,
  [KnowledgeRelationKind.Constraint]: RelationKind.Locks,
};

export interface KnowledgeMechanismProjection {
  focusNodeId: string;
  mechanismNodeId: string;
  label: string;
  origin: EntityId;
  model: MechanismModel;
  process: MechanismProcess;
  sourceNodeIds: readonly string[];
  validation: MechanismValidationResult;
}

export interface KnowledgeMechanismInput {
  focusNodeId: string | null;
  nodePool: Readonly<Record<string, KnowledgeNode>>;
  knowledgeEdges: readonly KnowledgeEdge[];
  treeData: TreeNode;
}

export interface KnowledgeMechanismInspection {
  mechanismNodeId: string | null;
  validation: MechanismValidationResult | null;
}

export function inspectKnowledgeMechanism({
  focusNodeId,
  nodePool,
  knowledgeEdges,
  treeData,
}: KnowledgeMechanismInput): KnowledgeMechanismInspection {
  if (!focusNodeId || !nodePool[focusNodeId]) {
    return { mechanismNodeId: null, validation: null };
  }
  const mechanismNodeId = resolveOwningMechanismNodeId(
    focusNodeId,
    nodePool,
    knowledgeEdges,
    treeData,
  );
  if (!mechanismNodeId) return { mechanismNodeId: null, validation: null };
  return {
    mechanismNodeId,
    validation: validateMechanismSpec(
      mechanismNodeId,
      nodePool[mechanismNodeId].mechanismSpec,
      nodePool,
      knowledgeEdges,
    ),
  };
}

/**
 * Projects only explicitly typed dynamic knowledge into a mechanism.
 * Ordinary concepts and ordinary graph relations are intentionally rejected.
 */
export function projectKnowledgeMechanism({
  focusNodeId,
  nodePool,
  knowledgeEdges,
  treeData,
}: KnowledgeMechanismInput): KnowledgeMechanismProjection | null {
  if (!focusNodeId || !nodePool[focusNodeId]) return null;

  const inspection = inspectKnowledgeMechanism({
    focusNodeId,
    nodePool,
    knowledgeEdges,
    treeData,
  });
  const { mechanismNodeId, validation } = inspection;
  if (!mechanismNodeId || !validation?.valid) return null;

  const candidateNodeIds = collectMechanismCandidateNodeIds(
    mechanismNodeId,
    nodePool,
    knowledgeEdges,
    treeData,
  );
  const candidateNodeIdSet = new Set(candidateNodeIds);
  const mechanismSpec = nodePool[mechanismNodeId].mechanismSpec;
  if (!mechanismSpec) return null;
  const declaredMechanismNodeIds = new Set([
    mechanismNodeId,
    mechanismSpec.phenomenonNodeId,
    ...mechanismSpec.triggerNodeIds,
    ...mechanismSpec.participantNodeIds,
    ...mechanismSpec.stateNodeIds,
    ...mechanismSpec.outcomeNodeIds,
    ...mechanismSpec.failureNodeIds,
  ]);
  const sourceEdges = knowledgeEdges.filter(
    (edge) => isMechanismRelation(edge)
      && (!isManagedContainmentEdge(edge)
        || (declaredMechanismNodeIds.has(edge.source)
          && declaredMechanismNodeIds.has(edge.target)))
      && candidateNodeIdSet.has(edge.source)
      && candidateNodeIdSet.has(edge.target),
  );
  const processEdges = sourceEdges.filter(isProcessRelation);
  if (processEdges.length === 0) return null;

  const participatingNodeIds = new Set<string>([mechanismNodeId]);
  for (const edge of sourceEdges) {
    participatingNodeIds.add(edge.source);
    participatingNodeIds.add(edge.target);
  }
  const sourceNodeIds = candidateNodeIds.filter((nodeId) => participatingNodeIds.has(nodeId));

  const model: MechanismModel = {
    entities: sourceNodeIds.map((nodeId) => ({
      id: entityId(nodeId),
      label: nodePool[nodeId].label,
      note: nodeSummary(nodePool[nodeId]),
    })),
    relations: sourceEdges.map(projectRelation),
  };

  const processRelations = orderProcessRelations(
    processEdges,
    sourceNodeIds,
    mechanismNodeId,
  );
  const origin = deriveOrigin(processRelations, sourceNodeIds, mechanismNodeId);
  const outgoingCount = countOutgoingRelations(processRelations);
  const process: MechanismProcess = {
    id: processId(`knowledge.mechanism.${mechanismNodeId}`),
    label: nodePool[mechanismNodeId].label,
    steps: processRelations.map((edge) => {
      const source = entityId(edge.source);
      const target = entityId(edge.target);
      const projectedRelationId = relationId(edge.id);
      const targetTone = outgoingCount.get(edge.target)
        ? VisualTone.Active
        : VisualTone.Persisted;

      return {
        id: processStepId(`knowledge.mechanism.step.${edge.id}`),
        label: edge.label || `${nodePool[edge.source].label} -> ${nodePool[edge.target].label}`,
        relationId: projectedRelationId,
        entityVisuals: [
          { entityId: source, tone: VisualTone.Traversed, weight: VisualWeight.Normal },
          { entityId: target, tone: targetTone, weight: VisualWeight.Strong },
        ],
        relationVisuals: [
          { relationId: projectedRelationId, tone: targetTone, weight: VisualWeight.Strong },
        ],
      };
    }),
  };

  return {
    focusNodeId,
    mechanismNodeId,
    label: nodePool[mechanismNodeId].label,
    origin,
    model,
    process,
    sourceNodeIds,
    validation,
  };
}

function resolveOwningMechanismNodeId(
  focusNodeId: string,
  nodePool: Readonly<Record<string, KnowledgeNode>>,
  knowledgeEdges: readonly KnowledgeEdge[],
  treeData: TreeNode,
): string | null {
  if (nodePool[focusNodeId]?.kind === KnowledgeNodeKind.Mechanism) return focusNodeId;

  for (const reference of collectTreeReferencesByNodeRef(treeData, focusNodeId)) {
    const path = findTreePathById(treeData, reference.treeNodeId);
    for (let index = path.length - 1; index >= 0; index -= 1) {
      const nodeId = path[index].nodeRef;
      if (!nodeId) continue;
      if (nodePool[nodeId]?.kind === KnowledgeNodeKind.Mechanism) return nodeId;
    }
  }

  for (const node of Object.values(nodePool)) {
    if (node.kind !== KnowledgeNodeKind.Mechanism) continue;
    const scopedIds = new Set(collectTreeDescendantNodeIds(node.id, nodePool, treeData));
    if (knowledgeEdges.some(
      (edge) => isMechanismRelation(edge)
        && ((edge.source === focusNodeId && scopedIds.has(edge.target))
          || (edge.target === focusNodeId && scopedIds.has(edge.source))),
    )) return node.id;
  }

  return null;
}

function collectMechanismCandidateNodeIds(
  mechanismNodeId: string,
  nodePool: Readonly<Record<string, KnowledgeNode>>,
  knowledgeEdges: readonly KnowledgeEdge[],
  treeData: TreeNode,
): string[] {
  const orderedIds = collectTreeDescendantNodeIds(mechanismNodeId, nodePool, treeData);
  const includedIds = new Set(orderedIds);
  const scopedIds = new Set(includedIds);

  for (const edge of knowledgeEdges) {
    if (!isMechanismRelation(edge)) continue;
    if (edge.relationKind === KnowledgeRelationKind.Structure) continue;
    if (!scopedIds.has(edge.source) && !scopedIds.has(edge.target)) continue;
    for (const nodeId of [edge.source, edge.target]) {
      if (!nodePool[nodeId] || includedIds.has(nodeId)) continue;
      includedIds.add(nodeId);
      orderedIds.push(nodeId);
    }
  }
  return orderedIds;
}

function collectTreeDescendantNodeIds(
  rootNodeId: string,
  nodePool: Readonly<Record<string, KnowledgeNode>>,
  treeData: TreeNode,
): string[] {
  const orderedIds: string[] = [];
  const includedIds = new Set<string>();
  const include = (nodeId: string) => {
    if (!nodePool[nodeId] || includedIds.has(nodeId)) return;
    includedIds.add(nodeId);
    orderedIds.push(nodeId);
  };

  include(rootNodeId);
  for (const reference of collectTreeReferencesByNodeRef(treeData, rootNodeId)) {
    const treeNode = findTreeNodeById(treeData, reference.treeNodeId);
    if (!treeNode) continue;
    for (const descendant of collectTreeNodes(treeNode)) {
      if (descendant.nodeRef) include(descendant.nodeRef);
    }
  }
  return orderedIds;
}

function findTreePathById(root: TreeNode, treeNodeId: string): TreeNode[] {
  if (root.id === treeNodeId) return [root];
  for (const child of root.children ?? []) {
    const childPath = findTreePathById(child, treeNodeId);
    if (childPath.length > 0) return [root, ...childPath];
  }
  return [];
}

function isMechanismRelation(edge: KnowledgeEdge): boolean {
  return !!edge.relationKind && MECHANISM_RELATION_KINDS.has(edge.relationKind);
}

function isProcessRelation(edge: KnowledgeEdge): boolean {
  return !!edge.relationKind && PROCESS_RELATION_KINDS.has(edge.relationKind);
}

function projectRelation(edge: KnowledgeEdge): Relation {
  if (!edge.relationKind || !isMechanismRelation(edge)) {
    throw new Error(`Knowledge relation is not eligible for mechanism projection: ${edge.id}`);
  }
  const kind = PROJECTED_RELATION_KINDS[
    edge.relationKind as keyof typeof PROJECTED_RELATION_KINDS
  ];
  return {
    id: relationId(edge.id),
    kind,
    source: entityId(edge.source),
    target: entityId(edge.target),
    label: edge.label || edge.type,
  };
}

function orderProcessRelations(
  relations: readonly KnowledgeEdge[],
  sourceNodeIds: readonly string[],
  mechanismNodeId: string,
): KnowledgeEdge[] {
  if (relations.length < 2) return [...relations];

  const nodeOrder = new Map(sourceNodeIds.map((nodeId, index) => [nodeId, index]));
  const outgoing = new Map<string, KnowledgeEdge[]>();
  const incomingCount = new Map<string, number>();
  for (const relation of relations) {
    const sourceRelations = outgoing.get(relation.source) ?? [];
    sourceRelations.push(relation);
    outgoing.set(relation.source, sourceRelations);
    incomingCount.set(relation.target, (incomingCount.get(relation.target) ?? 0) + 1);
    if (!incomingCount.has(relation.source)) incomingCount.set(relation.source, 0);
  }

  const compareRelations = (left: KnowledgeEdge, right: KnowledgeEdge) =>
    compareNodeOrder(left.target, right.target, nodeOrder)
    || compareNodeOrder(left.source, right.source, nodeOrder)
    || left.id.localeCompare(right.id);
  for (const sourceRelations of outgoing.values()) sourceRelations.sort(compareRelations);

  const origin = chooseProcessOrigin(relations, sourceNodeIds, mechanismNodeId, incomingCount);
  const ordered: KnowledgeEdge[] = [];
  const visitedEdges = new Set<string>();
  const visitedNodes = new Set<string>();
  const queue = [origin];
  for (let cursor = 0; cursor < queue.length; cursor += 1) {
    const nodeId = queue[cursor];
    if (visitedNodes.has(nodeId)) continue;
    visitedNodes.add(nodeId);
    for (const relation of outgoing.get(nodeId) ?? []) {
      if (visitedEdges.has(relation.id)) continue;
      visitedEdges.add(relation.id);
      ordered.push(relation);
      queue.push(relation.target);
    }
  }

  return [
    ...ordered,
    ...relations.filter((relation) => !visitedEdges.has(relation.id)).sort(compareRelations),
  ];
}

function chooseProcessOrigin(
  relations: readonly KnowledgeEdge[],
  sourceNodeIds: readonly string[],
  mechanismNodeId: string,
  incomingCount: ReadonlyMap<string, number>,
): string {
  if (relations.some((relation) => relation.source === mechanismNodeId)) return mechanismNodeId;
  return sourceNodeIds.find(
    (nodeId) => incomingCount.get(nodeId) === 0
      && relations.some((relation) => relation.source === nodeId),
  ) ?? relations[0].source;
}

function deriveOrigin(
  relations: readonly KnowledgeEdge[],
  sourceNodeIds: readonly string[],
  mechanismNodeId: string,
): EntityId {
  const incomingCount = new Map<string, number>();
  for (const relation of relations) {
    incomingCount.set(relation.target, (incomingCount.get(relation.target) ?? 0) + 1);
    if (!incomingCount.has(relation.source)) incomingCount.set(relation.source, 0);
  }
  return entityId(chooseProcessOrigin(relations, sourceNodeIds, mechanismNodeId, incomingCount));
}

function countOutgoingRelations(relations: readonly KnowledgeEdge[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const relation of relations) {
    counts.set(relation.source, (counts.get(relation.source) ?? 0) + 1);
  }
  return counts;
}

function compareNodeOrder(
  leftId: string,
  rightId: string,
  nodeOrder: ReadonlyMap<string, number>,
): number {
  return (nodeOrder.get(leftId) ?? Number.MAX_SAFE_INTEGER)
    - (nodeOrder.get(rightId) ?? Number.MAX_SAFE_INTEGER);
}

function nodeSummary(node: KnowledgeNode): string | undefined {
  const content = node.card.rootContent ?? findFirstContent(node.card.tabs) ?? node.card.notes;
  if (!content) return undefined;
  const normalized = content.replace(/[`*_#>\[\]]/g, '').replace(/\s+/g, ' ').trim();
  return normalized.length > 140 ? `${normalized.slice(0, 137)}...` : normalized;
}

function findFirstContent(items: readonly ExplanationTab[]): string | undefined {
  for (const item of items) {
    if (item.content.trim()) return item.content;
    if (item.tabs?.length) {
      const nested = findFirstContent(item.tabs);
      if (nested) return nested;
    }
  }
  return undefined;
}
