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
  NodeExplanation,
} from '../types';
import MarkdownView from './explanation/MarkdownView';
import ProjectionReferences from './explanation/ProjectionReferences';
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
const HIDDEN_LEGACY_TAB_IDS = new Set(['mech', 'bound', 'source']);

function isVisibleMainTab(tab: ExplanationTab): boolean {
  return !HIDDEN_LEGACY_TAB_IDS.has(tab.id);
}

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

interface ActionMenuSelection {
  kind: 'tab' | 'page';
  id: string;
}

type ActionMenuTarget = ActionMenuSelection | null;

interface ItemActionMenuProps {
  label: string;
  isOpen: boolean;
  isActive: boolean;
  onToggle: () => void;
  onClose: () => void;
  onAddChild: () => void;
  onRename?: () => void;
  onDelete?: () => void;
}

function ItemActionMenu({
  label,
  isOpen,
  isActive,
  onToggle,
  onClose,
  onAddChild,
  onRename,
  onDelete,
}: ItemActionMenuProps) {
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [menuPosition, setMenuPosition] = useState<CSSProperties>({ top: 0, left: 0 });

  useLayoutEffect(() => {
    if (!isOpen) return;

    const updatePosition = () => {
      const trigger = triggerRef.current;
      if (!trigger) return;

      const rect = trigger.getBoundingClientRect();
      const menuWidth = menuRef.current?.offsetWidth ?? 148;
      const menuHeight = menuRef.current?.offsetHeight ?? 104;
      const viewportGap = 8;
      const controlGap = 5;
      const opensRight = rect.right + controlGap + menuWidth <= window.innerWidth - viewportGap;
      const left = opensRight
        ? rect.right + controlGap
        : Math.max(viewportGap, rect.left - menuWidth - controlGap);
      const top = Math.min(
        Math.max(viewportGap, rect.top),
        Math.max(viewportGap, window.innerHeight - menuHeight - viewportGap),
      );

      setMenuPosition({ top, left });
    };

    updatePosition();
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);
    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    const focusFrame = window.requestAnimationFrame(() => menuRef.current?.focus());
    const handlePointerDown = (event: PointerEvent) => {
      if (
        !triggerRef.current?.contains(event.target as Node) &&
        !menuRef.current?.contains(event.target as Node)
      ) {
        onClose();
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      onClose();
      window.requestAnimationFrame(() => triggerRef.current?.focus());
    };

    document.addEventListener('pointerdown', handlePointerDown, true);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      window.cancelAnimationFrame(focusFrame);
      document.removeEventListener('pointerdown', handlePointerDown, true);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  const runAction = (action: () => void) => {
    onClose();
    action();
  };

  return (
    <span
      className={`explanation-item-menu-root${isActive ? ' is-active' : ''}${isOpen ? ' is-open' : ''}`}
    >
      <button
        ref={triggerRef}
        type="button"
        className="explanation-item-menu-trigger"
        aria-label={`${label}的更多操作`}
        aria-haspopup="menu"
        aria-expanded={isOpen}
        title="更多操作"
        onClick={(event) => {
          event.stopPropagation();
          onToggle();
        }}
      >
        <span aria-hidden="true">⋯</span>
      </button>
      {isOpen &&
        createPortal(
          <div
            ref={menuRef}
            className="explanation-item-menu"
            role="menu"
            aria-label={`${label}操作`}
            style={menuPosition}
            tabIndex={-1}
            onClick={(event) => event.stopPropagation()}
          >
            <button type="button" role="menuitem" onClick={() => runAction(onAddChild)}>
              <span aria-hidden="true">＋</span>
              <span>新增子页</span>
            </button>
            {onRename && (
              <button type="button" role="menuitem" onClick={() => runAction(onRename)}>
                <span aria-hidden="true">✎</span>
                <span>重命名</span>
              </button>
            )}
            {onDelete && (
              <button
                type="button"
                role="menuitem"
                className="is-danger"
                onClick={() => runAction(onDelete)}
              >
                <span aria-hidden="true">×</span>
                <span>删除</span>
              </button>
            )}
          </div>,
          document.body,
        )}
    </span>
  );
}

interface TabTreeItemProps {
  tab: ExplanationTab;
  depth: number;
  activeTab: string;
  expandedTabs: Record<string, boolean>;
  renamingTabId: string | null;
  renamingTabLabel: string;
  addingChildTabParent: string | null;
  newChildTabLabel: string;
  canRemove: boolean;
  isTopLevel: boolean;
  openActionMenu: ActionMenuTarget;
  onToggleActionMenu: (target: ActionMenuSelection) => void;
  onCloseActionMenu: () => void;
  onToggleExpand: (tabId: string) => void;
  onSelectTab: (tab: ExplanationTab) => void;
  onBeginRename: (tab: ExplanationTab) => void;
  onCancelRename: () => void;
  onCommitRename: () => void;
  onRenamingLabelChange: (value: string) => void;
  onRemoveTab: (tabId: string) => void;
  onBeginAddChild: (tabId: string) => void;
  onCancelAddChild: () => void;
  onCommitAddChild: () => void;
  onNewChildLabelChange: (value: string) => void;
}

function TabTreeItem(props: TabTreeItemProps) {
  const {
    tab,
    depth,
    activeTab,
    expandedTabs,
    renamingTabId,
    renamingTabLabel,
    addingChildTabParent,
    newChildTabLabel,
    canRemove,
    isTopLevel,
    openActionMenu,
    onToggleActionMenu,
    onCloseActionMenu,
    onToggleExpand,
    onSelectTab,
    onBeginRename,
    onCancelRename,
    onCommitRename,
    onRenamingLabelChange,
    onRemoveTab,
    onBeginAddChild,
    onCancelAddChild,
    onCommitAddChild,
    onNewChildLabelChange,
  } = props;
  const tabId = tab.id || tab.label;
  const hasChildren = !!tab.tabs?.length;
  const isExpanded = expandedTabs[tabId] ?? false;
  const isActive = tabId === activeTab;
  const isRenaming = renamingTabId === tab.id;
  const isAddingChild = addingChildTabParent === tab.id;

  return (
    <div className="card-tab-subtree">
      <div
        className={`card-tab-item${isRenaming ? ' is-renaming' : ''}`}
        style={{ paddingLeft: depth * 3 + 1 }}
      >
        {hasChildren ? (
          <button
            type="button"
            className={`card-tab-arrow${isExpanded ? ' is-expanded' : ''}`}
            aria-label={isExpanded ? '折叠子页签' : '展开子页签'}
            title={isExpanded ? '折叠' : '展开'}
            onClick={(event) => {
              event.stopPropagation();
              onToggleExpand(tabId);
            }}
          >
            {isExpanded ? '▾' : '▸'}
          </button>
        ) : (
          <span className="card-tab-arrow is-leaf" aria-hidden="true" />
        )}
        {isRenaming ? (
          <form
            className="card-tab-rename-form"
            onSubmit={(event) => {
              event.preventDefault();
              onCommitRename();
            }}
          >
            <input
              className="card-tab-rename-input"
              value={renamingTabLabel}
              autoFocus
              onFocus={(event) => event.currentTarget.select()}
              onChange={(event) => onRenamingLabelChange(event.target.value)}
              onBlur={onCommitRename}
              onKeyDown={(event) => {
                if (event.key === 'Escape') {
                  event.preventDefault();
                  onCancelRename();
                }
              }}
            />
          </form>
        ) : (
          <button
            type="button"
            className={`card-tab${isActive ? ' active' : ''}`}
            aria-current={isActive ? 'page' : undefined}
            title={tab.label}
            onDoubleClick={() => onBeginRename(tab)}
            onClick={() => onSelectTab(tab)}
          >
            {tab.label}
          </button>
        )}
        {!isRenaming && (
          <ItemActionMenu
            label={tab.label}
            isOpen={openActionMenu?.kind === 'tab' && openActionMenu.id === tab.id}
            isActive={isActive}
            onToggle={() => onToggleActionMenu({ kind: 'tab', id: tab.id })}
            onClose={onCloseActionMenu}
            onAddChild={() => onBeginAddChild(tab.id)}
            onRename={isTopLevel && tab.id ? () => onBeginRename(tab) : undefined}
            onDelete={canRemove ? () => onRemoveTab(tab.id) : undefined}
          />
        )}
      </div>
      {isAddingChild && (
        <form
          className="card-tab-add-form"
          style={{ marginLeft: (depth + 1) * 3 + 1 }}
          onSubmit={(event) => {
            event.preventDefault();
            onCommitAddChild();
          }}
        >
          <input
            className="card-tab-add-input"
            value={newChildTabLabel}
            placeholder="子页签名称"
            autoFocus
            onChange={(event) => onNewChildLabelChange(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Escape') {
                event.preventDefault();
                onCancelAddChild();
              }
            }}
          />
          <button type="submit" className="card-tab-add-confirm" aria-label="添加子页签" title="添加子页签">
            ✓
          </button>
        </form>
      )}
      {hasChildren && isExpanded && tab.tabs?.map((child) => (
        <TabTreeItem
          key={child.id || child.label}
          {...props}
          tab={child}
          depth={depth + 1}
          canRemove={true}
          isTopLevel={false}
        />
      ))}
    </div>
  );
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
  const visibleTabs = (explanation?.tabs ?? []).filter(isVisibleMainTab);

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
          <nav className="card-tabs" aria-label="解释页">
            {visibleTabs.map((tab) => {
              const tabId = tab.id || tab.label;
              const canRemove =
                tabId !== SYSTEM_TAB_IDS.definition && visibleTabs.length > 1;
              return (
                <TabTreeItem
                  key={tabId}
                  tab={tab}
                  depth={0}
                  activeTab={activeTab}
                  expandedTabs={expandedTabs}
                  renamingTabId={renamingTabId}
                  renamingTabLabel={renamingTabLabel}
                  addingChildTabParent={addingChildTabParent}
                  newChildTabLabel={newChildTabLabel}
                  canRemove={canRemove}
                  isTopLevel={true}
                  openActionMenu={openActionMenu}
                  onToggleActionMenu={toggleActionMenu}
                  onCloseActionMenu={() => setOpenActionMenu(null)}
                  onToggleExpand={handleToggleExpand}
                  onSelectTab={handleSelectTab}
                  onBeginRename={beginRenameTab}
                  onCancelRename={cancelRenameTab}
                  onCommitRename={commitRenameTab}
                  onRenamingLabelChange={setRenamingTabLabel}
                  onRemoveTab={handleRemoveTab}
                  onBeginAddChild={(parentId) => {
                    setAddingChildTabParent(parentId);
                    setNewChildTabLabel('');
                    setExpandedTabs((prev) => ({ ...prev, [parentId]: true }));
                  }}
                  onCancelAddChild={() => {
                    setAddingChildTabParent(null);
                    setNewChildTabLabel('');
                  }}
                  onCommitAddChild={handleAddChildTab}
                  onNewChildLabelChange={setNewChildTabLabel}
                />
              );
            })}

            {pathTabsForDisplay.map((tab) => {
              const tabId = tab.id || tab.label;
              const isActive = tabId === activeTab;
              return (
                <div key={tabId} className="card-tab-item path-tab-item">
                  <span className="card-tab-arrow is-leaf" aria-hidden="true" />
                  <button
                    type="button"
                    className={`card-tab${isActive ? ' active' : ''}`}
                    aria-current={isActive ? 'page' : undefined}
                    title={tab.label}
                    onClick={() => {
                      setActiveTab(tabId);
                      setActivePageId('');
                      setIsEditing(false);
                    }}
                  >
                    {tab.label}
                  </button>
                </div>
              );
            })}

            {isAddingTab ? (
              <form
                className="card-tab-add-form"
                onSubmit={(event) => {
                  event.preventDefault();
                  handleAddTab();
                }}
              >
                <input
                  className="card-tab-add-input"
                  value={newTabLabel}
                  placeholder="页面名称"
                  autoFocus
                  onChange={(event) => setNewTabLabel(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Escape') {
                      setIsAddingTab(false);
                      setNewTabLabel('');
                    }
                  }}
                />
                <button
                  type="submit"
                  className="card-tab-add-confirm"
                  aria-label="添加页面"
                  title="添加页面"
                >
                  ✓
                </button>
              </form>
            ) : (
              <button
                type="button"
                className="card-tab-add"
                onClick={() => setIsAddingTab(true)}
              >
                + 页
              </button>
            )}
          </nav>

          <div className="card-content" id="card-content-body">
            {isPagedTab && pageRows.length > 0 && (
              <section className="definition-pages definition-pages-multirow" aria-label="页面">
                {pageRows.map((row, rowIdx) => (
                  <div
                    key={rowIdx}
                    className="definition-page-row"
                    style={{ marginLeft: rowIdx * 6 }}
                  >
                    {row.pages.map((page) => {
                      const isActive = page.id === row.activePageId;
                      const isRenaming = renamingPageId === page.id;
                      const isAddingChild = addingChildPageParent === page.id;
                      const isDefinitionPage = page.id === SYSTEM_TAB_IDS.definition;
                      const canRemovePage =
                        !isDefinitionPage &&
                        rowIdx === 0 &&
                        pageTabs.length > 1;
                      const canRemoveChildPage = !isDefinitionPage && rowIdx > 0;
                      return (
                        <div
                          key={page.id}
                          className={`definition-page-item${isActive ? ' is-active' : ''}`}
                        >
                          {isRenaming ? (
                            <form
                              className="definition-page-rename-form"
                              onSubmit={(event) => {
                                event.preventDefault();
                                commitRenamePage();
                              }}
                            >
                              <input
                                className="definition-page-rename-input"
                                value={renamingPageLabel}
                                autoFocus
                                onFocus={(event) => event.currentTarget.select()}
                                onChange={(event) => setRenamingPageLabel(event.target.value)}
                                onBlur={commitRenamePage}
                                onKeyDown={(event) => {
                                  if (event.key === 'Escape') {
                                    event.preventDefault();
                                    cancelRenamePage();
                                  }
                                }}
                              />
                            </form>
                          ) : (
                            <button
                              type="button"
                              className={`definition-page-tab${isActive ? ' active' : ''}`}
                              aria-current={isActive ? 'page' : undefined}
                              title={page.label}
                              onDoubleClick={() => beginRenamePage(page)}
                              onClick={() => {
                                setActivePageId(page.id);
                                setIsEditing(false);
                              }}
                            >
                              {page.label}
                            </button>
                          )}
                          {!isRenaming && (
                            <ItemActionMenu
                              label={page.label}
                              isOpen={
                                openActionMenu?.kind === 'page' &&
                                openActionMenu.id === page.id
                              }
                              isActive={isActive}
                              onToggle={() => toggleActionMenu({ kind: 'page', id: page.id })}
                              onClose={() => setOpenActionMenu(null)}
                              onAddChild={() => {
                                setAddingChildPageParent(page.id);
                                setNewChildPageLabel('');
                              }}
                              onRename={
                                isDefinitionPage ? undefined : () => beginRenamePage(page)
                              }
                              onDelete={
                                canRemovePage || canRemoveChildPage
                                  ? () => handleRemovePage(page.id)
                                  : undefined
                              }
                            />
                          )}
                          {isAddingChild && (
                            <form
                              className="definition-page-add-form definition-page-add-child-form"
                              onSubmit={(event) => {
                                event.preventDefault();
                                handleAddPage(page.id);
                              }}
                            >
                              <input
                                className="definition-page-add-input"
                                value={newChildPageLabel}
                                placeholder="子页名称"
                                autoFocus
                                onChange={(event) => setNewChildPageLabel(event.target.value)}
                                onKeyDown={(event) => {
                                  if (event.key === 'Escape') {
                                    event.preventDefault();
                                    setAddingChildPageParent(null);
                                    setNewChildPageLabel('');
                                  }
                                }}
                              />
                              <button
                                type="submit"
                                className="definition-page-add-confirm"
                                aria-label="添加子页"
                                title="添加子页"
                              >
                                ✓
                              </button>
                            </form>
                          )}
                        </div>
                      );
                    })}
                    {rowIdx === 0 && isAddingPage ? (
                      <form
                        className="definition-page-add-form"
                        onSubmit={(event) => {
                          event.preventDefault();
                          handleAddPage(null);
                        }}
                      >
                        <input
                          className="definition-page-add-input"
                          value={newPageLabel}
                          placeholder="页面名称"
                          autoFocus
                          onChange={(event) => setNewPageLabel(event.target.value)}
                          onKeyDown={(event) => {
                            if (event.key === 'Escape') {
                              setIsAddingPage(false);
                              setNewPageLabel('');
                            }
                          }}
                        />
                        <button
                          type="submit"
                          className="definition-page-add-confirm"
                          aria-label="添加页面"
                          title="添加页面"
                        >
                          ✓
                        </button>
                      </form>
                    ) : rowIdx === 0 ? (
                      <button
                        type="button"
                        className="definition-page-add"
                        onClick={() => setIsAddingPage(true)}
                      >
                        +
                      </button>
                    ) : null}
                  </div>
                ))}
              </section>
            )}

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
