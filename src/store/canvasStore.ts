import { create } from 'zustand';
import { nanoid } from 'nanoid';
import { addEdge as rfAddEdge } from '@xyflow/react';
import { defaultEdgeData, markersForDirection } from '../data/edgeProps';
import { withResolvedHandles, reresolveEdgesForNodes } from '../data/joints';
import { applyTheme, loadCustomComponents, loadDiagrams, loadTheme, persistCustomComponents, persistDiagrams, persistTheme } from './storage';
import type { CanvasState, SavedCustomComponent, SavedDiagram } from './types';
import { COMPONENT_CATALOGUE } from '../data/components';
import { emptyConfig } from '../data/configSchemas';
import {
  canContain,
  collectSubtreeIds,
  expandParentStyle,
  getAbsPosition,
  GROUP_SIZE,
  isContainerType,
  sortParentsFirst,
  toRelativePosition,
} from '../data/containment';
import { applyPaste, captureSelection, PASTE_OFFSET } from '../data/clipboard';
import { diagramToClipboard, placementOffset } from '../data/importInfra';
import type { ElementClipboard } from '../data/clipboard';

function snapshot(s: {
  currentId: string | null;
  currentName: string;
  nodes: CanvasState['nodes'];
  edges: CanvasState['edges'];
  viewport: CanvasState['viewport'];
  diagrams: SavedDiagram[];
}): SavedDiagram[] {
  const id = s.currentId ?? nanoid();
  const entry: SavedDiagram = {
    id,
    name: s.currentName.trim() || 'Untitled',
    updatedAt: new Date().toISOString(),
    nodes: s.nodes.map((n) => ({ ...n, selected: false })),
    edges: s.edges.map((e) => ({ ...e, selected: false })),
    viewport: s.viewport,
  };
  const others = s.diagrams.filter((d) => d.id !== id);
  return [entry, ...others];
}

function restackSelection<T extends { id: string; zIndex?: number }>(
  items: T[],
  ids: Set<string>,
  to: 'front' | 'back',
  order: T[] = items.filter((item) => ids.has(item.id)),
): T[] {
  if (ids.size === 0) return items;
  const keep = items.filter((item) => !ids.has(item.id));
  const moved = order.filter((item) => ids.has(item.id));
  if (moved.length === 0) return items;
  const keepZ = keep.map((item) => item.zIndex ?? 0);
  const base =
    to === 'front'
      ? Math.max(0, ...keepZ, 0) + 1
      : Math.min(0, ...keepZ, 0) - moved.length;
  const nextZ = new Map(moved.map((item, i) => [item.id, base + i]));
  const stacked = to === 'front' ? [...keep, ...moved] : [...moved, ...keep];
  return stacked.map((item) =>
    nextZ.has(item.id) ? { ...item, zIndex: nextZ.get(item.id) } : item,
  );
}

const initialTheme = loadTheme();
applyTheme(initialTheme);

let clipboard: ElementClipboard | null = null;
let pasteCount = 0;

export const useCanvasStore = create<CanvasState>((set, get) => ({
  theme: initialTheme,
  sessionOpen: false,

  diagrams: loadDiagrams(),
  currentId: null,
  currentName: 'Untitled',
  dirty: false,
  hasClipboard: false,

  nodes: [],
  edges: [],
  viewport: { x: 0, y: 0, zoom: 1 },
  customComponents: loadCustomComponents(),

  addNode: (componentId, position, parentId, presetId) => {
    const def = COMPONENT_CATALOGUE.find((c) => c.id === componentId);
    if (!def) return;
    const group = isContainerType(componentId);
    const current = get().nodes;
    const parent = parentId ? current.find((n) => n.id === parentId) : undefined;
    if (parentId && (!parent || !canContain(String(parent.data.componentId), componentId))) return;

    const preset = presetId
      ? get().customComponents.find((c) => c.id === presetId)
      : undefined;
    const pos = parent ? toRelativePosition(position, parent, current) : position;
    const groupSize = group ? GROUP_SIZE[componentId] : undefined;
    const grown = parent
      ? expandParentStyle(parent, pos, group, componentId)
      : undefined;

    const node = {
      id: nanoid(),
      type: group ? 'infraGroup' : 'infra',
      position: pos,
      parentId: parent?.id,
      extent: parent ? ('parent' as const) : undefined,
      style: groupSize ? { width: groupSize.width, height: groupSize.height } : undefined,
      data: {
        componentId,
        label: preset?.label || def.defaultLabel,
        category: def.category,
        notes: preset?.notes ?? '',
        config: preset ? { ...preset.config } : emptyConfig(),
      },
    };

    set((s) => ({
      dirty: true,
      nodes: sortParentsFirst([
        ...s.nodes.map((n) =>
          grown && n.id === parent?.id ? { ...n, style: { ...n.style, ...grown } } : n,
        ),
        node,
      ]),
    }));
  },

  attachNode: (nodeId, parentId) => {
    const s = get();
    const node = s.nodes.find((n) => n.id === nodeId);
    const parent = s.nodes.find((n) => n.id === parentId);
    if (!node || !parent || nodeId === parentId) return;
    const subtree = collectSubtreeIds(nodeId, s.nodes);
    if (subtree.has(parentId)) return;
    if (!canContain(String(parent.data.componentId), String(node.data.componentId))) return;

    const abs = getAbsPosition(node, s.nodes);
    const pos = toRelativePosition(abs, parent, s.nodes);
    const grown = expandParentStyle(
      parent,
      pos,
      isContainerType(String(node.data.componentId)),
      String(node.data.componentId),
    );

    const nextNodes = sortParentsFirst(
      s.nodes.map((n) => {
        if (n.id === parent.id) return { ...n, style: { ...n.style, ...grown } };
        if (n.id === nodeId) {
          return { ...n, parentId, extent: 'parent' as const, position: pos };
        }
        return n;
      }),
    );

    set({
      dirty: true,
      nodes: nextNodes,
      edges: reresolveEdgesForNodes(s.edges, nextNodes, [nodeId, parentId]),
    });
  },

  detachNode: (nodeId) => {
    const s = get();
    const node = s.nodes.find((n) => n.id === nodeId);
    if (!node?.parentId) return;
    const abs = getAbsPosition(node, s.nodes);
    const nextNodes = s.nodes.map((n) =>
      n.id === nodeId
        ? { ...n, parentId: undefined, extent: undefined, position: abs }
        : n,
    );
    set({
      dirty: true,
      nodes: nextNodes,
      edges: reresolveEdgesForNodes(s.edges, nextNodes, [nodeId, node.parentId]),
    });
  },

  updateNode: (id, data) =>
    set((s) => ({
      dirty: true,
      nodes: s.nodes.map((n) => (n.id === id ? { ...n, data: { ...n.data, ...data } } : n)),
    })),

  updateNodeConfig: (id, patch) =>
    set((s) => ({
      dirty: true,
      nodes: s.nodes.map((n) =>
        n.id === id
          ? { ...n, data: { ...n.data, config: { ...n.data.config, ...patch } } }
          : n,
      ),
    })),

  removeNode: (id) =>
    set((s) => {
      const removed = collectSubtreeIds(id, s.nodes);
      return {
        dirty: true,
        nodes: s.nodes.filter((n) => !removed.has(n.id)),
        edges: s.edges.filter((e) => !removed.has(e.source) && !removed.has(e.target)),
      };
    }),

  setNodes: (nodes) => set({ nodes }),

  saveCustomComponent: (nodeId) => {
    const node = get().nodes.find((n) => n.id === nodeId);
    if (!node || String(node.data.componentId) !== 'custom') return false;
    const fallback =
      String(node.data.label || '').trim() ||
      String(node.data.config?.typeLabel || '').trim() ||
      'Custom';
    const name = window.prompt('Name for the palette', fallback)?.trim();
    if (!name) return false;

    const entry: SavedCustomComponent = {
      id: nanoid(),
      name,
      label: String(node.data.label || name),
      notes: String(node.data.notes ?? ''),
      config: { ...node.data.config },
    };

    const current = get().customComponents;
    const existing = current.find((c) => c.name.toLowerCase() === name.toLowerCase());
    if (existing && !window.confirm(`Replace saved “${existing.name}” in the palette?`)) {
      return false;
    }
    const next = existing
      ? current.map((c) => (c.id === existing.id ? { ...entry, id: existing.id } : c))
      : [entry, ...current];
    persistCustomComponents(next);
    set({ customComponents: next });
    return true;
  },

  deleteCustomComponent: (id) => {
    const next = get().customComponents.filter((c) => c.id !== id);
    persistCustomComponents(next);
    set({ customComponents: next });
  },

  addEdge: (edge) =>
    set((s) => {
      const resolved = withResolvedHandles(edge, s.nodes);
      return {
        dirty: true,
        edges: rfAddEdge(
          {
            ...resolved,
            type: 'infra',
            data: { ...defaultEdgeData(), ...edge.data },
            ...markersForDirection('forward'),
          },
          s.edges,
        ),
      };
    }),

  updateEdge: (id, patch) =>
    set((s) => ({
      dirty: true,
      edges: s.edges.map((e) => {
        if (e.id !== id) return e;
        const { data, ...rest } = patch;
        return {
          ...e,
          ...rest,
          data: data ? { ...e.data, ...data } : e.data,
        };
      }),
    })),

  removeEdge: (id) =>
    set((s) => ({
      dirty: true,
      edges: s.edges.filter((e) => e.id !== id),
    })),

  setEdges: (edges) => set({ edges }),

  setViewport: (viewport) => set({ viewport }),

  clearCanvas: () => set({ nodes: [], edges: [], dirty: true }),

  markDirty: () => set({ dirty: true }),

  deleteSelected: () =>
    set((s) => {
      const removed = new Set<string>();
      for (const n of s.nodes) {
        if (n.selected) {
          for (const id of collectSubtreeIds(n.id, s.nodes)) removed.add(id);
        }
      }
      return {
        dirty: true,
        nodes: s.nodes.filter((n) => !n.selected && !removed.has(n.id)),
        edges: s.edges.filter(
          (e) => !e.selected && !removed.has(e.source) && !removed.has(e.target),
        ),
      };
    }),

  bringSelectedToFront: () =>
    set((s) => {
      const ids = new Set<string>();
      for (const n of s.nodes) {
        if (n.selected) {
          for (const id of collectSubtreeIds(n.id, s.nodes)) ids.add(id);
        }
      }
      const edgeIds = new Set(s.edges.filter((e) => e.selected).map((e) => e.id));
      if (ids.size === 0 && edgeIds.size === 0) return s;
      return {
        dirty: true,
        nodes: restackSelection(s.nodes, ids, 'front', sortParentsFirst(s.nodes.filter((n) => ids.has(n.id)))),
        edges: restackSelection(s.edges, edgeIds, 'front'),
      };
    }),

  sendSelectedToBack: () =>
    set((s) => {
      const ids = new Set<string>();
      for (const n of s.nodes) {
        if (n.selected) {
          for (const id of collectSubtreeIds(n.id, s.nodes)) ids.add(id);
        }
      }
      const edgeIds = new Set(s.edges.filter((e) => e.selected).map((e) => e.id));
      if (ids.size === 0 && edgeIds.size === 0) return s;
      return {
        dirty: true,
        nodes: restackSelection(s.nodes, ids, 'back', sortParentsFirst(s.nodes.filter((n) => ids.has(n.id)))),
        edges: restackSelection(s.edges, edgeIds, 'back'),
      };
    }),

  copySelected: () => {
    const s = get();
    const next = captureSelection(s.nodes, s.edges);
    if (!next) return false;
    clipboard = next;
    pasteCount = 0;
    set({ hasClipboard: true });
    return true;
  },

  pasteClipboard: () => {
    if (!clipboard) return false;
    pasteCount += 1;
    const offset = { x: PASTE_OFFSET * pasteCount, y: PASTE_OFFSET * pasteCount };
    set((s) => {
      const next = applyPaste(clipboard as ElementClipboard, s.nodes, s.edges, offset);
      return { dirty: true, nodes: next.nodes, edges: next.edges };
    });
    return true;
  },

  setTheme: (theme) => {
    persistTheme(theme);
    set({ theme });
  },

  startNew: (name) => {
    const s = get();
    if (s.sessionOpen && s.dirty && !window.confirm('Discard unsaved changes?')) return;
    set({
      sessionOpen: true,
      currentId: null,
      currentName: name?.trim() || 'Untitled',
      dirty: false,
      nodes: [],
      edges: [],
      viewport: { x: 0, y: 0, zoom: 1 },
    });
  },

  openDiagram: (id) => {
    const diagram = get().diagrams.find((d) => d.id === id);
    if (!diagram) return;
    set({
      sessionOpen: true,
      currentId: diagram.id,
      currentName: diagram.name,
      dirty: false,
      nodes: diagram.nodes,
      edges: diagram.edges,
      viewport: diagram.viewport,
    });
  },

  saveCurrent: () => {
    const s = get();
    const diagrams = snapshot(s);
    persistDiagrams(diagrams);
    const current = diagrams[0];
    set({ diagrams, currentId: current.id, currentName: current.name, dirty: false });
  },

  deleteSavedDiagram: (id) => {
    const diagrams = get().diagrams.filter((d) => d.id !== id);
    persistDiagrams(diagrams);
    set({ diagrams });
  },

  setCurrentName: (name) => set({ currentName: name, dirty: true }),

  importIntoSession: (incoming: SavedDiagram[]) => {
    if (incoming.length === 0) return;
    const s = get();
    if (s.sessionOpen && s.dirty && !window.confirm('Replace unsaved work with the imported architecture?')) {
      return;
    }
    const first = incoming[0];
    const importedIds = new Set(incoming.map((d) => d.id));
    const diagrams = [...incoming, ...s.diagrams.filter((d) => !importedIds.has(d.id))];
    persistDiagrams(diagrams);
    set({
      sessionOpen: true,
      diagrams,
      currentId: first.id,
      currentName: first.name,
      nodes: first.nodes,
      edges: first.edges,
      viewport: first.viewport,
      dirty: false,
    });
  },

  addImportedDiagrams: (incoming) => {
    if (incoming.length === 0) return;
    set((s) => {
      let nodes = s.nodes;
      let edges = s.edges;
      for (const diagram of incoming) {
        const clip = diagramToClipboard(diagram);
        const offset = placementOffset(diagram.nodes, nodes);
        const next = applyPaste(clip, nodes, edges, offset);
        nodes = next.nodes;
        edges = next.edges;
      }
      return { dirty: true, sessionOpen: true, nodes, edges };
    });
  },

  showStartScreen: () => {
    const s = get();
    if (s.sessionOpen && s.dirty && !window.confirm('You have unsaved changes. Leave anyway?')) return;
    set({ sessionOpen: false, diagrams: loadDiagrams() });
  },
}));
