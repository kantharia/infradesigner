import { memo } from 'react';
import { Handle, NodeResizer, Position } from '@xyflow/react';
import { COMPONENT_CATALOGUE, categoryColorVar } from '../../../data/components';
import { fillFromConfig } from '../../../data/appearance';
import { childCountLabel } from '../../../data/containment';
import { HANDLE_SIDES, toHandleId, type HandleSide } from '../../../data/joints';
import { TechIcon, providerHintFromConfig } from '../../../data/providerIcons';
import { normalizeAnimationDotColor } from '../../../data/edgeProps';
import { useCanvasStore } from '../../../store/canvasStore';
import type { InfraNodeProps } from './InfraNode.types';
import { NodePropertyStrip } from './NodePropertyStrip';

const OUTWARD_FLOW: Record<HandleSide, Position> = {
  top: Position.Top,
  right: Position.Right,
  bottom: Position.Bottom,
  left: Position.Left,
};

const INWARD_FLOW: Record<HandleSide, Position> = {
  top: Position.Bottom,
  right: Position.Left,
  bottom: Position.Top,
  left: Position.Right,
};

function GroupHandles() {
  return (
    <>
      {HANDLE_SIDES.map((side) => (
        <Handle
          key={`out-${side}`}
          type="source"
          position={OUTWARD_FLOW[side]}
          id={toHandleId(side, 'out', true)}
          className="infra-handle"
          title={`Outward ${side}`}
        />
      ))}
      {HANDLE_SIDES.map((side) => (
        <Handle
          key={`in-${side}`}
          type="source"
          position={INWARD_FLOW[side]}
          id={toHandleId(side, 'in', true)}
          className={`infra-handle infra-handle-in infra-handle-in-${side}`}
          title={`Inward ${side}`}
        />
      ))}
    </>
  );
}

function InfraGroupNodeComponent({ id, data, selected }: InfraNodeProps) {
  const nestedCount = useCanvasStore(
    (s) => s.nodes.filter((n) => n.parentId === id).length,
  );
  const def = COMPONENT_CATALOGUE.find((c) => c.id === data.componentId);
  const hint = providerHintFromConfig(data.config);
  const isBoundary = data.componentId === 'boundary';
  const catColor = categoryColorVar(
    data.config?.accent && data.config.accent !== 'default'
      ? data.config.accent
      : data.category,
  );
  const dotColor =
    normalizeAnimationDotColor(data.config?.dotColor) || (selected ? 'var(--node-border-selected)' : catColor);
  const dotSize = Math.min(12, Math.max(1, Number(data.config?.dotSize) || 3));
  const caption = (data.config?.caption ?? '').trim();
  const fill = fillFromConfig(
    data.config,
    isBoundary ? 'transparent' : 'var(--accent-dim)',
    isBoundary ? 0 : 18,
  );

  return (
    <div
      className="infra-group relative h-full w-full"
      style={{
        background: fill,
        border: isBoundary
          ? `${dotSize}px dotted ${dotColor}`
          : `1px dashed ${selected ? 'var(--node-border-selected)' : catColor}`,
        borderRadius: isBoundary ? 18 : 12,
        boxShadow: selected ? 'var(--node-shadow-selected)' : 'none',
        overflow: 'visible',
      }}
    >
      <NodeResizer
        isVisible={selected}
        minWidth={240}
        minHeight={140}
        lineStyle={{ borderColor: 'var(--accent)' }}
        handleStyle={{
          width: 8,
          height: 8,
          background: 'var(--accent)',
          border: '1px solid var(--surface-1)',
        }}
      />

      <GroupHandles />

      <div
        className="flex items-center"
        style={{
          gap: 8,
          minHeight: isBoundary ? 36 : 40,
          padding: isBoundary ? '8px 14px 4px' : '0 12px 0 14px',
          borderBottom: isBoundary ? 'none' : '1px solid var(--surface-border)',
          background: isBoundary ? 'transparent' : 'var(--node-bg)',
          borderRadius: isBoundary ? 0 : '12px 12px 0 0',
        }}
      >
        {isBoundary ? null : (
          <div className="h-full w-[3px]" style={{ background: catColor, marginLeft: -14 }} />
        )}
        <span
          className="flex items-center justify-center"
          style={{
            width: 24,
            height: 24,
            flexShrink: 0,
            borderRadius: 5,
            background: isBoundary ? 'transparent' : 'var(--surface-3)',
            border: isBoundary ? 'none' : '1px solid var(--surface-border)',
          }}
        >
          <TechIcon
            hint={hint}
            fallbackName={data.config?.iconName || def?.icon || 'Box'}
            size={16}
            color={catColor}
          />
        </span>
        <div className="min-w-0 flex-1">
          <div className="truncate" style={{ color: 'var(--text-primary)', fontSize: 'var(--text-base)' }}>
            {data.label}
          </div>
          {caption ? (
            <div className="truncate" style={{ color: 'var(--text-muted)', fontSize: 'var(--text-xs)' }}>
              {caption}
            </div>
          ) : null}
        </div>
        <span
          style={{
            color: 'var(--text-muted)',
            fontSize: 'var(--text-xs)',
            whiteSpace: 'nowrap',
          }}
        >
          {childCountLabel(nestedCount)}
        </span>
      </div>
      <NodePropertyStrip
        componentId={String(data.componentId)}
        config={data.config}
        notes={data.notes}
        compact
      />
    </div>
  );
}

export const InfraGroupNode = memo(InfraGroupNodeComponent);
