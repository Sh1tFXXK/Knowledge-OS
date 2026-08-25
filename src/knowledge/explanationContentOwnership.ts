import type {
  ExplanationPage,
  ExplanationTab,
  KnowledgeNode,
  NodeExplanation,
  TreeNode,
} from '../types';
import type { KnowledgePointSnapshot } from './state';

export const SYNTHETIC_PAGE_LABELS = new Set(['通用页面', '通用定义']);

export interface ExplanationContentOwnershipStats {
  removed: number;
  renamed: number;
  legacyMoved: number;
  removedIds: string[];
  renamedIds: string[];
}

export interface ExplanationContentOwnershipResult {
  card: NodeExplanation;
  stats: ExplanationContentOwnershipStats;
}

function createStats(): ExplanationContentOwnershipStats {
  return {
    removed: 0,
    renamed: 0,
    legacyMoved: 0,
    removedIds: [],
    renamedIds: [],
  };
}

function normalizedContent(value: unknown): string {
  return String(value ?? '').replace(/\s+/g, ' ').trim();
}

function hasPageMetadata(page: ExplanationPage): boolean {
  return Boolean(
    page.table
      || page.tags?.length
      || page.pages?.length
      || page.weight !== undefined,
  );
}

export function isSyntheticExplanationPage(
  page: ExplanationPage | undefined,
  owner: ExplanationPage | undefined,
): boolean {
  if (!page || !owner) return false;
  if (!SYNTHETIC_PAGE_LABELS.has(page.label)) return false;
  if (page.id !== owner.id || hasPageMetadata(page)) return false;
  return normalizedContent(page.content) === normalizedContent(owner.content)
    || normalizedContent(page.content) === '';
}

function normalizePages(
  pages: ExplanationPage[] | undefined,
  owner: ExplanationPage | undefined,
  stats: ExplanationContentOwnershipStats,
): ExplanationPage[] {
  const nextPages: ExplanationPage[] = [];
  for (const page of pages ?? []) {
    const normalizedChildren = normalizePages(page.pages, page, stats);
    const nextPage: ExplanationPage = { ...page };
    if (page.pages) {
      if (normalizedChildren.length > 0) nextPage.pages = normalizedChildren;
      else delete nextPage.pages;
    }

    if (isSyntheticExplanationPage(nextPage, owner)) {
      stats.removed += 1;
      stats.removedIds.push(nextPage.id);
      continue;
    }

    if (
      owner
      && SYNTHETIC_PAGE_LABELS.has(nextPage.label)
      && nextPage.id === owner.id
      && normalizedContent(nextPage.content) !== normalizedContent(owner.content)
    ) {
      nextPage.label = nextPage.label === '通用定义' ? '补充定义' : '补充页面';
      stats.renamed += 1;
      stats.renamedIds.push(nextPage.id);
    }
    nextPages.push(nextPage);
  }
  return nextPages;
}

function normalizeTab(
  tab: ExplanationTab,
  stats: ExplanationContentOwnershipStats,
): ExplanationTab {
  const nextTab: ExplanationTab = { ...tab };
  if (tab.pages) {
    const pages = normalizePages(tab.pages, tab, stats);
    if (pages.length > 0) nextTab.pages = pages;
    else delete nextTab.pages;
  }
  if (tab.tabs) {
    const tabs = tab.tabs.map((child) => normalizeTab(child, stats));
    if (tabs.length > 0) nextTab.tabs = tabs;
    else delete nextTab.tabs;
  }
  return nextTab;
}

export function normalizeExplanationCard(
  card: NodeExplanation,
): ExplanationContentOwnershipResult {
  const stats = createStats();
  const next: NodeExplanation = {
    ...card,
    tabs: (card.tabs ?? []).map((tab) => normalizeTab(tab, stats)),
  };

  const definitionTab = next.tabs.find((tab) => tab.id === 'def');
  if (card.definitionPages) {
    const legacyPages = normalizePages(card.definitionPages, definitionTab, stats);
    if (definitionTab && !definitionTab.pages?.length && legacyPages.length > 0) {
      next.tabs = next.tabs.map((tab) => (
        tab.id === definitionTab.id ? { ...tab, pages: legacyPages } : tab
      ));
      delete next.definitionPages;
      stats.legacyMoved += 1;
    } else if (legacyPages.length > 0) {
      next.definitionPages = legacyPages;
    } else {
      delete next.definitionPages;
    }
  }

  const changed = stats.removed > 0 || stats.renamed > 0 || stats.legacyMoved > 0;
  return { card: changed ? next : card, stats };
}

function mergeStats(
  target: ExplanationContentOwnershipStats,
  source: ExplanationContentOwnershipStats,
): void {
  target.removed += source.removed;
  target.renamed += source.renamed;
  target.legacyMoved += source.legacyMoved;
  target.removedIds.push(...source.removedIds);
  target.renamedIds.push(...source.renamedIds);
}

function normalizeTreeSupplements(
  node: TreeNode,
  stats: ExplanationContentOwnershipStats,
): TreeNode {
  const next: TreeNode = { ...node };
  if (node.supplement?.tabs) {
    const result = normalizeExplanationCard({
      nodeId: node.nodeRef ?? node.id,
      title: node.name,
      tabs: node.supplement.tabs,
    });
    next.supplement = {
      ...node.supplement,
      tabs: result.card.tabs,
    };
    mergeStats(stats, result.stats);
  }
  if (node.children) {
    next.children = node.children.map((child) => normalizeTreeSupplements(child, stats));
  }
  return next;
}

export function normalizeExplanationContentOwnership({
  tree,
  nodePool,
}: {
  tree: TreeNode;
  nodePool: Record<string, KnowledgeNode>;
}): {
  tree: TreeNode;
  nodePool: Record<string, KnowledgeNode>;
  stats: ExplanationContentOwnershipStats & { cardsChanged: number };
} {
  const stats = { ...createStats(), cardsChanged: 0 };
  const nextNodePool: Record<string, KnowledgeNode> = {};
  for (const [id, node] of Object.entries(nodePool ?? {})) {
    const result = normalizeExplanationCard(
      node.card ?? { nodeId: id, title: node.label, tabs: [] },
    );
    if (result.card !== node.card) stats.cardsChanged += 1;
    mergeStats(stats, result.stats);
    nextNodePool[id] = result.card === node.card ? node : { ...node, card: result.card };
  }

  const nextTree = tree ? normalizeTreeSupplements(tree, stats) : tree;
  return { tree: nextTree, nodePool: nextNodePool, stats };
}

export function normalizeTimelineExplanationContent(
  timeline: KnowledgePointSnapshot[],
): {
  timeline: KnowledgePointSnapshot[];
  stats: ExplanationContentOwnershipStats & { snapshotsChanged: number };
} {
  const stats = { ...createStats(), snapshotsChanged: 0 };
  const normalizedTimeline = timeline.map((snapshot) => {
    const result = normalizeExplanationCard(snapshot.node.card);
    mergeStats(stats, result.stats);
    if (result.card === snapshot.node.card) return snapshot;
    stats.snapshotsChanged += 1;
    return {
      ...snapshot,
      node: { ...snapshot.node, card: result.card },
    };
  });
  return { timeline: normalizedTimeline, stats };
}
