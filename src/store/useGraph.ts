import { create } from 'zustand';
import type { GraphNode, GraphEdge, NotificationItem, ThemeType, Perspective, TreeNode } from '../types';
import { graphNodes as initialNodes, graphEdges as initialEdges, perspectives, universeTree } from '../data';

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

  // 树 Actions
  loadTreeData: () => Promise<void>;
  addChildNode: (parentId: string, label: string) => void;
  removeTreeNode: (nodeId: string) => void;
  renameTreeNode: (nodeId: string, newLabel: string) => void;
}

export const useGraphStore = create<GraphState>((set, get) => ({
  axioms: initialNodes.axioms,
  mechanisms: initialNodes.mechanisms,
  conclusions: initialNodes.conclusions,
  edges: initialEdges,
  selectedNodeId: null,
  hoveredNodeId: null,
  treeData: loadCachedTree(),
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
    const prev = {
      axioms: [...state.axioms],
      mechanisms: [...state.mechanisms],
      conclusions: [...state.conclusions],
      edges: [...state.edges],
    };
    set({
      axioms: state.axioms.filter((n) => n.id !== id),
      mechanisms: state.mechanisms.filter((n) => n.id !== id),
      conclusions: state.conclusions.filter((n) => n.id !== id),
      edges: state.edges.filter((e) => e.source !== id && e.target !== id),
      selectedNodeId: state.selectedNodeId === id ? null : state.selectedNodeId,
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
      });
    } else if (lastAction.action === 'addEdge') {
      set({ edges: lastAction.data });
    }
    set((state) => ({ history: state.history.slice(0, -1) }));
  },

  getAllNodes: () => {
    const state = get();
    return [...state.axioms, ...state.mechanisms, ...state.conclusions];
  },

  // ===== 树操作 =====
  loadTreeData: async () => {
    const fileTree = await loadTreeFromFile();
    if (!fileTree) return;

    persistTreeCache(fileTree);
    set({ treeData: fileTree });
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
    const newTree = cloneTree(state.treeData);
    const parent = findParent(newTree, nodeId);
    if (parent && parent.children) {
      parent.children = parent.children.filter(c => c.id !== nodeId);
      persistTree(newTree);
      set({ treeData: newTree });
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