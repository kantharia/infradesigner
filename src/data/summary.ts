import type { Node } from '@xyflow/react';
import type { InfraNodeData } from '../store/types';
import { componentName } from './containment';

export interface TypeCount {
  componentId: string;
  name: string;
  count: number;
}

export interface NestedRow {
  parentId: string;
  parentLabel: string;
  parentType: string;
  childId: string;
  childLabel: string;
  childType: string;
}

export function summarizeNodes(nodes: Node<InfraNodeData>[]): {
  totals: TypeCount[];
  nested: NestedRow[];
} {
  const counts = new Map<string, number>();
  for (const n of nodes) {
    const id = String(n.data.componentId);
    counts.set(id, (counts.get(id) ?? 0) + 1);
  }
  const totals = [...counts.entries()]
    .map(([componentId, count]) => ({
      componentId,
      name: componentName(componentId),
      count,
    }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));

  const byId = new Map(nodes.map((n) => [n.id, n]));
  const nested: NestedRow[] = nodes
    .filter((n) => n.parentId)
    .map((n) => {
      const parent = byId.get(n.parentId ?? '');
      return {
        parentId: n.parentId ?? '',
        parentLabel: String(parent?.data.label ?? 'Unknown'),
        parentType: componentName(String(parent?.data.componentId ?? '')),
        childId: n.id,
        childLabel: String(n.data.label),
        childType: componentName(String(n.data.componentId)),
      };
    })
    .sort((a, b) => a.parentLabel.localeCompare(b.parentLabel) || a.childLabel.localeCompare(b.childLabel));

  return { totals, nested };
}
