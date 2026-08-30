import type { KnowledgeNode } from '../types';
import type { KnowledgePointSnapshot } from './state';
import { normalizeExplanationCard } from './explanationContentOwnership.ts';

export interface KnowledgePointSnapshotStats {
  tabCount: number;
  dimensionCount: number;
  tagCount: number;
  hasRootContent: boolean;
}
export function cloneKnowledgeNode(node: KnowledgeNode): KnowledgeNode {
  return structuredClone(node);
}

function normalizeSnapshotNode(node: KnowledgeNode): KnowledgeNode {
  const cloned = cloneKnowledgeNode(node);
  const result = normalizeExplanationCard(cloned.card);
  return result.card === cloned.card ? cloned : { ...cloned, card: result.card };
}

export function createKnowledgePointSnapshot(
  node: KnowledgeNode,
  title: string,
  note: string | undefined,
  id: string,
  capturedAt = Date.now(),
): KnowledgePointSnapshot {
  const trimmedTitle = title.trim();
  const trimmedNote = note?.trim();

  return {
    id,
    knowledgeNodeId: node.id,
    title: trimmedTitle || '未命名版本',
    capturedAt,
    ...(trimmedNote ? { note: trimmedNote } : {}),
    node: normalizeSnapshotNode(node),
  };
}

export function getKnowledgePointSnapshotStats(
  node: KnowledgeNode,
): KnowledgePointSnapshotStats {
  return {
    tabCount: countTabs(node.card.tabs),
    dimensionCount: node.viewDimensions?.length ?? 0,
    tagCount: node.tags?.length ?? 0,
    hasRootContent: Boolean(node.card.rootContent?.trim()),
  };
}

export function countTabs(tabs: KnowledgeNode['card']['tabs']): number {
  return tabs.reduce((total, tab) => total + 1 + countTabs(tab.tabs ?? []), 0);
}

export function normalizeKnowledgePointTimeline(value: unknown): KnowledgePointSnapshot[] {
  if (!Array.isArray(value)) return [];

  return value.flatMap((entry): KnowledgePointSnapshot[] => {
    if (isKnowledgePointSnapshot(entry)) {
      return [{
        ...entry,
        node: normalizeSnapshotNode(entry.node),
      }];
    }

    // Convert the previous knowledge-base snapshots into point snapshots once.
    if (isLegacyKnowledgeSnapshot(entry)) {
      return Object.values(entry.data.nodePool).map((node) =>
        createKnowledgePointSnapshot(
          node,
          `${entry.title} · ${node.label}`,
          entry.note,
          `${entry.id}:${node.id}`,
          entry.capturedAt,
        ),
      );
    }

    return [];
  });
}

function isKnowledgePointSnapshot(value: unknown): value is KnowledgePointSnapshot {
  if (!value || typeof value !== 'object') return false;
  const snapshot = value as Partial<KnowledgePointSnapshot>;
  return (
    typeof snapshot.id === 'string' &&
    typeof snapshot.knowledgeNodeId === 'string' &&
    typeof snapshot.title === 'string' &&
    typeof snapshot.capturedAt === 'number' &&
    !!snapshot.node &&
    typeof snapshot.node === 'object' &&
    typeof snapshot.node.id === 'string'
  );
}

function isLegacyKnowledgeSnapshot(value: unknown): value is {
  id: string;
  title: string;
  capturedAt: number;
  note?: string;
  data: { nodePool: Record<string, KnowledgeNode> };
} {
  if (!value || typeof value !== 'object') return false;
  const snapshot = value as {
    id?: unknown;
    title?: unknown;
    capturedAt?: unknown;
    note?: unknown;
    data?: { nodePool?: unknown };
  };
  return (
    typeof snapshot.id === 'string' &&
    typeof snapshot.title === 'string' &&
    typeof snapshot.capturedAt === 'number' &&
    !!snapshot.data &&
    !!snapshot.data.nodePool &&
    typeof snapshot.data.nodePool === 'object' &&
    !Array.isArray(snapshot.data.nodePool)
  );
}
