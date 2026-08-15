import { useMemo } from 'react';
import {
  createEmptyMechanismSpec,
  validateMechanismSpec,
} from '../../mechanism';
import type {
  KnowledgeEdge,
  KnowledgeNode,
  MechanismSpec,
  TreeNode,
} from '../../types';
import { KnowledgeNodeKind, KnowledgeRelationKind } from '../../types';
import { collectTreeNodes, collectTreeReferencesByNodeRef, findTreeNodeById } from '../../knowledge/treeUtils';

interface MechanismSpecEditorProps {
  node: KnowledgeNode;
  nodePool: Readonly<Record<string, KnowledgeNode>>;
  knowledgeEdges: readonly KnowledgeEdge[];
  treeData: TreeNode;
  onChange: (spec: MechanismSpec) => void;
  onChangeEdgeKind: (edgeId: string, relationKind: KnowledgeRelationKind | undefined) => void;
  onOpenMechanism: () => void;
}

const KIND_LABELS: Record<KnowledgeNodeKind, string> = {
  [KnowledgeNodeKind.Concept]: '概念',
  [KnowledgeNodeKind.Entity]: '实体',
  [KnowledgeNodeKind.State]: '状态',
  [KnowledgeNodeKind.Event]: '事件',
  [KnowledgeNodeKind.Rule]: '规则',
  [KnowledgeNodeKind.Mechanism]: '机制',
  [KnowledgeNodeKind.Evidence]: '证据',
};

const RELATION_LABELS: Record<string, string> = {
  '': '未分类',
  [KnowledgeRelationKind.Causality]: '因果',
  [KnowledgeRelationKind.StateTransition]: '状态转移',
  [KnowledgeRelationKind.Constraint]: '约束',
};

export default function MechanismSpecEditor({
  node,
  nodePool,
  knowledgeEdges,
  treeData,
  onChange,
  onChangeEdgeKind,
  onOpenMechanism,
}: MechanismSpecEditorProps) {
  const spec = node.mechanismSpec ?? createEmptyMechanismSpec(node.id);
  const scopedNodeIds = useMemo(() => collectScopedNodeIds(node.id, treeData, nodePool), [node.id, nodePool, treeData]);
  const scopedNodes = scopedNodeIds
    .map((id: string) => nodePool[id])
    .filter((candidate: KnowledgeNode | undefined): candidate is KnowledgeNode => !!candidate && candidate.id !== node.id);
  const scopedEdges = knowledgeEdges.filter(
    (edge) => scopedNodeIds.includes(edge.source)
      && scopedNodeIds.includes(edge.target)
      && edge.relationKind !== KnowledgeRelationKind.Structure
      && edge.relationKind !== KnowledgeRelationKind.Classification,
  );
  const validation = validateMechanismSpec(node.id, spec, nodePool, knowledgeEdges);

  const updateIds = (field: keyof Pick<MechanismSpec, 'triggerNodeIds' | 'participantNodeIds' | 'stateNodeIds' | 'outcomeNodeIds' | 'failureNodeIds'>, id: string) => {
    const values = spec[field];
    onChange({ ...spec, [field]: values.includes(id) ? values.filter((value) => value !== id) : [...values, id] });
  };

  const selectRelationKind = (edgeId: string, value: string) => {
    const relationKind = value === '' ? undefined : value as KnowledgeRelationKind;
    const transitionEdgeIds = spec.transitionEdgeIds.filter((id) => id !== edgeId);
    const constraintEdgeIds = spec.constraintEdgeIds.filter((id) => id !== edgeId);
    if (relationKind === KnowledgeRelationKind.StateTransition || relationKind === KnowledgeRelationKind.Causality) {
      transitionEdgeIds.push(edgeId);
    }
    if (relationKind === KnowledgeRelationKind.Constraint) constraintEdgeIds.push(edgeId);
    onChange({ ...spec, transitionEdgeIds, constraintEdgeIds });
    onChangeEdgeKind(edgeId, relationKind);
  };

  return (
    <section className="mechanism-spec-editor" aria-label="机制契约">
      <div className="mechanism-spec-editor-head">
        <div>
          <strong>机制契约</strong>
          <p>只有补齐动态规律后，机制视图才会启用。</p>
        </div>
        <button
          type="button"
          className="btn btn-primary btn-sm"
          disabled={!validation.valid}
          onClick={onOpenMechanism}
        >
          打开机制视图
        </button>
      </div>

      <div className="mechanism-spec-grid">
        <SpecNodeGroup label="触发事件" values={spec.triggerNodeIds} nodes={scopedNodes} onToggle={(id) => updateIds('triggerNodeIds', id)} />
        <SpecNodeGroup label="参与者 / 资源" values={spec.participantNodeIds} nodes={scopedNodes} onToggle={(id) => updateIds('participantNodeIds', id)} />
        <SpecNodeGroup label="状态" values={spec.stateNodeIds} nodes={scopedNodes} onToggle={(id) => updateIds('stateNodeIds', id)} />
        <SpecNodeGroup label="结果" values={spec.outcomeNodeIds} nodes={scopedNodes} onToggle={(id) => updateIds('outcomeNodeIds', id)} />
        <SpecNodeGroup label="失败路径" values={spec.failureNodeIds} nodes={scopedNodes} onToggle={(id) => updateIds('failureNodeIds', id)} />
      </div>

      <div className="mechanism-spec-relations">
        <div className="mechanism-spec-section-title">动态关系</div>
        {scopedEdges.length === 0 ? (
          <p className="text-muted">当前目录子树没有可绑定的关系边。</p>
        ) : scopedEdges.map((edge) => (
          <label key={edge.id} className="mechanism-spec-relation-row">
            <span>{nodePool[edge.source]?.label ?? edge.source} → {nodePool[edge.target]?.label ?? edge.target}</span>
            <select
              className="input"
              value={edge.relationKind && RELATION_LABELS[edge.relationKind] ? edge.relationKind : ''}
              onChange={(event: { target: { value: string } }) => selectRelationKind(edge.id, event.target.value)}
            >
              <option value="">未分类</option>
              <option value={KnowledgeRelationKind.StateTransition}>状态转移</option>
              <option value={KnowledgeRelationKind.Causality}>因果</option>
              <option value={KnowledgeRelationKind.Constraint}>约束</option>
            </select>
          </label>
        ))}
      </div>

      {!validation.valid ? (
        <ul className="mechanism-spec-validation mechanism-spec-validation--error">
          {validation.errors.map((error) => <li key={error}>{error}</li>)}
        </ul>
      ) : (
        <p className="mechanism-spec-validation mechanism-spec-validation--ok">机制契约已通过验证。</p>
      )}
    </section>
  );
}

function SpecNodeGroup({
  label,
  values,
  nodes,
  onToggle,
}: {
  label: string;
  values: readonly string[];
  nodes: readonly KnowledgeNode[];
  onToggle: (id: string) => void;
}) {
  return (
    <fieldset className="mechanism-spec-node-group">
      <legend>{label}</legend>
      {nodes.length === 0 ? <span className="text-muted">暂无节点</span> : nodes.map((candidate) => (
        <label key={candidate.id}>
          <input type="checkbox" checked={values.includes(candidate.id)} onChange={() => onToggle(candidate.id)} />
          <span>{candidate.label}</span>
          <small>{candidate.kind ? KIND_LABELS[candidate.kind] : '未分类'}</small>
        </label>
      ))}
    </fieldset>
  );
}

function collectScopedNodeIds(
  rootNodeId: string,
  treeData: TreeNode,
  nodePool: Readonly<Record<string, KnowledgeNode>>,
): string[] {
  const ids = new Set<string>([rootNodeId]);
  for (const reference of collectTreeReferencesByNodeRef(treeData, rootNodeId)) {
    const treeNode = findTreeNodeById(treeData, reference.treeNodeId);
    if (!treeNode) continue;
    for (const descendant of collectTreeNodes(treeNode)) {
      if (descendant.nodeRef && nodePool[descendant.nodeRef]) ids.add(descendant.nodeRef);
    }
  }
  return [...ids];
}
