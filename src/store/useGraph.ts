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
} from '../types';
import {
  graphNodes as initialNodes,
  graphEdges as initialEdges,
  perspectives,
  universeTree,
  nodeExplanations as initialNodeExplanations,
  questionBank as initialQuestionBank,
  inferenceResponses as initialInferenceResponses,
  subSystems as initialSubSystems,
} from '../data';

// 递归工具：在树中查找节点
function findNodeById(root: TreeNode, id: string): TreeNode | null {
  if (root.id === id) return root;
  if (root.children) {
    for (const child of root.children) {
      const found = findNodeById(child, id);
      if (found) return found;
    }
  }
  return null;
}

// 递归工具：在树中查找父节点
function findParent(root: TreeNode, childId: string): TreeNode | null {
  if (root.children) {
    if (root.children.some(c => c.id === childId)) return root;
    for (const child of root.children) {
      const found = findParent(child, childId);
      if (found) return found;
    }
  }
  return null;
}

// 递归工具：深拷贝树
function cloneTree(node: TreeNode): TreeNode {
  return {
    ...node,
    children: node.children ? node.children.map(cloneTree) : undefined,
  };
}

// 生成唯一 ID
function genId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
}

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
  // 图谱数据
  axioms: GraphNode[];
  mechanisms: GraphNode[];
  conclusions: GraphNode[];
  edges: GraphEdge[];
  selectedNodeId: string | null;
  hoveredNodeId: string | null;

  // 树数据
  treeData: TreeNode;

  // 知识联动数据
  nodeExplanations: Record<string, NodeExplanation>;
  questions: Question[];
  inferenceResponses: Record<string, string>;
  subSystems: SubSystem[];

  // UI 状态
  notifications: NotificationItem[];
  theme: ThemeType;
  currentPerspective: Perspective | null;
  activeView: string;

  // 操作历史
  history: Array<{ action: string; data: any }>;

  // 图谱 Actions
  setSelectedNode: (id: string | null) => void;
  setHoveredNode: (id: string | null) => void;
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

  // 树 Actions
  loadTreeData: () => Promise<void>;
  addChildNode: (parentId: string, label: string) => void;
  removeTreeNode: (nodeId: string) => void;
  renameTreeNode: (nodeId: string, newLabel: string) => void;
}

const cachedTreeData = loadCachedTree();
const graphIdsMissingFromCachedTree = getMappedGraphIdsMissingFromTree(cachedTreeData);
const initialGraphNodes = [
  ...initialNodes.axioms,
  ...initialNodes.mechanisms,
  ...initialNodes.conclusions,
];
const cachedTreePruneKeywords = new Set(
  getNodeLabelKeywords(initialGraphNodes, graphIdsMissingFromCachedTree).map(normalizeKeyword),
);

export const useGraphStore = create<GraphState>((set, get) => ({
  axioms: initialNodes.axioms.filter((node) => !graphIdsMissingFromCachedTree.has(node.id)),
  mechanisms: initialNodes.mechanisms.filter((node) => !graphIdsMissingFromCachedTree.has(node.id)),
  conclusions: initialNodes.conclusions.filter((node) => !graphIdsMissingFromCachedTree.has(node.id)),
  edges: initialEdges.filter(
    (edge) =>
      !graphIdsMissingFromCachedTree.has(edge.source) &&
      !graphIdsMissingFromCachedTree.has(edge.target),
  ),
  selectedNodeId: null,
  hoveredNodeId: null,
  treeData: cachedTreeData,
  nodeExplanations: removeRecordKeys(initialNodeExplanations, graphIdsMissingFromCachedTree),
  questions: initialQuestionBank.filter(
    (question) => !textMatchesKeywords(question.text, cachedTreePruneKeywords),
  ),
  inferenceResponses: Object.fromEntries(
    Object.entries(initialInferenceResponses).filter(
      ([key]) => key === 'default' || !textMatchesKeywords(key, cachedTreePruneKeywords),
    ),
  ),
  subSystems: initialSubSystems.filter(
    (system) => !textMatchesKeywords(system.name, cachedTreePruneKeywords),
  ),
  notifications: [],
  theme: 'dark',
  currentPerspective: null,
  activeView: 'ability',
  history: [],

  setSelectedNode: (id) => set({ selectedNodeId: id }),
  setHoveredNode: (id) => set({ hoveredNodeId: id }),

  addNode: (node, zone) => {
    const state = get();
    const prev = {
      axioms: [...state.axioms],
      mechanisms: [...state.mechanisms],
      conclusions: [...state.conclusions],
    };
    set({
      [zone]: [...state[zone], node],
      history: [...state.history, { action: 'addNode', data: prev }],
    });
  },

  removeNode: (id) => {
    const state = get();
    const graphIdsToRemove = new Set([id]);
    const allNodes = [...state.axioms, ...state.mechanisms, ...state.conclusions];
    const keywords = new Set(
      [id, ...getNodeLabelKeywords(allNodes, graphIdsToRemove)].map(normalizeKeyword),
    );
    const prev = {
      axioms: [...state.axioms],
      mechanisms: [...state.mechanisms],
      conclusions: [...state.conclusions],
      edges: [...state.edges],
      selectedNodeId: state.selectedNodeId,
      hoveredNodeId: state.hoveredNodeId,
      nodeExplanations: { ...state.nodeExplanations },
      questions: [...state.questions],
      inferenceResponses: { ...state.inferenceResponses },
      subSystems: [...state.subSystems],
    };

    set({
      axioms: state.axioms.filter((n) => !graphIdsToRemove.has(n.id)),
      mechanisms: state.mechanisms.filter((n) => !graphIdsToRemove.has(n.id)),
      conclusions: state.conclusions.filter((n) => !graphIdsToRemove.has(n.id)),
      edges: state.edges.filter(
        (e) => !graphIdsToRemove.has(e.source) && !graphIdsToRemove.has(e.target),
      ),
      selectedNodeId:
        state.selectedNodeId && graphIdsToRemove.has(state.selectedNodeId)
          ? null
          : state.selectedNodeId,
      hoveredNodeId:
        state.hoveredNodeId && graphIdsToRemove.has(state.hoveredNodeId)
          ? null
          : state.hoveredNodeId,
      nodeExplanations: removeRecordKeys(state.nodeExplanations, graphIdsToRemove),
      questions: state.questions.filter((q) => !textMatchesKeywords(q.text, keywords)),
      inferenceResponses: Object.fromEntries(
        Object.entries(state.inferenceResponses).filter(
          ([key]) => key === 'default' || !textMatchesKeywords(key, keywords),
        ),
      ),
      subSystems: state.subSystems.filter(
        (system) => !textMatchesKeywords(system.name, keywords),
      ),
      history: [...state.history, { action: 'removeNode', data: prev }],
    });
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
  },

  addEdge: (edge) => {
    const state = get();
    set({
      edges: [...state.edges, edge],
      history: [...state.history, { action: 'addEdge', data: [...state.edges] }],
    });
  },

  removeEdge: (id) => {
    const state = get();
    set({
      edges: state.edges.filter((e) => e.id !== id),
      history: [...state.history, { action: 'removeEdge', data: [...state.edges] }],
    });
  },

  addNotification: (message, type) => {
    const id = `notif_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    set((state) => ({
      notifications: [
        ...state.notifications,
        { id, message, type, timestamp: Date.now() },
      ],
    }));
    setTimeout(() => get().removeNotification(id), 3000);
  },

  removeNotification: (id) =>
    set((state) => ({
      notifications: state.notifications.filter((n) => n.id !== id),
    })),

  setTheme: (theme) => set({ theme }),
  toggleTheme: () =>
    set((state) => ({ theme: state.theme === 'dark' ? 'light' : 'dark' })),

  setCurrentPerspective: (p) => set({ currentPerspective: p }),
  setActiveView: (view) => set({ activeView: view }),

  undo: () => {
    const state = get();
    const lastAction = state.history[state.history.length - 1];
    if (!lastAction) return;
    if (lastAction.action === 'addNode') {
      set({
        axioms: lastAction.data.axioms,
        mechanisms: lastAction.data.mechanisms,
        conclusions: lastAction.data.conclusions,
      });
    } else if (lastAction.action === 'removeNode') {
      set({
        axioms: lastAction.data.axioms,
        mechanisms: lastAction.data.mechanisms,
        conclusions: lastAction.data.conclusions,
        edges: lastAction.data.edges,
        selectedNodeId: lastAction.data.selectedNodeId,
        hoveredNodeId: lastAction.data.hoveredNodeId,
        nodeExplanations: lastAction.data.nodeExplanations,
        questions: lastAction.data.questions,
        inferenceResponses: lastAction.data.inferenceResponses,
        subSystems: lastAction.data.subSystems,
      });
    } else if (lastAction.action === 'removeTreeNode') {
      set({
        treeData: lastAction.data.treeData,
        axioms: lastAction.data.axioms,
        mechanisms: lastAction.data.mechanisms,
        conclusions: lastAction.data.conclusions,
        edges: lastAction.data.edges,
        selectedNodeId: lastAction.data.selectedNodeId,
        hoveredNodeId: lastAction.data.hoveredNodeId,
        nodeExplanations: lastAction.data.nodeExplanations,
        questions: lastAction.data.questions,
        inferenceResponses: lastAction.data.inferenceResponses,
        subSystems: lastAction.data.subSystems,
      });
      persistTree(lastAction.data.treeData);
    } else if (lastAction.action === 'addEdge') {
      set({ edges: lastAction.data });
    }
    set((state) => ({ history: state.history.slice(0, -1) }));
  },

  getAllNodes: () => {
    const state = get();
    return [...state.axioms, ...state.mechanisms, ...state.conclusions];
  },

  toggleQuestion: (id) =>
    set((state) => ({
      questions: state.questions.map((question) =>
        question.id === id ? { ...question, answered: !question.answered } : question,
      ),
    })),

  addQuestion: (text) => {
    const trimmed = text.trim();
    if (!trimmed) return;

    set((state) => ({
      questions: [
        ...state.questions,
        { id: `q${Date.now()}`, text: trimmed, answered: false },
      ],
    }));
  },

  // ===== 树操作 =====
  loadTreeData: async () => {
    const fileTree = await loadTreeFromFile();
    if (!fileTree) return;

    const state = get();
    const graphIdsToRemove = getMappedGraphIdsMissingFromTree(fileTree);
    const keywords = new Set(
      getNodeLabelKeywords(initialGraphNodes, graphIdsToRemove).map(normalizeKeyword),
    );

    persistTreeCache(fileTree);
    set({
      treeData: fileTree,
      axioms: initialNodes.axioms.filter((node) => !graphIdsToRemove.has(node.id)),
      mechanisms: initialNodes.mechanisms.filter((node) => !graphIdsToRemove.has(node.id)),
      conclusions: initialNodes.conclusions.filter((node) => !graphIdsToRemove.has(node.id)),
      edges: initialEdges.filter(
        (edge) => !graphIdsToRemove.has(edge.source) && !graphIdsToRemove.has(edge.target),
      ),
      selectedNodeId:
        state.selectedNodeId && graphIdsToRemove.has(state.selectedNodeId)
          ? null
          : state.selectedNodeId,
      hoveredNodeId:
        state.hoveredNodeId && graphIdsToRemove.has(state.hoveredNodeId)
          ? null
          : state.hoveredNodeId,
      nodeExplanations: removeRecordKeys(initialNodeExplanations, graphIdsToRemove),
      questions: initialQuestionBank.filter(
        (question) => !textMatchesKeywords(question.text, keywords),
      ),
      inferenceResponses: Object.fromEntries(
        Object.entries(initialInferenceResponses).filter(
          ([key]) => key === 'default' || !textMatchesKeywords(key, keywords),
        ),
      ),
      subSystems: initialSubSystems.filter(
        (system) => !textMatchesKeywords(system.name, keywords),
      ),
    });
  },

  addChildNode: (parentId, label) => {
    const state = get();
    const newTree = cloneTree(state.treeData);
    const parent = findNodeById(newTree, parentId);
    if (parent) {
      if (!parent.children) parent.children = [];
      const icon = parent.icon || '📄';
      parent.children.push({
        id: genId('tree'),
        name: label,
        count: 0,
        icon,
        expanded: false,
      });
      parent.expanded = true;
    }
    persistTree(newTree);
    set({ treeData: newTree });
  },

  removeTreeNode: (nodeId) => {
    const state = get();
    if (state.treeData.id === nodeId) return;

    const newTree = cloneTree(state.treeData);
    const targetNode = findNodeById(newTree, nodeId);
    const parent = findParent(newTree, nodeId);
    if (targetNode && parent && parent.children) {
      const deletedTreeNodes = collectTreeNodes(targetNode);
      const allNodes = [...state.axioms, ...state.mechanisms, ...state.conclusions];
      const graphIdsToRemove = new Set(
        deletedTreeNodes.flatMap((node) => TREE_TO_GRAPH_IDS[node.id] || []),
      );
      const keywords = new Set(
        [
          ...deletedTreeNodes.map((node) => node.name),
          ...getNodeLabelKeywords(allNodes, graphIdsToRemove),
        ].map(normalizeKeyword),
      );

      parent.children = parent.children.filter(c => c.id !== nodeId);
      persistTree(newTree);
      set({
        treeData: newTree,
        axioms: state.axioms.filter((node) => !graphIdsToRemove.has(node.id)),
        mechanisms: state.mechanisms.filter((node) => !graphIdsToRemove.has(node.id)),
        conclusions: state.conclusions.filter((node) => !graphIdsToRemove.has(node.id)),
        edges: state.edges.filter(
          (edge) => !graphIdsToRemove.has(edge.source) && !graphIdsToRemove.has(edge.target),
        ),
        selectedNodeId:
          state.selectedNodeId && graphIdsToRemove.has(state.selectedNodeId)
            ? null
            : state.selectedNodeId,
        hoveredNodeId:
          state.hoveredNodeId && graphIdsToRemove.has(state.hoveredNodeId)
            ? null
            : state.hoveredNodeId,
        nodeExplanations: removeRecordKeys(state.nodeExplanations, graphIdsToRemove),
        questions: state.questions.filter(
          (question) => !textMatchesKeywords(question.text, keywords),
        ),
        inferenceResponses: Object.fromEntries(
          Object.entries(state.inferenceResponses).filter(
            ([key]) => key === 'default' || !textMatchesKeywords(key, keywords),
          ),
        ),
        subSystems: state.subSystems.filter(
          (system) => !textMatchesKeywords(system.name, keywords),
        ),
        history: [
          ...state.history,
          {
            action: 'removeTreeNode',
            data: {
              treeData: state.treeData,
              axioms: state.axioms,
              mechanisms: state.mechanisms,
              conclusions: state.conclusions,
              edges: state.edges,
              selectedNodeId: state.selectedNodeId,
              hoveredNodeId: state.hoveredNodeId,
              nodeExplanations: state.nodeExplanations,
              questions: state.questions,
              inferenceResponses: state.inferenceResponses,
              subSystems: state.subSystems,
            },
          },
        ],
      });
    }
  },

  renameTreeNode: (nodeId, newLabel) => {
    const state = get();
    const newTree = cloneTree(state.treeData);
    const node = findNodeById(newTree, nodeId);
    if (node) {
      node.name = newLabel;
      persistTree(newTree);
      set({ treeData: newTree });
    }
  },
}));