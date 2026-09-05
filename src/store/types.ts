import type { Edge, Node, Viewport } from '@xyflow/react';

export type ThemeMode = 'light' | 'dark';

export interface InfraNodeData {
  componentId: string;
  label: string;
  category: string;
  notes: string;
  config: Record<string, string>;
  [key: string]: unknown;
}

export interface SavedCustomComponent {
  id: string;
  name: string;
  label: string;
  notes: string;
  config: Record<string, string>;
}

export interface SavedDiagram {
  id: string;
  name: string;
  updatedAt: string;
  nodes: Node<InfraNodeData>[];
  edges: Edge[];
  viewport: Viewport;
}

export interface CanvasState {
  theme: ThemeMode;
  sessionOpen: boolean;

  diagrams: SavedDiagram[];
  currentId: string | null;
  currentName: string;
  dirty: boolean;

  nodes: Node<InfraNodeData>[];
  edges: Edge[];
  viewport: Viewport;

  addNode: (componentId: string, position: { x: number; y: number }, parentId?: string, presetId?: string) => void;
  attachNode: (nodeId: string, parentId: string) => void;
  detachNode: (nodeId: string) => void;
  updateNode: (id: string, data: Partial<InfraNodeData>) => void;
  updateNodeConfig: (id: string, patch: Record<string, string>) => void;
  removeNode: (id: string) => void;
  setNodes: (nodes: Node<InfraNodeData>[]) => void;

  customComponents: SavedCustomComponent[];
  saveCustomComponent: (nodeId: string) => boolean;
  deleteCustomComponent: (id: string) => void;

  addEdge: (edge: Edge) => void;
  updateEdge: (id: string, patch: Partial<Edge>) => void;
  removeEdge: (id: string) => void;
  setEdges: (edges: Edge[]) => void;

  setViewport: (viewport: Viewport) => void;
  clearCanvas: () => void;
  deleteSelected: () => void;
  bringSelectedToFront: () => void;
  sendSelectedToBack: () => void;
  copySelected: () => boolean;
  pasteClipboard: () => boolean;
  hasClipboard: boolean;
  markDirty: () => void;

  setTheme: (theme: ThemeMode) => void;
  startNew: (name?: string) => void;
  openDiagram: (id: string) => void;
  saveCurrent: () => void;
  deleteSavedDiagram: (id: string) => void;
  setCurrentName: (name: string) => void;
  importIntoSession: (diagrams: SavedDiagram[]) => void;
  addImportedDiagrams: (diagrams: SavedDiagram[]) => void;
  showStartScreen: () => void;
}
