import {
  ExplanationSelectionKind,
  type ExplanationContentSelection,
  type ExplanationIndexSelection,
  type ExplanationPage,
  type ExplanationTab,
  type NodeExplanation,
} from '../types';
import { defaultExplanationSelection, explicitPagesForTab } from './explanationIndex';
import { findTab } from './explanationTree';
import { areSupertagsEqual, normalizeSupertags } from './supertags';

const DEFINITION_TAB_ID = 'def';

export enum ExplanationIndexOperationKind {
  Rename = 'rename',
  Split = 'split',
  AddChild = 'add-child',
  AddSibling = 'add-sibling',
  Remove = 'remove',
  Merge = 'merge',
  SetWeight = 'set-weight',
}

export type ExplanationIndexOperation =
  | { kind: ExplanationIndexOperationKind.Rename; label: string }
  | { kind: ExplanationIndexOperationKind.Split; childCount: number }
  | { kind: ExplanationIndexOperationKind.AddChild; label: string }
  | { kind: ExplanationIndexOperationKind.AddSibling }
  | { kind: ExplanationIndexOperationKind.Remove }
  | { kind: ExplanationIndexOperationKind.Merge }
  | { kind: ExplanationIndexOperationKind.SetWeight; weight: number };

export interface ExplanationIndexMutationResult {
  explanation: NodeExplanation;
  selection: ExplanationIndexSelection;
  changed: boolean;
}

interface CollectionUpdate<T> {
  items: T[];
  found: boolean;
}

interface PageLocation {
  page: ExplanationPage;
  siblings: ExplanationPage[];
  parentPageId: string | null;
}

function mapTabs(
  tabs: ExplanationTab[],
  tabId: string,
  update: (tab: ExplanationTab) => ExplanationTab,
): CollectionUpdate<ExplanationTab> {
  let found = false;
  const items = tabs.map((tab) => {
    if (tab.id === tabId) {
      found = true;
      return update(tab);
    }
    if (!tab.tabs?.length) return tab;
    const nested = mapTabs(tab.tabs, tabId, update);
    if (!nested.found) return tab;
    found = true;
    return { ...tab, tabs: nested.items };
  });
  return { items, found };
}

function insertTabSibling(
  tabs: ExplanationTab[],
  tabId: string,
  sibling: ExplanationTab,
): CollectionUpdate<ExplanationTab> {
  const index = tabs.findIndex((tab) => tab.id === tabId);
  if (index >= 0) {
    const items = [...tabs];
    items.splice(index + 1, 0, sibling);
    return { items, found: true };
  }

  let found = false;
  const items = tabs.map((tab) => {
    if (!tab.tabs?.length) return tab;
    const nested = insertTabSibling(tab.tabs, tabId, sibling);
    if (!nested.found) return tab;
    found = true;
    return { ...tab, tabs: nested.items };
  });
  return { items, found };
}

function removeTab(tabs: ExplanationTab[], tabId: string): CollectionUpdate<ExplanationTab> {
  const index = tabs.findIndex((tab) => tab.id === tabId);
  if (index >= 0) {
    return { items: tabs.filter((tab) => tab.id !== tabId), found: true };
  }

  let found = false;
  const items = tabs.map((tab) => {
    if (!tab.tabs?.length) return tab;
    const nested = removeTab(tab.tabs, tabId);
    if (!nested.found) return tab;
    found = true;
    return {
      ...tab,
      tabs: nested.items.length > 0 ? nested.items : undefined,
    };
  });
  return { items, found };
}

function mapPages(
  pages: ExplanationPage[],
  pageId: string,
  update: (page: ExplanationPage) => ExplanationPage,
): CollectionUpdate<ExplanationPage> {
  let found = false;
  const items = pages.map((page) => {
    if (page.id === pageId) {
      found = true;
      return update(page);
    }
    if (!page.pages?.length) return page;
    const nested = mapPages(page.pages, pageId, update);
    if (!nested.found) return page;
    found = true;
    return { ...page, pages: nested.items };
  });
  return { items, found };
}

function insertPageSibling(
  pages: ExplanationPage[],
  pageId: string,
  sibling: ExplanationPage,
): CollectionUpdate<ExplanationPage> {
  const index = pages.findIndex((page) => page.id === pageId);
  if (index >= 0) {
    const items = [...pages];
    items.splice(index + 1, 0, sibling);
    return { items, found: true };
  }

  let found = false;
  const items = pages.map((page) => {
    if (!page.pages?.length) return page;
    const nested = insertPageSibling(page.pages, pageId, sibling);
    if (!nested.found) return page;
    found = true;
    return { ...page, pages: nested.items };
  });
  return { items, found };
}

function removePage(pages: ExplanationPage[], pageId: string): CollectionUpdate<ExplanationPage> {
  const index = pages.findIndex((page) => page.id === pageId);
  if (index >= 0) {
    return { items: pages.filter((page) => page.id !== pageId), found: true };
  }

  let found = false;
  const items = pages.map((page) => {
    if (!page.pages?.length) return page;
    const nested = removePage(page.pages, pageId);
    if (!nested.found) return page;
    found = true;
    return {
      ...page,
      pages: nested.items.length > 0 ? nested.items : undefined,
    };
  });
  return { items, found };
}

function findPageLocation(
  pages: ExplanationPage[],
  pageId: string,
  parentPageId: string | null = null,
): PageLocation | null {
  const page = pages.find((candidate) => candidate.id === pageId);
  if (page) return { page, siblings: pages, parentPageId };
  for (const candidate of pages) {
    if (!candidate.pages?.length) continue;
    const found = findPageLocation(candidate.pages, pageId, candidate.id);
    if (found) return found;
  }
  return null;
}

function replaceTabPages(
  explanation: NodeExplanation,
  tabId: string,
  pages: ExplanationPage[] | undefined,
): NodeExplanation {
  const mapped = mapTabs(explanation.tabs, tabId, (tab) => ({ ...tab, pages }));
  if (!mapped.found) return explanation;
  return {
    ...explanation,
    tabs: mapped.items,
    definitionPages:
      tabId === DEFINITION_TAB_ID && explanation.definitionPages !== undefined
        ? pages
        : explanation.definitionPages,
  };
}

export function setExplanationIndexItemTags(
  explanation: NodeExplanation,
  selection: ExplanationContentSelection,
  values: readonly string[],
): NodeExplanation {
  if (selection.nodeId !== explanation.nodeId) return explanation;
  const tags = normalizeSupertags(values);
  const storedTags = tags.length > 0 ? tags : undefined;

  if (selection.pageId === null) {
    const tab = findTab(explanation.tabs, selection.tabId);
    if (!tab || areSupertagsEqual(tab.tags ?? [], tags)) return explanation;
    const mapped = mapTabs(explanation.tabs, selection.tabId, (item) => ({
      ...item,
      tags: storedTags,
    }));
    return mapped.found ? { ...explanation, tabs: mapped.items } : explanation;
  }

  const tab = findTab(explanation.tabs, selection.tabId);
  if (!tab) return explanation;
  const pages = explicitPagesForTab(explanation, tab);
  const location = findPageLocation(pages, selection.pageId);
  if (!location || areSupertagsEqual(location.page.tags ?? [], tags)) return explanation;
  const mapped = mapPages(pages, selection.pageId, (page) => ({
    ...page,
    tags: storedTags,
  }));
  return mapped.found ? replaceTabPages(explanation, tab.id, mapped.items) : explanation;
}

function contentSelection(
  nodeId: string,
  tabId: string,
  pageId: string | null,
): ExplanationContentSelection {
  return {
    kind: ExplanationSelectionKind.Content,
    nodeId,
    tabId,
    pageId,
  };
}

function unchanged(
  explanation: NodeExplanation,
  selection: ExplanationIndexSelection,
): ExplanationIndexMutationResult {
  return { explanation, selection, changed: false };
}

function changed(
  explanation: NodeExplanation,
  selection: ExplanationIndexSelection,
): ExplanationIndexMutationResult {
  return { explanation, selection, changed: true };
}

function createBlankPage(id: string): ExplanationPage {
  return { id, label: '', content: '', weight: 1 };
}

function createBlankTab(id: string): ExplanationTab {
  return { id, label: '', content: '', weight: 1 };
}

function renameItem(
  explanation: NodeExplanation,
  selection: ExplanationIndexSelection,
  label: string,
): ExplanationIndexMutationResult {
  const trimmed = label.trim();
  if (!trimmed) return unchanged(explanation, selection);
  if (selection.kind === ExplanationSelectionKind.Root) {
    if (explanation.title === trimmed) return unchanged(explanation, selection);
    return changed({ ...explanation, title: trimmed }, selection);
  }

  if (selection.pageId === null) {
    const mapped = mapTabs(explanation.tabs, selection.tabId, (tab) => ({ ...tab, label: trimmed }));
    return mapped.found
      ? changed({ ...explanation, tabs: mapped.items }, selection)
      : unchanged(explanation, selection);
  }

  const tab = findTab(explanation.tabs, selection.tabId);
  if (!tab) return unchanged(explanation, selection);
  const pages = explicitPagesForTab(explanation, tab);
  const mapped = mapPages(pages, selection.pageId, (page) => ({ ...page, label: trimmed }));
  return mapped.found
    ? changed(replaceTabPages(explanation, selection.tabId, mapped.items), selection)
    : unchanged(explanation, selection);
}

function splitItem(
  explanation: NodeExplanation,
  selection: ExplanationIndexSelection,
  childCount: number,
  createId: (prefix: string) => string,
): ExplanationIndexMutationResult {
  if (!Number.isInteger(childCount) || childCount < 1) return unchanged(explanation, selection);

  if (selection.kind === ExplanationSelectionKind.Root) {
    if (explanation.tabs.length > 0) return unchanged(explanation, selection);
    const tabs = Array.from({ length: childCount }, () => createBlankTab(createId('tab')));
    return changed(
      { ...explanation, tabs },
      contentSelection(explanation.nodeId, tabs[0].id, null),
    );
  }

  if (selection.pageId === null) {
    const tab = findTab(explanation.tabs, selection.tabId);
    if (!tab || tab.tabs?.length || explicitPagesForTab(explanation, tab).length > 0) {
      return unchanged(explanation, selection);
    }
    const pages = Array.from({ length: childCount }, () => createBlankPage(createId('page')));
    return changed(
      replaceTabPages(explanation, tab.id, pages),
      contentSelection(explanation.nodeId, tab.id, pages[0].id),
    );
  }

  const tab = findTab(explanation.tabs, selection.tabId);
  if (!tab) return unchanged(explanation, selection);
  const pages = explicitPagesForTab(explanation, tab);
  let children: ExplanationPage[] = [];
  const mapped = mapPages(pages, selection.pageId, (page) => {
    if (page.pages?.length) return page;
    children = Array.from({ length: childCount }, () => createBlankPage(createId('page')));
    return { ...page, pages: children };
  });
  if (!mapped.found || children.length === 0) return unchanged(explanation, selection);
  return changed(
    replaceTabPages(explanation, tab.id, mapped.items),
    contentSelection(explanation.nodeId, tab.id, children[0].id),
  );
}

function addChild(
  explanation: NodeExplanation,
  selection: ExplanationIndexSelection,
  label: string,
  createId: (prefix: string) => string,
): ExplanationIndexMutationResult {
  const trimmed = label.trim();
  if (!trimmed) return unchanged(explanation, selection);

  if (selection.kind === ExplanationSelectionKind.Root) {
    const child = { ...createBlankTab(createId('tab')), label: trimmed };
    return changed(
      { ...explanation, tabs: [...explanation.tabs, child] },
      contentSelection(explanation.nodeId, child.id, null),
    );
  }

  if (selection.pageId === null) {
    const tab = findTab(explanation.tabs, selection.tabId);
    if (!tab) return unchanged(explanation, selection);
    const child = { ...createBlankPage(createId('page')), label: trimmed };
    return changed(
      replaceTabPages(explanation, tab.id, [...explicitPagesForTab(explanation, tab), child]),
      contentSelection(explanation.nodeId, tab.id, child.id),
    );
  }

  const tab = findTab(explanation.tabs, selection.tabId);
  if (!tab) return unchanged(explanation, selection);
  const pages = explicitPagesForTab(explanation, tab);
  const child: ExplanationPage = { ...createBlankPage(createId('page')), label: trimmed };
  const mapped = mapPages(pages, selection.pageId, (page) => {
    return { ...page, pages: [...(page.pages ?? []), child] };
  });
  if (!mapped.found) return unchanged(explanation, selection);
  return changed(
    replaceTabPages(explanation, tab.id, mapped.items),
    contentSelection(explanation.nodeId, tab.id, child.id),
  );
}

function addSibling(
  explanation: NodeExplanation,
  selection: ExplanationIndexSelection,
  createId: (prefix: string) => string,
): ExplanationIndexMutationResult {
  if (selection.kind === ExplanationSelectionKind.Root) {
    const sibling = createBlankTab(createId('tab'));
    return changed(
      { ...explanation, tabs: [...explanation.tabs, sibling] },
      contentSelection(explanation.nodeId, sibling.id, null),
    );
  }

  if (selection.pageId === null) {
    const sibling = createBlankTab(createId('tab'));
    const inserted = insertTabSibling(explanation.tabs, selection.tabId, sibling);
    return inserted.found
      ? changed(
          { ...explanation, tabs: inserted.items },
          contentSelection(explanation.nodeId, sibling.id, null),
        )
      : unchanged(explanation, selection);
  }

  const tab = findTab(explanation.tabs, selection.tabId);
  if (!tab) return unchanged(explanation, selection);
  const sibling = createBlankPage(createId('page'));
  const inserted = insertPageSibling(
    explicitPagesForTab(explanation, tab),
    selection.pageId,
    sibling,
  );
  return inserted.found
    ? changed(
        replaceTabPages(explanation, tab.id, inserted.items),
        contentSelection(explanation.nodeId, tab.id, sibling.id),
      )
    : unchanged(explanation, selection);
}

export function canRemoveExplanationIndexSelection(
  explanation: NodeExplanation,
  selection: ExplanationIndexSelection,
): boolean {
  if (selection.kind === ExplanationSelectionKind.Root) return false;
  if (selection.pageId === null) {
    if (selection.tabId === DEFINITION_TAB_ID) {
      return explanation.tabs.some((tab) => tab.id === selection.tabId);
    }
    return true;
  }
  const tab = findTab(explanation.tabs, selection.tabId);
  if (!tab) return false;
  const location = findPageLocation(explicitPagesForTab(explanation, tab), selection.pageId);
  if (!location) return false;
  return true;
}

function removeItem(
  explanation: NodeExplanation,
  selection: ExplanationIndexSelection,
): ExplanationIndexMutationResult {
  if (!canRemoveExplanationIndexSelection(explanation, selection)) {
    return unchanged(explanation, selection);
  }
  if (selection.kind === ExplanationSelectionKind.Root) return unchanged(explanation, selection);

  if (selection.pageId === null) {
    const removed = removeTab(explanation.tabs, selection.tabId);
    if (!removed.found) return unchanged(explanation, selection);
    const nextExplanation = { ...explanation, tabs: removed.items };
    return changed(
      nextExplanation,
      defaultExplanationSelection(nextExplanation) ?? {
        kind: ExplanationSelectionKind.Root,
        nodeId: explanation.nodeId,
      },
    );
  }

  const tab = findTab(explanation.tabs, selection.tabId);
  if (!tab) return unchanged(explanation, selection);
  const removed = removePage(explicitPagesForTab(explanation, tab), selection.pageId);
  if (!removed.found) return unchanged(explanation, selection);
  const nextExplanation = replaceTabPages(explanation, tab.id, removed.items);
  return changed(nextExplanation, contentSelection(explanation.nodeId, tab.id, null));
}

function mergeItem(
  explanation: NodeExplanation,
  selection: ExplanationIndexSelection,
): ExplanationIndexMutationResult {
  if (selection.kind === ExplanationSelectionKind.Root) {
    if (explanation.tabs.length === 0) return unchanged(explanation, selection);
    return changed(
      { ...explanation, tabs: [], definitionPages: undefined },
      selection,
    );
  }

  if (selection.pageId === null) {
    const tab = findTab(explanation.tabs, selection.tabId);
    if (!tab || (!tab.tabs?.length && explicitPagesForTab(explanation, tab).length === 0)) {
      return unchanged(explanation, selection);
    }
    const mapped = mapTabs(explanation.tabs, tab.id, (item) => ({
      ...item,
      tabs: undefined,
      pages: undefined,
    }));
    return changed(
      {
        ...explanation,
        tabs: mapped.items,
        definitionPages:
          tab.id === DEFINITION_TAB_ID ? undefined : explanation.definitionPages,
      },
      selection,
    );
  }

  const tab = findTab(explanation.tabs, selection.tabId);
  if (!tab) return unchanged(explanation, selection);
  const pages = explicitPagesForTab(explanation, tab);
  let didMerge = false;
  const mapped = mapPages(pages, selection.pageId, (page) => {
    if (!page.pages?.length) return page;
    didMerge = true;
    return { ...page, pages: undefined };
  });
  return didMerge
    ? changed(replaceTabPages(explanation, tab.id, mapped.items), selection)
    : unchanged(explanation, selection);
}

function setWeight(
  explanation: NodeExplanation,
  selection: ExplanationIndexSelection,
  weight: number,
): ExplanationIndexMutationResult {
  if (
    selection.kind === ExplanationSelectionKind.Root ||
    !Number.isFinite(weight) ||
    weight <= 0
  ) {
    return unchanged(explanation, selection);
  }

  if (selection.pageId === null) {
    const mapped = mapTabs(explanation.tabs, selection.tabId, (tab) => ({ ...tab, weight }));
    return mapped.found
      ? changed({ ...explanation, tabs: mapped.items }, selection)
      : unchanged(explanation, selection);
  }

  const tab = findTab(explanation.tabs, selection.tabId);
  if (!tab) return unchanged(explanation, selection);
  const mapped = mapPages(
    explicitPagesForTab(explanation, tab),
    selection.pageId,
    (page) => ({ ...page, weight }),
  );
  return mapped.found
    ? changed(replaceTabPages(explanation, tab.id, mapped.items), selection)
    : unchanged(explanation, selection);
}

export function applyExplanationIndexOperation(
  explanation: NodeExplanation,
  selection: ExplanationIndexSelection,
  operation: ExplanationIndexOperation,
  createId: (prefix: string) => string,
): ExplanationIndexMutationResult {
  switch (operation.kind) {
    case ExplanationIndexOperationKind.Rename:
      return renameItem(explanation, selection, operation.label);
    case ExplanationIndexOperationKind.Split:
      return splitItem(explanation, selection, operation.childCount, createId);
    case ExplanationIndexOperationKind.AddChild:
      return addChild(explanation, selection, operation.label, createId);
    case ExplanationIndexOperationKind.AddSibling:
      return addSibling(explanation, selection, createId);
    case ExplanationIndexOperationKind.Remove:
      return removeItem(explanation, selection);
    case ExplanationIndexOperationKind.Merge:
      return mergeItem(explanation, selection);
    case ExplanationIndexOperationKind.SetWeight:
      return setWeight(explanation, selection, operation.weight);
  }
}
