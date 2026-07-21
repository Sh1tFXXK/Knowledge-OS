import { useMemo, useState } from 'react';
import type {
  ExplanationPage,
  ExplanationTab,
  ExplanationTitleTarget,
  NodeExplanation,
} from '../../types';

const DEFINITION_TAB_ID = 'def';

interface PathTitle {
  id: string;
  label: string;
}

interface RootMatrixNode {
  key: 'root';
  kind: 'root';
  label: string;
  weight: 1;
  children: MatrixTitleNode[];
}

interface TabMatrixNode {
  key: string;
  kind: 'tab';
  label: string;
  weight: number;
  target: Extract<ExplanationTitleTarget, { kind: 'tab' }>;
  tab: ExplanationTab;
  parentTabId: string | null;
  childKind: 'tab' | 'page';
  canDelete: boolean;
  children: MatrixTitleNode[];
}

interface PageMatrixNode {
  key: string;
  kind: 'page';
  label: string;
  weight: number;
  target: Extract<ExplanationTitleTarget, { kind: 'page' }>;
  page: ExplanationPage;
  parentPageId: string | null;
  canDelete: boolean;
  children: MatrixTitleNode[];
}

interface PathMatrixNode {
  key: string;
  kind: 'path';
  label: string;
  weight: 1;
  pathId: string;
  children: [];
}

type MatrixTitleNode = RootMatrixNode | TabMatrixNode | PageMatrixNode | PathMatrixNode;
type MutableMatrixNode = TabMatrixNode | PageMatrixNode;
type CommandMode = 'rename' | 'add-child' | 'add-sibling';

interface PendingCommand {
  mode: CommandMode;
  node: MatrixTitleNode;
}

interface Props {
  explanation: NodeExplanation;
  visibleTabs: ExplanationTab[];
  pathTitles: PathTitle[];
  activeTabId: string;
  activePageId: string;
  onSelectTab: (tab: ExplanationTab) => void;
  onSelectPage: (tabId: string, pageId: string) => void;
  onSelectPath: (pathId: string) => void;
  onRenameRoot: (label: string) => void;
  onRenameTab: (tabId: string, label: string) => void;
  onRenamePage: (tabId: string, pageId: string, label: string) => void;
  onAddTab: (label: string, parentTabId: string | null) => void;
  onAddPage: (tabId: string, label: string, parentPageId: string | null) => void;
  onDelete: (target: ExplanationTitleTarget) => void;
  onMerge: (target: ExplanationTitleTarget) => void;
  onWeightChange: (target: ExplanationTitleTarget, weight: number) => void;
}

function storedPagesForTab(
  explanation: NodeExplanation,
  tab: ExplanationTab,
): ExplanationPage[] {
  if (tab.pages?.length) return tab.pages;
  if (tab.id === DEFINITION_TAB_ID && explanation.definitionPages?.length) {
    return explanation.definitionPages;
  }
  return [];
}

function buildPageNode(
  page: ExplanationPage,
  tabId: string,
  parentPageId: string | null,
  siblingCount: number,
): PageMatrixNode {
  const children = page.pages?.map((child) =>
    buildPageNode(child, tabId, page.id, page.pages?.length ?? 0),
  ) ?? [];
  return {
    key: `page:${tabId}:${page.id}`,
    kind: 'page',
    label: page.label,
    weight: page.weight ?? 1,
    target: { kind: 'page', tabId, pageId: page.id },
    page,
    parentPageId,
    canDelete:
      page.id !== DEFINITION_TAB_ID && (parentPageId !== null || siblingCount > 1),
    children,
  };
}

function buildTabNode(
  explanation: NodeExplanation,
  tab: ExplanationTab,
  parentTabId: string | null,
  siblingCount: number,
): TabMatrixNode {
  const childTabs = tab.tabs ?? [];
  const storedPages = storedPagesForTab(explanation, tab);
  const childKind = childTabs.length > 0 ? 'tab' : 'page';
  const children = childTabs.length > 0
    ? childTabs.map((child) => buildTabNode(explanation, child, tab.id, childTabs.length))
    : storedPages.map((page) => buildPageNode(page, tab.id, null, storedPages.length));

  return {
    key: `tab:${tab.id}`,
    kind: 'tab',
    label: tab.label,
    weight: tab.weight ?? 1,
    target: { kind: 'tab', tabId: tab.id },
    tab,
    parentTabId,
    childKind,
    canDelete: tab.id !== DEFINITION_TAB_ID && (parentTabId !== null || siblingCount > 1),
    children,
  };
}

function containsActive(node: MatrixTitleNode, activeTabId: string, activePageId: string): boolean {
  if (node.kind === 'tab' && node.tab.id === activeTabId) return true;
  if (node.kind === 'page' && node.page.id === activePageId) return true;
  if (node.kind === 'path' && node.pathId === activeTabId) return true;
  return node.children.some((child) => containsActive(child, activeTabId, activePageId));
}

function isMutable(node: MatrixTitleNode): node is MutableMatrixNode {
  return node.kind === 'tab' || node.kind === 'page';
}

function commandLabel(mode: CommandMode): string {
  if (mode === 'rename') return '编辑标题';
  if (mode === 'add-child') return '分裂';
  return '添加同级';
}

export default function RecursiveTitleMatrix({
  explanation,
  visibleTabs,
  pathTitles,
  activeTabId,
  activePageId,
  onSelectTab,
  onSelectPage,
  onSelectPath,
  onRenameRoot,
  onRenameTab,
  onRenamePage,
  onAddTab,
  onAddPage,
  onDelete,
  onMerge,
  onWeightChange,
}: Props) {
  const [openToolsKey, setOpenToolsKey] = useState<string | null>(null);
  const [pendingCommand, setPendingCommand] = useState<PendingCommand | null>(null);
  const [titleDraft, setTitleDraft] = useState('');
  const [countDraft, setCountDraft] = useState(1);

  const root = useMemo<RootMatrixNode>(() => ({
    key: 'root',
    kind: 'root',
    label: explanation.title,
    weight: 1,
    children: [
      ...visibleTabs.map((tab) => buildTabNode(explanation, tab, null, visibleTabs.length)),
      ...pathTitles.map<PathMatrixNode>((path) => ({
        key: `path:${path.id}`,
        kind: 'path',
        label: path.label,
        weight: 1,
        pathId: path.id,
        children: [],
      })),
    ],
  }), [explanation, pathTitles, visibleTabs]);

  const beginCommand = (mode: CommandMode, node: MatrixTitleNode) => {
    setPendingCommand({ mode, node });
    setTitleDraft(mode === 'rename' ? node.label : '');
    setCountDraft(1);
    setOpenToolsKey(null);
  };

  const cancelCommand = () => {
    setPendingCommand(null);
    setTitleDraft('');
    setCountDraft(1);
  };

  const runAdd = (node: MatrixTitleNode, mode: 'add-child' | 'add-sibling', labels: string[]) => {
    if (node.kind === 'root') {
      labels.forEach((label) => onAddTab(label, null));
      return;
    }
    if (node.kind === 'tab') {
      if (mode === 'add-sibling') {
        labels.forEach((label) => onAddTab(label, node.parentTabId));
      } else if (node.childKind === 'tab') {
        labels.forEach((label) => onAddTab(label, node.tab.id));
      } else {
        labels.forEach((label) => onAddPage(node.tab.id, label, null));
      }
      return;
    }
    if (node.kind === 'page') {
      const parentPageId = mode === 'add-child' ? node.page.id : node.parentPageId;
      labels.forEach((label) => onAddPage(node.target.tabId, label, parentPageId));
    }
  };

  const commitCommand = () => {
    if (!pendingCommand) return;
    const label = titleDraft.trim();
    if (!label) return;
    const { mode, node } = pendingCommand;

    if (mode === 'rename') {
      if (node.kind === 'root') onRenameRoot(label);
      if (node.kind === 'tab') onRenameTab(node.tab.id, label);
      if (node.kind === 'page') onRenamePage(node.target.tabId, node.page.id, label);
      cancelCommand();
      return;
    }

    const count = Math.max(1, Math.min(20, Math.floor(countDraft)));
    const labels = Array.from({ length: count }, (_, index) =>
      count === 1 ? label : `${label} ${index + 1}`,
    );
    runAdd(node, mode, labels);
    cancelCommand();
  };

  const selectNode = (node: MatrixTitleNode) => {
    if (node.kind === 'root') {
      const firstTab = visibleTabs[0];
      if (firstTab) onSelectTab(firstTab);
    } else if (node.kind === 'tab') {
      onSelectTab(node.tab);
    } else if (node.kind === 'page') {
      onSelectPage(node.target.tabId, node.page.id);
    } else {
      onSelectPath(node.pathId);
    }
  };

  const renderTools = (node: MatrixTitleNode) => {
    if (node.kind === 'path') return null;
    const isOpen = openToolsKey === node.key;
    return (
      <div className="title-matrix-tools" onClick={(event) => event.stopPropagation()}>
        <button
          type="button"
          className="title-matrix-tools-trigger"
          aria-label={`${node.label}的操作`}
          aria-expanded={isOpen}
          title="操作"
          onClick={() => setOpenToolsKey(isOpen ? null : node.key)}
        >
          <span aria-hidden="true">...</span>
        </button>
        {isOpen && (
          <div className="title-matrix-tools-menu">
            <button type="button" onClick={() => beginCommand('add-child', node)}>分裂</button>
            {node.kind !== 'root' && (
              <button type="button" onClick={() => beginCommand('add-sibling', node)}>添加同级</button>
            )}
            <button type="button" onClick={() => beginCommand('rename', node)}>编辑标题</button>
            {isMutable(node) && (
              <label className="title-matrix-weight-control">
                <span>比例</span>
                <input
                  type="number"
                  min="0.1"
                  step="0.1"
                  value={node.weight}
                  onChange={(event) => {
                    const weight = Number(event.target.value);
                    if (weight > 0) onWeightChange(node.target, weight);
                  }}
                />
              </label>
            )}
            {isMutable(node) && node.children.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  setOpenToolsKey(null);
                  if (window.confirm(`合并「${node.label}」并移除其全部直接和间接子格？`)) {
                    onMerge(node.target);
                  }
                }}
              >
                合并
              </button>
            )}
            {isMutable(node) && node.canDelete && (
              <button
                type="button"
                className="is-danger"
                onClick={() => {
                  setOpenToolsKey(null);
                  onDelete(node.target);
                }}
              >
                删除
              </button>
            )}
          </div>
        )}
      </div>
    );
  };

  const renderNode = (node: MatrixTitleNode, depth: number): React.ReactNode => {
    const hasChildren = node.children.length > 0;
    const active = containsActive(node, activeTabId, activePageId);
    const axis = depth % 2 === 0 ? 'column' : 'row';
    const style = node.kind === 'root'
      ? undefined
      : { flexGrow: node.weight, flexBasis: 0 };

    if (!hasChildren) {
      return (
        <div
          key={node.key}
          className={`title-matrix-node title-matrix-leaf${active ? ' is-active' : ''}`}
          style={style}
        >
          <button type="button" className="title-matrix-leaf-title" onClick={() => selectNode(node)}>
            {node.label}
          </button>
          {renderTools(node)}
        </div>
      );
    }

    return (
      <div
        key={node.key}
        className={`title-matrix-node title-matrix-parent${active ? ' is-active' : ''}`}
        style={style}
      >
        <div className="title-matrix-parent-rail">
          <button type="button" className="title-matrix-parent-title" onClick={() => selectNode(node)}>
            <span>{node.label}</span>
          </button>
          {renderTools(node)}
        </div>
        <div className="title-matrix-children" data-axis={axis}>
          {node.children.map((child) => renderNode(child, depth + 1))}
        </div>
      </div>
    );
  };

  return (
    <section className="recursive-title-matrix" aria-label="解释卡标题矩阵">
      {pendingCommand && (
        <form
          className="title-matrix-commandbar"
          onSubmit={(event) => {
            event.preventDefault();
            commitCommand();
          }}
        >
          <span>{commandLabel(pendingCommand.mode)}</span>
          <input
            value={titleDraft}
            autoFocus
            placeholder="标题"
            onChange={(event) => setTitleDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Escape') cancelCommand();
            }}
          />
          {pendingCommand.mode !== 'rename' && (
            <input
              className="title-matrix-count"
              type="number"
              min="1"
              max="20"
              value={countDraft}
              aria-label="数量"
              title="数量"
              onChange={(event) => setCountDraft(Number(event.target.value))}
            />
          )}
          <button type="submit" aria-label="确认" title="确认">OK</button>
          <button type="button" aria-label="取消" title="取消" onClick={cancelCommand}>×</button>
        </form>
      )}
      <div className="recursive-title-matrix-scroll">
        {renderNode(root, 0)}
      </div>
    </section>
  );
}
