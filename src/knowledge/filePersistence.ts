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

async function saveFile<T>(filename: string, data: T): Promise<void> {
  try {
    const res = await fetch(`/api/data?file=${filename}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data, null, 2),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
  } catch (e) {
    console.error(`Failed to save ${filename}`, e);
    throw e;
  }
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

export async function saveStateToFiles(state: PersistedAppState): Promise<void> {
  await Promise.all([
    saveFile(FILES.treeData, normalizeTreeNode(state.treeData)),
    saveFile(FILES.nodePool, migrateNodePool(state.nodePool)),
    saveFile(FILES.knowledgeEdges, state.knowledgeEdges),
    saveFile(FILES.questions, state.questions),
    saveFile(FILES.inferenceResponses, state.inferenceResponses),
    saveFile(FILES.timeline, state.timeline),
  ]);
}
