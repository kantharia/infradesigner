import type { Edge, Node } from '@xyflow/react';
import type { InfraNodeData } from '../store/types';
import { getAbsPosition, getNodeSize, isContainerType } from './containment';

export const HANDLE_SIDES = ['top', 'right', 'bottom', 'left'] as const;
export type HandleSide = (typeof HANDLE_SIDES)[number];
export type JointFacing = 'in' | 'out';

const INWARD_Z = 1002;

export function isGroupNode(node: Node<InfraNodeData> | undefined): boolean {
  if (!node) return false;
  return node.type === 'infraGroup' || isContainerType(String(node.data.componentId));
}

export function parseHandleId(
  id: string | null | undefined,
): { side: HandleSide; facing: JointFacing } {
  if (!id) return { side: 'right', facing: 'out' };
  const inward = id.startsWith('in-');
  const raw = inward ? id.slice(3) : id.startsWith('out-') ? id.slice(4) : id;
  const side: HandleSide = HANDLE_SIDES.includes(raw as HandleSide)
    ? (raw as HandleSide)
    : 'right';
  return { side, facing: inward ? 'in' : 'out' };
}

export function toHandleId(side: HandleSide, facing: JointFacing, isGroup: boolean): string {
  if (!isGroup || facing === 'out') return side;
  return `in-${side}`;
}

export function isInsideContainer(
  nodeId: string,
  containerId: string,
  nodes: Node<InfraNodeData>[],
): boolean {
  if (!nodeId || !containerId || nodeId === containerId) return false;
  const map = new Map(nodes.map((n) => [n.id, n]));
  const seen = new Set<string>();
  let current = map.get(nodeId)?.parentId;
  while (current && !seen.has(current)) {
    if (current === containerId) return true;
    seen.add(current);
    current = map.get(current)?.parentId;
  }
  return false;
}

export function facingFor(
  thisId: string,
  otherId: string,
  nodes: Node<InfraNodeData>[],
): JointFacing {
  return isInsideContainer(otherId, thisId, nodes) ? 'in' : 'out';
}

export function closestSide(
  thisNode: Node<InfraNodeData>,
  otherNode: Node<InfraNodeData>,
  nodes: Node<InfraNodeData>[],
): HandleSide {
  const box = getAbsPosition(thisNode, nodes);
  const size = getNodeSize(thisNode);
  const other = getAbsPosition(otherNode, nodes);
  const otherSize = getNodeSize(otherNode);
  const otherCx = other.x + otherSize.width / 2;
  const otherCy = other.y + otherSize.height / 2;

  if (isInsideContainer(otherNode.id, thisNode.id, nodes)) {
    const dist: Record<HandleSide, number> = {
      top: otherCy - box.y,
      bottom: box.y + size.height - otherCy,
      left: otherCx - box.x,
      right: box.x + size.width - otherCx,
    };
    return HANDLE_SIDES.reduce(
      (best, side) => (dist[side] < dist[best] ? side : best),
      'top' as HandleSide,
    );
  }

  const dx = otherCx - (box.x + size.width / 2);
  const dy = otherCy - (box.y + size.height / 2);
  if (Math.abs(dx) > Math.abs(dy)) return dx > 0 ? 'right' : 'left';
  return dy > 0 ? 'bottom' : 'top';
}

export function inwardEdgeZIndex(
  sourceHandle?: string | null,
  targetHandle?: string | null,
): number {
  return parseHandleId(sourceHandle).facing === 'in' || parseHandleId(targetHandle).facing === 'in'
    ? INWARD_Z
    : 0;
}

function resolveHandle(
  thisId: string,
  otherId: string,
  currentHandle: string | null | undefined,
  nodes: Node<InfraNodeData>[],
): string {
  const thisNode = nodes.find((n) => n.id === thisId);
  const otherNode = nodes.find((n) => n.id === otherId);
  const grouped = isGroupNode(thisNode);
  const side = currentHandle
    ? parseHandleId(currentHandle).side
    : thisNode && otherNode
      ? closestSide(thisNode, otherNode, nodes)
      : 'right';
  if (!grouped) return side;
  return toHandleId(side, facingFor(thisId, otherId, nodes), true);
}

export function withResolvedHandles<
  T extends {
    source: string;
    target: string;
    sourceHandle?: string | null;
    targetHandle?: string | null;
  },
>(connection: T, nodes: Node<InfraNodeData>[]): T & {
  sourceHandle: string;
  targetHandle: string;
  zIndex: number;
} {
  const sourceHandle = resolveHandle(
    connection.source,
    connection.target,
    connection.sourceHandle,
    nodes,
  );
  const targetHandle = resolveHandle(
    connection.target,
    connection.source,
    connection.targetHandle,
    nodes,
  );
  return {
    ...connection,
    sourceHandle,
    targetHandle,
    zIndex: inwardEdgeZIndex(sourceHandle, targetHandle),
  };
}

export function reresolveEdgesForNodes(
  edges: Edge[],
  nodes: Node<InfraNodeData>[],
  nodeIds: Iterable<string>,
): Edge[] {
  const ids = new Set(nodeIds);
  return edges.map((edge) => {
    if (!ids.has(edge.source) && !ids.has(edge.target)) return edge;
    const resolved = withResolvedHandles(edge, nodes);
    return {
      ...edge,
      sourceHandle: resolved.sourceHandle,
      targetHandle: resolved.targetHandle,
      zIndex: resolved.zIndex,
    };
  });
}
