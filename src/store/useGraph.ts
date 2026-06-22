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
  createTreeEntry,
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
  moveTreeNode as moveTreeNodeInTree,
  removeTreeChild,
  updateTreeNode,
} from '../knowledge/treeUtils';
import { resolvePoolIdFromTree, resolvePoolIdFromTreeNode } from '../knowledge/treeSelection';
import {
  createTreeBindingEdge,
  createMovedTreeBindingEdges,
  removeTreeBindingEdgesForTreeIds,
} from '../knowledge/treeBinding';
import {
  pickQuestionForFocus,
  questionsForNode,
} from '../knowledge/questionLink';
import { normalizeQuestionAnswerSteps } from '../knowledge/answerComposer';
import { loadStateFromFiles, saveStateToFiles } from '../knowledge/filePersistence';
import { removeNodeRefsFromViewDimensions } from '../knowledge/projection';

const initialApp = createEmptyAppState();

interface GraphState {
  axioms: GraphNode[];
  mechanisms: GraphNode[];
  conclusions: GraphNode[];
  edges: GraphEdge[];
  selectedNodeId: string | null;
  selectedTreeNodeId: string | null;
  focusNodeId: string | null;
  /** 鍙充晶闂璇︽儏闈㈡澘褰撳墠灞曠ず鐨勯棶棰?*/
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

  initialize: () => Promise<void>;
  save: () => void;
  setSelectedNode: (id: string | null) => void;
  /** 浠呮墦寮€鍙充晶瑙ｉ噴鍗★紝涓嶆敼鍙樹腑蹇冮暅澶寸劍鐐?*/
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

  /** 鑺傜偣姹狅細鏂板缓鐭ヨ瘑瀹炰綋 */
  addKnowledgeNode: (label: string, shared?: boolean) => string;
  updateKnowledgeCard: (
    knowledgeId: string,
    patch: Partial<Pick<NodeExplanation, 'title' | 'tabs' | 'notes'>>,
  ) => void;
  updateKnowledgeTab: (knowledgeId: string, tabId: string, content: string) => void;
  removeKnowledgeNode: (knowledgeId: string) => void;
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
  linkTreeToKnowledge: (treeNodeId: string, knowledgeId: string) => void;

  removeTreeNode: (nodeId: string) => void;
  moveTreeNode: (nodeId: string, nextParentId: string) => boolean;
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
  const persist = () => {
    const state = snapshotState(get());
    persistAppState(state);
    void saveStateToFiles(state);
  };

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

    initialize: async () => {
      const fileState = await loadStateFromFiles();
      const demoState = createInitialAppState();

      const finalState: PersistedAppState = {
        ...demoState,
        ...fileState,
        nodePool: fileState.nodePool || demoState.nodePool,
        inferenceResponses: { ...demoState.inferenceResponses, ...(fileState.inferenceResponses || {}) },
      };

      applyPersisted(set, finalState);
      get().addNotification('Knowledge loaded from local files', 'info');
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
      });
    },

    setSelectedNodeOnly: (id) => set({ selectedNodeId: id }),

    openCard: (id) => {
      if (id === null) {
        set({ selectedNodeId: null });
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
      });
    },

    setSelectedQuestion: (id) => set({ selectedQuestionId: id }),

    selectTreeEntry: (treeNodeId) => {
      const state = get();
      const treeNode = findTreeNodeById(state.treeData, treeNodeId);
      if (!treeNode) return;
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
        [id]: { ...node, label: trimmed, card },
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
        [knowledgeId]: { ...existing, label, card: { ...card, title: label } },
      };
      set({ nodePool });
      persist();
    },

    updateKnowledgeTab: (knowledgeId, tabId, content) => {
      const state = get();
      const existing = state.nodePool[knowledgeId];
      if (!existing) return;
      if (existing.locked) {
        get().addNotification('节点已锁定，不可编辑', 'warning');
        return;
      }
      const tabs = existing.card.tabs.map((t) =>
        t.id === tabId ? { ...t, content } : t,
      );
      get().updateKnowledgeCard(knowledgeId, { tabs });
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
        removedTreeNodes.map((node) => node.nodeRef).filter(Boolean)
      );

      // 3. Remove tree nodes from the tree structure
      const nextTree = removeTreeChild(state.treeData, nodeId);
      if (!nextTree) return;

      // 4. Identify remaining referenced knowledge IDs in the remaining tree
      const remainingTreeNodes = collectTreeNodes(nextTree);
      const remainingKnowledgeIds = new Set(
        remainingTreeNodes.map((node) => node.nodeRef).filter(Boolean)
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
              selectedNodeId: state.selectedNodeId,
              selectedTreeNodeId: state.selectedTreeNodeId,
            },
          },
        ],
      });
      persist();
    },

    moveTreeNode: (nodeId, nextParentId) => {
      const state = get();
      const moved = moveTreeNodeInTree(state.treeData, nodeId, nextParentId);
      if (!moved) return false;

      const movedTreeIds = new Set([nodeId]);
      let knowledgeEdges = removeTreeBindingEdgesForTreeIds(
        state.knowledgeEdges,
        movedTreeIds,
      );

      for (const edge of createMovedTreeBindingEdges({
        tree: moved.tree,
        nodePool: state.nodePool,
        movedTreeId: nodeId,
        nextParentTreeId: nextParentId,
      })) {
        knowledgeEdges = appendUniqueKnowledgeEdge(knowledgeEdges, edge);
      }

      set({
        treeData: moved.tree,
        knowledgeEdges,
      });
      persist();
      return true;
    },

    renameTreeNode: (nodeId, newLabel) => {
      const trimmed = newLabel.trim();
      if (!trimmed) return;
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
