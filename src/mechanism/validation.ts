import {
  KnowledgeNodeKind,
  KnowledgeRelationKind,
  type KnowledgeEdge,
  type KnowledgeNode,
  type MechanismSpec,
} from '../types';

export interface MechanismValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export function createEmptyMechanismSpec(mechanismNodeId: string): MechanismSpec {
  return {
    phenomenonNodeId: mechanismNodeId,
    triggerNodeIds: [],
    participantNodeIds: [],
    stateNodeIds: [],
    transitionEdgeIds: [],
    constraintEdgeIds: [],
    outcomeNodeIds: [],
    failureNodeIds: [],
  };
}

export function validateMechanismSpec(
  mechanismNodeId: string,
  spec: MechanismSpec | undefined,
  nodePool: Readonly<Record<string, KnowledgeNode>>,
  knowledgeEdges: readonly KnowledgeEdge[],
): MechanismValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const mechanism = nodePool[mechanismNodeId];

  if (!spec) {
    return { valid: false, errors: ['缺少 MechanismSpec'], warnings };
  }
  if (mechanism?.kind !== KnowledgeNodeKind.Mechanism) {
    errors.push('机制根节点的 kind 必须为 mechanism');
  }
  if (spec.phenomenonNodeId !== mechanismNodeId) {
    errors.push('phenomenonNodeId 必须指向机制根节点');
  }

  const requiredNodeGroups = [
    ['triggerNodeIds', spec.triggerNodeIds],
    ['participantNodeIds', spec.participantNodeIds],
    ['stateNodeIds', spec.stateNodeIds],
    ['outcomeNodeIds', spec.outcomeNodeIds],
  ] as const;
  for (const [name, ids] of requiredNodeGroups) {
    if (ids.length === 0) errors.push(`${name} 不能为空`);
  }
  if (spec.stateNodeIds.length < 2) errors.push('机制至少需要两个状态');
  if (spec.transitionEdgeIds.length === 0) errors.push('transitionEdgeIds 不能为空');

  const declaredNodeIds = new Set([
    spec.phenomenonNodeId,
    ...spec.triggerNodeIds,
    ...spec.participantNodeIds,
    ...spec.stateNodeIds,
    ...spec.outcomeNodeIds,
    ...spec.failureNodeIds,
  ]);
  for (const nodeId of declaredNodeIds) {
    if (!nodePool[nodeId]) errors.push(`机制引用了不存在的节点: ${nodeId}`);
  }

  const edgesById = new Map(knowledgeEdges.map((edge) => [edge.id, edge]));
  const validateEdges = (
    edgeIds: readonly string[],
    allowedKinds: ReadonlySet<KnowledgeRelationKind>,
    groupName: string,
  ) => {
    for (const edgeId of edgeIds) {
      const edge = edgesById.get(edgeId);
      if (!edge) {
        errors.push(`${groupName} 引用了不存在的关系: ${edgeId}`);
        continue;
      }
      if (!edge.relationKind || !allowedKinds.has(edge.relationKind)) {
        errors.push(`${groupName} 的关系语义不匹配: ${edgeId}`);
      }
      if (!declaredNodeIds.has(edge.source) || !declaredNodeIds.has(edge.target)) {
        errors.push(`${groupName} 的关系端点不在机制声明中: ${edgeId}`);
      }
    }
  };

  validateEdges(
    spec.transitionEdgeIds,
    new Set([KnowledgeRelationKind.Causality, KnowledgeRelationKind.StateTransition]),
    'transitionEdgeIds',
  );
  validateEdges(
    spec.constraintEdgeIds,
    new Set([KnowledgeRelationKind.Constraint]),
    'constraintEdgeIds',
  );

  for (const nodeId of spec.stateNodeIds) {
    if (nodePool[nodeId]?.kind !== KnowledgeNodeKind.State) {
      errors.push(`状态引用的节点 kind 必须为 state: ${nodeId}`);
    }
  }
  for (const nodeId of spec.triggerNodeIds) {
    if (nodePool[nodeId]?.kind !== KnowledgeNodeKind.Event) {
      warnings.push(`触发节点最好使用 event kind: ${nodeId}`);
    }
  }

  return { valid: errors.length === 0, errors, warnings };
}
