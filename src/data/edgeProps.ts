import { MarkerType, type Edge, type EdgeMarker } from '@xyflow/react';

export type EdgeDirection = 'forward' | 'back' | 'both' | 'sync' | 'none';
export type EdgeLineStyle = 'solid' | 'dashed';

export interface InfraEdgeData {
  direction: EdgeDirection;
  lineStyle: EdgeLineStyle;
  animated: boolean;
  animationSpeed: number;
  animationDots: number;
  animationDotColor: string;
  [key: string]: unknown;
}

function arrowMarker(): EdgeMarker {
  return {
    type: MarkerType.ArrowClosed,
    width: 18,
    height: 18,
  };
}

export const DEFAULT_ANIMATION_SPEED = 1.5;
export const DEFAULT_ANIMATION_DOTS = 3;

export const DOT_COLOR_PRESETS: { hex: string; label: string }[] = [
  { hex: '#3b7dee', label: 'Blue' },
  { hex: '#7c6cf0', label: 'Violet' },
  { hex: '#12b981', label: 'Green' },
  { hex: '#ea7a2a', label: 'Orange' },
  { hex: '#e05656', label: 'Red' },
  { hex: '#c9a227', label: 'Gold' },
  { hex: '#06b6d4', label: 'Cyan' },
  { hex: '#e8edf7', label: 'White' },
  { hex: '#1a2030', label: 'Black' },
];

export function dotColorLabel(hex: string): string {
  if (!hex) return 'Default';
  return DOT_COLOR_PRESETS.find((c) => c.hex === hex)?.label ?? 'Custom';
}

export function clampAnimationSpeed(value: unknown): number {
  const n = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(n)) return DEFAULT_ANIMATION_SPEED;
  return Math.min(8, Math.max(0.3, n));
}

export function clampAnimationDots(value: unknown): number {
  const n = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(n)) return DEFAULT_ANIMATION_DOTS;
  return Math.min(8, Math.max(1, Math.round(n)));
}

export function normalizeAnimationDotColor(value: unknown): string {
  if (typeof value !== 'string') return '';
  const v = value.trim();
  if (/^#[0-9a-fA-F]{6}$/.test(v)) return v.toLowerCase();
  if (/^#[0-9a-fA-F]{3}$/.test(v)) {
    const r = v[1];
    const g = v[2];
    const b = v[3];
    return `#${r}${r}${g}${g}${b}${b}`.toLowerCase();
  }
  return '';
}

export function defaultEdgeData(): InfraEdgeData {
  return {
    direction: 'forward',
    lineStyle: 'solid',
    animated: false,
    animationSpeed: DEFAULT_ANIMATION_SPEED,
    animationDots: DEFAULT_ANIMATION_DOTS,
    animationDotColor: '',
  };
}

export function readEdgeData(edge: Pick<Edge, 'data'> | undefined): InfraEdgeData {
  const data = (edge?.data ?? {}) as Partial<InfraEdgeData>;
  return {
    direction:
      data.direction === 'back' ||
      data.direction === 'both' ||
      data.direction === 'sync' ||
      data.direction === 'none'
        ? data.direction
        : 'forward',
    lineStyle: data.lineStyle === 'dashed' ? 'dashed' : 'solid',
    animated: Boolean(data.animated),
    animationSpeed: clampAnimationSpeed(data.animationSpeed),
    animationDots: clampAnimationDots(data.animationDots),
    animationDotColor: normalizeAnimationDotColor(data.animationDotColor),
  };
}

export function isSyncDirection(direction: EdgeDirection): boolean {
  return direction === 'sync';
}

export function markersForDirection(direction: EdgeDirection): {
  markerStart: EdgeMarker | undefined;
  markerEnd: EdgeMarker | undefined;
} {
  if (direction === 'sync') {
    return { markerStart: undefined, markerEnd: undefined };
  }
  return {
    markerStart: direction === 'back' || direction === 'both' ? arrowMarker() : undefined,
    markerEnd: direction === 'forward' || direction === 'both' ? arrowMarker() : undefined,
  };
}

export function syncLaneOffset(
  sourceX: number,
  sourceY: number,
  targetX: number,
  targetY: number,
  gap = 10,
): { x: number; y: number } {
  const dx = targetX - sourceX;
  const dy = targetY - sourceY;
  if (Math.abs(dx) >= Math.abs(dy)) return { x: 0, y: gap };
  return { x: gap, y: 0 };
}

export function withEdgeDirection(edge: Edge, direction: EdgeDirection): Partial<Edge> {
  return {
    data: { ...edge.data, direction },
    ...markersForDirection(direction),
  };
}
