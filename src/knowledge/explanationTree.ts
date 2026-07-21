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

/**
 * 计算一组初始 Page 下需要渲染的 Page 行。
 * - 第 0 行：传入的 initialPages（调用方应先通过 pagesForTab 拿到，已处理 legacy/默认 fallback）
 * - 第 i 行：上一行活跃 Page 的 pages
 * - 一直渲染到某行的活跃 Page 没有子 pages 为止
 *
 * 返回每一行的 { pages, activePageId } 列表，便于 UI 渲染多行页签。
 *
 * 注意：不要直接传 tab.pages，否则会漏掉 def Tab 的 legacy definitionPages 兜底。
 */
/** 计算 Tab 树每一层需要渲染的横向页签行。 */
export function computeTabRows(
  initialTabs: ExplanationTab[],
  tabPath: ExplanationTab[],
): Array<{ tabs: ExplanationTab[]; activeTabId: string | null }> {
  const rows: Array<{ tabs: ExplanationTab[]; activeTabId: string | null }> = [];
  let currentTabs: ExplanationTab[] | undefined = initialTabs;
  let pathIndex = 0;
  while (currentTabs && currentTabs.length > 0) {
    const activeTabId =
      pathIndex < tabPath.length ? tabPath[pathIndex].id : (currentTabs[0]?.id ?? null);
    rows.push({ tabs: currentTabs, activeTabId });
    if (!activeTabId) break;
    const activeTab = currentTabs.find((tab) => tab.id === activeTabId) ?? null;
    if (!activeTab?.tabs?.length) break;
    currentTabs = activeTab.tabs;
    pathIndex += 1;
  }
  return rows;
}

export function computePageRows(
  initialPages: ExplanationPage[],
  pagePath: ExplanationPage[],
): Array<{ pages: ExplanationPage[]; activePageId: string | null }> {
  const rows: Array<{ pages: ExplanationPage[]; activePageId: string | null }> = [];
  let currentPages: ExplanationPage[] | undefined = initialPages;
  let pathIndex = 0;
  while (currentPages && currentPages.length > 0) {
    const activePageId = pathIndex < pagePath.length ? pagePath[pathIndex].id : currentPages[0]?.id ?? null;
    rows.push({ pages: currentPages, activePageId });
    if (!activePageId) break;
    const activePage = currentPages.find((p) => p.id === activePageId) ?? null;
    if (!activePage || !activePage.pages || activePage.pages.length === 0) break;
    currentPages = activePage.pages;
    pathIndex += 1;
  }
  return rows;
}
