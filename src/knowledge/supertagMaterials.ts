import {
  ExplanationSelectionKind,
  type ExplanationIndexSelection,
  ExplanationPage,
  ExplanationTab,
  KnowledgeNode,
} from '../types';
import { normalizeSupertag, supertagKey } from './supertags';

export enum SupertagMaterialKind {
  Node = 'node',
  Tab = 'tab',
  Page = 'page',
}

export interface SupertagMaterial {
  id: string;
  tag: string;
  kind: SupertagMaterialKind;
  nodeId: string;
  nodeLabel: string;
  label: string;
  path: string[];
  content: string;
  selection: ExplanationIndexSelection;
}

export interface SupertagMaterialGroup {
  tag: string;
  materials: SupertagMaterial[];
  nodeCount: number;
}

interface SupertagMaterialAccumulator {
  tag: string;
  materials: SupertagMaterial[];
}

function firstNodeContent(node: KnowledgeNode): string {
  for (const tab of node.card.tabs) {
    if (tab.content.trim()) return tab.content;
    const pages = tab.pages?.length
      ? tab.pages
      : tab.id === 'def'
        ? node.card.definitionPages ?? []
        : [];
    const pageContent = firstPageContent(pages);
    if (pageContent) return pageContent;
  }
  return '';
}

function firstPageContent(pages: readonly ExplanationPage[]): string {
  for (const page of pages) {
    if (page.content.trim()) return page.content;
    const childContent = firstPageContent(page.pages ?? []);
    if (childContent) return childContent;
  }
  return '';
}

function appendMaterial(
  groups: Map<string, SupertagMaterialAccumulator>,
  material: Omit<SupertagMaterial, 'tag'>,
  tags: readonly string[] | undefined,
): void {
  const seen = new Set<string>();
  for (const rawTag of tags ?? []) {
    const tag = normalizeSupertag(rawTag);
    const key = supertagKey(tag);
    if (!key || seen.has(key)) continue;
    seen.add(key);

    const group = groups.get(key);
    const displayTag = group?.tag ?? tag;
    groups.set(key, {
      tag: displayTag,
      materials: [...(group?.materials ?? []), { ...material, tag: displayTag }],
    });
  }
}

function collectPages(
  groups: Map<string, SupertagMaterialAccumulator>,
  node: KnowledgeNode,
  tabId: string,
  tabPath: readonly string[],
  pages: readonly ExplanationPage[],
  idPath: readonly string[],
): void {
  for (const page of pages) {
    const path = [...tabPath, page.label];
    const nextIdPath = [...idPath, page.id];
    appendMaterial(
      groups,
      {
        id: `page:${node.id}:${nextIdPath.join('/')}`,
        kind: SupertagMaterialKind.Page,
        nodeId: node.id,
        nodeLabel: node.label,
        label: page.label,
        path,
        content: page.content,
        selection: {
          kind: ExplanationSelectionKind.Content,
          nodeId: node.id,
          tabId,
          pageId: page.id,
        },
      },
      page.tags,
    );
    collectPages(groups, node, tabId, path, page.pages ?? [], nextIdPath);
  }
}

function collectTabs(
  groups: Map<string, SupertagMaterialAccumulator>,
  node: KnowledgeNode,
  tabs: readonly ExplanationTab[],
  labelPath: readonly string[] = [],
  idPath: readonly string[] = [],
): void {
  for (const tab of tabs) {
    const path = [...labelPath, tab.label];
    const nextIdPath = [...idPath, tab.id];
    appendMaterial(
      groups,
      {
        id: `tab:${node.id}:${nextIdPath.join('/')}`,
        kind: SupertagMaterialKind.Tab,
        nodeId: node.id,
        nodeLabel: node.label,
        label: tab.label,
        path,
        content: tab.content,
        selection: {
          kind: ExplanationSelectionKind.Content,
          nodeId: node.id,
          tabId: tab.id,
          pageId: null,
        },
      },
      tab.tags,
    );
    const pages = tab.pages?.length
      ? tab.pages
      : tab.id === 'def'
        ? node.card.definitionPages ?? []
        : [];
    collectPages(groups, node, tab.id, path, pages, nextIdPath);
    collectTabs(groups, node, tab.tabs ?? [], path, nextIdPath);
  }
}

export function collectSupertagMaterialGroups(
  nodePool: Record<string, KnowledgeNode>,
): SupertagMaterialGroup[] {
  const groups = new Map<string, SupertagMaterialAccumulator>();

  for (const node of Object.values(nodePool)) {
    appendMaterial(
      groups,
      {
        id: `node:${node.id}`,
        kind: SupertagMaterialKind.Node,
        nodeId: node.id,
        nodeLabel: node.label,
        label: node.card.title,
        path: [],
        content: node.card.rootContent?.trim() || firstNodeContent(node),
        selection: {
          kind: ExplanationSelectionKind.Root,
          nodeId: node.id,
        },
      },
      node.tags,
    );
    collectTabs(groups, node, node.card.tabs);
  }

  return [...groups.values()]
    .map(({ tag, materials }) => ({
      tag,
      materials: [...materials].sort(
        (left, right) =>
          left.nodeLabel.localeCompare(right.nodeLabel, 'zh-CN') ||
          left.path.join('/').localeCompare(right.path.join('/'), 'zh-CN'),
      ),
      nodeCount: new Set(materials.map((material) => material.nodeId)).size,
    }))
    .sort(
      (left, right) =>
        right.materials.length - left.materials.length ||
        left.tag.localeCompare(right.tag, 'zh-CN'),
    );
}

export function supertagMaterialSignature(material: SupertagMaterial): string {
  return material.content.replace(/\s+/g, ' ').trim().toLocaleLowerCase();
}
