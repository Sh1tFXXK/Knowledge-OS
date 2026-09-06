import { create } from 'zustand';
import type {
  GraphNode,
  GraphEdge,
  NotificationItem,
  ThemeType,
  Perspective,
  TreeNode,
  NodeExplanation,
  Question,
  QuestionAnswerStep,
  KnowledgeNode,
  KnowledgeEdge,
  ExplanationPage,
  ExplanationTab,
  ExplanationTable,
  TreeRefSupplement,
  Rule,
  ViewScope,
  ViewDataPack,
  AppView,
  ExplanationIndexSelection,
  ExplanationSelection,
} from '../types';
import { ExplanationSelectionKind, KnowledgeRelationKind, TypeRelationKind } from '../types';
import {
  createKnowledgeNode,
  createKnowledgeEdge,
  createTreeEntry,
  genId,
} from '../knowledge/defaults';
import { extractSubgraph } from '../knowledge/extractSubgraph';
import {
  clearPersistedAppState,
  exportAppStateJson,
  parseImportedAppState,
} from '../knowledge/persist';
import {
  createEmptyAppState,
  APP_STATE_VERSION,
  type PersistedAppState,
} from '../knowledge/state';
import type { KnowledgeEvolutionEvent } from '../knowledge/timelineEvolution';
import {
  appendTreeChild,
  cloneTree,
  cloneTreeWithNewIds,
  collectTreeNodes,
  findTreeParent,
  findTreeNodeById,
  moveTreeNodes as moveTreeNodesInTree,
  removeTreeChild,
  updateTreeNode,
} from '../knowledge/treeUtils';
import { resolvePoolIdFromTree, resolvePoolIdFromTreeNode } from '../knowledge/treeSelection';
import {
  createTreeBindingEdge,
  createTreeBindingEdgesForSubtree,
  createMovedTreeBindingEdges,
  removeTreeBindingEdgesForTreeIds,
} from '../knowledge/treeBinding';
import {
  pickQuestionForFocus,
  questionsForNode,
} from '../knowledge/questionLink';
import { normalizeQuestionAnswerSteps } from '../knowledge/answerComposer';
import {
  loadCompleteStateFromFiles,
  dirtyPersistedSlices,
  pickPersistedSlices,
  savePersistedSlices,
  type PersistedSliceKey,
  type PersistedSlices,
} from '../knowledge/filePersistence';
import { removeNodeRefsFromViewDimensions } from '../knowledge/projection';
import {
  hasDirectTypeRelation,
  typeRelationLabel,
  wouldIntroduceTypeRelationCycle,
} from '../knowledge/typeRelations';
import { saveLastSelectedEvent, clearTemporalPreferences } from '../knowledge/temporalPreferences';
import {
  CONTAINMENT_EDGE_LABEL,
  CONTAINMENT_EDGE_TYPE,
  hasDirectContainmentRelation,
  isManagedContainmentEdge,
  wouldIntroduceContainmentCycle,
} from '../knowledge/containment';
import {
  applyExplanationIndexOperation as mutateExplanationIndex,
  setExplanationIndexItemTags,
  type ExplanationIndexOperation,
} from '../knowledge/explanationIndexMutations';
import {
  areSupertagsEqual,
  normalizeSupertag,
  normalizeSupertags,
  supertagKey,
} from '../knowledge/supertags';

const initialApp = createEmptyAppState();
const DEFINITION_TAB_ID = 'def';

function pagesForTab(card: NodeExplanation, tab: NodeExplanation['tabs'][number]): ExplanationPage[] {
  if (tab.pages?.length) return tab.pages;
  const legacyPages = tab.id === DEFINITION_TAB_ID ? card.definitionPages : undefined;
  return legacyPages?.length ? legacyPages : [];
}

function patchTabPages(
  card: NodeExplanation,
  tabId: string,
  pages: ExplanationPage[],
): Partial<Pick<NodeExplanation, 'tabs' | 'definitionPages'>> {
  const tabs = mapTabRecursive(card.tabs, tabId, (tab) => ({
    ...tab,
    content: tab.content,
    pages: pages.length > 0 ? pages : undefined,
  }));
  return tabId === DEFINITION_TAB_ID
    ? { tabs, definitionPages: undefined }
    : { tabs };
}

// ===================== 递归树遍历工具 =====================
// ExplanationTab 与 ExplanationPage 都支持无限递归（tabs[].tabs[] 与 pages[].pages[]）。
// 以下工具函数在树中按 ID 查找/变换/删除节点，路径用 ID 数组表示（从根到目标）。

/** 在 Tab 树中按 ID 查找 Tab 节点。 */
function findTabRecursive(tabs: ExplanationTab[], tabId: string): ExplanationTab | null {
  for (const tab of tabs) {
    if (tab.id === tabId) return tab;
    if (tab.tabs) {
      const found = findTabRecursive(tab.tabs, tabId);
      if (found) return found;
    }
  }
  return null;
}

/** 在 Tab 树中按 ID 查找路径（从根到目标，包含目标本身）。找不到返回 null。 */
function findTabPath(tabs: ExplanationTab[], tabId: string): ExplanationTab[] | null {
  for (const tab of tabs) {
    if (tab.id === tabId) return [tab];
    if (tab.tabs) {
      const subPath = findTabPath(tab.tabs, tabId);
      if (subPath) return [tab, ...subPath];
    }
  }
  return null;
}

/** 在 Tab 树中变换匹配 ID 的节点（返回新树，不修改原树）。 */
function mapTabRecursive(
  tabs: ExplanationTab[],
  tabId: string,
  fn: (tab: ExplanationTab) => ExplanationTab,
): ExplanationTab[] {
  return tabs.map((tab) => {
    if (tab.id === tabId) return fn(tab);
    if (tab.tabs) return { ...tab, tabs: mapTabRecursive(tab.tabs, tabId, fn) };
    return tab;
  });
}

/** 在 Tab 树中删除匹配 ID 的节点（返回新树）。 */
function removeTabRecursive(tabs: ExplanationTab[], tabId: string): ExplanationTab[] {
  return tabs
    .filter((tab) => tab.id !== tabId)
    .map((tab) => (tab.tabs ? { ...tab, tabs: removeTabRecursive(tab.tabs, tabId) } : tab));
}

/** 在 Page 树中按 ID 查找 Page 节点。 */
function findPageRecursive(pages: ExplanationPage[], pageId: string): ExplanationPage | null {
  for (const page of pages) {
    if (page.id === pageId) return page;
    if (page.pages) {
      const found = findPageRecursive(page.pages, pageId);
      if (found) return found;
    }
  }
  return null;
}

/** 在 Page 树中按 ID 查找路径（从根到目标，包含目标本身）。 */
function findPagePath(pages: ExplanationPage[], pageId: string): ExplanationPage[] | null {
  for (const page of pages) {
    if (page.id === pageId) return [page];
    if (page.pages) {
      const subPath = findPagePath(page.pages, pageId);
      if (subPath) return [page, ...subPath];
    }
  }
  return null;
}

/** 在 Page 树中变换匹配 ID 的节点（返回新树，不修改原树）。 */
function mapPageRecursive(
  pages: ExplanationPage[],
  pageId: string,
  fn: (page: ExplanationPage) => ExplanationPage,
): ExplanationPage[] {
  return pages.map((page) => {
    if (page.id === pageId) return fn(page);
    if (page.pages) return { ...page, pages: mapPageRecursive(page.pages, pageId, fn) };
    return page;
  });
}

/** 在 Page 树中删除匹配 ID 的节点（返回新树）。 */
function removePageRecursive(pages: ExplanationPage[], pageId: string): ExplanationPage[] {
  return pages
    .filter((page) => page.id !== pageId)
    .map((page) => (page.pages ? { ...page, pages: removePageRecursive(page.pages, pageId) } : page));
}

/** 给 Page 树的某个节点追加一个子页面（返回新树）。 */
function appendChildPage(
  pages: ExplanationPage[],
  parentPageId: string,
  child: ExplanationPage,
): ExplanationPage[] {
  return mapPageRecursive(pages, parentPageId, (page) => ({
    ...page,
    pages: [...(page.pages ?? []), child],
  }));
}

/** 给 Tab 树的某个节点追加一个子 Tab（返回新树）。 */
function appendChildTab(
  tabs: ExplanationTab[],
  parentTabId: string,
  child: ExplanationTab,
): ExplanationTab[] {
  return mapTabRecursive(tabs, parentTabId, (tab) => ({
    ...tab,
    tabs: [...(tab.tabs ?? []), child],
  }));
}

interface GraphState {
  axioms: GraphNode[];
  mechanisms: GraphNode[];
  conclusions: GraphNode[];
  edges: GraphEdge[];
  selectedNodeId: string | null;
  selectedTreeNodeId: string | null;
  focusNodeId: string | null;
  activeExplanationSelection: ExplanationSelection | null;
  /** 鍙充晶闂璇︽儏闈㈡澘褰撳墠灞曠ず鐨勯棶棰?*/
  selectedQuestionId: string | null;
  hoveredNodeId: string | null;

  treeData: TreeNode;
  nodePool: Record<string, KnowledgeNode>;
  knowledgeEdges: KnowledgeEdge[];

  questions: Question[];
  inferenceResponses: Record<string, string>;
  rules: Rule[];
  perspectives: Perspective[];
  evolutionEvents: KnowledgeEvolutionEvent[];

  notifications: NotificationItem[];
  theme: ThemeType;
  currentPerspective: Perspective | null;
  activeView: AppView;
  selectedSupertag: string | null;
  activeEventId: string | null;
  followSelection: boolean;
  history: Array<{ action: string; data: unknown }>;

  initialize: () => Promise<void>;
  save: () => void;
  setSelectedNode: (id: string | null) => void;
  /** 浠呮墦寮€鍙充晶瑙ｉ噴鍗★紝涓嶆敼鍙樹腑蹇冮暅澶寸劍鐐?*/
  setSelectedNodeOnly: (id: string | null) => void;
  /** @alias setSelectedNodeOnly */
  openCard: (id: string | null) => void;
  setSelectedQuestion: (id: string | null) => void;
  setActiveExplanationSelection: (selection: ExplanationSelection | null) => void;
  applyExplanationIndexOperation: (
    selection: ExplanationIndexSelection,
    operation: ExplanationIndexOperation,
  ) => boolean;
  setExplanationIndexTags: (
    selection: ExplanationIndexSelection,
    tags: readonly string[],
  ) => boolean;
  selectTreeEntry: (treeNodeId: string) => void;
  getTreeSupplement: () => TreeRefSupplement | null;
  getKnowledgeExplanation: () => NodeExplanation | null;
  getActiveDimension: () => string;
  extractView: (scope: ViewScope) => ViewDataPack;
  setHoveredNode: (id: string | null) => void;

  addKnowledgeEdge: (
    source: string,
    target: string,
    type: string,
    label?: string,
    dimensions?: string[],
  ) => void;
  removeKnowledgeEdge: (id: string) => void;
  addTypeRelation: (
    source: string,
    target: string,
    kind: TypeRelationKind,
  ) => boolean;
  removeTypeRelation: (id: string) => boolean;
  addContainmentRelation: (source: string, target: string) => boolean;
  removeContainmentRelation: (id: string) => boolean;
  updateKnowledgeNodeMeta: (
    id: string,
    patch: Partial<Pick<KnowledgeNode, 'role' | 'dimensions' | 'tags' | 'kind' | 'mechanismSpec'>>,
  ) => void;
  updateKnowledgeEdgeRelationKind: (
    id: string,
    relationKind: KnowledgeEdge['relationKind'],
  ) => void;
  updateKnowledgeNodeLabel: (id: string, label: string) => void;
  updateKnowledgeViewDimensions: (
    id: string,
    viewDimensions: NonNullable<KnowledgeNode['viewDimensions']>,
  ) => void;

  addNode: (node: GraphNode, zone: 'axiom' | 'mechanism' | 'conclusion') => void;
  removeNode: (id: string) => void;
  updateNode: (id: string, updates: Partial<GraphNode>) => void;
  addEdge: (edge: GraphEdge) => void;
  removeEdge: (id: string) => void;

  addNotification: (message: string, type: NotificationItem['type']) => void;
  removeNotification: (id: string) => void;
  setTheme: (theme: ThemeType) => void;
  toggleTheme: () => void;
  setCurrentPerspective: (p: Perspective | null) => void;
  setActiveView: (view: AppView) => void;
  setActiveEvent: (id: string | null) => void;
  setFollowSelection: (follow: boolean) => void;
  openSupertag: (tag: string) => void;
  undo: () => void;
  getAllNodes: () => GraphNode[];

  toggleQuestion: (id: string) => void;
  addQuestion: (text: string, relatedNodeId?: string) => void;
  removeQuestion: (id: string) => void;
  updateQuestion: (id: string, text: string) => void;
  answerQuestion: (id: string, answer: string, answerSteps?: QuestionAnswerStep[]) => void;
  linkQuestionToNode: (questionId: string, nodeId: string) => void;
  addRule: (rule: Rule) => void;

  exportKnowledgeJson: () => string;
  importKnowledgeJson: (json: string) => boolean;
  resetAllKnowledge: () => void;
  loadDemoData: () => Promise<void>;

  /** 鑺傜偣姹狅細鏂板缓鐭ヨ瘑瀹炰綋 */
  addKnowledgeNode: (label: string, shared?: boolean) => string;
  updateKnowledgeCard: (
    knowledgeId: string,
    patch: Partial<Pick<NodeExplanation, 'title' | 'rootContent' | 'rootTable' | 'tabs' | 'definitionPages' | 'notes'>>,
  ) => void;
  updateKnowledgeRootContent: (knowledgeId: string, content: string) => void;
  updateKnowledgeRootTable: (knowledgeId: string, table: ExplanationTable | undefined) => void;
  addKnowledgeTab: (knowledgeId: string, label: string, parentTabId?: string | null) => string | null;
  removeKnowledgeTab: (knowledgeId: string, tabId: string) => void;
  updateKnowledgeTab: (knowledgeId: string, tabId: string, content: string) => void;
  updateKnowledgeTabTable: (
    knowledgeId: string,
    tabId: string,
    table: ExplanationTable | undefined,
  ) => void;
  renameKnowledgeTab: (knowledgeId: string, tabId: string, label: string) => void;
  addKnowledgeTabPage: (
    knowledgeId: string,
    tabId: string,
    label: string,
    parentPageId?: string | null,
  ) => string | null;
  removeKnowledgeTabPage: (knowledgeId: string, tabId: string, pageId: string) => void;
  updateKnowledgeTabPage: (knowledgeId: string, tabId: string, pageId: string, content: string) => void;
  updateKnowledgeTabPageTable: (
    knowledgeId: string,
    tabId: string,
    pageId: string,
    table: ExplanationTable | undefined,
  ) => void;
  renameKnowledgeTabPage: (knowledgeId: string, tabId: string, pageId: string, label: string) => void;
  removeKnowledgeNode: (knowledgeId: string) => void;
  /** 删除知识节点并同步移除对应目录项（子目录上移保留） */
  removeKnowledgeNodeKeepTree: (knowledgeId: string) => void;
  listKnowledgeNodes: () => KnowledgeNode[];

  /** 鐩綍锛氫粎瀵艰埅缁撴瀯 */
  addTreeEntry: (
    parentId: string,
    displayName: string,
    knowledgeId: string,
    supplement?: TreeRefSupplement,
  ) => void;
  /** 鏂板缓鐭ヨ瘑骞舵寕鍒扮洰褰?*/
  createKnowledgeAndLink: (parentId: string, label: string, shared?: boolean) => string;
  setTreeSupplement: (treeNodeId: string, supplement: TreeRefSupplement | undefined) => void;
  updatePathSupplementContent: (treeNodeId: string, content: string) => void;
  updatePathSupplementTable: (
    treeNodeId: string,
    tabId: string,
    table: ExplanationTable | undefined,
  ) => void;
  linkTreeToKnowledge: (treeNodeId: string, knowledgeId: string) => void;

  removeTreeNode: (nodeId: string) => void;
  moveTreeNode: (nodeId: string, nextParentId: string) => boolean;
  moveTreeNodes: (nodeIds: string[], nextParentId: string) => number;
  copyTreeNode: (nodeId: string, nextParentId: string) => boolean;
  copyTreeNodes: (nodeIds: string[], nextParentId: string) => number;
  renameTreeNode: (nodeId: string, newLabel: string) => void;

  /** @deprecated 璇风敤 createKnowledgeAndLink */
  addChildNode: (parentId: string, label: string) => void;
}

function snapshotState(state: GraphState): PersistedAppState {
  return {
    version: APP_STATE_VERSION,
    treeData: state.treeData,
    nodePool: state.nodePool,
    knowledgeEdges: state.knowledgeEdges,
    graph: {
      axioms: state.axioms,
      mechanisms: state.mechanisms,
      conclusions: state.conclusions,
      edges: state.edges,
    },
    questions: state.questions,
    rules: state.rules,
    perspectives: state.perspectives,
    inferenceResponses: state.inferenceResponses,
    evolutionEvents: state.evolutionEvents,
  };
}

type SetGraphState = (
  partial:
    | Partial<GraphState>
    | ((state: GraphState) => Partial<GraphState>),
) => void;

function applyPersisted(set: SetGraphState, data: PersistedAppState) {
  set({
    treeData: data.treeData,
    nodePool: data.nodePool,
    knowledgeEdges: data.knowledgeEdges,
    axioms: data.graph.axioms,
    mechanisms: data.graph.mechanisms,
    conclusions: data.graph.conclusions,
    edges: data.graph.edges,
    questions: data.questions,
    rules: data.rules,
    perspectives: data.perspectives,
    inferenceResponses: data.inferenceResponses,
    evolutionEvents: data.evolutionEvents,
    selectedNodeId: null,
    selectedTreeNodeId: null,
    selectedQuestionId: null,
    activeExplanationSelection: null,
    activeEventId: null,
    followSelection: true,
  });
}

function appendUniqueKnowledgeEdge(
  edges: KnowledgeEdge[],
  edge: KnowledgeEdge | null,
): KnowledgeEdge[] {
  if (!edge) return edges;
  return [...edges.filter((item) => item.id !== edge.id), edge];
}

function tagsForRenamedKnowledgeNode(
  node: KnowledgeNode,
  nextLabel: string,
): string[] | undefined {
  if (nextLabel === node.label) return node.tags;

  const existingTags = node.tags ?? [];
  const oldTitleWasDefaultTag = existingTags.length > 0
    && supertagKey(existingTags[0]) === supertagKey(node.label);
  return normalizeSupertags([
    nextLabel,
    ...(oldTitleWasDefaultTag ? existingTags.slice(1) : existingTags),
  ]);
}

export const useGraphStore = create<GraphState>((set, get) => {
  // ===== 持久化管道 =====
  // 数据在装载（normalize/migrate）与变更（各 action）路径上均已规范化，保存时无需再整体克隆。
  // 通过切片引用对比只回写真正变化的数据文件；突发编辑（如打字）合并为一次写入；
  // 写入经串行队列排队，避免两次保存乱序覆盖数据文件。
  const PERSIST_DEBOUNCE_MS = 500;
  let saveTimer: ReturnType<typeof setTimeout> | null = null;
  let lastSavedSlices: Partial<PersistedSlices> | null = null;
  let writeChain: Promise<void> = Promise.resolve();

  const flushPersist = () => {
    if (saveTimer !== null) {
      clearTimeout(saveTimer);
      saveTimer = null;
    }
    const slices = pickPersistedSlices(snapshotState(get()));
    const dirty = dirtyPersistedSlices(slices, lastSavedSlices);
    if (dirty.length === 0) return;
    if (!lastSavedSlices) lastSavedSlices = {};
    const baseline = lastSavedSlices as Record<PersistedSliceKey, unknown>;
    for (const key of dirty) baseline[key] = slices[key];
    const scheduled = dirty;
    writeChain = writeChain
      .then(() => savePersistedSlices(slices, scheduled))
      .then((failedKeys) => {
        if (failedKeys.length === 0) return;
        // 失败的切片回滚基线，下一次 persist 会自动重试
        for (const key of failedKeys) delete lastSavedSlices![key];
        get().addNotification('数据文件保存失败，请检查磁盘或文件占用状态', 'error');
      })
      .catch((error) => {
        console.error('Failed to persist application data files', error);
        get().addNotification('数据文件保存失败，请检查磁盘或文件占用状态', 'error');
      });
  };

  const persist = () => {
    if (saveTimer !== null) clearTimeout(saveTimer);
    saveTimer = setTimeout(flushPersist, PERSIST_DEBOUNCE_MS);
  };

  // StrictMode 双调用 App 的挂载 effect 会让 initialize() 跑两次；
  // 第二次 applyPersisted 会把用户刚选中的节点重置掉。这里做幂等：
  // 进行中或已完成的初始化直接复用，失败则允许重试。
  let initializePromise: Promise<void> | null = null;

  return {
    axioms: initialApp.graph.axioms,
    mechanisms: initialApp.graph.mechanisms,
    conclusions: initialApp.graph.conclusions,
    edges: initialApp.graph.edges,
    selectedNodeId: null,
    selectedTreeNodeId: null,
    focusNodeId: null,
    selectedQuestionId: null,
    activeExplanationSelection: null,
    hoveredNodeId: null,
    treeData: initialApp.treeData,
    nodePool: initialApp.nodePool,
    knowledgeEdges: initialApp.knowledgeEdges,
    questions: initialApp.questions,
    inferenceResponses: initialApp.inferenceResponses,
    rules: initialApp.rules,
    perspectives: initialApp.perspectives,
    evolutionEvents: initialApp.evolutionEvents,
    notifications: [],
    theme: 'dark',
    currentPerspective: null,
    activeView: 'universe',
    selectedSupertag: null,
    activeEventId: null,
    followSelection: true,
    history: [],

    initialize: async () => {
      if (initializePromise) return initializePromise;
      initializePromise = (async () => {
        const fileState = await loadCompleteStateFromFiles();
        applyPersisted(set, fileState);
        // 记录装载基线：首次小幅编辑只回写对应的一个数据文件，而不是全量六文件
        lastSavedSlices = pickPersistedSlices(fileState);
        get().addNotification('Knowledge loaded from local files', 'info');
      })();
      try {
        return await initializePromise;
      } catch (error) {
        initializePromise = null;
        throw error;
      }
    },

    save: () => {
      persist();
      get().addNotification('宸蹭繚瀛樺埌鏈湴鏂囦欢', 'success');
    },

    setSelectedNode: (id) => {
      const state = get();
      set({
        selectedNodeId: id,
        focusNodeId: id,
        selectedTreeNodeId: null,
        selectedQuestionId: pickQuestionForFocus(state.questions, id),
        activeExplanationSelection: null,
      });
    },

    setSelectedNodeOnly: (id) =>
      set((state) => ({
        selectedNodeId: id,
        activeExplanationSelection:
          state.selectedNodeId === id ? state.activeExplanationSelection : null,
      })),

    openCard: (id) => {
      if (id === null) {
        set({ selectedNodeId: null, activeExplanationSelection: null });
        return;
      }
      // Update focusNodeId so RelationNetwork and questions follow the opened card,
      // but leave selectedTreeNodeId (left-panel cursor) untouched.
      const state = get();
      const view = extractSubgraph(state.nodePool, state.knowledgeEdges, {
        focus: id,
        scope: 'neighbor',
        dimension: state.currentPerspective?.id ?? 'all',
      });
      const axioms: GraphNode[] = [];
      const mechanisms: GraphNode[] = [];
      const conclusions: GraphNode[] = [];
      const edges: GraphEdge[] = view.edges.map((e) => ({
        id: e.id, source: e.source, target: e.target, type: e.type, label: e.label,
      }));
      for (const n of view.nodes) {
        const gn: GraphNode = {
          id: n.id, label: n.label, x: 0, y: 0,
          color: n.role === 'axiom' ? '#ff6b6b' : n.role === 'subsystem' ? '#8b5cf6' : '#58B2DC',
          size: n.id === id ? 14 : 9, zone: (n.role === 'axiom' ? 'axiom' : n.role === 'conclusion' ? 'conclusion' : 'mechanism') as GraphNode['zone'],
          phase: 0, glow: n.id === id,
        };
        if (n.role === 'axiom') axioms.push(gn);
        else if (n.role === 'conclusion') conclusions.push(gn);
        else mechanisms.push(gn);
      }
      set({
        selectedNodeId: id,
        focusNodeId: id,
        axioms, mechanisms, conclusions, edges,
        selectedQuestionId: pickQuestionForFocus(state.questions, id),
        activeExplanationSelection:
          state.selectedNodeId === id ? state.activeExplanationSelection : null,
      });
    },

    setSelectedQuestion: (id) => set({ selectedQuestionId: id }),

    setActiveExplanationSelection: (selection) =>
      set({ activeExplanationSelection: selection }),

    applyExplanationIndexOperation: (selection, operation) => {
      const state = get();
      const existing = state.nodePool[selection.nodeId];
      if (!existing || existing.locked) return false;
      const result = mutateExplanationIndex(existing.card, selection, operation, genId);
      if (!result.changed) return false;

      const nodePool = {
        ...state.nodePool,
        [existing.id]: {
          ...existing,
          label: result.explanation.title,
          tags: tagsForRenamedKnowledgeNode(existing, result.explanation.title),
          card: result.explanation,
        },
      };
      set({
        nodePool,
        activeExplanationSelection: result.selection,
      });
      persist();
      return true;
    },

    setExplanationIndexTags: (selection, values) => {
      const state = get();
      const existing = state.nodePool[selection.nodeId];
      if (!existing || existing.locked) return false;
      const tags = normalizeSupertags(values);

      if (selection.kind === ExplanationSelectionKind.Root) {
        if (areSupertagsEqual(existing.tags ?? [], tags)) return false;
        set({
          nodePool: {
            ...state.nodePool,
            [existing.id]: {
              ...existing,
              tags: tags.length > 0 ? tags : undefined,
            },
          },
        });
        persist();
        return true;
      }

      const card = setExplanationIndexItemTags(existing.card, selection, tags);
      if (card === existing.card) return false;
      set({
        nodePool: {
          ...state.nodePool,
          [existing.id]: { ...existing, card },
        },
      });
      persist();
      return true;
    },

    selectTreeEntry: (treeNodeId) => {
      const state = get();
      const treeNode = findTreeNodeById(state.treeData, treeNodeId);
      if (!treeNode?.nodeRef) return;
      const nodeId = treeNode.nodeRef;
      const focusNodeId = nodeId;

      // 鎻愬彇瀛愬浘鏁版嵁骞跺～鍏?graph
      const view = extractSubgraph(state.nodePool, state.knowledgeEdges, {
        focus: nodeId,
        scope: 'neighbor',
        dimension: state.currentPerspective?.id ?? 'all',
      });

      const axioms: GraphNode[] = [];
      const mechanisms: GraphNode[] = [];
      const conclusions: GraphNode[] = [];
      const edges: GraphEdge[] = view.edges.map(e => ({
        id: e.id,
        source: e.source,
        target: e.target,
        type: e.type || 'related',
        label: e.label || '',
      }));

      view.nodes.forEach(n => {
        const gNode: GraphNode = {
          id: n.id,
          label: n.label,
          x: n.layoutHint?.x ?? (0.2 + Math.random() * 0.6),
          y: n.layoutHint?.y ?? (0.3 + Math.random() * 0.4),
          color: n.layoutHint?.color ?? '#8b5cf6',
          size: n.layoutHint?.size ?? 22,
          zone: (n.role as any) || 'mechanism',
          phase: Math.random() * Math.PI * 2,
          glow: true,
        };
        if (n.role === 'axiom') axioms.push(gNode);
        else if (n.role === 'conclusion') conclusions.push(gNode);
        else mechanisms.push(gNode);
      });

      set({
        activeView: state.activeView === 'mechanism' ? 'mechanism' : 'index',
        selectedTreeNodeId: treeNodeId,
        selectedNodeId: nodeId,
        focusNodeId: focusNodeId,
        selectedQuestionId: pickQuestionForFocus(state.questions, focusNodeId),
        activeExplanationSelection: null,
        axioms,
        mechanisms,
        conclusions,
        edges,
      });
    },

    getTreeSupplement: () => {
      const state = get();
      if (!state.selectedTreeNodeId) return null;
      return findTreeNodeById(state.treeData, state.selectedTreeNodeId)?.supplement ?? null;
    },

    getKnowledgeExplanation: () => {
      const state = get();
      const selectedTree = state.selectedTreeNodeId
        ? findTreeNodeById(state.treeData, state.selectedTreeNodeId)
        : null;
      const id = state.selectedNodeId ?? selectedTree?.nodeRef ?? null;
      if (!id) return null;
      const directCard = state.nodePool[id]?.card ?? null;
      const base = directCard ?? {
        nodeId: id,
        title: state.nodePool[id]?.label ?? id,
        tabs: [],
      };
      const cardDefinition = String(
        directCard?.rootContent ?? directCard?.tabs?.find((tab) => tab.id === 'def')?.content ?? '',
      ).trim();
      const findByRef = (node: TreeNode): TreeNode | null => {
        if (node.nodeRef === id) return node;
        for (const child of node.children ?? []) {
          const found = findByRef(child);
          if (found) return found;
        }
        return null;
      };
      const treeNode = selectedTree ?? findByRef(state.treeData);
      const definitionFor = (node: TreeNode): string => {
        const linked = node.nodeRef ? state.nodePool[node.nodeRef] : undefined;
        const root = String(linked?.card?.rootContent ?? '').trim();
        if (root) return root;
        const definition = linked?.card?.tabs?.find((tab) => tab.id === 'def')?.content;
        if (String(definition ?? '').trim()) return String(definition);
        return String(linked?.card?.tabs?.find((tab) => String(tab.content ?? '').trim())?.content ?? '');
      };
      const pageFor = (node: TreeNode): ExplanationPage => ({
        id: 'tree-page:' + node.id,
        knowledgeNodeId: node.nodeRef,
        label: node.name,
        content: definitionFor(node),
        pages: (node.children ?? []).filter((child) => Boolean(child.nodeRef)).map(pageFor),
      });
      const children = (treeNode?.children ?? []).filter((child) => Boolean(child.nodeRef));
      if (!treeNode || children.length === 0) return { ...base, nodeId: id, rootContent: String(base.rootContent ?? '').trim() || cardDefinition };
      const tabs = children.map((child): ExplanationTab => ({
        id: 'tree-tab:' + child.id,
        knowledgeNodeId: child.nodeRef,
        label: child.name,
        content: definitionFor(child),
        pages: (child.children ?? []).filter((grandchild) => Boolean(grandchild.nodeRef)).map(pageFor),
      }));
      return { ...base, nodeId: id, title: state.nodePool[id]?.label ?? treeNode.name, rootContent: String(base.rootContent ?? '').trim() || cardDefinition, tabs };
    },

    getActiveDimension: () => get().currentPerspective?.id ?? 'all',

    extractView: (scope) => {
      const state = get();
      return extractSubgraph(state.nodePool, state.knowledgeEdges, {
        focus: state.focusNodeId,
        scope,
        dimension: state.currentPerspective?.id ?? 'all',
      });
    },

    setHoveredNode: (id) => set({ hoveredNodeId: id }),

    addKnowledgeEdge: (source, target, type, label, dimensions) => {
      if (!get().nodePool[source] || !get().nodePool[target]) return;
      const edge = createKnowledgeEdge(source, target, type, label, dimensions);
      set((s) => ({ knowledgeEdges: [...s.knowledgeEdges, edge] }));
      persist();
    },

    removeKnowledgeEdge: (id) => {
      set((s) => ({ knowledgeEdges: s.knowledgeEdges.filter((e) => e.id !== id) }));
      persist();
    },

    addTypeRelation: (source, target, kind) => {
      const state = get();
      const sourceNode = state.nodePool[source];
      if (!sourceNode || !state.nodePool[target] || sourceNode.locked) {
        get().addNotification('无法添加类型关系：源节点已锁定或目标不存在', 'warning');
        return false;
      }
      if (hasDirectTypeRelation(state.knowledgeEdges, source, target, kind)) {
        get().addNotification('已存在相同的类型关系', 'warning');
        return false;
      }
      if (wouldIntroduceTypeRelationCycle(state.knowledgeEdges, source, target)) {
        get().addNotification('会形成循环：请先删除或调整反向的 extends / implements 关系', 'warning');
        return false;
      }

      const edge = createKnowledgeEdge(
        source,
        target,
        kind,
        typeRelationLabel(kind),
        undefined,
        KnowledgeRelationKind.Classification,
      );
      set({ knowledgeEdges: [...state.knowledgeEdges, edge] });
      persist();
      return true;
    },

    removeTypeRelation: (id) => {
      const state = get();
      const edge = state.knowledgeEdges.find((item) => item.id === id);
      if (!edge || state.nodePool[edge.source]?.locked) return false;
      if (edge.type !== TypeRelationKind.Implements && edge.type !== TypeRelationKind.Extends) {
        return false;
      }

      set({ knowledgeEdges: state.knowledgeEdges.filter((item) => item.id !== id) });
      persist();
      return true;
    },

    addContainmentRelation: (source, target) => {
      const state = get();
      const sourceNode = state.nodePool[source];
      if (!sourceNode || !state.nodePool[target] || sourceNode.locked) {
        get().addNotification('无法添加包含关系：源节点已锁定或目标不存在', 'warning');
        return false;
      }
      if (hasDirectContainmentRelation(state.knowledgeEdges, source, target)) {
        get().addNotification('已存在相同的包含关系', 'warning');
        return false;
      }
      if (wouldIntroduceContainmentCycle(state.knowledgeEdges, source, target)) {
        get().addNotification('会形成包含循环：请先调整现有的包含关系', 'warning');
        return false;
      }

      const edge = createKnowledgeEdge(
        source,
        target,
        CONTAINMENT_EDGE_TYPE,
        CONTAINMENT_EDGE_LABEL,
        undefined,
        KnowledgeRelationKind.Structure,
      );
      set({ knowledgeEdges: [...state.knowledgeEdges, edge] });
      persist();
      return true;
    },

    removeContainmentRelation: (id) => {
      const state = get();
      const edge = state.knowledgeEdges.find((item) => item.id === id);
      if (
        !edge
        || state.nodePool[edge.source]?.locked
        || edge.type !== CONTAINMENT_EDGE_TYPE
        || isManagedContainmentEdge(edge)
      ) {
        return false;
      }

      set({ knowledgeEdges: state.knowledgeEdges.filter((item) => item.id !== id) });
      persist();
      return true;
    },

    updateKnowledgeNodeMeta: (id, patch) => {
      const state = get();
      const node = state.nodePool[id];
      if (!node) return;
      // Allow unlock even on locked nodes; block all other mutations.
      const isUnlockOnly = Object.keys(patch).length === 1 && 'locked' in patch && patch.locked === false;
      if (node.locked && !isUnlockOnly) {
        get().addNotification('节点已锁定，不可编辑', 'warning');
        return;
      }
      const nodePool = { ...state.nodePool, [id]: { ...node, ...patch } };
      set({ nodePool });
      persist();
    },

    updateKnowledgeEdgeRelationKind: (id, relationKind) => {
      const state = get();
      const edge = state.knowledgeEdges.find((item) => item.id === id);
      if (!edge || state.nodePool[edge.source]?.locked) return;
      set({
        knowledgeEdges: state.knowledgeEdges.map((item) =>
          item.id === id ? { ...item, relationKind } : item,
        ),
      });
      persist();
    },

    updateKnowledgeNodeLabel: (id, label) => {
      const trimmed = label.trim();
      if (!trimmed) return;
      const state = get();
      const node = state.nodePool[id];
      if (!node) return;
      if (node.locked) {
        get().addNotification('节点已锁定，不可编辑', 'warning');
        return;
      }
      const card = { ...node.card, title: trimmed };
      const nodePool = {
        ...state.nodePool,
        [id]: {
          ...node,
          label: trimmed,
          tags: tagsForRenamedKnowledgeNode(node, trimmed),
          card,
        },
      };
      set({ nodePool });
      persist();
    },

    updateKnowledgeViewDimensions: (id, viewDimensions) => {
      const state = get();
      const node = state.nodePool[id];
      if (!node) return;

      const cleanDimensions = viewDimensions.map((dim) => ({
        ...dim,
        sections: dim.sections.map((section) => ({
          ...section,
          atoms: section.atoms.filter((atom) => !!state.nodePool[atom.nodeId]),
        })),
        groups: dim.groups?.map((group) => ({
          ...group,
          nodeId: group.nodeId && state.nodePool[group.nodeId] ? group.nodeId : undefined,
          members: group.members.filter((memberId) => !!state.nodePool[memberId]),
        })),
      }));

      const nodePool = {
        ...state.nodePool,
        [id]: { ...node, viewDimensions: cleanDimensions },
      };

      set({ nodePool });
      persist();
    },

    addNode: (node, zone) => {
      const state = get();
      const key = (zone === 'axiom' ? 'axioms' : zone === 'mechanism' ? 'mechanisms' : 'conclusions') as 'axioms' | 'mechanisms' | 'conclusions';
      set({
        [key]: [...state[key], node],
        history: [
          ...state.history,
          {
            action: 'addNode',
            data: {
              axioms: state.axioms,
              mechanisms: state.mechanisms,
              conclusions: state.conclusions,
            },
          },
        ],
      });
      persist();
    },

    removeNode: (id) => {
      const state = get();
      const prev = {
        axioms: state.axioms,
        mechanisms: state.mechanisms,
        conclusions: state.conclusions,
        edges: state.edges,
        selectedNodeId: state.selectedNodeId,
        hoveredNodeId: state.hoveredNodeId,
      };

      set({
        axioms: state.axioms.filter((n) => n.id !== id),
        mechanisms: state.mechanisms.filter((n) => n.id !== id),
        conclusions: state.conclusions.filter((n) => n.id !== id),
        edges: state.edges.filter((e) => e.source !== id && e.target !== id),
        selectedNodeId: state.selectedNodeId === id ? null : state.selectedNodeId,
        hoveredNodeId: state.hoveredNodeId === id ? null : state.hoveredNodeId,
        history: [...state.history, { action: 'removeNode', data: prev }],
      });
      persist();
    },

    updateNode: (id, updates) => {
      const state = get();
      const updateIn = (arr: GraphNode[]) =>
        arr.map((n) => (n.id === id ? { ...n, ...updates } : n));
      set({
        axioms: updateIn(state.axioms),
        mechanisms: updateIn(state.mechanisms),
        conclusions: updateIn(state.conclusions),
      });
      persist();
    },

    addEdge: (edge) => {
      const state = get();
      set({
        edges: [...state.edges, edge],
        history: [...state.history, { action: 'addEdge', data: [...state.edges] }],
      });
      persist();
    },

    removeEdge: (id) => {
      const state = get();
      set({
        edges: state.edges.filter((e) => e.id !== id),
        history: [...state.history, { action: 'removeEdge', data: [...state.edges] }],
      });
      persist();
    },

    addNotification: (message, type) => {
      const id = genId('notif');
      set((s) => ({
        notifications: [...s.notifications, { id, message, type, timestamp: Date.now() }],
      }));
      setTimeout(() => get().removeNotification(id), 3000);
    },

    removeNotification: (id) =>
      set((s) => ({ notifications: s.notifications.filter((n) => n.id !== id) })),

    setTheme: (theme) => set({ theme }),
    toggleTheme: () => set((s) => ({ theme: s.theme === 'dark' ? 'light' : 'dark' })),
    setCurrentPerspective: (p) => set({ currentPerspective: p }),
    setActiveView: (view) => set({ activeView: view }),
    setActiveEvent: (id) => {
      if (id) {
        const event = get().evolutionEvents.find((item) => item.id === id);
        if (event) saveLastSelectedEvent(event.scopeRootId, id);
      }
      set({ activeEventId: id });
    },
    setFollowSelection: (follow) => set({ followSelection: follow }),
    openSupertag: (tag) => {
      const selectedSupertag = normalizeSupertag(tag);
      if (!selectedSupertag) return;
      set({ selectedSupertag, activeView: 'supertags' });
    },

    undo: () => {
      const state = get();
      const last = state.history[state.history.length - 1];
      if (!last) return;
      const data = last.data as Record<string, unknown>;
      if (last.action === 'addNode') {
        set({
          axioms: data.axioms as GraphNode[],
          mechanisms: data.mechanisms as GraphNode[],
          conclusions: data.conclusions as GraphNode[],
        });
      } else if (last.action === 'removeNode') {
        set({
          axioms: data.axioms as GraphNode[],
          mechanisms: data.mechanisms as GraphNode[],
          conclusions: data.conclusions as GraphNode[],
          edges: data.edges as GraphEdge[],
          selectedNodeId: data.selectedNodeId as string | null,
          hoveredNodeId: data.hoveredNodeId as string | null,
        });
      } else if (last.action === 'removeTreeNode') {
        const treeData = data.treeData as TreeNode;
        const nodePool = data.nodePool as Record<string, KnowledgeNode>;
        const knowledgeEdges = (data.knowledgeEdges as KnowledgeEdge[]) ?? get().knowledgeEdges;
        set({
          treeData,
          nodePool,
          knowledgeEdges,
          questions: (data.questions as Question[]) ?? get().questions,
          selectedNodeId: data.selectedNodeId as string | null,
          selectedTreeNodeId: data.selectedTreeNodeId as string | null,
          selectedQuestionId: data.selectedQuestionId as string | null,
          focusNodeId: data.focusNodeId as string | null,
        });
        persist();
      } else if (last.action === 'addEdge') {
        set({ edges: data as unknown as GraphEdge[] });
      }
      set((s) => ({ history: s.history.slice(0, -1) }));
    },

    getAllNodes: () => {
      const s = get();
      return [...s.axioms, ...s.mechanisms, ...s.conclusions];
    },

    toggleQuestion: (id) => {
      set((s) => ({
        questions: s.questions.map((q) =>
          q.id === id ? { ...q, answered: !q.answered, updatedAt: Date.now() } : q,
        ),
      }));
      persist();
    },

    addQuestion: (text: string, relatedNodeId?: string) => {
      const trimmed = text.trim();
      if (!trimmed) return;
      const state = get();
      const normalizedRelatedNodeId = relatedNodeId
        ? state.nodePool[relatedNodeId]
          ? relatedNodeId
          : resolvePoolIdFromTree(state.treeData, relatedNodeId) ?? relatedNodeId
        : undefined;
      const newId = genId('q');
      set((s) => ({
        questions: [
          ...s.questions,
          {
            id: newId,
            text: trimmed,
            answered: false,
            relatedNodeId: normalizedRelatedNodeId,
            createdAt: Date.now(),
            updatedAt: Date.now(),
          },
        ],
        selectedQuestionId:
          normalizedRelatedNodeId && normalizedRelatedNodeId === s.focusNodeId
            ? newId
            : s.selectedQuestionId,
      }));
      persist();
    },

    removeQuestion: (id) => {
      set((s) => {
        const removed = s.questions.find((q) => q.id === id);
        const nextQuestions = s.questions.filter((q) => q.id !== id);
        let selectedQuestionId = s.selectedQuestionId;
        if (selectedQuestionId === id) {
          const siblings = removed?.relatedNodeId
            ? questionsForNode(nextQuestions, removed.relatedNodeId)
            : [];
          selectedQuestionId = siblings[0]?.id ?? pickQuestionForFocus(nextQuestions, s.focusNodeId);
        }
        return { questions: nextQuestions, selectedQuestionId };
      });
      persist();
    },

    updateQuestion: (id, text) => {
      const trimmed = text.trim();
      if (!trimmed) return;
      set((s) => ({
        questions: s.questions.map((q) =>
          q.id === id ? { ...q, text: trimmed, updatedAt: Date.now() } : q,
        ),
      }));
      persist();
    },

    answerQuestion: (id, answer, answerSteps) => {
      const state = get();
      const normalizedAnswerSteps =
        answerSteps === undefined
          ? undefined
          : normalizeQuestionAnswerSteps(answerSteps, state.nodePool);
      set((s) => ({
        questions: s.questions.map((q) =>
          q.id === id
            ? {
              ...q,
              answer: answer.trim(),
              answered: true,
              ...(normalizedAnswerSteps !== undefined
                ? { answerSteps: normalizedAnswerSteps }
                : {}),
              updatedAt: Date.now(),
            }
            : q,
        ),
      }));
      persist();
    },

    linkQuestionToNode: (questionId, nodeId) => {
      const state = get();
      // 妫€鏌ヨ妭鐐规槸鍚﹀瓨鍦?
      if (!state.nodePool[nodeId]) return;

      set((s) => ({
        questions: s.questions.map((q) =>
          q.id === questionId ? { ...q, relatedNodeId: nodeId, updatedAt: Date.now() } : q,
        ),
      }));
      persist();
    },

    addRule: (rule) => {
      set((s) => ({ rules: [...s.rules, rule] }));
      persist();
    },

    exportKnowledgeJson: () => exportAppStateJson(snapshotState(get())),

    importKnowledgeJson: (json) => {
      const data = parseImportedAppState(json);
      if (!data) return false;
      clearTemporalPreferences();
      applyPersisted(set, data);
      persist();
      return true;
    },

    resetAllKnowledge: () => {
      clearPersistedAppState();
      clearTemporalPreferences();
      const fresh = createEmptyAppState();
      applyPersisted(set, fresh);
      persist();
    },

    loadDemoData: async () => {
      const fresh = await loadCompleteStateFromFiles();
      applyPersisted(set, fresh);
      persist();
      get().addNotification('Demo knowledge restored', 'success');
    },

    addKnowledgeNode: (label, shared = false) => {
      const trimmed = label.trim();
      if (!trimmed) return '';
      const node = createKnowledgeNode(trimmed);
      if (shared) node.shared = true;
      const state = get();
      const nodePool = { ...state.nodePool, [node.id]: node };
      set({ nodePool });
      persist();
      return node.id;
    },

    updateKnowledgeCard: (knowledgeId, patch) => {
      const state = get();
      const existing = state.nodePool[knowledgeId];
      if (!existing) return;
      const card = { ...existing.card, ...patch };
      const label = patch.title?.trim() || existing.label;
      const nodePool = {
        ...state.nodePool,
        [knowledgeId]: {
          ...existing,
          label,
          tags: tagsForRenamedKnowledgeNode(existing, label),
          card: { ...card, title: label },
        },
      };
      set({ nodePool });
      persist();
    },

    addKnowledgeTab: (knowledgeId, label, parentTabId = null) => {
      const state = get();
      const existing = state.nodePool[knowledgeId];
      const trimmedLabel = label.trim();
      if (!existing || existing.locked || !trimmedLabel) return null;

      const idPrefix = `${knowledgeId}-tab-`;
      let tabId = `${idPrefix}${Date.now()}`;
      let suffix = 1;
      // ID 在整棵 Tab 树中保持唯一（包含子 Tab）
      const allTabIds = new Set<string>();
      const collectIds = (tabs: ExplanationTab[]) => {
        for (const t of tabs) {
          allTabIds.add(t.id);
          if (t.tabs) collectIds(t.tabs);
        }
      };
      collectIds(existing.card.tabs);
      while (allTabIds.has(tabId)) {
        tabId = `${idPrefix}${Date.now()}-${suffix}`;
        suffix += 1;
      }

      const newTab: ExplanationTab = { id: tabId, label: trimmedLabel, content: '' };

      if (parentTabId) {
        // 加为子 Tab
        const parentExists = findTabRecursive(existing.card.tabs, parentTabId);
        if (!parentExists) return null;
        const tabs = appendChildTab(existing.card.tabs, parentTabId, newTab);
        get().updateKnowledgeCard(knowledgeId, { tabs });
      } else {
        // 加为顶层 Tab
        get().updateKnowledgeCard(knowledgeId, {
          tabs: [...existing.card.tabs, newTab],
        });
      }
      return tabId;
    },

    removeKnowledgeTab: (knowledgeId, tabId) => {
      const state = get();
      const existing = state.nodePool[knowledgeId];
      if (!existing || existing.locked) return;
      const isTopLevel = existing.card.tabs.some((t) => t.id === tabId);
      if (tabId === DEFINITION_TAB_ID && !isTopLevel) return;
      // 递归查找并删除（支持删子 Tab）
      const before = JSON.stringify(existing.card.tabs);
      const nextTabs = removeTabRecursive(existing.card.tabs, tabId);
      const after = JSON.stringify(nextTabs);
      if (before === after) return;
      get().updateKnowledgeCard(knowledgeId, { tabs: nextTabs });
    },

    updateKnowledgeTab: (knowledgeId, tabId, content) => {
      const state = get();
      const existing = state.nodePool[knowledgeId];
      if (!existing) return;
      if (existing.locked) {
        get().addNotification('节点已锁定，不可编辑', 'warning');
        return;
      }
      const tabs = mapTabRecursive(existing.card.tabs, tabId, (tab) => ({ ...tab, content }));
      get().updateKnowledgeCard(knowledgeId, { tabs });
    },

    updateKnowledgeTabTable: (knowledgeId, tabId, table) => {
      const state = get();
      const existing = state.nodePool[knowledgeId];
      if (!existing) return;
      if (existing.locked) {
        get().addNotification('节点已锁定，不可编辑', 'warning');
        return;
      }
      const tabs = mapTabRecursive(existing.card.tabs, tabId, (tab) => ({ ...tab, table }));
      get().updateKnowledgeCard(knowledgeId, { tabs });
    },

    updateKnowledgeRootContent: (knowledgeId, content) => {
      const state = get();
      const existing = state.nodePool[knowledgeId];
      if (!existing) return;
      if (existing.locked) {
        get().addNotification('节点已锁定，不可编辑', 'warning');
        return;
      }
      get().updateKnowledgeCard(knowledgeId, { rootContent: content });
    },

    updateKnowledgeRootTable: (knowledgeId, table) => {
      const state = get();
      const existing = state.nodePool[knowledgeId];
      if (!existing) return;
      if (existing.locked) {
        get().addNotification('节点已锁定，不可编辑', 'warning');
        return;
      }
      get().updateKnowledgeCard(knowledgeId, { rootTable: table });
    },

    renameKnowledgeTab: (knowledgeId, tabId, label) => {
      const state = get();
      const existing = state.nodePool[knowledgeId];
      const trimmedLabel = label.trim();
      if (!existing || !trimmedLabel) return;
      if (existing.locked) {
        get().addNotification('节点已锁定，不可编辑', 'warning');
        return;
      }
      const tabs = mapTabRecursive(existing.card.tabs, tabId, (tab) => ({ ...tab, label: trimmedLabel }));
      if (tabs.every((tab, index) => tab === existing.card.tabs[index])) return;
      get().updateKnowledgeCard(knowledgeId, { tabs });
    },

    addKnowledgeTabPage: (knowledgeId, tabId, label, parentPageId = null) => {
      const state = get();
      const existing = state.nodePool[knowledgeId];
      const trimmedLabel = label.trim();
      if (!existing || existing.locked || !trimmedLabel) return null;

      const tab = findTabRecursive(existing.card.tabs, tabId);
      if (!tab) return null;
      const pages = pagesForTab(existing.card, tab);

      const pageIdPrefix = `${knowledgeId}-${tabId}-page-`;
      let pageId = `${pageIdPrefix}${Date.now()}`;
      let suffix = 1;
      // ID 在整棵 Page 树中保持唯一
      const allPageIds = new Set<string>();
      const collectIds = (list: ExplanationPage[]) => {
        for (const p of list) {
          allPageIds.add(p.id);
          if (p.pages) collectIds(p.pages);
        }
      };
      collectIds(pages);
      while (allPageIds.has(pageId)) {
        pageId = `${pageIdPrefix}${Date.now()}-${suffix}`;
        suffix += 1;
      }

      const newPage: ExplanationPage = { id: pageId, label: trimmedLabel, content: '' };

      let nextPages: ExplanationPage[];
      if (parentPageId) {
        // 加为子 Page
        const parentExists = findPageRecursive(pages, parentPageId);
        if (!parentExists) return null;
        nextPages = appendChildPage(pages, parentPageId, newPage);
      } else {
        // 加为顶层 Page（在该 Tab 下）
        nextPages = [...pages, newPage];
      }

      get().updateKnowledgeCard(knowledgeId, patchTabPages(existing.card, tabId, nextPages));
      return pageId;
    },

    removeKnowledgeTabPage: (knowledgeId, tabId, pageId) => {
      const state = get();
      const existing = state.nodePool[knowledgeId];
      if (!existing || existing.locked) return;

      const tab = findTabRecursive(existing.card.tabs, tabId);
      if (!tab) return;
      const pages = pagesForTab(existing.card, tab);
      // 递归删除
      const nextPages = removePageRecursive(pages, pageId);
      const before = JSON.stringify(pages);
      const after = JSON.stringify(nextPages);
      if (before === after) return;

      get().updateKnowledgeCard(knowledgeId, patchTabPages(existing.card, tabId, nextPages));
    },

    updateKnowledgeTabPage: (knowledgeId, tabId, pageId, content) => {
      const state = get();
      const existing = state.nodePool[knowledgeId];
      if (!existing) return;
      if (existing.locked) {
        get().addNotification('节点已锁定，不可编辑', 'warning');
        return;
      }

      const tab = findTabRecursive(existing.card.tabs, tabId);
      if (!tab) return;
      const pages = pagesForTab(existing.card, tab);
      const nextPages = mapPageRecursive(pages, pageId, (page) => ({ ...page, content }));
      if (nextPages.every((page, index) => page === pages[index])) return;

      get().updateKnowledgeCard(knowledgeId, patchTabPages(existing.card, tabId, nextPages));
    },

    updateKnowledgeTabPageTable: (knowledgeId, tabId, pageId, table) => {
      const state = get();
      const existing = state.nodePool[knowledgeId];
      if (!existing) return;
      if (existing.locked) {
        get().addNotification('节点已锁定，不可编辑', 'warning');
        return;
      }

      const tab = findTabRecursive(existing.card.tabs, tabId);
      if (!tab) return;
      const pages = pagesForTab(existing.card, tab);
      const nextPages = mapPageRecursive(pages, pageId, (page) => ({ ...page, table }));
      if (nextPages.every((page, index) => page === pages[index])) return;

      get().updateKnowledgeCard(knowledgeId, patchTabPages(existing.card, tabId, nextPages));
    },

    renameKnowledgeTabPage: (knowledgeId, tabId, pageId, label) => {
      const state = get();
      const existing = state.nodePool[knowledgeId];
      const trimmedLabel = label.trim();
      if (!existing || !trimmedLabel) return;
      if (existing.locked) {
        get().addNotification('节点已锁定，不可编辑', 'warning');
        return;
      }
      const tab = findTabRecursive(existing.card.tabs, tabId);
      if (!tab) return;
      const pages = pagesForTab(existing.card, tab);
      const nextPages = mapPageRecursive(pages, pageId, (page) => ({ ...page, label: trimmedLabel }));
      if (nextPages.every((page, index) => page === pages[index])) return;

      get().updateKnowledgeCard(knowledgeId, patchTabPages(existing.card, tabId, nextPages));
    },

    removeKnowledgeNode: (knowledgeId) => {
      const state = get();

      // 1. 鍒犻櫎鑺傜偣锛屽苟绾ц仈娓呴櫎鎵€鏈夊叾瀹冭妭鐐?viewDimensions 涓寚鍚戣 nodeId 鐨勫紩鐢?
      const { [knowledgeId]: _, ...rawNodePool } = state.nodePool;
      const removedIds = new Set([knowledgeId]);
      const nodePool = Object.entries(rawNodePool).reduce((acc, [id, node]) => {
        if (node.viewDimensions) {
          const nextViewDims = removeNodeRefsFromViewDimensions(node.viewDimensions, removedIds);
          acc[id] = { ...node, viewDimensions: nextViewDims };
        } else {
          acc[id] = node;
        }
        return acc;
      }, {} as Record<string, KnowledgeNode>);

      // 2. 鍒犻櫎鐩稿叧鐨勮竟
      const knowledgeEdges = state.knowledgeEdges.filter(
        (e) => e.source !== knowledgeId && e.target !== knowledgeId,
      );

      // 3. 绾ц仈鍒犻櫎鐩綍涓墍鏈夊紩鐢ㄦ鑺傜偣鐨勯」鍙婂叾瀛愭爲
      const cascadeRemoveRefs = (node: TreeNode): TreeNode | null => {
        if (node.nodeRef === knowledgeId) {
          return null;
        }
        const cleanedChildren = node.children
          ?.map(cascadeRemoveRefs)
          .filter((child): child is TreeNode => child !== null) ?? [];
        return {
          ...node,
          children: node.children ? cleanedChildren : undefined,
        };
      };
      const treeData = cascadeRemoveRefs(cloneTree(state.treeData)) ?? state.treeData;
      const selectedTreeNodeId =
        state.selectedTreeNodeId && findTreeNodeById(treeData, state.selectedTreeNodeId)
          ? state.selectedTreeNodeId
          : null;

      // 4. 鍒犻櫎鎴栨竻闄ょ浉鍏抽棶棰樼殑鍏宠仈
      const questions = state.questions.map((q) => {
        const answerSteps = q.answerSteps?.filter((step) => step.nodeId !== knowledgeId);
        return {
          ...q,
          relatedNodeId: q.relatedNodeId === knowledgeId ? undefined : q.relatedNodeId,
          ...(answerSteps ? { answerSteps } : {}),
        };
      });

      // 5. 鍒犻櫎鐩稿叧鐨勬帹鐞嗗搷搴?
      const deletedNode = state.nodePool[knowledgeId];
      const inferenceResponses = { ...state.inferenceResponses };
      if (deletedNode?.label && inferenceResponses[deletedNode.label]) {
        delete inferenceResponses[deletedNode.label];
      }
      set({
        nodePool,
        knowledgeEdges,
        treeData,
        questions,
        inferenceResponses,
        selectedNodeId: state.selectedNodeId === knowledgeId ? null : state.selectedNodeId,
        focusNodeId: state.focusNodeId === knowledgeId ? null : state.focusNodeId,
        selectedTreeNodeId,
      });
      persist();
    },

    removeKnowledgeNodeKeepTree: (knowledgeId) => {
      const state = get();
      const removedIds = new Set([knowledgeId]);

      const { [knowledgeId]: _, ...rawNodePool } = state.nodePool;
      const nodePool = Object.entries(rawNodePool).reduce((acc, [id, node]) => {
        if (node.viewDimensions) {
          const nextViewDims = removeNodeRefsFromViewDimensions(node.viewDimensions, removedIds);
          acc[id] = { ...node, viewDimensions: nextViewDims };
        } else {
          acc[id] = node;
        }
        return acc;
      }, {} as Record<string, KnowledgeNode>);

      const knowledgeEdges = state.knowledgeEdges.filter(
        (e) => e.source !== knowledgeId && e.target !== knowledgeId,
      );

      // 同一个知识点的所有视图共享删除逻辑：对应目录项一并移除，子目录上移保留。
      const replaceNodeWithChildren = (node: TreeNode, targetId: string): TreeNode => {
        if (node.id === targetId) {
          return {
            ...node,
            nodeRef: undefined,
            children: node.children ?? undefined,
          };
        }
        const children = (node.children ?? []).flatMap((child) => {
          if (child.id === targetId) return child.children ?? [];
          return [replaceNodeWithChildren(child, targetId)];
        });
        return {
          ...node,
          children: children.length > 0 ? children : undefined,
        };
      };
      const treeData = replaceNodeWithChildren(cloneTree(state.treeData), knowledgeId);

      const questions = state.questions.map((q) => {
        const answerSteps = q.answerSteps?.filter((step) => step.nodeId !== knowledgeId);
        return {
          ...q,
          relatedNodeId: q.relatedNodeId === knowledgeId ? undefined : q.relatedNodeId,
          ...(answerSteps ? { answerSteps } : {}),
        };
      });

      const deletedNode = state.nodePool[knowledgeId];
      const inferenceResponses = { ...state.inferenceResponses };
      if (deletedNode?.label && inferenceResponses[deletedNode.label]) {
        delete inferenceResponses[deletedNode.label];
      }
      const removedTreeNodes = collectTreeNodes(state.treeData)
        .filter((node) => node.nodeRef === knowledgeId);
      // 删除当前选中节点后自动跳到父目录，避免索引视图空白。
      let nextSelectedTreeNodeId = state.selectedTreeNodeId;
      let nextSelectedNodeId = state.selectedNodeId;
      if (
        state.selectedNodeId === knowledgeId
        || removedTreeNodes.some((node) => node.id === state.selectedTreeNodeId)
      ) {
        const parent = removedTreeNodes
          .map((node) => findTreeParent(state.treeData, node.id))
          .find((candidate) => candidate !== null) ?? null;
        if (parent) {
          nextSelectedTreeNodeId = parent.id;
          nextSelectedNodeId = parent.nodeRef ?? null;
        } else {
          nextSelectedTreeNodeId = null;
          nextSelectedNodeId = null;
        }
      }

      set({
        nodePool,
        knowledgeEdges,
        treeData,
        questions,
        inferenceResponses,
        selectedNodeId: nextSelectedNodeId,
        selectedTreeNodeId: nextSelectedTreeNodeId,
        focusNodeId: state.focusNodeId === knowledgeId ? null : state.focusNodeId,
      });
      persist();
    },

    listKnowledgeNodes: () => Object.values(get().nodePool),

    addTreeEntry: (parentId, displayName, knowledgeId, supplement) => {
      const trimmed = displayName.trim();
      if (!trimmed || !get().nodePool[knowledgeId]) return;
      const state = get();
      const entry = createTreeEntry(trimmed, knowledgeId);
      if (supplement) entry.supplement = supplement;
      const treeData = appendTreeChild(state.treeData, parentId, entry);
      const bindingEdge = createTreeBindingEdge({
        tree: state.treeData,
        nodePool: state.nodePool,
        parentTreeId: parentId,
        childTreeId: entry.id,
        childKnowledgeId: knowledgeId,
      });
      const knowledgeEdges = appendUniqueKnowledgeEdge(state.knowledgeEdges, bindingEdge);
      set({ treeData, knowledgeEdges });
      persist();
    },

    createKnowledgeAndLink: (parentId, label, shared) => {
      const id = get().addKnowledgeNode(label, shared);
      if (!id) return '';
      get().addTreeEntry(parentId, label, id);
      return id;
    },

    setTreeSupplement: (treeNodeId, supplement) => {
      const state = get();
      const treeData = updateTreeNode(state.treeData, treeNodeId, { supplement });
      set({ treeData });
      persist();
    },

    updatePathSupplementContent: (treeNodeId, content) => {
      const state = get();
      const treeNode = findTreeNodeById(state.treeData, treeNodeId);
      if (!treeNode?.nodeRef) return;
      const prev = treeNode.supplement ?? {};
      const tabs = prev.tabs?.length
        ? prev.tabs.map((t, i) => (i === 0 ? { ...t, content } : t))
        : [{ id: 'path', label: '璺緞琛ュ厖', content }];
      get().setTreeSupplement(treeNodeId, { ...prev, tabs });
    },

    updatePathSupplementTable: (treeNodeId, tabId, table) => {
      const state = get();
      const treeNode = findTreeNodeById(state.treeData, treeNodeId);
      if (!treeNode?.nodeRef) return;
      const prev = treeNode.supplement ?? {};
      const tabs = prev.tabs?.length
        ? prev.tabs.map((tab) =>
            (tab.id || tab.label) === tabId ? { ...tab, table } : tab,
          )
        : [{ id: 'path', label: '路径补充', content: '', table }];
      get().setTreeSupplement(treeNodeId, { ...prev, tabs });
    },

    linkTreeToKnowledge: (treeNodeId, knowledgeId) => {
      if (!get().nodePool[knowledgeId]) return;
      const state = get();
      const parent = findTreeParent(state.treeData, treeNodeId);
      const treeData = updateTreeNode(state.treeData, treeNodeId, { nodeRef: knowledgeId });
      const treeIds = new Set([treeNodeId]);
      let knowledgeEdges = removeTreeBindingEdgesForTreeIds(state.knowledgeEdges, treeIds);
      knowledgeEdges = appendUniqueKnowledgeEdge(
        knowledgeEdges,
        parent
          ? createTreeBindingEdge({
            tree: treeData,
            nodePool: state.nodePool,
            parentTreeId: parent.id,
            childTreeId: treeNodeId,
            childKnowledgeId: knowledgeId,
          })
          : null,
      );
      const linkedNode = findTreeNodeById(treeData, treeNodeId);
      for (const child of linkedNode?.children ?? []) {
        if (!child.nodeRef) continue;
        knowledgeEdges = appendUniqueKnowledgeEdge(
          knowledgeEdges,
          createTreeBindingEdge({
            tree: treeData,
            nodePool: state.nodePool,
            parentTreeId: treeNodeId,
            childTreeId: child.id,
            childKnowledgeId: child.nodeRef,
          }),
        );
      }
      set({ treeData, knowledgeEdges });
      persist();
    },

    addChildNode: (parentId, label) => {
      get().createKnowledgeAndLink(parentId, label);
    },

    removeTreeNode: (nodeId) => {
      const state = get();
      if (state.treeData.id === nodeId) return;
      const removedNode = findTreeNodeById(state.treeData, nodeId);
      if (!removedNode) return;

      // 1. Collect all tree node IDs being deleted
      const removedTreeNodes = collectTreeNodes(removedNode);
      const removedTreeIds = new Set(removedTreeNodes.map((node) => node.id));

      // 2. Collect all referenced knowledge node IDs from those tree nodes
      const removedKnowledgeIds = new Set(
        removedTreeNodes
          .map((node) => node.nodeRef)
          .filter((nodeId): nodeId is string => Boolean(nodeId))
      );

      // 3. Remove tree nodes from the tree structure
      const nextTree = removeTreeChild(state.treeData, nodeId);
      if (!nextTree) return;

      // 4. Identify remaining referenced knowledge IDs in the remaining tree
      const remainingTreeNodes = collectTreeNodes(nextTree);
      const remainingKnowledgeIds = new Set(
        remainingTreeNodes
          .map((node) => node.nodeRef)
          .filter((nodeId): nodeId is string => Boolean(nodeId))
      );

      // 5. Determine which knowledge nodes are completely orphaned and should be deleted
      const knowledgeIdsToReallyDelete = new Set<string>();
      for (const kId of removedKnowledgeIds) {
        if (!remainingKnowledgeIds.has(kId)) {
          knowledgeIdsToReallyDelete.add(kId);
        }
      }

      // 6. Delete those knowledge nodes from the node pool and clean up references from other nodes' viewDimensions
      const rawNodePool = { ...state.nodePool };
      for (const kId of knowledgeIdsToReallyDelete) {
        delete rawNodePool[kId];
      }
      const nodePool = Object.entries(rawNodePool).reduce((acc, [id, node]) => {
        if (node.viewDimensions) {
          const nextViewDims = removeNodeRefsFromViewDimensions(
            node.viewDimensions,
            knowledgeIdsToReallyDelete,
          );
          acc[id] = { ...node, viewDimensions: nextViewDims };
        } else {
          acc[id] = node;
        }
        return acc;
      }, {} as Record<string, KnowledgeNode>);

      // 7. Remove any custom and tree-binding edges referencing the deleted knowledge nodes or deleted tree IDs
      // Remove tree-binding edges first
      let nextEdges = removeTreeBindingEdgesForTreeIds(state.knowledgeEdges, removedTreeIds);
      // Remove custom edges that source from or target any deleted knowledge node
      nextEdges = nextEdges.filter(
        (edge) =>
          !knowledgeIdsToReallyDelete.has(edge.source) &&
          !knowledgeIdsToReallyDelete.has(edge.target)
      );

      // 8. Delete any questions related to the deleted knowledge nodes
      const nextQuestions = state.questions
        .filter((q) => !q.relatedNodeId || !knowledgeIdsToReallyDelete.has(q.relatedNodeId))
        .map((q) => {
          if (!q.answerSteps) return q;
          const remainingSteps = q.answerSteps.filter(
            (step) => !knowledgeIdsToReallyDelete.has(step.nodeId)
          );
          return { ...q, answerSteps: remainingSteps };
        });
      // 9. Handle selection and focus state cleanup
      let selectedTreeNodeId = state.selectedTreeNodeId;
      let selectedNodeId = state.selectedNodeId;
      let focusNodeId = state.focusNodeId;
      let selectedQuestionId = state.selectedQuestionId;

      if (removedTreeIds.has(selectedTreeNodeId ?? '')) {
        selectedTreeNodeId = null;
      }
      if (knowledgeIdsToReallyDelete.has(selectedNodeId ?? '')) {
        selectedNodeId = null;
      }
      if (knowledgeIdsToReallyDelete.has(focusNodeId ?? '')) {
        focusNodeId = null;
      }
      if (nextQuestions.every((q) => q.id !== selectedQuestionId)) {
        selectedQuestionId = null;
      }

      // 10. Save state to store, record history for undo, and persist
      set({
        treeData: nextTree,
        nodePool,
        knowledgeEdges: nextEdges,
        questions: nextQuestions,
        selectedTreeNodeId,
        selectedNodeId,
        focusNodeId,
        selectedQuestionId,
        history: [
          ...state.history,
          {
            action: 'removeTreeNode',
            data: {
              treeData: state.treeData,
              nodePool: state.nodePool,
              knowledgeEdges: state.knowledgeEdges,
              questions: state.questions,
              selectedNodeId: state.selectedNodeId,
              selectedTreeNodeId: state.selectedTreeNodeId,
              selectedQuestionId: state.selectedQuestionId,
              focusNodeId: state.focusNodeId,
            },
          },
        ],
      });
      persist();
    },

    moveTreeNode: (nodeId, nextParentId) => {
      return get().moveTreeNodes([nodeId], nextParentId) > 0;
    },

    moveTreeNodes: (nodeIds, nextParentId) => {
      const state = get();
      const moved = moveTreeNodesInTree(state.treeData, nodeIds, nextParentId);
      if (moved.movedNodeIds.length === 0) return 0;

      const movedTreeIds = new Set(moved.movedNodeIds);
      let knowledgeEdges = removeTreeBindingEdgesForTreeIds(
        state.knowledgeEdges,
        movedTreeIds,
      );

      for (const movedTreeId of moved.movedNodeIds) {
        for (const edge of createMovedTreeBindingEdges({
          tree: moved.tree,
          nodePool: state.nodePool,
          movedTreeId,
          nextParentTreeId: nextParentId,
        })) {
          knowledgeEdges = appendUniqueKnowledgeEdge(knowledgeEdges, edge);
        }
      }

      set({
        treeData: moved.tree,
        knowledgeEdges,
      });
      persist();
      return moved.movedNodeIds.length;
    },

    copyTreeNode: (nodeId, nextParentId) => {
      return get().copyTreeNodes([nodeId], nextParentId) > 0;
    },

    copyTreeNodes: (nodeIds, nextParentId) => {
      const state = get();
      const targetParent = findTreeNodeById(state.treeData, nextParentId);
      if (!targetParent) return 0;

      let treeData = state.treeData;
      let knowledgeEdges = state.knowledgeEdges;
      let copiedCount = 0;

      for (const nodeId of [...new Set(nodeIds)]) {
        const source = findTreeNodeById(treeData, nodeId);
        const currentTarget = findTreeNodeById(treeData, nextParentId);
        if (!source || !currentTarget || source.id === nextParentId || findTreeNodeById(source, nextParentId)) continue;

        const copiedNode = cloneTreeWithNewIds(source, () => genId('tree'));
        treeData = appendTreeChild(treeData, nextParentId, copiedNode);
        copiedCount += 1;

        for (const edge of createTreeBindingEdgesForSubtree({
          tree: treeData,
          nodePool: state.nodePool,
          rootTreeId: copiedNode.id,
          parentTreeId: nextParentId,
        })) {
          knowledgeEdges = appendUniqueKnowledgeEdge(knowledgeEdges, edge);
        }
      }

      if (copiedCount === 0) return 0;

      set({ treeData, knowledgeEdges });
      persist();
      return copiedCount;
    },

    renameTreeNode: (nodeId, newLabel) => {
      const trimmed = newLabel.trim();
      if (!trimmed || nodeId == null) return;
      const state = get();
      const treeNode = findTreeNodeById(state.treeData, nodeId);
      if (!treeNode) return;
      const treeData = updateTreeNode(state.treeData, nodeId, { name: trimmed });
      const nodePool = { ...state.nodePool };
      if (treeNode.nodeRef && nodePool[treeNode.nodeRef]) {
        const kNode = nodePool[treeNode.nodeRef];
        nodePool[treeNode.nodeRef] = {
          ...kNode,
          label: trimmed,
          card: {
            ...kNode.card,
            title: trimmed,
          },
        };
      }
      set({ treeData, nodePool });
      persist();
    },
  };
});
