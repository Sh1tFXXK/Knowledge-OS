// Knowledge OS - Type Definitions

export interface GraphNode {
  id: string;
  label: string;
  x: number;
  y: number;
  color: string;
  size: number;
  zone: 'axiom' | 'mechanism' | 'conclusion';
  px?: number;
  py?: number;
  phase: number;
  glow: boolean;
  description?: string;
}

export interface GraphEdge {
  id: string;
  source: string;
  target: string;
  type: string;
  label: string;
}

export interface GraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

export interface TreeNode {
  id: string;
  name: string;
  count: number;
  icon: string;
  expanded?: boolean;
  active?: boolean;
  children?: TreeNode[];
}

export interface Perspective {
  id: string;
  name: string;
  nameEn: string;
  color: string;
  description?: string;
}

export interface Rule {
  premise: string[];
  result: string;
}

export interface SubSystem {
  id: string;
  name: string;
  color: string;
  nodes: number;
  relations: number;
}

export interface InferenceStep {
  label: string;
  description: string;
}

export interface InferenceEngine {
  steps: InferenceStep[];
  answer: string;
}

export interface ExplanationTab {
  id: string;
  label: string;
  content: string;
}

export interface NodeExplanation {
  nodeId: string;
  title: string;
  tabs: ExplanationTab[];
  relatedCount: number;
  notes?: string;
}

export interface Question {
  id: string;
  text: string;
  answered: boolean;
}

export interface Coordinates {
  x: number;
  y: number;
  z: number;
}

export interface NotificationItem {
  id: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  timestamp: number;
}

export type ThemeType = 'dark' | 'light';