import type { PersistedAppState } from './state';
import { APP_STATE_VERSION, createEmptyAppState } from './state';
import type { TreeNode, KnowledgeNode, KnowledgeEdge, Question } from '../types';
import { migrateNodePool } from './migrateViewDimensions';
import { normalizeTreeNode } from './treeUtils';
import { normalizeKnowledgePointTimeline } from './timeline';

const FILES = {
  treeData: 'tree-data.json',
  nodePool: 'node-pool.json',
  knowledgeEdges: 'knowledge-edges.json',
  questions: 'questions.json',
  inferenceResponses: 'inference-responses.json',
  timeline: 'timeline.json',
};

async function fetchFile<T>(filename: string, fallback: T): Promise<T> {
  try {
    const res = await fetch(`/api/data?file=${filename}`, { cache: 'no-store' });
    if (res.status === 404) return fallback;
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json() as T;
  } catch (e) {
    console.error(`Failed to fetch ${filename}`, e);
    return fallback;
  }
}

// 线上传输用压缩 JSON（服务端落盘时仍会格式化），12MB 级数据可省一半序列化与传输开销
async function saveFile<T>(filename: string, data: T): Promise<void> {
  try {
    const res = await fetch(`/api/data?file=${filename}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
  } catch (e) {
    console.error(`Failed to save ${filename}`, e);
    throw e;
  }
}

/** 持久化到本地文件的六个数据切片。 */
export type PersistedSliceKey =
  | 'treeData'
  | 'nodePool'
  | 'knowledgeEdges'
  | 'questions'
  | 'inferenceResponses'
  | 'timeline';

export type PersistedSlices = Pick<PersistedAppState, PersistedSliceKey>;

export const PERSISTED_SLICE_KEYS: readonly PersistedSliceKey[] = [
  'treeData',
  'nodePool',
  'knowledgeEdges',
  'questions',
  'inferenceResponses',
  'timeline',
] as const;

const SLICE_FILES: Record<PersistedSliceKey, string> = {
  treeData: FILES.treeData,
  nodePool: FILES.nodePool,
  knowledgeEdges: FILES.knowledgeEdges,
  questions: FILES.questions,
  inferenceResponses: FILES.inferenceResponses,
  timeline: FILES.timeline,
};

export function pickPersistedSlices(state: PersistedAppState): PersistedSlices {
  return {
    treeData: state.treeData,
    nodePool: state.nodePool,
    knowledgeEdges: state.knowledgeEdges,
    questions: state.questions,
    inferenceResponses: state.inferenceResponses,
    timeline: state.timeline,
  };
}

/** 通过引用对比找出真正变化过的切片：zustand 每次 set 只替换被改的切片。 */
export function dirtyPersistedSlices(
  next: PersistedSlices,
  saved: Partial<PersistedSlices> | null,
): PersistedSliceKey[] {
  if (!saved) return [...PERSISTED_SLICE_KEYS];
  return PERSISTED_SLICE_KEYS.filter((key) => next[key] !== saved[key]);
}

/** 只写入指定切片对应的数据文件，返回写入失败的切片。 */
export async function savePersistedSlices(
  slices: PersistedSlices,
  keys: readonly PersistedSliceKey[],
): Promise<PersistedSliceKey[]> {
  const results = await Promise.all(
    keys.map((key) =>
      saveFile(SLICE_FILES[key], slices[key]).then(
        () => null,
        () => key,
      ),
    ),
  );
  return results.filter((key): key is PersistedSliceKey => key !== null);
}

export async function loadStateFromFiles(): Promise<Partial<PersistedAppState>> {
  const [
    treeData,
    nodePool,
    knowledgeEdges,
    questions,
    inferenceResponses,
    timeline,
  ] = await Promise.all([
    fetchFile<TreeNode | null>(FILES.treeData, null),
    fetchFile<Record<string, KnowledgeNode> | null>(FILES.nodePool, null),
    fetchFile<KnowledgeEdge[] | null>(FILES.knowledgeEdges, null),
    fetchFile<Question[] | null>(FILES.questions, null),
    fetchFile<Record<string, string> | null>(FILES.inferenceResponses, null),
    fetchFile<unknown>(FILES.timeline, null),
  ]);

  const state: Partial<PersistedAppState> = {
    version: APP_STATE_VERSION,
  };

  if (treeData) state.treeData = normalizeTreeNode(treeData);
  if (nodePool) state.nodePool = migrateNodePool(nodePool);
  if (knowledgeEdges) state.knowledgeEdges = knowledgeEdges;
  if (questions) state.questions = questions;
  if (inferenceResponses) state.inferenceResponses = inferenceResponses;
  state.timeline = normalizeKnowledgePointTimeline(timeline);

  return state;
}

export async function loadCompleteStateFromFiles(): Promise<PersistedAppState> {
  const fileState = await loadStateFromFiles();
  const emptyState = createEmptyAppState();

  return {
    ...emptyState,
    ...fileState,
    version: APP_STATE_VERSION,
    graph: {
      ...emptyState.graph,
      ...(fileState.graph ?? {}),
    },
    treeData: normalizeTreeNode(fileState.treeData ?? emptyState.treeData),
    nodePool: fileState.nodePool ?? emptyState.nodePool,
    knowledgeEdges: fileState.knowledgeEdges ?? emptyState.knowledgeEdges,
    questions: fileState.questions ?? emptyState.questions,
    rules: fileState.rules ?? emptyState.rules,
    perspectives: fileState.perspectives ?? emptyState.perspectives,
    inferenceResponses: {
      ...emptyState.inferenceResponses,
      ...(fileState.inferenceResponses ?? {}),
    },
    timeline: fileState.timeline ?? emptyState.timeline,
  };
}

