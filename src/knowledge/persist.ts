import type { KnowledgeNode, TreeNode } from '../types';
import {
  APP_STATE_VERSION,
  createEmptyAppState,
  type PersistedAppState,
} from './state';
import { migrateAppState } from './migrateViewDimensions';
import { normalizeTreeNode } from './treeUtils';
import { normalizeKnowledgePointTimeline } from './timeline';

// 历史版本曾把全量状态写入 localStorage（STORAGE_KEY = 'knowledge-os:app-state-v1'），
// 但加载路径始终读取 data/*.json，localStorage 从未被读回——每次 mutation 同步序列化
// 约 20MB 纯属主线程浪费，现已移除。clearPersistedAppState 仅用于清理旧版本遗留数据。
const LEGACY_STORAGE_KEY = 'knowledge-os:app-state-v1';

function hasStorage(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return typeof window.localStorage !== 'undefined';
  } catch {
    return false;
  }
}

function normalizeAppState(raw: Record<string, unknown>): PersistedAppState {
  const empty = createEmptyAppState();
  const migrated = migrateAppState({
    ...empty,
    ...raw,
    version: APP_STATE_VERSION,
    treeData: (raw.treeData as TreeNode) || empty.treeData,
    nodePool: (raw.nodePool as Record<string, KnowledgeNode>) || empty.nodePool,
    knowledgeEdges: (raw.knowledgeEdges as any[]) || [],
    questions: (raw.questions as any[]) || [],
    timeline: normalizeKnowledgePointTimeline(raw.timeline),
  } as PersistedAppState);
  return {
    ...migrated,
    treeData: normalizeTreeNode(migrated.treeData),
  };
}

function isPersistedAppState(value: unknown): value is PersistedAppState {
  if (!value || typeof value !== 'object') return false;
  const s = value as PersistedAppState;
  return (
    s.version === APP_STATE_VERSION ||
    s.version === 5 ||
    s.version === 4 ||
    s.version === 3 ||
    s.version === 2
  );
}

export function clearPersistedAppState(): void {
  if (!hasStorage()) return;
  try {
    window.localStorage.removeItem(LEGACY_STORAGE_KEY);
  } catch {
    // 忽略存储访问失败（隐私模式等）
  }
}

export function exportAppStateJson(state: PersistedAppState): string {
  return JSON.stringify({
    ...state,
    treeData: normalizeTreeNode(state.treeData),
  }, null, 2);
}

export function parseImportedAppState(json: string): PersistedAppState | null {
  try {
    const parsed = JSON.parse(json);
    if (isPersistedAppState(parsed)) {
      const migrated = migrateAppState(parsed);
      return {
        ...migrated,
        version: APP_STATE_VERSION,
        timeline: normalizeKnowledgePointTimeline(migrated.timeline),
        treeData: normalizeTreeNode(migrated.treeData),
      };
    }
    if (parsed && typeof parsed === 'object' && parsed.treeData) {
      return normalizeAppState(parsed as Record<string, unknown>);
    }
    return null;
  } catch {
    return null;
  }
}
