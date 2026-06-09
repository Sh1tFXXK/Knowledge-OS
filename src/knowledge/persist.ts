import type { KnowledgeNode, TreeNode } from '../types';
import {
  APP_STATE_VERSION,
  createEmptyAppState,
  type GraphSlice,
  type PersistedAppState,
} from './state';

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
  return {
    ...empty,
    ...raw,
    version: APP_STATE_VERSION,
    treeData: (raw.treeData as TreeNode) || empty.treeData,
    nodePool: (raw.nodePool as Record<string, KnowledgeNode>) || empty.nodePool,
    knowledgeEdges: (raw.knowledgeEdges as any[]) || [],
    questions: (raw.questions as any[]) || [],
  } as PersistedAppState;
}

function isPersistedAppState(value: unknown): value is PersistedAppState {
  if (!value || typeof value !== 'object') return false;
  const s = value as PersistedAppState;
  return s.version === APP_STATE_VERSION || s.version === 2;
}

export function loadPersistedAppState(): PersistedAppState | null {
  if (!hasStorage()) return null;

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (isPersistedAppState(parsed)) {
        return parsed;
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
    if (isPersistedAppState(parsed)) return parsed;
    if (parsed && typeof parsed === 'object' && parsed.treeData) {
      return normalizeAppState(parsed as Record<string, unknown>);
    }
    return null;
  } catch {
    return null;
  }
}

