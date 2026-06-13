import type { KnowledgeNode, TreeNode } from '../types';
import {
  APP_STATE_VERSION,
  createEmptyAppState,
  type GraphSlice,
  type PersistedAppState,
} from './state';
import { migrateAppState } from './migrateViewDimensions';

const STORAGE_KEY = 'knowledge-os:app-state-v1';

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
  return (
    typeof node.id === 'string' &&
    typeof node.name === 'string' &&
    typeof node.count === 'number' &&
    typeof node.icon === 'string'
  );
}

function isNodePool(value: unknown): value is Record<string, KnowledgeNode> {
  if (!value || typeof value !== 'object') return false;
  return true; // Simplified for basic check
}

function isKnowledgeEdges(value: unknown): value is import('../types').KnowledgeEdge[] {
  return Array.isArray(value);
}

function normalizeAppState(raw: Record<string, unknown>): PersistedAppState {
  const empty = createEmptyAppState();
  return migrateAppState({
    ...empty,
    ...raw,
    version: APP_STATE_VERSION,
    treeData: (raw.treeData as TreeNode) || empty.treeData,
    nodePool: (raw.nodePool as Record<string, KnowledgeNode>) || empty.nodePool,
    knowledgeEdges: (raw.knowledgeEdges as any[]) || [],
    questions: (raw.questions as any[]) || [],
  } as PersistedAppState);
}

function isPersistedAppState(value: unknown): value is PersistedAppState {
  if (!value || typeof value !== 'object') return false;
  const s = value as PersistedAppState;
  return s.version === APP_STATE_VERSION || s.version === 3 || s.version === 2;
}

const RADICAL_MAP: Record<string, string> = {
  '\u2f42': '文', // ⽂ -> 文
  '\u2eda': '页', // ⻚ -> 页
  '\u2f8f': '行', // ⾏ -> 行
  '\u2f45': '方', // ⽅ -> 方
  '\u2f50': '比', // ⽐ -> 比
  '\u2f00': '一', // ⼀ -> 一
  '\u2f29': '小', // ⼩ -> 小
  '\u2f24': '大', // ⼤ -> 大
  '\u2f6c': '目', // ⽬ -> 目
  '\u2f64': '用', // ⽤ -> 用
  '\u2f06': '二', // ⼆ -> 二
  '\u2f0a': '入', // ⼊ -> 入
};

function cleanRadicals(str: string): string {
  let res = '';
  for (let i = 0; i < str.length; i++) {
    const char = str[i];
    res += RADICAL_MAP[char] || char;
  }
  return res;
}

export function loadPersistedAppState(): PersistedAppState | null {
  if (!hasStorage()) return null;

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const cleanedRaw = cleanRadicals(raw);
      const parsed = JSON.parse(cleanedRaw);
      if (isPersistedAppState(parsed)) {
        return migrateAppState(parsed);
      }
      if (parsed && typeof parsed === 'object' && parsed.treeData) {
        return normalizeAppState(parsed as Record<string, unknown>);
      }
    }
    return null;
  } catch (e) {
    console.warn('Failed to load app state from localStorage', e);
    return null;
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
    console.warn('Failed to persist app state to localStorage', e);
  }
}

export function clearPersistedAppState(): void {
  if (!hasStorage()) return;
  window.localStorage.removeItem(STORAGE_KEY);
}

export function exportAppStateJson(state: PersistedAppState): string {
  return JSON.stringify(state, null, 2);
}

export function parseImportedAppState(json: string): PersistedAppState | null {
  try {
    const parsed = JSON.parse(json);
    if (isPersistedAppState(parsed)) return migrateAppState(parsed);
    if (parsed && typeof parsed === 'object' && parsed.treeData) {
      return normalizeAppState(parsed as Record<string, unknown>);
    }
    return null;
  } catch {
    return null;
  }
}

