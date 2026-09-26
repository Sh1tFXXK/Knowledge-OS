import type { ExplanationPage, ExplanationTab, NodeExplanation } from '../types';

/**
 * 解释卡 Tab / Page 的递归树遍历工具。
 *
 * 数据模型：
 * - Tab extends Page，因此 Tab 同时拥有 `tabs`（左侧纵向子 Tab）和 `pages`（顶部横向子页）。
 * - Page 拥有 `pages`（横向多层堆叠）。
 * - 两层都可无限递归。
 *
 * 路径用 ID 数组表示，从根到目标。例如：
 *   tabPath = ['rootTabId', 'subTabId', 'subSubTabId']
 *   pagePath = ['topPageId', 'subPageId']
 */

/** 在 Tab 树中按 ID 查找。 */
export function findTab(tabs: ExplanationTab[], tabId: string): ExplanationTab | null {
  for (const tab of tabs) {
    if (tab.id === tabId) return tab;
    if (tab.tabs) {
      const found = findTab(tab.tabs, tabId);
      if (found) return found;
    }
  }
  return null;
}

/** 在 Tab 树中查找路径（返回从根到目标的 Tab 节点数组）。 */
export function findTabPath(tabs: ExplanationTab[], tabId: string): ExplanationTab[] | null {
  for (const tab of tabs) {
    if (tab.id === tabId) return [tab];
    if (tab.tabs) {
      const subPath = findTabPath(tab.tabs, tabId);
      if (subPath) return [tab, ...subPath];
    }
  }
  return null;
}

/** 在 Page 树中按 ID 查找。 */
export function findPage(pages: ExplanationPage[], pageId: string): ExplanationPage | null {
  for (const page of pages) {
    if (page.id === pageId) return page;
    if (page.pages) {
      const found = findPage(page.pages, pageId);
      if (found) return found;
    }
  }
  return null;
}

/** 在 Page 树中查找路径（返回从根到目标的 Page 节点数组）。 */
export function findPagePath(pages: ExplanationPage[], pageId: string): ExplanationPage[] | null {
  for (const page of pages) {
    if (page.id === pageId) return [page];
    if (page.pages) {
      const subPath = findPagePath(page.pages, pageId);
      if (subPath) return [page, ...subPath];
    }
  }
  return null;
}
