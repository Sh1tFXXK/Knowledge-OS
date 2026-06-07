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
  SubSystem,
  KnowledgeNode,
  KnowledgeEdge,
  TreeRefSupplement,
  Rule,
  ViewScope,
  ViewDataPack,
} from '../types';
import {
  createKnowledgeNode,
  createKnowledgeEdge,
  createTreeFolder,
  createTreeRef,
  genId,
} from '../knowledge/defaults';
import { extractSubgraph } from '../knowledge/extractSubgraph';
import {
  loadPersistedAppState,
  persistAppState,
  clearPersistedAppState,
  exportAppStateJson,
  parseImportedAppState,
} from '../knowledge/persist';
import { createEmptyAppState, APP_STATE_VERSION, type PersistedAppState } from '../knowledge/state';
import { createInitialAppState } from '../knowledge/demoSeed';
import {
  appendTreeChild,
  cloneTree,
  collectTreeNodes,
  findTreeParent,
  findTreeNodeById,
  removeTreeChild,
  updateTreeNode,
} from '../knowledge/treeUtils';
import { resolvePoolIdFromTree, resolvePoolIdFromTreeNode } from '../knowledge/treeSelection';
import {
  createTreeBindingEdge,
  removeTreeBindingEdgesForTreeIds,
} from '../knowledge/treeBinding';
import {
  pickQuestionForFocus,
  questionsForNode,
  resolveQuestionForNode,
} from '../knowledge/questionLink';
import { normalizeQuestionAnswerSteps } from '../knowledge/answerComposer';

const loadedApp = loadPersistedAppState();
const initialApp = loadedApp;

const TREE_STORAGE_KEY = 'knowledge-os:universe-tree';
const TREE_FILE_ENDPOINT = '/api/universe-tree';

const TREE_TO_GRAPH_IDS: Record<string, string[]> = {
  acid: ['n-transaction'],
  isolation: ['n-isolation'],
  'undo-log': ['n-version'],
  'version-chain': ['n-vchain', 'n-vercontrol'],
  'read-view': ['n-readview'],
  visibility: ['n-visibility', 'n-vischeck'],
};

function collectTreeNodes(node: TreeNode): TreeNode[] {
  return [node, ...(node.children ? node.children.flatMap(collectTreeNodes) : [])];
}

function normalizeKeyword(value: string): string {
  return value.trim().toLowerCase();
}

function textMatchesKeywords(text: string, keywords: Set<string>): boolean {
  const normalized = normalizeKeyword(text);
  return Array.from(keywords).some((keyword) => keyword && normalized.includes(keyword));
}

function getNodeLabelKeywords(nodes: GraphNode[], ids: Set<string>): string[] {
  return nodes
    .filter((node) => ids.has(node.id))
    .flatMap((node) => [node.label, node.description].filter(Boolean) as string[]);
}

function removeRecordKeys<T>(record: Record<string, T>, keys: Set<string>): Record<string, T> {
  return Object.fromEntries(Object.entries(record).filter(([key]) => !keys.has(key)));
}

function collectTreeIds(node: TreeNode): Set<string> {
  return new Set(collectTreeNodes(node).map((treeNode) => treeNode.id));
}

function getMappedGraphIdsMissingFromTree(tree: TreeNode): Set<string> {
  const treeIds = collectTreeIds(tree);
  return new Set(
    Object.entries(TREE_TO_GRAPH_IDS)
      .filter(([treeId]) => !treeIds.has(treeId))
      .flatMap(([, graphIds]) => graphIds),
  );
}

function hasBrowserStorage(): boolean {
  if (typeof window === 'undefined') return false;

  try {
    return typeof window.localStorage !== 'undefined';
  } catch {
    return false;
  }
}

function isTreeNode(value: unknown): value is TreeNode {
  if (!value || typeof value !== 'object') return false;

  const node = value as Partial<TreeNode>;
  const children = node.children;

  return (
    typeof node.id === 'string' &&
    typeof node.name === 'string' &&
    typeof node.count === 'number' &&
    typeof node.icon === 'string' &&
    (children === undefined || (Array.isArray(children) && children.every(isTreeNode)))
  );
}

function loadCachedTree(): TreeNode {
  if (!hasBrowserStorage()) return cloneTree(universeTree);

  try {
    const stored = window.localStorage.getItem(TREE_STORAGE_KEY);
    if (!stored) return cloneTree(universeTree);

    const parsed = JSON.parse(stored);
    return isTreeNode(parsed) ? parsed : cloneTree(universeTree);
  } catch (error) {
    console.warn('Failed to load universe tree from localStorage:', error);
    return cloneTree(universeTree);
  }
}

function persistTreeCache(tree: TreeNode): void {
  if (!hasBrowserStorage()) return;

  try {
    window.localStorage.setItem(TREE_STORAGE_KEY, JSON.stringify(tree));
  } catch (error) {
    console.warn('Failed to persist universe tree to localStorage:', error);
  }
}

async function loadTreeFromFile(): Promise<TreeNode | null> {
  if (typeof fetch === 'undefined') return null;

  try {
    const response = await fetch(TREE_FILE_ENDPOINT, { cache: 'no-store' });
    if (response.status === 404) return null;
    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const parsed = await response.json();
    return isTreeNode(parsed) ? parsed : null;
  } catch (error) {
    console.warn('Failed to load universe tree from file API:', error);
    return null;
  }
}

async function persistTreeToFile(tree: TreeNode): Promise<void> {
  if (typeof fetch === 'undefined') return;

  try {
    const response = await fetch(TREE_FILE_ENDPOINT, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(tree),
    });

    if (!response.ok && response.status !== 404) {
      throw new Error(`HTTP ${response.status}`);
    }
  } catch (error) {
    console.warn('Failed to persist universe tree to file API:', error);
  }
}

function persistTree(tree: TreeNode): void {
  persistTreeCache(tree);
  void persistTreeToFile(tree);
}

interface GraphState {
  axioms: GraphNode[];
  mechanisms: GraphNode[];
  conclusions: GraphNode[];
  edges: GraphEdge[];
  selectedNodeId: string | null;
  selectedTreeNodeId: string | null;
  focusNodeId: string | null;
  /** 右侧问题详情面板当前展示的问题 */
  selectedQuestionId: string | null;
  hoveredNodeId: string | null;

  treeData: TreeNode;
  nodePool: Record<string, KnowledgeNode>;
  knowledgeEdges: KnowledgeEdge[];

  questions: Question[];
  inferenceResponses: Record<string, string>;
  subSystems: SubSystem[];
  rules: Rule[];
  perspectives: Perspective[];

  notifications: NotificationItem[];
  theme: ThemeType;
  currentPerspective: Perspective | null;
  activeView: string;
  history: Array<{ action: string; data: unknown }>;

  setSelectedNode: (id: string | null) => void;
  /** 仅打开右侧解释卡，不改变中心镜头焦点 */
  setSelectedNodeOnly: (id: string | null) => void;
  /** @alias setSelectedNodeOnly */
  openCard: (id: string | null) => void;
  setSelectedQuestion: (id: string | null) => void;
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
  updateKnowledgeNodeMeta: (
    id: string,
    patch: Partial<Pick<KnowledgeNode, 'role' | 'dimensions' | 'tags'>>,
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
  setActiveView: (view: string) => void;
  undo: () => void;
  getAllNodes: () => GraphNode[];
  toggleQuestion: (id: string) => void;
  addQuestion: (text: string) => void;

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
  loadDemoData: () => void;

  /** 节点池：新建知识实体 */
  addKnowledgeNode: (label: string, shared?: boolean) => string;
  updateKnowledgeCard: (
    knowledgeId: string,
    patch: Partial<Pick<NodeExplanation, 'title' | 'tabs' | 'notes'>>,
  ) => void;
  updateKnowledgeTab: (knowledgeId: string, tabId: string, content: string) => void;
  removeKnowledgeNode: (knowledgeId: string) => void;
  listKnowledgeNodes: () => KnowledgeNode[];

  /** 目录：仅导航结构 */
  addTreeFolder: (parentId: string, name: string) => void;
  addTreeRef: (
    parentId: string,
    displayName: string,
    knowledgeId: string,
    supplement?: TreeRefSupplement,
  ) => void;
  /** 新建知识并挂到目录 */
  createKnowledgeAndLink: (parentId: string, label: string, shared?: boolean) => string;
  setTreeSupplement: (treeNodeId: string, supplement: TreeRefSupplement | undefined) => void;
  updatePathSupplementContent: (treeNodeId: string, content: string) => void;
  linkTreeToKnowledge: (treeNodeId: string, knowledgeId: string) => void;

  removeTreeNode: (nodeId: string) => void;
  renameTreeNode: (nodeId: string, newLabel: string) => void;

  /** @deprecated 请用 addTreeFolder / createKnowledgeAndLink */
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
    subSystems: state.subSystems,
    inferenceResponses: state.inferenceResponses,
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
    subSystems: data.subSystems,
    inferenceResponses: data.inferenceResponses,
    selectedNodeId: null,
    selectedTreeNodeId: null,
    selectedQuestionId: null,
  });
}

function appendUniqueKnowledgeEdge(
  edges: KnowledgeEdge[],
  edge: KnowledgeEdge | null,
): KnowledgeEdge[] {
  if (!edge) return edges;
  return [...edges.filter((item) => item.id !== edge.id), edge];
}

export const useGraphStore = create<GraphState>((set, get) => {
  const persist = () => persistAppState(snapshotState(get()));

  return {
  axioms: initialApp.graph.axioms,
  mechanisms: initialApp.graph.mechanisms,
  conclusions: initialApp.graph.conclusions,
  edges: initialApp.graph.edges,
  selectedNodeId: null,
  selectedTreeNodeId: null,
  focusNodeId: null,
  selectedQuestionId: null,
  hoveredNodeId: null,
  treeData: initialApp.treeData,
  nodePool: initialApp.nodePool,
  knowledgeEdges: initialApp.knowledgeEdges,
  questions: initialApp.questions,
  inferenceResponses: initialApp.inferenceResponses,
  subSystems: initialApp.subSystems,
  rules: initialApp.rules,
  perspectives: initialApp.perspectives,
  notifications: [],
  theme: 'dark',
  currentPerspective: null,
  activeView: 'universe',
  history: [],

  setSelectedNode: (id) => {
    const state = get();
    set({
      selectedNodeId: id,
      focusNodeId: id,
      selectedTreeNodeId: null,
      selectedQuestionId: pickQuestionForFocus(state.questions, id),
    });
  },

  setSelectedNodeOnly: (id) => set({ selectedNodeId: id }),

  openCard: (id) => {
    if (id === null) {
      set({ selectedNodeId: null });
      return;
    }
    set({ selectedNodeId: id });
  },

  setSelectedQuestion: (id) => set({ selectedQuestionId: id }),

  selectTreeEntry: (treeNodeId) => {
    const state = get();
    const treeNode = findTreeNodeById(state.treeData, treeNodeId);
    if (!treeNode) return;
    const nodeId = resolvePoolIdFromTreeNode(treeNode);
    const focusNodeId = nodeId ?? treeNodeId;  // 文件夹用自身 treeNodeId 也能关联问题

    // 提取子图数据并填入 graph
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
      selectedTreeNodeId: treeNodeId,
      selectedNodeId: nodeId,
      focusNodeId: focusNodeId,
      selectedQuestionId: pickQuestionForFocus(state.questions, focusNodeId),
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
    const id = get().selectedNodeId;
    if (!id) return null;
    return get().nodePool[id]?.card ?? null;
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

  updateKnowledgeNodeMeta: (id, patch) => {
    const state = get();
    const node = state.nodePool[id];
    if (!node || node.locked) return;
    const nodePool = { ...state.nodePool, [id]: { ...node, ...patch } };
    set({ nodePool });
    persist();
  },

  updateKnowledgeNodeLabel: (id, label) => {
    const trimmed = label.trim();
    if (!trimmed) return;
    const state = get();
    const node = state.nodePool[id];
    if (!node || node.locked) return;
    const card = { ...node.card, title: trimmed };
    const nodePool = {
      ...state.nodePool,
      [id]: { ...node, label: trimmed, card },
    };
    set({ nodePool });
    persist();
  },

  updateKnowledgeViewDimensions: (id, viewDimensions) => {
    const state = get();
    const node = state.nodePool[id];
    if (!node || node.locked) return;
    const nodePool = {
      ...state.nodePool,
      [id]: { ...node, viewDimensions },
    };

    // 联动树：viewDimensions 的 children.nodeId 同步为树的子节点
    let treeData = state.treeData;
    const allChildNodeIds = new Set<string>();
    for (const dim of viewDimensions) {
      for (const child of dim.children ?? []) {
        if (child.nodeId) allChildNodeIds.add(child.nodeId);
      }
    }

    // 找到 nodeRef 指向此节点的 tree node
    function syncTree(node: TreeNode): TreeNode {
      if (node.nodeRef === id && allChildNodeIds.size > 0) {
        const existingChildIds = new Set((node.children ?? []).map((c) => c.id));
        const newChildren = [...(node.children ?? [])];
        for (const nodeId of allChildNodeIds) {
          const poolNode = nodePool[nodeId];
          if (!poolNode) continue;
          const treeChildId = `tree_syn_${nodeId}`;
          if (!existingChildIds.has(treeChildId)) {
            newChildren.push({
              id: treeChildId,
              name: poolNode.label,
              count: 0,
              icon: '📄',
              nodeRef: nodeId,
            });
          }
        }
        return { ...node, children: newChildren, expanded: true };
      }
      if (!node.children) return node;
      return { ...node, children: node.children.map(syncTree) };
    }
    treeData = syncTree(treeData);

    set({ nodePool, treeData });
    persist();
  },

  addNode: (node, zone) => {
    const state = get();
    set({
      [zone]: [...state[zone], node],
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
    const graphIdsToRemove = new Set([id]);
    const allNodes = [...state.axioms, ...state.mechanisms, ...state.conclusions];
    const keywords = new Set(
      [id, ...getNodeLabelKeywords(allNodes, graphIdsToRemove)].map(normalizeKeyword),
    );
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
        selectedNodeId: data.selectedNodeId as string | null,
        selectedTreeNodeId: data.selectedTreeNodeId as string | null,
      });
      persist();
    } else if (last.action === 'addEdge') {
      set({ edges: data as GraphEdge[] });
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

  addQuestion: (text, relatedNodeId) => {
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
    // 检查节点是否存在
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
    applyPersisted(set, data);
    persistAppState(data);
    return true;
  },

  resetAllKnowledge: () => {
    clearPersistedAppState();
    const fresh = createEmptyAppState();
    applyPersisted(set, fresh);
    persistAppState(fresh);
  },

  loadDemoData: () => {
    const fresh = createInitialAppState();
    applyPersisted(set, fresh);
    persistAppState(fresh);
    get().addNotification('已恢复内置知识库（数据库知识体系）', 'success');
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
    if (!existing || existing.locked) return;
    const card = { ...existing.card, ...patch };
    const label = patch.title?.trim() || existing.label;
    const nodePool = {
      ...state.nodePool,
      [knowledgeId]: { ...existing, label, card: { ...card, title: label } },
    };
    set({ nodePool });
    persist();
  },

  updateKnowledgeTab: (knowledgeId, tabId, content) => {
    const state = get();
    const existing = state.nodePool[knowledgeId];
    if (!existing) return;
    const tabs = existing.card.tabs.map((t) =>
      t.id === tabId ? { ...t, content } : t,
    );
    get().updateKnowledgeCard(knowledgeId, { tabs });
  },

  removeKnowledgeNode: (knowledgeId) => {
    const state = get();

    // 1. 删除节点
    const { [knowledgeId]: _, ...nodePool } = state.nodePool;

    // 2. 删除相关的边
    const knowledgeEdges = state.knowledgeEdges.filter(
      (e) => e.source !== knowledgeId && e.target !== knowledgeId,
    );

    // 3. 级联删除目录中所有引用此节点的纯引用项
    //    纯引用（nodeRef 存在且无 children）→ 删除
    //    有子节点的引用 → 清除 nodeRef 变为文件夹
    //    文件夹（无 nodeRef）→ 不处理
    const cascadeRemoveRefs = (node: TreeNode): TreeNode | null => {
      const cleanedChildren = node.children
        ?.map(cascadeRemoveRefs)
        .filter((child): child is TreeNode => child !== null) ?? [];
      // 如果当前节点是引用此知识的纯引用（无子节点），删除它
      if (node.nodeRef === knowledgeId && (!node.children || node.children.length === 0)) {
        return null;
      }
      // 如果当前节点引用此知识但有子节点，清除引用变文件夹
      if (node.nodeRef === knowledgeId) {
        return { ...node, nodeRef: undefined, children: cleanedChildren };
      }
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

    // 4. 删除或清除相关问题的关联
    const questions = state.questions.map((q) => {
      const answerSteps = q.answerSteps?.filter((step) => step.nodeId !== knowledgeId);
      return {
        ...q,
        relatedNodeId: q.relatedNodeId === knowledgeId ? undefined : q.relatedNodeId,
        ...(answerSteps ? { answerSteps } : {}),
      };
    });

    // 5. 删除相关的推理响应
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

  listKnowledgeNodes: () => Object.values(get().nodePool),

  addTreeFolder: (parentId, name) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    const state = get();
    const treeData = appendTreeChild(state.treeData, parentId, createTreeFolder(trimmed));
    set({ treeData });
    persist();
  },

  addTreeRef: (parentId, displayName, knowledgeId, supplement) => {
    const trimmed = displayName.trim();
    if (!trimmed || !get().nodePool[knowledgeId]) return;
    const state = get();
    const entry = createTreeRef(trimmed, knowledgeId);
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
    get().addTreeRef(parentId, label, id);
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
      : [{ id: 'path', label: '路径补充', content }];
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
    get().addTreeFolder(parentId, label);
  },

  removeTreeNode: (nodeId) => {
    const state = get();
    if (state.treeData.id === nodeId) return;
    const removedNode = findTreeNodeById(state.treeData, nodeId);
    const removedTreeIds = new Set(
      removedNode ? collectTreeNodes(removedNode).map((node) => node.id) : [nodeId],
    );
    const nextTree = removeTreeChild(state.treeData, nodeId);
    if (!nextTree) return;
    const knowledgeEdges = removeTreeBindingEdgesForTreeIds(
      state.knowledgeEdges,
      removedTreeIds,
    );

    const clearSelection =
      state.selectedTreeNodeId === nodeId ||
      (state.selectedTreeNodeId &&
        !findTreeNodeById(nextTree, state.selectedTreeNodeId));

    set({
      treeData: nextTree,
      knowledgeEdges,
      history: [
        ...state.history,
        {
          action: 'removeTreeNode',
          data: {
            treeData: state.treeData,
            nodePool: state.nodePool,
            knowledgeEdges: state.knowledgeEdges,
            selectedNodeId: state.selectedNodeId,
            selectedTreeNodeId: state.selectedTreeNodeId,
          },
        },
      ],
      ...(clearSelection
        ? { selectedTreeNodeId: null, selectedNodeId: null, focusNodeId: null }
        : {}),
    });
    persist();
  },

  renameTreeNode: (nodeId, newLabel) => {
    const trimmed = newLabel.trim();
    if (!trimmed) return;
    const state = get();
    const treeData = updateTreeNode(state.treeData, nodeId, { name: trimmed });
    set({ treeData });
    persist();
  },
};
});
