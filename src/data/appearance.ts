import { normalizeAnimationDotColor } from './edgeProps';

export function clampOpacity(value: unknown, fallback = 100): number {
  if (value === '' || value === undefined || value === null) return fallback;
  const n = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(100, Math.max(0, n));
}

export function hexToRgba(hex: string, opacityPct: number): string {
  const h = hex.replace('#', '');
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${opacityPct / 100})`;
}

export function fillFromConfig(
  config: Record<string, string> | undefined,
  fallback: string,
  defaultOpacity = 100,
): string {
  const hex = normalizeAnimationDotColor(config?.fillColor);
  if (!hex) return fallback;
  return hexToRgba(hex, clampOpacity(config?.fillOpacity, defaultOpacity));
}

export function parseCustomKv(raw: string | undefined): { key: string; value: string }[] {
  if (!raw?.trim()) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((row) => {
        if (!row || typeof row !== 'object') return null;
        const rec = row as { key?: unknown; value?: unknown };
        const key = String(rec.key ?? '').trim();
        if (!key) return null;
        return { key, value: String(rec.value ?? '') };
      })
      .filter((row): row is { key: string; value: string } => row !== null);
  } catch {
    return [];
  }
}

export function stringifyCustomKv(rows: { key: string; value: string }[]): string {
  return JSON.stringify(rows.filter((r) => r.key.trim()));
}

export function displayTypeLabel(
  componentId: string,
  config: Record<string, string> | undefined,
  fallback: string,
): string {
  if (componentId === 'custom') {
    const custom = (config?.typeLabel ?? '').trim();
    if (custom) return custom;
  }
  return fallback;
}
