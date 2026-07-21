import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from 'react';
import { createPortal } from 'react-dom';
import { useGraphStore } from '../store/useGraph';
import {
  collectTreeReferencesByNodeRef,
  findTreeNodeById,
  type TreeNodeReference,
} from '../knowledge/treeUtils';
import { findMatrixProjections } from '../knowledge/projection';
import {
  findTabPath,
  findPagePath,
  computePageRows,
} from '../knowledge/explanationTree';
import type {
  ExplanationPage,
  ExplanationTab,
  ExplanationTitleTarget,
  NodeExplanation,
} from '../types';
import MarkdownView from './explanation/MarkdownView';
import ProjectionReferences from './explanation/ProjectionReferences';
import RecursiveTitleMatrix from './explanation/RecursiveTitleMatrix';
import SupertagPanel from './explanation/SupertagPanel';

function contextParentPathLabel(reference: TreeNodeReference): string {
  const visiblePath = reference.path.slice(1);
  const parentPath = visiblePath.length > 1 ? visiblePath.slice(0, -1) : visiblePath;
  return parentPath.join(' / ') || reference.name;
}

function contextEnvironmentLabel(reference: TreeNodeReference): string {
  const visiblePath = reference.path.slice(1);
  const parentPath = visiblePath.length > 1 ? visiblePath.slice(0, -1) : visiblePath;
  return parentPath[parentPath.length - 1] ?? reference.name;
}

const SYSTEM_TAB_IDS = {
  definition: 'def',
} as const;

function defaultPageForTab(tab: ExplanationTab): ExplanationPage {
  return {
    id: tab.id,
    label: tab.id === SYSTEM_TAB_IDS.definition ? '通用定义' : '通用页面',
    content: tab.content,
  };
}

function pagesForTab(explanation: NodeExplanation, tab: ExplanationTab): ExplanationPage[] {
  if (tab.pages?.length) return tab.pages;
  const legacyPages = tab.id === SYSTEM_TAB_IDS.definition ? explanation.definitionPages : undefined;
  return legacyPages?.length ? legacyPages : [defaultPageForTab(tab)];
}

export default function ExplanationCard() {
  const selectedNodeId = useGraphStore((s) => s.selectedNodeId);
  const selectedTreeNodeId = useGraphStore((s) => s.selectedTreeNodeId);
  const getKnowledgeExplanation = useGraphStore((s) => s.getKnowledgeExplanation);
  const addKnowledgeTab = useGraphStore((s) => s.addKnowledgeTab);
  const removeKnowledgeTab = useGraphStore((s) => s.removeKnowledgeTab);
  const updateKnowledgeTab = useGraphStore((s) => s.updateKnowledgeTab);
  const renameKnowledgeTab = useGraphStore((s) => s.renameKnowledgeTab);
  const addKnowledgeTabPage = useGraphStore((s) => s.addKnowledgeTabPage);
  const removeKnowledgeTabPage = useGraphStore((s) => s.removeKnowledgeTabPage);
  const updateKnowledgeTabPage = useGraphStore((s) => s.updateKnowledgeTabPage);
  const renameKnowledgeTabPage = useGraphStore((s) => s.renameKnowledgeTabPage);
  const updateKnowledgeCard = useGraphStore((s) => s.updateKnowledgeCard);
  const updateExplanationTitleWeight = useGraphStore((s) => s.updateExplanationTitleWeight);
  const mergeExplanationTitle = useGraphStore((s) => s.mergeExplanationTitle);
  const updateKnowledgeNodeMeta = useGraphStore((s) => s.updateKnowledgeNodeMeta);
  const updatePathSupplementContent = useGraphStore((s) => s.updatePathSupplementContent);
  const addKnowledgeNode = useGraphStore((s) => s.addKnowledgeNode);
  const linkTreeToKnowledge = useGraphStore((s) => s.linkTreeToKnowledge);
  const selectTreeEntry = useGraphStore((s) => s.selectTreeEntry);
  const addNotification = useGraphStore((s) => s.addNotification);
  const treeData = useGraphStore((s) => s.treeData);
  const nodePool = useGraphStore((s) => s.nodePool);
  const openCard = useGraphStore((s) => s.openCard);
  const nodeMeta = useGraphStore((s) =>
    selectedNodeId ? s.nodePool[selectedNodeId] : undefined,
  );
  const explanation = getKnowledgeExplanation();
  const [activeTab, setActiveTab] = useState('');
  const [activeContextTreeId, setActiveContextTreeId] = useState<string | null>(null);
  const [newLabel, setNewLabel] = useState('');
  const [isAddingTab, setIsAddingTab] = useState(false);
  const [newTabLabel, setNewTabLabel] = useState('');
  const [renamingTabId, setRenamingTabId] = useState<string | null>(null);
  const [renamingTabLabel, setRenamingTabLabel] = useState('');
  const [activePageId, setActivePageId] = useState('');
  const [isAddingPage, setIsAddingPage] = useState(false);
  const [newPageLabel, setNewPageLabel] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [activeSupertag, setActiveSupertag] = useState('');

  // 递归相关状态
  const [expandedTabs, setExpandedTabs] = useState<Record<string, boolean>>({});
  const [addingChildTabParent, setAddingChildTabParent] = useState<string | null>(null);
  const [newChildTabLabel, setNewChildTabLabel] = useState('');
  const [addingChildPageParent, setAddingChildPageParent] = useState<string | null>(null);
  const [newChildPageLabel, setNewChildPageLabel] = useState('');
  const [renamingPageId, setRenamingPageId] = useState<string | null>(null);
  const [renamingPageLabel, setRenamingPageLabel] = useState('');
  const [openActionMenu, setOpenActionMenu] = useState<ActionMenuTarget>(null);

  const selectedTreeNode = selectedTreeNodeId
    ? findTreeNodeById(treeData, selectedTreeNodeId)
    : null;
  const contextRefs: TreeNodeReference[] = useMemo(
    () => (selectedNodeId ? collectTreeReferencesByNodeRef(treeData, selectedNodeId) : []),
    [selectedNodeId, treeData],
  );
  const activeContext: TreeNodeReference | null =
    contextRefs.find((context) => context.treeNodeId === activeContextTreeId) ?? contextRefs[0] ?? null;
  const activeContextSupplement = activeContext?.supplement ?? null;
  const suggestedLabel = selectedTreeNode?.name.trim() ?? '';
  const createLabel = (newLabel.trim() || suggestedLabel).trim();
  const visibleTabs = explanation?.tabs ?? [];

  // 计算 activeTab 在 Tab 树中的路径（如果是顶层 Tab 或子 Tab）
  const activeTabPath = useMemo(() => {
    if (!explanation || !activeTab) return [];
    return findTabPath(explanation.tabs, activeTab) ?? [];
  }, [explanation, activeTab]);

  // 活跃的"分页 Tab"（即真实 Tab，非路径 Tab）
  const activePageTab = activeTabPath.length > 0 ? activeTabPath[activeTabPath.length - 1] : null;
  const pageTabs = activePageTab && explanation ? pagesForTab(explanation, activePageTab) : [];

  // 计算 activePageId 在 Page 树中的路径
  const activePagePath = useMemo(() => {
    if (!activePageTab || !activePageId) return [];
    const pages = pagesForTab(explanation!, activePageTab);
    return findPagePath(pages, activePageId) ?? [];
  }, [explanation, activePageTab, activePageId]);

  // 计算要渲染的 Page 行（每行一组 Page + activePageId）
  // 注意：用 pageTabs（已通过 pagesForTab 处理 legacy/默认 fallback）而不是 activePageTab.pages
  const pageRows = useMemo(
    () => computePageRows(pageTabs, activePagePath),
    [pageTabs, activePagePath],
  );

  // 活跃的内容（最深层叶子的内容）
  const activeLeafPage = activePagePath[activePagePath.length - 1] ?? null;
  const activeLeafTab = activeTabPath[activeTabPath.length - 1] ?? null;
  const activeContent = activeLeafPage?.content ?? activeLeafTab?.content ?? '';

  const toggleActionMenu = (target: ActionMenuSelection) => {
    setOpenActionMenu((current) =>
      current?.kind === target.kind && current.id === target.id ? null : target,
    );
  };

  const handleCreateForCurrentTree = () => {
    if (!selectedTreeNodeId) return;
    if (!createLabel) {
      addNotification('请先填写知识名称', 'warning');
      return;
    }

    const id = addKnowledgeNode(createLabel);
    if (!id) {
      addNotification('创建失败：知识名称为空', 'warning');
      return;
    }

    linkTreeToKnowledge(selectedTreeNodeId, id);
    selectTreeEntry(selectedTreeNodeId);
    addNotification(`已创建并绑定当前目录项：${createLabel}`, 'success');
    setNewLabel('');
  };

  const handleCreateInPool = () => {
    const label = newLabel.trim();
    if (!label) {
      addNotification('请先填写知识名称', 'warning');
      return;
    }

    const id = addKnowledgeNode(label);
    if (id) {
      addNotification(`已加入节点池：${label}`, 'success');
      setNewLabel('');
    }
  };

  const handleAddTab = () => {
    if (!selectedNodeId) return;
    const label = newTabLabel.trim();
    if (!label) {
      addNotification('请先填写页面名称', 'warning');
      return;
    }

    const tabId = addKnowledgeTab(selectedNodeId, label);
    if (!tabId) return;

    setActiveTab(tabId);
    setIsEditing(true);
    setNewTabLabel('');
    setIsAddingTab(false);
  };

  const handleAddChildTab = () => {
    if (!selectedNodeId || !addingChildTabParent) return;
    const label = newChildTabLabel.trim();
    if (!label) {
      addNotification('请先填写子页签名称', 'warning');
      return;
    }
    const tabId = addKnowledgeTab(selectedNodeId, label, addingChildTabParent);
    if (!tabId) return;
    setExpandedTabs((prev) => ({ ...prev, [addingChildTabParent]: true }));
    setActiveTab(tabId);
    setIsEditing(true);
    setNewChildTabLabel('');
    setAddingChildTabParent(null);
  };

  const handleRemoveTab = (tabId: string) => {
    if (!selectedNodeId || !explanation || tabId === SYSTEM_TAB_IDS.definition) return;
    // 顶层 Tab 至少留一个
    const isTopLevel = explanation.tabs.some((t) => t.id === tabId);
    if (isTopLevel && visibleTabs.length <= 1) return;

    removeKnowledgeTab(selectedNodeId, tabId);
    if (renamingTabId === tabId) {
      setRenamingTabId(null);
      setRenamingTabLabel('');
    }
    if (activeTab === tabId) {
      setActiveTab(visibleTabs[0]?.id ?? '');
      setIsEditing(false);
    }
  };

  const beginRenameTab = (tab: ExplanationTab) => {
    if (!tab.id) return;
    setRenamingTabId(tab.id);
    setRenamingTabLabel(tab.label);
    setIsAddingTab(false);
    setAddingChildTabParent(null);
  };

  const cancelRenameTab = () => {
    setRenamingTabId(null);
    setRenamingTabLabel('');
  };

  const commitRenameTab = () => {
    if (!selectedNodeId || !renamingTabId) return;
    const label = renamingTabLabel.trim();
    if (!label) {
      addNotification('请先填写页面名称', 'warning');
      return;
    }
    renameKnowledgeTab(selectedNodeId, renamingTabId, label);
    cancelRenameTab();
  };

  const handleSelectTab = (tab: ExplanationTab) => {
    const tabId = tab.id || tab.label;
    setActiveTab(tabId);
    if (explanation && tab.id) {
      const pages = pagesForTab(explanation, tab);
      setActivePageId(pages[0]?.id ?? tab.id);
    } else {
      setActivePageId('');
    }
    setIsEditing(false);
    if (explanation && tab.id) {
      const path = findTabPath(explanation.tabs, tab.id);
      if (path && path.length > 1) {
        setExpandedTabs((prev) => {
          const next = { ...prev };
          for (let i = 0; i < path.length - 1; i++) {
            const ancestorId = path[i].id || path[i].label;
            next[ancestorId] = true;
          }
          return next;
        });
      }
    }
  };

  const handleToggleExpand = (tabId: string) => {
    setExpandedTabs((prev) => ({ ...prev, [tabId]: !prev[tabId] }));
  };

  const handleAddPage = (parentPageId: string | null = null) => {
    if (!selectedNodeId || !activePageTab) return;
    const label = (parentPageId ? newChildPageLabel : newPageLabel).trim();
    if (!label) {
      addNotification('请先填写页面名称', 'warning');
      return;
    }
    const pageId = addKnowledgeTabPage(
      selectedNodeId,
      activePageTab.id,
      label,
      parentPageId,
    );
    if (!pageId) return;
    setActivePageId(pageId);
    setIsEditing(true);
    if (parentPageId) {
      setNewChildPageLabel('');
      setAddingChildPageParent(null);
    } else {
      setNewPageLabel('');
      setIsAddingPage(false);
    }
  };

  const handleRemovePage = (pageId: string) => {
    if (!selectedNodeId || !activePageTab || pageId === SYSTEM_TAB_IDS.definition) return;
    const pages = pagesForTab(explanation!, activePageTab);
    // 顶层 Page 至少留一个
    const isTopLevel = pages.some((p) => p.id === pageId);
    if (isTopLevel && pages.length <= 1) return;

    removeKnowledgeTabPage(selectedNodeId, activePageTab.id, pageId);
    if (renamingPageId === pageId) {
      setRenamingPageId(null);
      setRenamingPageLabel('');
    }
    if (activePageId === pageId) {
      // 重置到第一个 Page
      const remaining = pages.filter((p) => p.id !== pageId);
      setActivePageId(remaining[0]?.id ?? activePageTab.id);
      setIsEditing(false);
    }
  };

  const beginRenamePage = (page: ExplanationPage) => {
    if (!page.id || page.id === SYSTEM_TAB_IDS.definition) return;
    setRenamingPageId(page.id);
    setRenamingPageLabel(page.label);
  };

  const cancelRenamePage = () => {
    setRenamingPageId(null);
    setRenamingPageLabel('');
    setOpenActionMenu(null);
  };

  const commitRenamePage = () => {
    if (!selectedNodeId || !activePageTab || !renamingPageId) return;
    const label = renamingPageLabel.trim();
    if (!label) {
      addNotification('请先填写页面名称', 'warning');
      return;
    }
    renameKnowledgeTabPage(selectedNodeId, activePageTab.id, renamingPageId, label);
    cancelRenamePage();
  };

  const handleMatrixAddTab = (label: string, parentTabId: string | null) => {
    if (!selectedNodeId) return;
    const tabId = addKnowledgeTab(selectedNodeId, label, parentTabId);
    if (!tabId) return;
    setActiveTab(tabId);
    setActivePageId(tabId);
    setIsEditing(false);
  };

  const handleMatrixAddPage = (
    tabId: string,
    label: string,
    parentPageId: string | null,
  ) => {
    if (!selectedNodeId) return;
    const pageId = addKnowledgeTabPage(selectedNodeId, tabId, label, parentPageId);
    if (!pageId) return;
    setActiveTab(tabId);
    setActivePageId(pageId);
    setIsEditing(false);
  };

  const handleMatrixDelete = (target: ExplanationTitleTarget) => {
    if (!selectedNodeId || !explanation) return;
    if (target.kind === 'tab') {
      handleRemoveTab(target.tabId);
      return;
    }

    const tabPath = findTabPath(explanation.tabs, target.tabId);
    const tab = tabPath?.[tabPath.length - 1];
    if (!tab) return;
    const pages = pagesForTab(explanation, tab);
    removeKnowledgeTabPage(selectedNodeId, target.tabId, target.pageId);
    if (activePageId === target.pageId) {
      const remaining = pages.filter((page) => page.id !== target.pageId);
      setActiveTab(target.tabId);
      setActivePageId(remaining[0]?.id ?? target.tabId);
      setIsEditing(false);
    }
  };

  const handleMatrixMerge = (target: ExplanationTitleTarget) => {
    if (!selectedNodeId) return;
    mergeExplanationTitle(selectedNodeId, target);
    if (target.kind === 'tab') {
      setActiveTab(target.tabId);
      setActivePageId(target.tabId);
    } else {
      setActiveTab(target.tabId);
      setActivePageId(target.pageId);
    }
    setIsEditing(false);
  };

  // 选中节点切换时重置状态
  useEffect(() => {
    setIsEditing(false);
    setIsAddingTab(false);
    setNewTabLabel('');
    setRenamingTabId(null);
    setRenamingTabLabel('');
    setIsAddingPage(false);
    setNewPageLabel('');
    setActiveSupertag('');
    setAddingChildTabParent(null);
    setNewChildTabLabel('');
    setAddingChildPageParent(null);
    setNewChildPageLabel('');
    setRenamingPageId(null);
    setRenamingPageLabel('');
    setOpenActionMenu(null);
    if (visibleTabs[0]) {
      const first = visibleTabs[0];
      const firstPages = explanation ? pagesForTab(explanation, first) : [];
      setActiveTab(first.id || first.label);
      setActivePageId(firstPages[0]?.id ?? first.id);
    } else {
      setActiveTab('');
      setActivePageId('');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedNodeId, selectedTreeNodeId, explanation?.nodeId]);

  useEffect(() => {
    if (explanation || !selectedTreeNodeId) return;
    setNewLabel(suggestedLabel);
  }, [explanation, selectedTreeNodeId, suggestedLabel]);

  useEffect(() => {
    if (!selectedNodeId) {
      setActiveContextTreeId(null);
      return;
    }

    const selectedTreeContext = selectedTreeNodeId
      ? contextRefs.find((context) => context.treeNodeId === selectedTreeNodeId)
      : undefined;
    const fallbackContextId = selectedTreeContext?.treeNodeId ?? contextRefs[0]?.treeNodeId ?? null;

    setActiveContextTreeId((current) => {
      if (selectedTreeContext && current !== selectedTreeContext.treeNodeId) {
        return selectedTreeContext.treeNodeId;
      }
      if (current && contextRefs.some((context) => context.treeNodeId === current)) {
        return current;
      }
      return fallbackContextId;
    });
  }, [contextRefs, selectedNodeId, selectedTreeNodeId]);

  // ===================== 路径 Tab（来自 supplement，非递归树） =====================
  const supplementTabs: ExplanationTab[] = activeContextSupplement?.tabs ?? [];
  const pathTab: ExplanationTab | null =
    activeContextSupplement?.tabs?.[0] ?? null;

  const pathTabsForDisplay: ExplanationTab[] = [
    ...(pathTab
      ? [
          {
            ...pathTab,
            label: pathTab.label.startsWith('路径·')
              ? pathTab.label
              : `路径·${pathTab.label}`,
          },
        ]
      : []),
    ...supplementTabs.slice(1).map((tab) => ({
      ...tab,
      label: tab.label.startsWith('路径·') ? tab.label : `路径·${tab.label}`,
    })),
  ];

  const activePathTab =
    pathTabsForDisplay.find((tab) => (tab.id || tab.label) === activeTab) ?? null;

  const matrixProjections = selectedNodeId
    ? findMatrixProjections(nodePool, selectedNodeId)
    : [];
  const isPagedTab = !!activePageTab && activePageTab.id === activeTab;
  const isPathTab = !!activePathTab;
  const activeContextLabel = activeContext ? contextEnvironmentLabel(activeContext) : '';
  const activeContextTitle = activeContext ? contextParentPathLabel(activeContext) : '';

  if (!explanation) {
    return (
      <div className="right-section explanation-panel">
        <div style={{ padding: 16, fontSize: 12 }}>
          <p className="text-muted" style={{ marginBottom: 12, fontStyle: 'italic' }}>
            {selectedTreeNodeId
              ? '该目录项尚未关联知识实体。'
              : '从左侧节点树选择节点。'}
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <input
              className="input"
              placeholder={suggestedLabel || '知识名称，如 SQL 语句'}
              value={newLabel}
              onChange={(event) => setNewLabel(event.target.value)}
            />
            {selectedTreeNodeId ? (
              <button
                className="btn btn-primary btn-sm"
                disabled={!createLabel}
                onClick={handleCreateForCurrentTree}
              >
                创建知识并绑定当前目录项
              </button>
            ) : (
              <button
                className="btn btn-primary btn-sm"
                disabled={!newLabel.trim()}
                onClick={handleCreateInPool}
              >
                仅加入节点池
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="right-section explanation-panel">
      <div className="explanation-card">
        <div className="explanation-card-header explanation-card-header--compact">
          {activeContextLabel && (
            <span className="context-env-chip" title={activeContextTitle}>
              {activeContextLabel}
            </span>
          )}

          {nodeMeta && (
            <div className="explanation-card-supertag-inline" aria-label="supertag">
              <SupertagPanel
                node={nodeMeta}
                updateKnowledgeNodeMeta={updateKnowledgeNodeMeta}
                addNotification={addNotification}
                activeSupertag={activeSupertag}
                onActiveSupertagChange={setActiveSupertag}
              />
            </div>
          )}

          <button
            type="button"
            className={`btn btn-sm explanation-edit-toggle${isEditing ? ' is-active' : ''}`}
            onClick={() => setIsEditing(!isEditing)}
          >
            <span>{isEditing ? '预览' : '编辑'}</span>
          </button>
        </div>

        <div className="explanation-card-body">
          <RecursiveTitleMatrix
            explanation={explanation}
            visibleTabs={visibleTabs}
            pathTitles={pathTabsForDisplay.map((tab) => ({
              id: tab.id || tab.label,
              label: tab.label,
            }))}
            activeTabId={activeTab}
            activePageId={activePageId}
            onSelectTab={handleSelectTab}
            onSelectPage={(tabId, pageId) => {
              setActiveTab(tabId);
              setActivePageId(pageId);
              setIsEditing(false);
            }}
            onSelectPath={(pathId) => {
              setActiveTab(pathId);
              setActivePageId('');
              setIsEditing(false);
            }}
            onRenameRoot={(label) =>
              selectedNodeId && updateKnowledgeCard(selectedNodeId, { title: label })
            }
            onRenameTab={(tabId, label) =>
              selectedNodeId && renameKnowledgeTab(selectedNodeId, tabId, label)
            }
            onRenamePage={(tabId, pageId, label) =>
              selectedNodeId && renameKnowledgeTabPage(selectedNodeId, tabId, pageId, label)
            }
            onAddTab={handleMatrixAddTab}
            onAddPage={handleMatrixAddPage}
            onDelete={handleMatrixDelete}
            onMerge={handleMatrixMerge}
            onWeightChange={(target, weight) =>
              selectedNodeId && updateExplanationTitleWeight(selectedNodeId, target, weight)
            }
          />

          <div className="card-content" id="card-content-body">
            {isEditing ? (
              isPagedTab && activePageTab && activeLeafPage ? (
                <textarea
                  className="explanation-editor"
                  value={activeLeafPage.content}
                  placeholder={`填写「${activeLeafPage.label}」...`}
                  onChange={(event) =>
                    selectedNodeId &&
                    activePageTab.id &&
                    updateKnowledgeTabPage(
                      selectedNodeId,
                      activePageTab.id,
                      activeLeafPage.id,
                      event.target.value,
                    )
                  }
                />
              ) : isPathTab && activePathTab && activeContext ? (
                <textarea
                  className="explanation-editor"
                  value={activePathTab.content ?? ''}
                  placeholder="填写该导航路径下的补充说明，如方言、上下文差异等。"
                  onChange={(event) =>
                    updatePathSupplementContent(activeContext.treeNodeId, event.target.value)
                  }
                />
              ) : (
                <p className="text-muted">{activeContent || '无内容'}</p>
              )
            ) : (
              <MarkdownView content={activeContent} />
            )}

            {selectedNodeId && matrixProjections.length > 0 && (
              <ProjectionReferences
                currentNodeId={selectedNodeId}
                nodePool={nodePool}
                projections={matrixProjections}
                onOpenOwner={openCard}
              />
            )}

            {(explanation.notes || activeContextSupplement?.notes) && (
              <div className="card-note-container">
                {explanation.notes && (
                  <div className="card-note">
                    <span className="card-note-label">备注:</span>
                    <span className="card-note-text">{explanation.notes}</span>
                  </div>
                )}
                {activeContextSupplement?.notes && (
                  <div className="card-note">
                    <span className="card-note-label">路径:</span>
                    <span className="card-note-text">{activeContextSupplement.notes}</span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
