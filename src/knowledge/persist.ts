import type { KnowledgeNode, TreeNode } from '../types';
import { createEmptyTreeRoot } from './defaults';
import {
  APP_STATE_VERSION,
  createEmptyAppState,
  type GraphSlice,
  type PersistedAppState,
} from './state';
import { createInitialAppState } from './demoSeed';

function mergeWithInitialKnowledge(stored: PersistedAppState): PersistedAppState {
  const canonical = createInitialAppState();

  // nodePool：stored 已有的保留，canonical 新增的补入（不覆盖用户编辑过的节点）
  const nodePool = { ...canonical.nodePool };
  for (const [id, node] of Object.entries(stored.nodePool)) {
    nodePool[id] = node; // stored 覆盖 canonical，保留用户编辑
  }

  // edges：all canonical edges + stored-only extras (full refresh from canonical)
  const canonicalEdgeIds = new Set(canonical.knowledgeEdges.map((e) => e.id));
  const extraEdges = stored.knowledgeEdges.filter((e) => !canonicalEdgeIds.has(e.id));
  const knowledgeEdges = [...canonical.knowledgeEdges, ...extraEdges];

  // treeData：递归合并 — stored 已有的保留，canonical 新增的补入
  function mergeTreeNodes(storedNode: TreeNode | undefined, canonicalNode: TreeNode): TreeNode {
    if (!storedNode) return canonicalNode;
    const storedChildMap = new Map((storedNode.children ?? []).map((c) => [c.id, c]));
    const canonicalChildMap = new Map((canonicalNode.children ?? []).map((c) => [c.id, c]));
    // stored 中保留的 + canonical 中新增的
    const mergedChildren: TreeNode[] = [];
    for (const child of canonicalNode.children ?? []) {
      mergedChildren.push(mergeTreeNodes(storedChildMap.get(child.id), child));
    }
    // stored 中独有的（用户创建的文件夹/引用）
    for (const child of storedNode.children ?? []) {
      if (!canonicalChildMap.has(child.id)) {
        mergedChildren.push(child);
      }
    }
    return { ...canonicalNode, ...storedNode, children: mergedChildren };
  }
  const treeData = mergeTreeNodes(stored.treeData, canonical.treeData);
  const storedQuestionIds = new Set(stored.questions.map((q) => q.id));
  const extraQuestions = stored.questions.filter(
    (q) => !canonical.questions.some((cq) => cq.id === q.id),
  );
  const questions = [
    ...canonical.questions.filter((cq) => storedQuestionIds.has(cq.id)),
    ...extraQuestions,
  ];

  return {
    ...stored,
    version: APP_STATE_VERSION,
    treeData: stored.treeData,
    nodePool,
    knowledgeEdges,
    questions,
    inferenceResponses: { ...canonical.inferenceResponses, ...stored.inferenceResponses },
    subSystems: canonical.subSystems,
    graph: stored.graph.axioms.length > 0 ? stored.graph : canonical.graph,
  };
}

const STORAGE_KEY = 'knowledge-os:app-state-v1';

/** 旧版分散 key（含预设数据时代），加载后不再写入 */
const LEGACY_KEYS = ['knowledge-os:universe-tree', 'knowledge-os:node-pool'] as const;

function hasStorage(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return typeof window.localStorage !== 'undefined';
  } catch {
    return false;
  }
}

function isTreeNode(value: unknown): value is TreeNode {
  if (!value || typeof value !== 'object') return false;
  const node = value as Partial<TreeNode>;
  const children = node.children;
  return (
    typeof node.id === 'string' &&
    typeof node.name === 'string' &&
    typeof node.count === 'number' &&
    typeof node.icon === 'string' &&
    (node.nodeRef === undefined || typeof node.nodeRef === 'string') &&
    (children === undefined || (Array.isArray(children) && children.every(isTreeNode)))
  );
}

function isNodePool(value: unknown): value is Record<string, KnowledgeNode> {
  if (!value || typeof value !== 'object') return false;
  return Object.values(value).every(
    (n) =>
      n &&
      typeof n === 'object' &&
      typeof (n as KnowledgeNode).id === 'string' &&
      typeof (n as KnowledgeNode).label === 'string' &&
      !!(n as KnowledgeNode).card,
  );
}

function isKnowledgeEdges(value: unknown): value is import('../types').KnowledgeEdge[] {
  return Array.isArray(value);
}

function normalizeAppState(raw: Record<string, unknown>): PersistedAppState {
  const empty = createEmptyAppState();
  return {
    ...empty,
    ...raw,
    version: APP_STATE_VERSION,
    treeData: isTreeNode(raw.treeData) ? raw.treeData : empty.treeData,
    nodePool: isNodePool(raw.nodePool) ? raw.nodePool : empty.nodePool,
    knowledgeEdges: isKnowledgeEdges(raw.knowledgeEdges) ? raw.knowledgeEdges : [],
    graph: raw.graph && typeof raw.graph === 'object'
      ? {
          axioms: Array.isArray((raw.graph as GraphSlice).axioms) ? (raw.graph as GraphSlice).axioms : [],
          mechanisms: Array.isArray((raw.graph as GraphSlice).mechanisms)
            ? (raw.graph as GraphSlice).mechanisms
            : [],
          conclusions: Array.isArray((raw.graph as GraphSlice).conclusions)
            ? (raw.graph as GraphSlice).conclusions
            : [],
          edges: Array.isArray((raw.graph as GraphSlice).edges) ? (raw.graph as GraphSlice).edges : [],
        }
      : empty.graph,
    questions: Array.isArray(raw.questions) ? raw.questions : empty.questions,
    rules: Array.isArray(raw.rules) ? raw.rules : empty.rules,
    perspectives: Array.isArray(raw.perspectives) ? raw.perspectives : empty.perspectives,
    subSystems: Array.isArray(raw.subSystems) ? raw.subSystems : empty.subSystems,
    inferenceResponses:
      raw.inferenceResponses && typeof raw.inferenceResponses === 'object'
        ? (raw.inferenceResponses as Record<string, string>)
        : empty.inferenceResponses,
  };
}

function isPersistedAppState(value: unknown): value is PersistedAppState {
  if (!value || typeof value !== 'object') return false;
  const s = value as PersistedAppState;
  return (
    (s.version === APP_STATE_VERSION || s.version === 2) &&
    isTreeNode(s.treeData) &&
    isNodePool(s.nodePool) &&
    isKnowledgeEdges(s.knowledgeEdges) &&
    !!s.graph &&
    Array.isArray(s.graph.axioms) &&
    Array.isArray(s.graph.edges)
  );
}

function finalizeLoadedState(state: PersistedAppState): PersistedAppState {
  const merged = mergeWithInitialKnowledge(state);
  if (merged !== state && hasStorage()) {
    persistAppState(merged);
  }
  return merged;
}

function loadLegacyPartial(): Pick<PersistedAppState, 'treeData' | 'nodePool'> | null {
  if (!hasStorage()) return null;
  try {
    const treeRaw = window.localStorage.getItem(LEGACY_KEYS[0]);
    const poolRaw = window.localStorage.getItem(LEGACY_KEYS[1]);
    if (!treeRaw && !poolRaw) return null;

    const treeData =
      treeRaw && isTreeNode(JSON.parse(treeRaw))
        ? (JSON.parse(treeRaw) as TreeNode)
        : createEmptyTreeRoot();

    const nodePool =
      poolRaw && isNodePool(JSON.parse(poolRaw))
        ? (JSON.parse(poolRaw) as Record<string, KnowledgeNode>)
        : {};

    return { treeData, nodePool };
  } catch {
    return null;
  }
}

function clearLegacyKeys(): void {
  if (!hasStorage()) return;
  for (const key of LEGACY_KEYS) {
    window.localStorage.removeItem(key);
  }
}

export function loadPersistedAppState(): PersistedAppState {
  const empty = createEmptyAppState();
  if (!hasStorage()) return empty;

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (isPersistedAppState(parsed)) {
        return finalizeLoadedState(parsed);
      }
      if (parsed && typeof parsed === 'object' && isTreeNode(parsed.treeData)) {
        return finalizeLoadedState(normalizeAppState(parsed as Record<string, unknown>));
      }
    }

    const legacy = loadLegacyPartial();
    if (legacy) {
      const merged: PersistedAppState = finalizeLoadedState({ ...empty, ...legacy });
      clearLegacyKeys();
      return merged;
    }

    return empty;
  } catch (e) {
    console.warn('Failed to load app state', e);
    return empty;
  }
}

export function persistAppState(state: PersistedAppState): void {
  if (!hasStorage()) return;
  try {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ ...state, version: APP_STATE_VERSION }),
    );
  } catch (e) {
    console.warn('Failed to persist app state', e);
  }
}

export function clearPersistedAppState(): void {
  if (!hasStorage()) return;
  window.localStorage.removeItem(STORAGE_KEY);
  clearLegacyKeys();
}

export function exportAppStateJson(state: PersistedAppState): string {
  return JSON.stringify(state, null, 2);
}

export function parseImportedAppState(json: string): PersistedAppState | null {
  try {
    const parsed = JSON.parse(json);
    if (isPersistedAppState(parsed)) return parsed;
    if (parsed && typeof parsed === 'object' && isTreeNode(parsed.treeData)) {
      return normalizeAppState(parsed as Record<string, unknown>);
    }
    return null;
  } catch {
    return null;
  }
}

/** @deprecated 仅保留类型导出兼容 */
export type PersistedKnowledge = Pick<PersistedAppState, 'treeData' | 'nodePool'>;

export function loadPersistedKnowledge(): PersistedKnowledge {
  const s = loadPersistedAppState();
  return { treeData: s.treeData, nodePool: s.nodePool };
}

export function persistKnowledge(data: PersistedKnowledge): void {
  const current = loadPersistedAppState();
  persistAppState({ ...current, treeData: data.treeData, nodePool: data.nodePool });
}
