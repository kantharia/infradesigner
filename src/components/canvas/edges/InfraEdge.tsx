import { useState } from 'react';
import {
  EdgeLabelRenderer,
  SmoothStepEdge,
  getSmoothStepPath,
  Position,
  type EdgeProps,
} from '@xyflow/react';
import { isSyncDirection, readEdgeData, syncLaneOffset } from '../../../data/edgeProps';

function EdgeArrow({
  x,
  y,
  position,
  color,
}: {
  x: number;
  y: number;
  position: Position;
  color: string;
}) {
  const len = 9;
  const half = 5;
  let points = '';
  switch (position) {
    case Position.Left:
      points = `${x},${y} ${x - len},${y - half} ${x - len},${y + half}`;
      break;
    case Position.Right:
      points = `${x},${y} ${x + len},${y - half} ${x + len},${y + half}`;
      break;
    case Position.Top:
      points = `${x},${y} ${x - half},${y - len} ${x + half},${y - len}`;
      break;
    default:
      points = `${x},${y} ${x - half},${y + len} ${x + half},${y + len}`;
  }
  return <polygon points={points} fill={color} stroke={color} strokeLinejoin="round" />;
}

function SyncChip({ x, y, text }: { x: number; y: number; text: string }) {
  const height = 22;
  const padX = 9;
  const label = `⇄  ${text}`;
  const width = Math.max(64, padX * 2 + label.length * 6.4);
  return (
    <g transform={`translate(${x - width / 2} ${y - height / 2})`}>
      <rect
        x={-4}
        y={-4}
        width={width + 8}
        height={height + 8}
        rx={8}
        fill="var(--canvas-bg)"
        stroke="none"
      />
      <rect
        width={width}
        height={height}
        rx={6}
        fill="var(--surface-1)"
        stroke="var(--surface-border)"
      />
      <text
        x={width / 2}
        y={height / 2}
        textAnchor="middle"
        dominantBaseline="central"
        fontSize={11}
        fontWeight={600}
        fontFamily="var(--font-ui), system-ui, sans-serif"
        fill="var(--text-primary)"
      >
        {label}
      </text>
    </g>
  );
}

function FlowDots({
  path,
  count,
  speed,
  color,
  dir,
}: {
  path: string;
  count: number;
  speed: number;
  color: string;
  dir: 'forward' | 'back';
}) {
  return (
    <>
      {Array.from({ length: count }, (_, i) => (
        <circle
          key={`${dir}-${i}`}
          r={2.75}
          fill={color}
          style={{
            pointerEvents: 'none',
            offsetPath: `path("${path}")`,
            offsetRotate: '0deg',
            animation: `edge-flow ${speed}s linear infinite`,
            animationDirection: dir === 'back' ? 'reverse' : 'normal',
            animationDelay: `${-(speed / count) * i}s`,
          }}
        />
      ))}
    </>
  );
}

export function InfraEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  selected,
  label,
  style,
  data,
}: EdgeProps) {
  const [hovered, setHovered] = useState(false);
  const meta = readEdgeData({ data });
  const sync = isSyncDirection(meta.direction);
  const [edgePath, labelX, labelY] = getSmoothStepPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
  });

  const stroke = sync
    ? selected || hovered
      ? 'var(--edge-sync-hover)'
      : 'var(--edge-sync)'
    : selected
      ? 'var(--edge-animated)'
      : hovered
        ? 'var(--edge-color-hover)'
        : 'var(--edge-color)';

  const dashed = meta.lineStyle === 'dashed' || selected;
  const flows: Array<'forward' | 'back'> =
    meta.direction === 'back'
      ? ['back']
      : meta.direction === 'both' || meta.direction === 'sync'
        ? ['forward', 'back']
        : ['forward'];

  const offset = syncLaneOffset(sourceX, sourceY, targetX, targetY);
  const fwdPath = getSmoothStepPath({
    sourceX: sourceX + offset.x,
    sourceY: sourceY + offset.y,
    targetX: targetX + offset.x,
    targetY: targetY + offset.y,
    sourcePosition,
    targetPosition,
  })[0];
  const revPath = getSmoothStepPath({
    sourceX: targetX - offset.x,
    sourceY: targetY - offset.y,
    targetX: sourceX - offset.x,
    targetY: sourceY - offset.y,
    sourcePosition: targetPosition,
    targetPosition: sourcePosition,
  })[0];

  const chipText = label ? String(label) : 'sync';

  return (
    <>
      {sync ? (
        <>
          <SmoothStepEdge
            id={`${id}-sync-fwd`}
            markerEnd={undefined}
            markerStart={undefined}
            sourceX={sourceX + offset.x}
            sourceY={sourceY + offset.y}
            targetX={targetX + offset.x}
            targetY={targetY + offset.y}
            sourcePosition={sourcePosition}
            targetPosition={targetPosition}
            interactionWidth={0}
            style={{
              ...style,
              stroke,
              strokeWidth: selected || hovered ? 1.75 : 1.35,
              strokeDasharray: dashed ? '7 5' : undefined,
              transition: 'stroke var(--transition-fast)',
            }}
          />
          <SmoothStepEdge
            id={`${id}-sync-rev`}
            markerEnd={undefined}
            markerStart={undefined}
            sourceX={targetX - offset.x}
            sourceY={targetY - offset.y}
            targetX={sourceX - offset.x}
            targetY={sourceY - offset.y}
            sourcePosition={targetPosition}
            targetPosition={sourcePosition}
            interactionWidth={0}
            style={{
              ...style,
              stroke,
              strokeWidth: selected || hovered ? 1.75 : 1.35,
              strokeDasharray: dashed ? '7 5' : undefined,
              transition: 'stroke var(--transition-fast)',
            }}
          />
          <EdgeArrow
            x={targetX + offset.x}
            y={targetY + offset.y}
            position={targetPosition}
            color={stroke}
          />
          <EdgeArrow
            x={sourceX - offset.x}
            y={sourceY - offset.y}
            position={sourcePosition}
            color={stroke}
          />
        </>
      ) : (
        <>
          <SmoothStepEdge
            id={id}
            markerEnd={undefined}
            markerStart={undefined}
            sourceX={sourceX}
            sourceY={sourceY}
            targetX={targetX}
            targetY={targetY}
            sourcePosition={sourcePosition}
            targetPosition={targetPosition}
            interactionWidth={20}
            style={{
              ...style,
              stroke,
              strokeWidth: selected || hovered ? 2 : 1.5,
              strokeDasharray: dashed ? '5 5' : undefined,
              transition: 'stroke var(--transition-fast)',
            }}
          />
          {meta.direction === 'forward' || meta.direction === 'both' ? (
            <EdgeArrow x={targetX} y={targetY} position={targetPosition} color={stroke} />
          ) : null}
          {meta.direction === 'back' || meta.direction === 'both' ? (
            <EdgeArrow x={sourceX} y={sourceY} position={sourcePosition} color={stroke} />
          ) : null}
        </>
      )}
      {meta.animated
        ? sync
          ? [
              <FlowDots
                key="fwd"
                path={fwdPath}
                count={meta.animationDots}
                speed={meta.animationSpeed}
                color={meta.animationDotColor || stroke}
                dir="forward"
              />,
              <FlowDots
                key="rev"
                path={revPath}
                count={meta.animationDots}
                speed={meta.animationSpeed}
                color={meta.animationDotColor || stroke}
                dir="forward"
              />,
            ]
          : flows.flatMap((dir) => (
              <FlowDots
                key={dir}
                path={edgePath}
                count={meta.animationDots}
                speed={meta.animationSpeed}
                color={meta.animationDotColor || 'var(--edge-animated)'}
                dir={dir}
              />
            ))
        : null}
      <path
        d={edgePath}
        fill="none"
        stroke="transparent"
        strokeWidth={sync ? 28 : 20}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      />
      {sync ? <SyncChip x={labelX} y={labelY} text={chipText} /> : null}
      {!sync && label ? (
        <EdgeLabelRenderer>
          <div
            className="nodrag nopan infra-edge-chip"
            style={{
              position: 'absolute',
              transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
              display: 'flex',
              alignItems: 'center',
              background: 'var(--surface-2)',
              color: 'var(--text-secondary)',
              fontSize: 'var(--text-xs)',
              fontFamily: 'var(--font-ui)',
              border: '1px solid var(--surface-border)',
              borderRadius: 999,
              padding: '2px 8px',
            }}
          >
            {String(label)}
          </div>
        </EdgeLabelRenderer>
      ) : null}
    </>
  );
}
