import { useCallback, useEffect, type DragEvent } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  ConnectionMode,
  BackgroundVariant,
  applyNodeChanges,
  applyEdgeChanges,
  useReactFlow,
  type Connection,
  type Edge,
  type Node,
  type NodeChange,
  type EdgeChange,
  MarkerType,
} from '@xyflow/react';
import { InfraNode } from './nodes/InfraNode';
import { InfraGroupNode } from './nodes/InfraGroupNode';
import { InfraEdge } from './edges/InfraEdge';
import { useCanvasStore } from '../../store/canvasStore';
import { categoryColorVar } from '../../data/components';
import {
  canContain,
  collectSubtreeIds,
  findDeepestGroupAt,
} from '../../data/containment';
import type { InfraNodeData } from '../../store/types';
import { isEditableTarget } from '../../data/clipboard';

const nodeTypes = { infra: InfraNode, infraGroup: InfraGroupNode };
const edgeTypes = { infra: InfraEdge };

export function Canvas() {
  const nodes = useCanvasStore((s) => s.nodes);
  const edges = useCanvasStore((s) => s.edges);
  const viewport = useCanvasStore((s) => s.viewport);
  const setNodes = useCanvasStore((s) => s.setNodes);
  const setEdges = useCanvasStore((s) => s.setEdges);
  const addNode = useCanvasStore((s) => s.addNode);
  const addEdge = useCanvasStore((s) => s.addEdge);
  const attachNode = useCanvasStore((s) => s.attachNode);
  const setViewport = useCanvasStore((s) => s.setViewport);
  const markDirty = useCanvasStore((s) => s.markDirty);
  const copySelected = useCanvasStore((s) => s.copySelected);
  const pasteClipboard = useCanvasStore((s) => s.pasteClipboard);
  const { screenToFlowPosition } = useReactFlow();

  const onNodesChange = useCallback(
    (changes: NodeChange<typeof nodes[number]>[]) => {
      const expanded: NodeChange<typeof nodes[number]>[] = [...changes];
      for (const change of changes) {
        if (change.type === 'remove') {
          for (const id of collectSubtreeIds(change.id, nodes)) {
            if (id !== change.id) expanded.push({ type: 'remove', id });
          }
        }
      }
      setNodes(applyNodeChanges(expanded, nodes));
      const structural = expanded.some(
        (c) =>
          c.type === 'remove' ||
          c.type === 'add' ||
          c.type === 'dimensions' ||
          (c.type === 'position' && c.dragging === false),
      );
      if (structural) markDirty();
    },
    [nodes, setNodes, markDirty],
  );

  const onEdgesChange = useCallback(
    (changes: EdgeChange[]) => {
      setEdges(applyEdgeChanges(changes, edges));
      if (changes.some((c) => c.type === 'remove' || c.type === 'add')) markDirty();
    },
    [edges, setEdges, markDirty],
  );

  const onConnect = useCallback(
    (connection: Connection) => {
      addEdge(connection as Edge);
    },
    [addEdge],
  );

  const handleDrop = useCallback(
    (event: DragEvent) => {
      event.preventDefault();
      const componentId = event.dataTransfer.getData('componentId');
      if (!componentId) return;
      const presetId = event.dataTransfer.getData('presetId') || undefined;
      const position = screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });
      const group = findDeepestGroupAt(nodes, position);
      if (group && canContain(String(group.data.componentId), componentId)) {
        addNode(componentId, position, group.id, presetId);
        return;
      }
      addNode(componentId, position, undefined, presetId);
    },
    [screenToFlowPosition, addNode, nodes],
  );

  const onNodeDragStop = useCallback(
    (_: unknown, node: Node<InfraNodeData>) => {
      if (node.parentId) return;
      const exclude = collectSubtreeIds(node.id, nodes);
      const probe = {
        x: node.position.x + 40,
        y: node.position.y + 24,
      };
      const group = findDeepestGroupAt(nodes, probe, exclude);
      if (group) attachNode(node.id, group.id);
    },
    [nodes, attachNode],
  );

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (!(event.metaKey || event.ctrlKey) || event.altKey) return;
      if (isEditableTarget(event.target)) return;
      const key = event.key.toLowerCase();
      if (key === 'c' && !event.shiftKey) {
        if (copySelected()) event.preventDefault();
        return;
      }
      if (key === 'v' && !event.shiftKey) {
        if (pasteClipboard()) event.preventDefault();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [copySelected, pasteClipboard]);

  return (
    <div className="h-full w-full" style={{ background: 'var(--canvas-bg)' }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        defaultEdgeOptions={{
          type: 'infra',
          markerEnd: { type: MarkerType.ArrowClosed, width: 18, height: 18 },
        }}
        defaultViewport={viewport}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onDrop={handleDrop}
        onNodeDragStop={onNodeDragStop}
        onDragOver={(e) => {
          e.preventDefault();
          e.dataTransfer.dropEffect = 'move';
        }}
        onMoveEnd={(_, next) => setViewport(next)}
        fitView={nodes.length === 0}
        connectionMode={ConnectionMode.Loose}
        deleteKeyCode={['Delete', 'Backspace']}
        multiSelectionKeyCode="Shift"
        proOptions={{ hideAttribution: true }}
      >
        <Background variant={BackgroundVariant.Dots} gap={24} color="var(--canvas-dot)" />
        <Controls />
        <MiniMap
          nodeColor={(n) => {
            const config = n.data.config;
            const accent =
              config && typeof config === 'object' && 'accent' in config
                ? String((config as Record<string, string>).accent)
                : 'default';
            const category = n.data.category;
            if (accent && accent !== 'default') return categoryColorVar(accent);
            return categoryColorVar(typeof category === 'string' ? category : 'networking');
          }}
          maskColor="var(--minimap-mask)"
        />
      </ReactFlow>
    </div>
  );
}
