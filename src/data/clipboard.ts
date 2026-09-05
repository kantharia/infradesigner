import { nanoid } from 'nanoid';
import type { Edge, Node } from '@xyflow/react';
import type { InfraNodeData } from '../store/types';
import {
  collectSubtreeIds,
  expandParentStyle,
  getAbsPosition,
  isContainerType,
  sortParentsFirst,
} from './containment';

export const PASTE_OFFSET = 40;

export interface ElementClipboard {
  nodes: Node<InfraNodeData>[];
  abs: Record<string, { x: number; y: number }>;
  edges: Edge[];
}

export function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  if (target.isContentEditable) return true;
  const tag = target.tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true;
  return Boolean(target.closest('input, textarea, select, [contenteditable="true"]'));
}

export function shortcutMod(): '⌘' | 'Ctrl' {
  if (typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform)) {
    return '⌘';
  }
  return 'Ctrl';
}

function stripNode(node: Node<InfraNodeData>): Node<InfraNodeData> {
  return {
    id: node.id,
    type: node.type,
    position: { ...node.position },
    parentId: node.parentId,
    extent: node.extent,
    style: node.style ? { ...node.style } : undefined,
    width: node.width,
    height: node.height,
    data: {
      ...node.data,
      config: { ...node.data.config },
    },
    selected: false,
  };
}

function stripEdge(edge: Edge): Edge {
  return {
    ...edge,
    selected: false,
    data: edge.data ? { ...edge.data } : edge.data,
  };
}

export function captureSelection(
  nodes: Node<InfraNodeData>[],
  edges: Edge[],
): ElementClipboard | null {
  const selectedNodeIds = new Set(nodes.filter((n) => n.selected).map((n) => n.id));
  const copyIds = new Set<string>();
  for (const id of selectedNodeIds) {
    for (const sid of collectSubtreeIds(id, nodes)) copyIds.add(sid);
  }
  for (const edge of edges) {
    if (!edge.selected) continue;
    copyIds.add(edge.source);
    copyIds.add(edge.target);
  }
  if (copyIds.size === 0) return null;

  const clipNodes = nodes.filter((n) => copyIds.has(n.id)).map(stripNode);
  const abs: Record<string, { x: number; y: number }> = {};
  for (const node of clipNodes) {
    const live = nodes.find((n) => n.id === node.id);
    abs[node.id] = live ? getAbsPosition(live, nodes) : { ...node.position };
  }
  const clipEdges = edges
    .filter((e) => copyIds.has(e.source) && copyIds.has(e.target))
    .map(stripEdge);
  if (clipNodes.length === 0 && clipEdges.length === 0) return null;
  return { nodes: clipNodes, abs, edges: clipEdges };
}

export function applyPaste(
  clip: ElementClipboard,
  nodes: Node<InfraNodeData>[],
  edges: Edge[],
  offset: { x: number; y: number },
): { nodes: Node<InfraNodeData>[]; edges: Edge[] } {
  const idMap = new Map(clip.nodes.map((n) => [n.id, nanoid()]));
  const copied = new Set(clip.nodes.map((n) => n.id));
  const liveIds = new Set(nodes.map((n) => n.id));

  const pasted: Node<InfraNodeData>[] = clip.nodes.map((node) => {
    const parentInClip = Boolean(node.parentId && copied.has(node.parentId));
    const parentLive = Boolean(node.parentId && !parentInClip && liveIds.has(node.parentId));
    const parentId = parentInClip
      ? idMap.get(node.parentId as string)
      : parentLive
        ? node.parentId
        : undefined;
    const position = parentInClip
      ? { ...node.position }
      : parentLive
        ? { x: node.position.x + offset.x, y: node.position.y + offset.y }
        : {
            x: (clip.abs[node.id]?.x ?? node.position.x) + offset.x,
            y: (clip.abs[node.id]?.y ?? node.position.y) + offset.y,
          };
    return {
      ...node,
      id: idMap.get(node.id) as string,
      parentId,
      extent: parentId ? ('parent' as const) : undefined,
      position,
      selected: true,
    };
  });

  const pastedEdges: Edge[] = clip.edges.flatMap((edge) => {
    const source = idMap.get(edge.source);
    const target = idMap.get(edge.target);
    if (!source || !target) return [];
    return [
      {
        ...edge,
        id: nanoid(),
        source,
        target,
        selected: true,
      },
    ];
  });

  let nextNodes = sortParentsFirst([
    ...nodes.map((n) => ({ ...n, selected: false })),
    ...pasted,
  ]);

  for (const child of pasted) {
    if (!child.parentId || !liveIds.has(child.parentId)) continue;
    const parent = nextNodes.find((n) => n.id === child.parentId);
    if (!parent) continue;
    const grown = expandParentStyle(
      parent,
      child.position,
      isContainerType(String(child.data.componentId)),
      String(child.data.componentId),
    );
    nextNodes = nextNodes.map((n) =>
      n.id === parent.id ? { ...n, style: { ...n.style, ...grown } } : n,
    );
  }

  return {
    nodes: nextNodes,
    edges: [...edges.map((e) => ({ ...e, selected: false })), ...pastedEdges],
  };
}
