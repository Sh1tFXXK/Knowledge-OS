import assert from 'node:assert/strict';
import test from 'node:test';
import { KnowledgeNodeKind, KnowledgeRelationKind } from '../src/types.ts';
import {
  inspectKnowledgeMechanism,
  projectKnowledgeMechanism,
} from '../src/mechanism/knowledgeProjection.ts';

/**
 * 回归背景：
 * 机制状态节点按「卸树留池」约定退出树（树只留名词，见 CONSTITUTION §2.5；
 * `aop_flow` / `tio_flow` / `asplit_bean_lifecycle` 的状态均已卸树）。
 * 但 `collectMechanismCandidateNodeIds` 原先只按**树后代**取候选，
 * 卸树后状态全部落空 → 内部转移边两端都不在作用域 → processEdges 为空
 * → `projectKnowledgeMechanism` 返回 null，机制视图显示「当前知识不构成机制」。
 * 修复后 spec 的显式声明与树作用域并列作为候选来源。
 */

const node = (id, kind, extra = {}) => ({ id, label: id, kind, card: { tabs: [] }, ...extra });
const stateNode = (id) => node(id, KnowledgeNodeKind.State);
const transition = (id, source, target) => ({
  id,
  source,
  target,
  type: KnowledgeRelationKind.StateTransition,
  relationKind: KnowledgeRelationKind.StateTransition,
  label: `${source}→${target}`,
});

/** 造一个 spec 完备的机制：形态对齐本批真实数据（宿主 + 触发 + 参与 + 状态 + 结果 + 转移边）。 */
function makeFixture({ statesInTree }) {
  const pool = {
    mech: node('mech', KnowledgeNodeKind.Mechanism, {
      role: 'mechanism',
      mechanismSpec: {
        phenomenonNodeId: 'mech',
        triggerNodeIds: ['trigger'],
        participantNodeIds: ['participant'],
        stateNodeIds: ['s1', 's2', 's3'],
        transitionEdgeIds: ['t1', 't2'],
        constraintEdgeIds: [],
        outcomeNodeIds: ['s3'],
        failureNodeIds: [],
      },
    }),
    trigger: { ...node('trigger', KnowledgeNodeKind.Event), role: 'mechanism' },
    participant: node('participant', KnowledgeNodeKind.Concept),
    s1: stateNode('s1'),
    s2: stateNode('s2'),
    s3: stateNode('s3'),
  };
  const edges = [transition('t1', 's1', 's2'), transition('t2', 's2', 's3')];
  // statesInTree=true  → 状态留在树里（旧形态，如 tpl_flow）
  // statesInTree=false → 状态已卸树留池（本批形态）
  const treeData = {
    id: 'root',
    name: 'root',
    nodeRef: 'root',
    children: [{
      id: 'tree_mech',
      name: '机制',
      nodeRef: 'mech',
      children: statesInTree
        ? ['s1', 's2', 's3'].map((id) => ({ id: `tree_${id}`, name: id, nodeRef: id, children: [] }))
        : [],
    }],
  };
  return { pool, edges, treeData };
}

test('机制状态卸树留池后，投影仍然成立（本批 §2.5 回归）', () => {
  const { pool, edges, treeData } = makeFixture({ statesInTree: false });

  const inspection = inspectKnowledgeMechanism({
    focusNodeId: 'mech', nodePool: pool, knowledgeEdges: edges, treeData,
  });
  assert.equal(inspection.mechanismNodeId, 'mech');
  assert.equal(inspection.validation.valid, true, inspection.validation.errors.join('; '));

  const projection = projectKnowledgeMechanism({
    focusNodeId: 'mech', nodePool: pool, knowledgeEdges: edges, treeData,
  });
  assert.ok(projection, '卸树后仍应投影出机制，而不是判定「当前知识不构成机制」');
  assert.equal(projection.mechanismNodeId, 'mech');
  assert.equal(projection.process.steps.length, 2);
  const labels = projection.model.entities.map((e) => e.label);
  for (const id of ['s1', 's2', 's3']) {
    assert.ok(labels.includes(id), `卸树状态 ${id} 应出现在机制实体集中`);
  }
});

test('状态留在树里时投影保持原有行为（不被修复破坏）', () => {
  const { pool, edges, treeData } = makeFixture({ statesInTree: true });
  const projection = projectKnowledgeMechanism({
    focusNodeId: 'mech', nodePool: pool, knowledgeEdges: edges, treeData,
  });
  assert.ok(projection);
  assert.equal(projection.process.steps.length, 2);
});

test('选中卸树状态时仍能回溯到宿主机制', () => {
  const { pool, edges, treeData } = makeFixture({ statesInTree: false });
  const inspection = inspectKnowledgeMechanism({
    focusNodeId: 's2', nodePool: pool, knowledgeEdges: edges, treeData,
  });
  assert.equal(inspection.mechanismNodeId, 'mech', 'spec 声明即确定宿主关系，不该依赖树路径');
});

test('未标记为 mechanism 的节点不产生投影', () => {
  const { pool, edges, treeData } = makeFixture({ statesInTree: false });
  pool.plain = node('plain', KnowledgeNodeKind.Concept);
  const projection = projectKnowledgeMechanism({
    focusNodeId: 'plain', nodePool: pool, knowledgeEdges: edges, treeData,
  });
  assert.equal(projection, null);
});

test('spec 声明缺失时不会把无关节点塞进候选集', () => {
  const { pool, edges, treeData } = makeFixture({ statesInTree: false });
  // 摘掉 spec → 校验失败 → 直接 null；同时验证 collectDeclaredMechanismNodeIds 对 undefined 安全
  delete pool.mech.mechanismSpec;
  const projection = projectKnowledgeMechanism({
    focusNodeId: 'mech', nodePool: pool, knowledgeEdges: edges, treeData,
  });
  assert.equal(projection, null);
});
