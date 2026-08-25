import {
  ExplanationSelectionKind,
  type ExplanationContentSelection,
  type ExplanationIndexSelection,
  type ExplanationPage,
  type ExplanationSelection,
  type ExplanationTab,
  type NodeExplanation,
} from '../types';
import { findPage, findTab } from './explanationTree';

const DEFINITION_TAB_ID = 'def';
const HIDDEN_LEGACY_TAB_IDS = new Set(['mech', 'bound', 'source']);

export enum ExplanationIndexNodeKind {
  Root = 'root',
  Tab = 'tab',
  Page = 'page',
}

export interface ExplanationIndexNode {
  id: string;
  kind: ExplanationIndexNodeKind;
  label: string;
  weight: number;
  selection: ExplanationIndexSelection;
  children: ExplanationIndexNode[];
  /** 方框内直接显示的完整定义正文。 */
  content?: string;
}

export function isVisibleExplanationTab(tab: ExplanationTab): boolean {
  return !HIDDEN_LEGACY_TAB_IDS.has(tab.id);
}

export function explicitPagesForTab(
  explanation: NodeExplanation,
  tab: ExplanationTab,
): ExplanationPage[] {
  if (tab.pages?.length) return tab.pages;
  if (tab.id !== DEFINITION_TAB_ID) return [];
  return explanation.definitionPages?.length ? explanation.definitionPages : [];
}

function pageNode(nodeId: string, tabId: string, page: ExplanationPage): ExplanationIndexNode {
  const effectiveNodeId = page.knowledgeNodeId ?? nodeId;
  return {
    id: `page:${tabId}:${page.id}`,
    kind: ExplanationIndexNodeKind.Page,
    label: page.label,
    weight: page.weight ?? 1,
    content: page.content ?? '',
    selection: {
      kind: ExplanationSelectionKind.Content,
      nodeId,
      tabId,
      pageId: page.id,
    },
    children: (page.pages ?? []).map((child) => pageNode(effectiveNodeId, tabId, child)),
  };
}

function tabNode(
  nodeId: string,
  explanation: NodeExplanation,
  tab: ExplanationTab,
 ): ExplanationIndexNode {
  const effectiveNodeId = tab.knowledgeNodeId ?? nodeId;
  const childTabs = (tab.tabs ?? []).map((child) => tabNode(effectiveNodeId, explanation, child));
  const childPages = explicitPagesForTab(explanation, tab).map((page) =>
    pageNode(effectiveNodeId, tab.id, page),
  );

  return {
    id: `tab:${tab.id}`,
    kind: ExplanationIndexNodeKind.Tab,
    label: tab.label,
    weight: tab.weight ?? 1,
    content: tab.content ?? '',
    selection: {
      kind: ExplanationSelectionKind.Content,
      nodeId,
      tabId: tab.id,
      pageId: null,
    },
    children: [...childTabs, ...childPages],
  };
}

export function buildExplanationIndex(explanation: NodeExplanation): ExplanationIndexNode {
  return {
    id: `root:${explanation.nodeId}`,
    kind: ExplanationIndexNodeKind.Root,
    label: explanation.title,
    weight: 1,
    content: explanation.rootContent ?? '',
    selection: {
      kind: ExplanationSelectionKind.Root,
      nodeId: explanation.nodeId,
    },
    children: explanation.tabs
      .filter(isVisibleExplanationTab)
      .map((tab) => tabNode(explanation.nodeId, explanation, tab)),
  };
}

export function defaultExplanationSelection(
  explanation: NodeExplanation,
): ExplanationIndexSelection | null {
  const firstTab = explanation.tabs.find(isVisibleExplanationTab);
  if (!firstTab) {
    return {
      kind: ExplanationSelectionKind.Root,
      nodeId: explanation.nodeId,
    };
  }
  return {
    kind: ExplanationSelectionKind.Root,
    nodeId: explanation.nodeId,
  };
}

export function isExplanationSelectionActive(
  current: ExplanationSelection | null,
  candidate: ExplanationIndexSelection,
): boolean {
  if (!current || current.kind !== candidate.kind || current.nodeId !== candidate.nodeId) {
    return false;
  }
  if (candidate.kind === ExplanationSelectionKind.Root) return true;
  if (current.kind !== ExplanationSelectionKind.Content) return false;
  return (
    current.tabId === candidate.tabId &&
    current.pageId === candidate.pageId
  );
}

export function findExplanationIndexNode(
  root: ExplanationIndexNode,
  selection: ExplanationIndexSelection,
): ExplanationIndexNode | null {
  if (isExplanationSelectionActive(selection, root.selection)) return root;
  for (const child of root.children) {
    const found = findExplanationIndexNode(child, selection);
    if (found) return found;
  }
  return null;
}

export function isExplanationContentSelectionValid(
  explanation: NodeExplanation,
  selection: ExplanationContentSelection,
): boolean {
  if (selection.nodeId !== explanation.nodeId) return false;
  const tab = findTab(explanation.tabs, selection.tabId);
  if (!tab) return false;
  if (selection.pageId === null) return true;
  return Boolean(findPage(explicitPagesForTab(explanation, tab), selection.pageId));
}

export function countExplanationIndexNodes(node: ExplanationIndexNode): number {
  return node.children.reduce(
    (count, child) => count + countExplanationIndexNodes(child),
    node.kind === ExplanationIndexNodeKind.Root ? 0 : 1,
  );
}
