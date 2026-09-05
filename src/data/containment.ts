import type { Node } from '@xyflow/react';
import type { InfraNodeData } from '../store/types';
import { COMPONENT_CATALOGUE } from './components';

export const CONTAINER_IDS = [
  'physical-server',
  'vm',
  'k8s-cluster',
  'k8s-node',
  'container',
  'boundary',
] as const;

export type ContainerId = (typeof CONTAINER_IDS)[number];

const APPS = ['frontend', 'backend-svc', 'microservice', 'worker'] as const;
const LOCAL_DATA = ['rdb', 'nosql', 'cache'] as const;

export const ALLOWED_CHILDREN: Record<ContainerId, readonly string[]> = {
  'physical-server': ['vm', 'container', ...APPS, ...LOCAL_DATA, 'custom'],
  vm: ['container', ...APPS, ...LOCAL_DATA, 'custom'],
  'k8s-cluster': ['k8s-node', 'container', ...APPS, 'custom'],
  'k8s-node': ['container', ...APPS, 'custom'],
  container: [...APPS, 'custom'],
  boundary: [],
};

export const GROUP_SIZE: Record<ContainerId, { width: number; height: number }> = {
  'physical-server': { width: 560, height: 380 },
  vm: { width: 440, height: 280 },
  'k8s-cluster': { width: 680, height: 440 },
  'k8s-node': { width: 400, height: 260 },
  container: { width: 280, height: 180 },
  boundary: { width: 520, height: 360 },
};

const CHILD_SIZE = { width: 188, height: 68 };
const PAD = 16;
export const GROUP_HEADER = 40;

export function isContainerType(componentId: string): componentId is ContainerId {
  return (CONTAINER_IDS as readonly string[]).includes(componentId);
}

export function canContain(parentComponentId: string, childComponentId: string): boolean {
  if (!isContainerType(parentComponentId)) return false;
  if (parentComponentId === 'boundary') return true;
  return ALLOWED_CHILDREN[parentComponentId].includes(childComponentId);
}

export function getAllowedChildIds(parentComponentId: string): readonly string[] {
  if (!isContainerType(parentComponentId)) return [];
  if (parentComponentId === 'boundary') {
    return COMPONENT_CATALOGUE.map((c) => c.id);
  }
  return ALLOWED_CHILDREN[parentComponentId];
}

export function collectSubtreeIds(rootId: string, nodes: Node<InfraNodeData>[]): Set<string> {
  const ids = new Set<string>([rootId]);
  let grew = true;
  while (grew) {
    grew = false;
    for (const n of nodes) {
      if (n.parentId && ids.has(n.parentId) && !ids.has(n.id)) {
        ids.add(n.id);
        grew = true;
      }
    }
  }
  return ids;
}

export function getAbsPosition(
  node: Node<InfraNodeData>,
  nodes: Node<InfraNodeData>[],
): { x: number; y: number } {
  const map = new Map(nodes.map((n) => [n.id, n]));
  let x = node.position.x;
  let y = node.position.y;
  let parentId = node.parentId;
  while (parentId) {
    const parent = map.get(parentId);
    if (!parent) break;
    x += parent.position.x;
    y += parent.position.y;
    parentId = parent.parentId;
  }
  return { x, y };
}

export function getNodeSize(node: Node<InfraNodeData>): { width: number; height: number } {
  const fromStyleW = Number(node.style?.width);
  const fromStyleH = Number(node.style?.height);
  if (fromStyleW && fromStyleH) return { width: fromStyleW, height: fromStyleH };
  if (node.measured?.width && node.measured?.height) {
    return { width: node.measured.width, height: node.measured.height };
  }
  if (isContainerType(String(node.data.componentId))) {
    return GROUP_SIZE[node.data.componentId as ContainerId];
  }
  return CHILD_SIZE;
}

export function findDeepestGroupAt(
  nodes: Node<InfraNodeData>[],
  point: { x: number; y: number },
  excludeIds: Set<string> = new Set(),
): Node<InfraNodeData> | null {
  const hits: { node: Node<InfraNodeData>; area: number; depth: number }[] = [];

  for (const node of nodes) {
    if (excludeIds.has(node.id)) continue;
    if (node.type !== 'infraGroup') continue;
    const abs = getAbsPosition(node, nodes);
    const size = getNodeSize(node);
    if (
      point.x >= abs.x &&
      point.x <= abs.x + size.width &&
      point.y >= abs.y &&
      point.y <= abs.y + size.height
    ) {
      let depth = 0;
      let p = node.parentId;
      const map = new Map(nodes.map((n) => [n.id, n]));
      while (p) {
        depth += 1;
        p = map.get(p)?.parentId;
      }
      hits.push({ node, area: size.width * size.height, depth });
    }
  }

  hits.sort((a, b) => b.depth - a.depth || a.area - b.area);
  return hits[0]?.node ?? null;
}

export function toRelativePosition(
  abs: { x: number; y: number },
  parent: Node<InfraNodeData>,
  nodes: Node<InfraNodeData>[],
): { x: number; y: number } {
  const origin = getAbsPosition(parent, nodes);
  return {
    x: Math.max(PAD, abs.x - origin.x),
    y: Math.max(GROUP_HEADER, abs.y - origin.y),
  };
}

export function expandParentStyle(
  parent: Node<InfraNodeData>,
  childPos: { x: number; y: number },
  childIsGroup: boolean,
  childComponentId: string,
): { width: number; height: number } {
  const size = getNodeSize(parent);
  const child = childIsGroup && isContainerType(childComponentId)
    ? GROUP_SIZE[childComponentId]
    : CHILD_SIZE;
  return {
    width: Math.max(size.width, childPos.x + child.width + PAD),
    height: Math.max(size.height, childPos.y + child.height + PAD),
  };
}

export function sortParentsFirst(nodes: Node<InfraNodeData>[]): Node<InfraNodeData>[] {
  const map = new Map(nodes.map((n) => [n.id, n]));
  const depth = (n: Node<InfraNodeData>) => {
    let d = 0;
    let p = n.parentId;
    const seen = new Set<string>();
    while (p && !seen.has(p)) {
      seen.add(p);
      d += 1;
      p = map.get(p)?.parentId;
    }
    return d;
  };
  return [...nodes].sort((a, b) => depth(a) - depth(b));
}

export function childCountLabel(count: number): string {
  return count === 1 ? '1 nested' : `${count} nested`;
}

export function componentName(id: string): string {
  return COMPONENT_CATALOGUE.find((c) => c.id === id)?.name ?? id;
}
