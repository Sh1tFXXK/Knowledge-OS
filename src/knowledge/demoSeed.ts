/**
 * 知识库数据加载：从 JSON 数据文件构建应用初始状态。
 * 数据与代码分离——修改知识内容只需编辑 ../data/ 下的 JSON 文件。
 */
import type { PersistedAppState } from './state';
import type { KnowledgeNode, KnowledgeEdge, TreeNode, Question } from '../types';

import nodePoolData from '../../data/node-pool.json';
import knowledgeEdgesData from '../../data/knowledge-edges.json';
import treeDataRaw from '../../data/tree-data.json';
import questionsData from '../../data/questions.json';
import inferenceResponsesData from '../../data/inference-responses.json';
import { migrateNodePool } from './migrateViewDimensions';

function demoGraphSlice(): PersistedAppState['graph'] {
  const mk = (
    id: string,
    label: string,
    zone: 'axiom' | 'mechanism' | 'conclusion',
    x: number,
    y: number,
  ) => ({
    id,
    label,
    x,
    y,
    color: zone === 'axiom' ? '#8b5cf6' : zone === 'mechanism' ? '#ec4899' : '#06b6d4',
    size: zone === 'axiom' ? 38 : 34,
    zone,
    phase: 0,
    glow: id === 'g_mvcc',
    description: label,
  });

  return {
    axioms: [
      mk('g_version', '版本', 'axiom', 0.28, 0.12),
      mk('g_transaction', '事务', 'axiom', 0.5, 0.1),
      mk('g_isolation', '隔离级别', 'axiom', 0.72, 0.12),
    ],
    mechanisms: [
      mk('g_mvcc', 'MVCC', 'mechanism', 0.5, 0.32),
      mk('g_vchain', '版本链', 'mechanism', 0.32, 0.38),
      mk('g_vis', '可见性判断', 'mechanism', 0.68, 0.36),
      mk('g_readview', 'Read View', 'mechanism', 0.5, 0.42),
    ],
    conclusions: [
      mk('g_snapshot', '快照读', 'conclusion', 0.35, 0.58),
      mk('g_highconc', '高并发', 'conclusion', 0.65, 0.56),
    ],
    edges: [
      { id: 'g_e1', source: 'g_transaction', target: 'g_mvcc', type: 'belongs-to', label: '属于' },
      { id: 'g_e2', source: 'g_isolation', target: 'g_readview', type: 'belongs-to', label: '属于' },
      { id: 'g_e3', source: 'g_version', target: 'g_vchain', type: 'belongs-to', label: '属于' },
      { id: 'g_e4', source: 'g_mvcc', target: 'g_vchain', type: 'needs-for', label: '需要' },
      { id: 'g_e5', source: 'g_readview', target: 'g_vis', type: 'leads-to', label: '导致' },
      { id: 'g_e6', source: 'g_vis', target: 'g_snapshot', type: 'enables', label: '支撑' },
      { id: 'g_e7', source: 'g_mvcc', target: 'g_highconc', type: 'enables', label: '支撑' },
    ],
  };
}

export function createInitialAppState(): PersistedAppState {
  return {
    version: 7,
    treeData: treeDataRaw as TreeNode,
    nodePool: migrateNodePool(nodePoolData as Record<string, KnowledgeNode>),
    knowledgeEdges: knowledgeEdgesData as KnowledgeEdge[],
    graph: demoGraphSlice(),
    rules: [],
    perspectives: [],
    questions: questionsData as Question[],
    inferenceResponses: inferenceResponsesData as Record<string, string>,
    evolutionEvents: [],
  };
}

/** @deprecated 使用 createInitialAppState */
export const createDemoAppState = createInitialAppState;

export function isAppStateEmpty(state: PersistedAppState): boolean {
  return (
    Object.keys(state.nodePool).length === 0 &&
    state.knowledgeEdges.length === 0 &&
    state.graph.axioms.length === 0
  );
}
