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
import { createEmptyAppState, type PersistedAppState } from '../knowledge/state';
import {
  appendTreeChild,
  cloneTree,
  findTreeNodeById,
  removeTreeChild,
  updateTreeNode,
} from '../knowledge/treeUtils';
import { resolvePoolIdFromTreeNode } from '../knowledge/treeSelection';

const loadedApp = loadPersistedAppState();
const initialApp = loadedApp;

interface GraphState {
  axioms: GraphNode[];
  mechanisms: GraphNode[];
  conclusions: GraphNode[];
  edges: GraphEdge[];
  selectedNodeId: string | null;
  selectedTreeNodeId: string | null;
  focusNodeId: string | null;
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
  setSelectedNodeOnly: (id: string | null) => void;
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
  addQuestion: (text: string, relatedNodeId?: string) => void;
  removeQuestion: (id: string) => void;
  updateQuestion: (id: string, text: string) => void;
  answerQuestion: (id: string, answer: string) => void;
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
    version: 1,
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
  });
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
  activeView: 'ability',
  history: [],

  setSelectedNode: (id) => set({ selectedNodeId: id, focusNodeId: id, selectedTreeNodeId: null }),

  setSelectedNodeOnly: (id) => set({ selectedNodeId: id }),

  selectTreeEntry: (treeNodeId) => {
    const state = get();
    const treeNode = findTreeNodeById(state.treeData, treeNodeId);
    if (!treeNode) return;
    const nodeId = resolvePoolIdFromTreeNode(treeNode);

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
      focusNodeId: nodeId,
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
      focus: state.selectedNodeId,
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
    if (!node) return;
    const nodePool = { ...state.nodePool, [id]: { ...node, ...patch } };
    set({ nodePool });
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
    set((s) => ({
      questions: [
        ...s.questions,
        {
          id: genId('q'),
          text: trimmed,
          answered: false,
          relatedNodeId,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        },
      ],
    }));
    persist();
  },

  removeQuestion: (id) => {
    set((s) => ({
      questions: s.questions.filter((q) => q.id !== id),
    }));
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

  answerQuestion: (id, answer) => {
    set((s) => ({
      questions: s.questions.map((q) =>
        q.id === id
          ? { ...q, answer: answer.trim(), answered: true, updatedAt: Date.now() }
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
    const demo = createEmptyAppState();
    applyPersisted(set, demo);
    persistAppState(demo);
    get().addNotification('已加载演示数据（数据库知识体系）', 'success');
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
    if (patch.title) existing.label = patch.title;
    const nodePool = {
      ...state.nodePool,
      [knowledgeId]: { ...existing, label: card.title, card },
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

    // 3. 清除目录树中的引用
    const treeData = cloneTree(state.treeData);
    const clearRef = (node: TreeNode) => {
      if (node.nodeRef === knowledgeId) node.nodeRef = undefined;
      node.children?.forEach(clearRef);
    };
    clearRef(treeData);

    // 4. 删除或清除相关问题的关联（不删除问题本身，只清除关联）
    const questions = state.questions.map((q) =>
      (q as any).relatedNodeId === knowledgeId
        ? { ...q, relatedNodeId: undefined }
        : q
    );

    // 5. 删除相关的推理响应（使用节点的 label 作为 key）
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
    set({ treeData });
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
    const treeData = updateTreeNode(state.treeData, treeNodeId, { nodeRef: knowledgeId });
    set({ treeData });
    persist();
  },

  addChildNode: (parentId, label) => {
    get().addTreeFolder(parentId, label);
  },

  removeTreeNode: (nodeId) => {
    const state = get();
    if (state.treeData.id === nodeId) return;
    const nextTree = removeTreeChild(state.treeData, nodeId);
    if (!nextTree) return;

    const clearSelection =
      state.selectedTreeNodeId === nodeId ||
      (state.selectedTreeNodeId &&
        !findTreeNodeById(nextTree, state.selectedTreeNodeId));

    set({
      treeData: nextTree,
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
        ? { selectedTreeNodeId: null, selectedNodeId: null }
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
