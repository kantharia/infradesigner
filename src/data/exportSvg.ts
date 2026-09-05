import { getSmoothStepPath, Position, type Edge, type Node, type Viewport } from '@xyflow/react';
import type { InfraNodeData } from '../store/types';
import { useCanvasStore } from '../store/canvasStore';
import {
  childCountLabel,
  collectSubtreeIds,
  getAbsPosition,
  getNodeSize,
  GROUP_HEADER,
  sortParentsFirst,
} from './containment';
import { displayTypeLabel, fillFromConfig, hexToRgba } from './appearance';
import { COMPONENT_CATALOGUE } from './components';
import { parseHandleId } from './joints';
import {
  DEFAULT_ANIMATION_DOTS,
  isSyncDirection,
  readEdgeData,
  syncLaneOffset,
  type InfraEdgeData,
} from './edgeProps';
import { visibleNodeProperties } from './configSchemas';
import { downloadTextFile } from './importInfra';

function esc(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function safeColor(value: string, fallback: string): string {
  const v = value.trim();
  if (/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/.test(v)) return v;
  if (/^rgba?\([\d.\s,%]+\)$/.test(v)) return v;
  return fallback;
}

function safePath(path: string): string {
  return path.replace(/[^MLHVCSQTAZmlhvcsqtaz0-9eE.,\s+-]/g, ' ').replace(/\s+/g, ' ').trim();
}

function cssVar(name: string, fallback: string): string {
  if (typeof document === 'undefined') return fallback;
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fallback;
}

function catHex(category: string): string {
  return cssVar(`--cat-${category}`, '') || '#3b7dee';
}

function tintHex(hex: string, opacityPct: number): string {
  const v = safeColor(hex, '#3b7dee');
  if (!/^#[0-9a-fA-F]{6}$/.test(v)) return hexToRgba('#3b7dee', opacityPct);
  return hexToRgba(v, opacityPct);
}

function roundCoord(n: number): number {
  return Math.round(n * 100) / 100;
}

const LEAF_CARD_H = 64;
const CHIP_H = 17;
const CHIP_GAP = 4;
const CHIP_PAD_X = 7;
const GRID_GAP = 24;
const SAFE_PAD_SELECTION = 40;
const SAFE_PAD_CANVAS = 80;
const EXPORT_LOOP_SEC = 5;

interface ChipBox {
  text: string;
  x: number;
  y: number;
  w: number;
  h: number;
}

interface LayoutBox {
  node: Node<InfraNodeData>;
  abs: { x: number; y: number };
  width: number;
  height: number;
  cardW: number;
  cardH: number;
  headerH: number;
  chips: ChipBox[];
}

let measureCtx: CanvasRenderingContext2D | null | undefined;

function measureText(text: string, fontSize: number, weight = '400'): number {
  if (typeof document !== 'undefined') {
    if (measureCtx === undefined) {
      measureCtx = document.createElement('canvas').getContext('2d');
    }
    if (measureCtx) {
      measureCtx.font = `${weight} ${fontSize}px Inter, system-ui, sans-serif`;
      return Math.ceil(measureCtx.measureText(text).width);
    }
  }
  return Math.ceil(text.length * fontSize * 0.58);
}

function wrapChips(texts: string[], maxWidth: number, y0: number): ChipBox[] {
  const chips: ChipBox[] = [];
  let x = 4;
  let y = y0;
  for (const text of texts) {
    const w = Math.min(maxWidth, measureText(text, 10) + CHIP_PAD_X * 2);
    if (x > 4 && x + w > maxWidth) {
      x = 4;
      y += CHIP_H + CHIP_GAP;
    }
    chips.push({ text, x, y, w, h: CHIP_H });
    x += w + CHIP_GAP;
  }
  return chips;
}

function svgArrow(x: number, y: number, position: Position, color: string): string {
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
  return `<polygon points="${points}" fill="${color}" stroke="${color}" stroke-linejoin="round"/>`;
}

function smoothStep(
  s: { x: number; y: number; position: Position },
  t: { x: number; y: number; position: Position },
): { d: string; labelX: number; labelY: number } {
  const [raw, labelX, labelY] = getSmoothStepPath({
    sourceX: s.x,
    sourceY: s.y,
    targetX: t.x,
    targetY: t.y,
    sourcePosition: s.position,
    targetPosition: t.position,
  });
  return { d: safePath(raw), labelX: roundCoord(labelX), labelY: roundCoord(labelY) };
}

function handleAnchor(
  abs: { x: number; y: number },
  size: { width: number; height: number },
  handleId: string | null | undefined,
): { x: number; y: number; position: Position } {
  const { side, facing } = parseHandleId(handleId);
  const inset = facing === 'in' ? 12 : 0;
  switch (side) {
    case 'top':
      return { x: abs.x + size.width / 2, y: abs.y + inset, position: facing === 'in' ? Position.Bottom : Position.Top };
    case 'bottom':
      return {
        x: abs.x + size.width / 2,
        y: abs.y + size.height - inset,
        position: facing === 'in' ? Position.Top : Position.Bottom,
      };
    case 'left':
      return { x: abs.x + inset, y: abs.y + size.height / 2, position: facing === 'in' ? Position.Right : Position.Left };
    default:
      return {
        x: abs.x + size.width - inset,
        y: abs.y + size.height / 2,
        position: facing === 'in' ? Position.Left : Position.Right,
      };
  }
}

function screenToFlow(clientX: number, clientY: number, viewport: Viewport): { x: number; y: number } | null {
  const pane = document.querySelector('.react-flow');
  if (!pane) return null;
  const r = pane.getBoundingClientRect();
  const zoom = viewport.zoom || 1;
  return {
    x: (clientX - r.left - viewport.x) / zoom,
    y: (clientY - r.top - viewport.y) / zoom,
  };
}

function nodeEl(id: string): HTMLElement | null {
  return document.querySelector(`.react-flow__node[data-id="${CSS.escape(id)}"]`);
}

function liveHandle(
  nodeId: string,
  handleId: string | null | undefined,
  fallback: { x: number; y: number; position: Position },
  viewport: Viewport,
): { x: number; y: number; position: Position } {
  const sel = handleId
    ? `.react-flow__node[data-id="${CSS.escape(nodeId)}"] .react-flow__handle[data-handleid="${CSS.escape(handleId)}"]`
    : `.react-flow__node[data-id="${CSS.escape(nodeId)}"] .react-flow__handle`;
  const el = document.querySelector(sel);
  if (!el) return fallback;
  const box = el.getBoundingClientRect();
  const flow = screenToFlow(box.left + box.width / 2, box.top + box.height / 2, viewport);
  return flow ? { x: flow.x, y: flow.y, position: fallback.position } : fallback;
}

function applyPaint(from: Element, to: Element): void {
  const cs = getComputedStyle(from);
  const tag = to.tagName.toLowerCase();
  const paintable = ['path', 'polygon', 'circle', 'line', 'rect', 'polyline', 'text', 'tspan'].includes(tag);
  if (tag === 'svg' || tag === 'g') {
    to.removeAttribute('marker-start');
    to.removeAttribute('marker-end');
    to.removeAttribute('style');
    to.removeAttribute('class');
    return;
  }
  if (!paintable) return;
  const fill = cs.fill;
  const stroke = cs.stroke;
  if (fill && !fill.includes('url(')) {
    to.setAttribute('fill', fill === 'none' || fill === 'rgba(0, 0, 0, 0)' ? 'none' : fill);
  }
  if (stroke && !stroke.includes('url(')) {
    to.setAttribute('stroke', stroke === 'none' || stroke === 'rgba(0, 0, 0, 0)' ? 'none' : stroke);
  }
  const sw = parseFloat(cs.strokeWidth);
  if (Number.isFinite(sw) && sw > 0 && tag !== 'g' && tag !== 'svg' && tag !== 'text') {
    to.setAttribute('stroke-width', String(sw));
  }
  if (cs.strokeLinecap && cs.strokeLinecap !== 'butt') to.setAttribute('stroke-linecap', cs.strokeLinecap);
  if (cs.strokeLinejoin && cs.strokeLinejoin !== 'miter') to.setAttribute('stroke-linejoin', cs.strokeLinejoin);
  if (cs.strokeDasharray && cs.strokeDasharray !== 'none') to.setAttribute('stroke-dasharray', cs.strokeDasharray);
  if (tag === 'text' || tag === 'tspan') {
    if (cs.fontSize) to.setAttribute('font-size', cs.fontSize);
    if (cs.fontWeight) to.setAttribute('font-weight', cs.fontWeight);
    if (cs.fontFamily) to.setAttribute('font-family', cs.fontFamily);
    if (fill && fill !== 'none') to.setAttribute('fill', fill);
  }
  to.removeAttribute('marker-start');
  to.removeAttribute('marker-end');
  to.removeAttribute('style');
  to.removeAttribute('class');
}

function snapshotGroup(live: SVGElement): { html: string; pathDs: string[] } {
  const clone = live.cloneNode(true) as SVGElement;
  const liveEls = [live, ...live.querySelectorAll('*')];
  const cloneEls = [clone, ...clone.querySelectorAll('*')];
  for (let i = 0; i < liveEls.length && i < cloneEls.length; i += 1) {
    applyPaint(liveEls[i], cloneEls[i]);
  }
  for (const c of [...clone.querySelectorAll('circle')]) c.remove();
  const pathDs: string[] = [];
  for (const p of [...clone.querySelectorAll('path')]) {
    const stroke = (p.getAttribute('stroke') || '').toLowerCase();
    const width = Number.parseFloat(p.getAttribute('stroke-width') || '0');
    if (stroke === 'transparent' || stroke === 'none' || width >= 18) {
      p.remove();
      continue;
    }
    const d = p.getAttribute('d');
    if (d) pathDs.push(d);
  }
  return { html: clone.innerHTML, pathDs };
}

function cloneNodeIcon(id: string, x: number, y: number, size: number): string {
  const host = nodeEl(id);
  if (!host) return '';
  const live = host.querySelector('.infra-node svg, .infra-group span svg, .infra-group svg') as SVGSVGElement | null;
  if (!live) return '';
  const clone = live.cloneNode(true) as SVGSVGElement;
  const liveEls = [live, ...live.querySelectorAll('*')];
  const cloneEls = [clone, ...clone.querySelectorAll('*')];
  for (let i = 0; i < liveEls.length && i < cloneEls.length; i += 1) {
    applyPaint(liveEls[i], cloneEls[i]);
  }
  clone.setAttribute('x', String(roundCoord(x)));
  clone.setAttribute('y', String(roundCoord(y)));
  clone.setAttribute('width', String(size));
  clone.setAttribute('height', String(size));
  clone.setAttribute('overflow', 'visible');
  clone.removeAttribute('style');
  clone.removeAttribute('class');
  return clone.outerHTML;
}

function liveChips(nodeId: string, nodeAbs: { x: number; y: number }, viewport: Viewport): ChipBox[] {
  const host = nodeEl(nodeId);
  const strip = host?.querySelector('.infra-node')?.nextElementSibling as HTMLElement | null;
  if (!strip) return [];
  const chips: ChipBox[] = [];
  for (const span of strip.querySelectorAll(':scope > span')) {
    const box = span.getBoundingClientRect();
    const flow = screenToFlow(box.left, box.top, viewport);
    if (!flow) continue;
    chips.push({
      text: (span.textContent ?? '').trim(),
      x: flow.x - nodeAbs.x,
      y: flow.y - nodeAbs.y,
      w: box.width / (viewport.zoom || 1),
      h: box.height / (viewport.zoom || 1),
    });
  }
  return chips;
}

function selectionSet(nodes: Node<InfraNodeData>[], edges: Edge[]): {
  nodeIds: Set<string>;
  nodes: Node<InfraNodeData>[];
  edges: Edge[];
  fullCanvas: boolean;
} {
  const selected = nodes.filter((n) => n.selected);
  const nodeIds = new Set<string>();
  if (selected.length > 0) {
    for (const n of selected) {
      for (const id of collectSubtreeIds(n.id, nodes)) nodeIds.add(id);
    }
  }
  for (const e of edges) {
    if (!e.selected) continue;
    nodeIds.add(e.source);
    nodeIds.add(e.target);
  }
  if (nodeIds.size === 0) {
    return { nodeIds: new Set(nodes.map((n) => n.id)), nodes, edges, fullCanvas: true };
  }
  return {
    nodeIds,
    nodes: nodes.filter((n) => nodeIds.has(n.id)),
    edges: edges.filter((e) => nodeIds.has(e.source) && nodeIds.has(e.target)),
    fullCanvas: false,
  };
}

function animatedDots(d: string, meta: InfraEdgeData, color: string, reverse: boolean): string {
  const fill = safeColor(color, '#3b7dee');
  const path = safePath(d);
  if (!path) return '';
  const count = meta.animated ? meta.animationDots : DEFAULT_ANIMATION_DOTS;
  const dots: string[] = [];
  const motion = (rev: boolean, begin: string) => {
    const keys = rev ? ' keyPoints="1;0" keyTimes="0;1" calcMode="linear"' : '';
    return `<circle r="2.75" fill="${fill}"><animateMotion dur="${EXPORT_LOOP_SEC}s" begin="${begin}s" repeatCount="indefinite" rotate="0"${keys} path="${path}"/></circle>`;
  };
  for (let i = 0; i < count; i += 1) {
    dots.push(motion(reverse, (-(EXPORT_LOOP_SEC / count) * i).toFixed(3)));
  }
  if (meta.direction === 'both' && !reverse) {
    for (let i = 0; i < count; i += 1) {
      dots.push(motion(true, (-(EXPORT_LOOP_SEC / count) * i).toFixed(3)));
    }
  }
  return dots.join('\n');
}

export function downloadSelectionSvg(
  allNodes: Node<InfraNodeData>[],
  allEdges: Edge[],
  filename = 'selection.svg',
): boolean {
  const picked = selectionSet(allNodes, allEdges);
  if (picked.nodes.length === 0) {
    window.alert('Nothing to export yet. Add a component first.');
    return false;
  }

  const viewport = useCanvasStore.getState().viewport;
  const colors = {
    canvas: safeColor(cssVar('--canvas-bg', '#f3f5fa'), '#f3f5fa'),
    grid: safeColor(cssVar('--canvas-dot', '#cfd6e6'), '#cfd6e6'),
    nodeBg: safeColor(cssVar('--node-bg', '#ffffff'), '#ffffff'),
    surface3: safeColor(cssVar('--surface-3', '#e8ecf4'), '#e8ecf4'),
    border: safeColor(cssVar('--node-border', '#d4dbe8'), '#d4dbe8'),
    text: safeColor(cssVar('--text-primary', '#1a2030'), '#1a2030'),
    muted: safeColor(cssVar('--text-secondary', '#5c667a'), '#5c667a'),
    mutedSoft: safeColor(cssVar('--text-muted', '#8b93a7'), '#8b93a7'),
    edge: safeColor(cssVar('--edge-color', '#a3acbb'), '#a3acbb'),
    sync: safeColor(cssVar('--edge-sync', '#0f9d8e'), '#0f9d8e'),
    animated: safeColor(cssVar('--edge-animated', '#3b7dee'), '#3b7dee'),
    font: 'Inter, system-ui, sans-serif',
  };

  const layout: LayoutBox[] = picked.nodes.map((node) => {
    const stored = getAbsPosition(node, allNodes);
    const host = nodeEl(node.id);
    const rect = host?.getBoundingClientRect();
    const livePos = rect ? screenToFlow(rect.left, rect.top, viewport) : null;
    const abs = livePos ?? stored;
    const size = getNodeSize(node);
    const isGroup = node.type === 'infraGroup';
    const card = host?.querySelector('.infra-node') as HTMLElement | null;
    if (isGroup) {
      const w = host?.offsetWidth || size.width;
      const h = host?.offsetHeight || size.height;
      return { node, abs, width: w, height: h, cardW: w, cardH: h, headerH: GROUP_HEADER, chips: [] };
    }
    const cardW = card?.offsetWidth || size.width || 188;
    const cardH = card?.offsetHeight || LEAF_CARD_H;
    const fromDom = liveChips(node.id, abs, viewport);
    const chipTexts = visibleNodeProperties(
      String(node.data.componentId),
      node.data.config,
      node.data.notes,
    ).map((c) => c.text);
    const chips = fromDom.length ? fromDom : wrapChips(chipTexts, Math.min(220, cardW), cardH + 6);
    const bottom = chips.reduce((m, c) => Math.max(m, c.y + c.h), cardH);
    return { node, abs, width: cardW, height: bottom, cardW, cardH, headerH: 0, chips };
  });

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const box of layout) {
    minX = Math.min(minX, box.abs.x);
    minY = Math.min(minY, box.abs.y);
    maxX = Math.max(maxX, box.abs.x + box.width);
    maxY = Math.max(maxY, box.abs.y + box.height);
  }
  const pad = picked.fullCanvas ? SAFE_PAD_CANVAS : SAFE_PAD_SELECTION;
  const originX = minX - pad;
  const originY = minY - pad;
  const width = maxX - minX + pad * 2;
  const height = maxY - minY + pad * 2;

  const parts: string[] = [];
  parts.push('<?xml version="1.0" encoding="UTF-8"?>');
  parts.push(
    `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${Math.round(width)}" height="${Math.round(height)}" viewBox="0 0 ${width} ${height}" shape-rendering="geometricPrecision">`,
  );
  parts.push(
    `<defs><pattern id="canvas-dots" width="${GRID_GAP}" height="${GRID_GAP}" patternUnits="userSpaceOnUse"><circle cx="1.2" cy="1.2" r="1.1" fill="${colors.grid}"/></pattern></defs>`,
  );
  parts.push(`<rect width="100%" height="100%" fill="${colors.canvas}"/>`);
  parts.push(`<rect width="100%" height="100%" fill="url(#canvas-dots)"/>`);

  const groupsToDraw = sortParentsFirst(layout.filter((l) => l.node.type === 'infraGroup').map((l) => l.node));
  for (const groupNode of groupsToDraw) {
    const box = layout.find((l) => l.node.id === groupNode.id);
    if (!box) continue;
    const x = box.abs.x - originX;
    const y = box.abs.y - originY;
    const accent =
      groupNode.data.config?.accent && groupNode.data.config.accent !== 'default'
        ? catHex(groupNode.data.config.accent)
        : catHex(String(groupNode.data.category));
    const stroke = safeColor(accent, colors.edge);
    const isBoundary = groupNode.data.componentId === 'boundary';
    const rx = isBoundary ? 18 : 12;
    const headerH = box.headerH;
    const nested = allNodes.filter((n) => n.parentId === groupNode.id).length;
    const groupFill = isBoundary ? 'none' : fillFromConfig(groupNode.data.config, tintHex(stroke, 12), 18);
    const dotSize = Math.min(12, Math.max(1, Number(groupNode.data.config?.dotSize) || 3));
    const dash = isBoundary
      ? ` stroke-linecap="round" stroke-dasharray="0 ${dotSize * 2}"`
      : ' stroke-dasharray="6 4"';
    parts.push(
      `<rect x="${roundCoord(x)}" y="${roundCoord(y)}" width="${roundCoord(box.width)}" height="${roundCoord(box.height)}" rx="${rx}" fill="${groupFill}" stroke="${stroke}" stroke-width="${isBoundary ? dotSize : 1}"${dash}/>`,
    );
    if (!isBoundary) {
      parts.push(
        `<path d="M${roundCoord(x)},${roundCoord(y + headerH)} L${roundCoord(x)},${roundCoord(y + rx)} Q${roundCoord(x)},${roundCoord(y)} ${roundCoord(x + rx)},${roundCoord(y)} L${roundCoord(x + box.width - rx)},${roundCoord(y)} Q${roundCoord(x + box.width)},${roundCoord(y)} ${roundCoord(x + box.width)},${roundCoord(y + rx)} L${roundCoord(x + box.width)},${roundCoord(y + headerH)} Z" fill="${colors.nodeBg}"/>`,
      );
      parts.push(
        `<line x1="${roundCoord(x)}" y1="${roundCoord(y + headerH)}" x2="${roundCoord(x + box.width)}" y2="${roundCoord(y + headerH)}" stroke="${colors.border}" stroke-width="1"/>`,
      );
      parts.push(`<rect x="${roundCoord(x)}" y="${roundCoord(y)}" width="3" height="${headerH}" rx="1" fill="${stroke}"/>`);
      parts.push(
        `<rect x="${roundCoord(x + 14)}" y="${roundCoord(y + 8)}" width="24" height="24" rx="5" fill="${colors.surface3}" stroke="${colors.border}"/>`,
      );
      const icon = cloneNodeIcon(groupNode.id, x + 18, y + 12, 16);
      if (icon) parts.push(icon);
    }
    const titleX = isBoundary ? x + 14 : x + 46;
    parts.push(
      `<text x="${roundCoord(titleX)}" y="${roundCoord(y + (isBoundary ? 22 : headerH / 2 + 5))}" font-family="${colors.font}" font-size="13" font-weight="600" fill="${colors.text}">${esc(String(groupNode.data.label))}</text>`,
    );
    parts.push(
      `<text x="${roundCoord(x + box.width - 12)}" y="${roundCoord(y + (isBoundary ? 22 : headerH / 2 + 4))}" text-anchor="end" font-family="${colors.font}" font-size="10" fill="${colors.mutedSoft}">${esc(childCountLabel(nested))}</text>`,
    );
  }

  const clonedIds = new Set<string>();
  for (const g of document.querySelectorAll<SVGGElement>('.react-flow__edge')) {
    const id = g.getAttribute('data-id') ?? '';
    const edge = picked.edges.find((e) => e.id === id);
    if (!edge) continue;
    const snap = snapshotGroup(g);
    if (!snap.html.trim()) continue;
    clonedIds.add(id);
    const meta = readEdgeData(edge);
    const sync = isSyncDirection(meta.direction);
    const motionColor = meta.animationDotColor || (sync ? colors.sync : colors.animated);
    const extras = meta.animated
      ? snap.pathDs.map((d) => animatedDots(d, meta, motionColor, false)).join('\n')
      : '';
    parts.push(
      `<g transform="translate(${roundCoord(-originX)} ${roundCoord(-originY)})">${snap.html}${extras}</g>`,
    );
  }

  for (const edge of picked.edges) {
    const source = layout.find((l) => l.node.id === edge.source);
    const target = layout.find((l) => l.node.id === edge.target);
    if (!source || !target) continue;
    const s0 = handleAnchor(source.abs, { width: source.cardW, height: source.cardH }, edge.sourceHandle);
    const t0 = handleAnchor(target.abs, { width: target.cardW, height: target.cardH }, edge.targetHandle);
    const sLive = liveHandle(edge.source, edge.sourceHandle, s0, viewport);
    const tLive = liveHandle(edge.target, edge.targetHandle, t0, viewport);
    const s = { ...sLive, x: roundCoord(sLive.x - originX), y: roundCoord(sLive.y - originY) };
    const t = { ...tLive, x: roundCoord(tLive.x - originX), y: roundCoord(tLive.y - originY) };
    const meta = readEdgeData(edge);
    const sync = isSyncDirection(meta.direction);
    const stroke = sync ? colors.sync : colors.edge;
    const dashed = meta.lineStyle === 'dashed';
    const dash = dashed
      ? ` stroke-dasharray="${sync ? '7 5' : '5 5'}" stroke-linecap="butt"`
      : ' stroke-linecap="round"';
    const center = smoothStep(s, t);
    const already = clonedIds.has(edge.id);

    if (already) continue;

    if (sync) {
      const off = syncLaneOffset(s.x, s.y, t.x, t.y);
      const fwd = {
        s: { x: roundCoord(s.x + off.x), y: roundCoord(s.y + off.y), position: s.position },
        t: { x: roundCoord(t.x + off.x), y: roundCoord(t.y + off.y), position: t.position },
      };
      const rev = {
        s: { x: roundCoord(t.x - off.x), y: roundCoord(t.y - off.y), position: t.position },
        t: { x: roundCoord(s.x - off.x), y: roundCoord(s.y - off.y), position: s.position },
      };
      const fwdPath = smoothStep(fwd.s, fwd.t);
      const revPath = smoothStep(rev.s, rev.t);
      parts.push(
        `<path d="${fwdPath.d}" fill="none" stroke="${stroke}" stroke-width="1.35" stroke-linejoin="round"${dash}/>`,
      );
      parts.push(
        `<path d="${revPath.d}" fill="none" stroke="${stroke}" stroke-width="1.35" stroke-linejoin="round"${dash}/>`,
      );
      parts.push(svgArrow(fwd.t.x, fwd.t.y, fwd.t.position, stroke));
      parts.push(svgArrow(rev.t.x, rev.t.y, rev.t.position, stroke));
      if (meta.animated) {
        const color = meta.animationDotColor || stroke;
        parts.push(animatedDots(fwdPath.d, meta, color, false));
        parts.push(animatedDots(revPath.d, meta, color, false));
      }
    } else {
      parts.push(
        `<path d="${center.d}" fill="none" stroke="${stroke}" stroke-width="1.5" stroke-linejoin="round"${dash}/>`,
      );
      if (meta.direction === 'forward' || meta.direction === 'both') parts.push(svgArrow(t.x, t.y, t.position, stroke));
      if (meta.direction === 'back' || meta.direction === 'both') parts.push(svgArrow(s.x, s.y, s.position, stroke));
      if (meta.animated) {
        parts.push(
          animatedDots(center.d, meta, meta.animationDotColor || colors.animated, meta.direction === 'back'),
        );
      }
    }

    if (!sync) continue;
    const label = edge.label != null ? String(edge.label) : 'sync';
    const shown = `⇄  ${label}`;
    const labelW = Math.max(64, measureText(shown, 11, '600') + 18);
    parts.push(
      `<rect x="${roundCoord(center.labelX - labelW / 2 - 4)}" y="${roundCoord(center.labelY - 15)}" width="${labelW + 8}" height="30" rx="8" fill="${colors.canvas}"/>`,
    );
    parts.push(
      `<rect x="${roundCoord(center.labelX - labelW / 2)}" y="${roundCoord(center.labelY - 11)}" width="${labelW}" height="22" rx="6" fill="${colors.nodeBg}" stroke="${colors.border}"/>`,
    );
    parts.push(
      `<text x="${center.labelX}" y="${roundCoord(center.labelY + 4)}" text-anchor="middle" font-family="${colors.font}" font-size="11" font-weight="600" fill="${colors.text}">${esc(shown)}</text>`,
    );
  }

  for (const chip of document.querySelectorAll<HTMLElement>('.infra-edge-chip')) {
    const text = (chip.textContent ?? '').trim();
    if (!text) continue;
    const box = chip.getBoundingClientRect();
    const flow = screenToFlow(box.left + box.width / 2, box.top + box.height / 2, viewport);
    if (!flow) continue;
    const midX = flow.x - originX;
    const midY = flow.y - originY;
    const w = box.width / (viewport.zoom || 1);
    const h = box.height / (viewport.zoom || 1);
    parts.push(
      `<rect x="${roundCoord(midX - w / 2)}" y="${roundCoord(midY - h / 2)}" width="${roundCoord(w)}" height="${roundCoord(h)}" rx="${h / 2}" fill="${colors.nodeBg}" stroke="${colors.border}"/>`,
    );
    parts.push(
      `<text x="${roundCoord(midX)}" y="${roundCoord(midY + 4)}" text-anchor="middle" font-family="${colors.font}" font-size="11" fill="${colors.muted}">${esc(text)}</text>`,
    );
  }

  for (const box of layout.filter((l) => l.node.type !== 'infraGroup')) {
    const x = box.abs.x - originX;
    const y = box.abs.y - originY;
    const node = box.node;
    const accent =
      node.data.config?.accent && node.data.config.accent !== 'default'
        ? catHex(node.data.config.accent)
        : catHex(String(node.data.category));
    const def = COMPONENT_CATALOGUE.find((c) => c.id === node.data.componentId);
    const typeName = displayTypeLabel(
      String(node.data.componentId),
      node.data.config,
      def?.name ?? String(node.data.componentId),
    );
    const accentHex = safeColor(accent, colors.animated);
    parts.push(
      `<rect x="${roundCoord(x)}" y="${roundCoord(y)}" width="${roundCoord(box.cardW)}" height="${roundCoord(box.cardH)}" rx="8" fill="${colors.nodeBg}" stroke="${colors.border}"/>`,
    );
    parts.push(
      `<rect x="${roundCoord(x)}" y="${roundCoord(y)}" width="3" height="${roundCoord(box.cardH)}" rx="1" fill="${accentHex}"/>`,
    );
    parts.push(
      `<rect x="${roundCoord(x + 20)}" y="${roundCoord(y + (box.cardH - 28) / 2)}" width="28" height="28" rx="6" fill="${colors.surface3}" stroke="${colors.border}"/>`,
    );
    const icon = cloneNodeIcon(node.id, x + 25, y + (box.cardH - 18) / 2, 18);
    if (icon) parts.push(icon);
    parts.push(
      `<text x="${roundCoord(x + 56)}" y="${roundCoord(y + box.cardH / 2 - 2)}" font-family="${colors.font}" font-size="13" font-weight="600" fill="${colors.text}">${esc(String(node.data.label))}</text>`,
    );
    parts.push(
      `<text x="${roundCoord(x + 56)}" y="${roundCoord(y + box.cardH / 2 + 14)}" font-family="${colors.font}" font-size="11" fill="${colors.muted}">${esc(typeName)}</text>`,
    );
    for (const chip of box.chips) {
      const cx = x + chip.x;
      const cy = y + chip.y;
      parts.push(
        `<rect x="${roundCoord(cx)}" y="${roundCoord(cy)}" width="${roundCoord(chip.w)}" height="${roundCoord(chip.h)}" rx="9" fill="${colors.nodeBg}" fill-opacity="0.85" stroke="${colors.border}" stroke-opacity="0.7"/>`,
      );
      parts.push(
        `<text x="${roundCoord(cx + CHIP_PAD_X)}" y="${roundCoord(cy + chip.h * 0.72)}" font-family="${colors.font}" font-size="10" fill="${colors.muted}">${esc(chip.text)}</text>`,
      );
    }
  }

  parts.push('</svg>');
  downloadTextFile(filename, parts.join('\n'), 'image/svg+xml;charset=utf-8');
  return true;
}
