import type { ThemeMode, SavedDiagram, SavedCustomComponent } from './types';

const DIAGRAMS_KEY = 'infra-designer-diagrams';
const THEME_KEY = 'infra-designer-theme';
const CUSTOMS_KEY = 'infra-designer-custom-components';

export function loadDiagrams(): SavedDiagram[] {
  try {
    const raw = localStorage.getItem(DIAGRAMS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as SavedDiagram[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function persistDiagrams(diagrams: SavedDiagram[]): void {
  localStorage.setItem(DIAGRAMS_KEY, JSON.stringify(diagrams));
}

export function loadCustomComponents(): SavedCustomComponent[] {
  try {
    const raw = localStorage.getItem(CUSTOMS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as SavedCustomComponent[];
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((item) => {
        if (!item || typeof item !== 'object' || !item.id || !item.name) return null;
        return {
          id: String(item.id),
          name: String(item.name).trim() || 'Custom',
          label: String(item.label ?? item.name).trim() || 'Custom',
          notes: String(item.notes ?? ''),
          config: item.config && typeof item.config === 'object' ? { ...item.config } : {},
        };
      })
      .filter((item): item is SavedCustomComponent => item !== null);
  } catch {
    return [];
  }
}

export function persistCustomComponents(items: SavedCustomComponent[]): void {
  localStorage.setItem(CUSTOMS_KEY, JSON.stringify(items));
}

export function loadTheme(): ThemeMode {
  const value = localStorage.getItem(THEME_KEY);
  return value === 'light' || value === 'dark' ? value : 'dark';
}

export function persistTheme(theme: ThemeMode): void {
  localStorage.setItem(THEME_KEY, theme);
  document.documentElement.setAttribute('data-theme', theme);
}

export function applyTheme(theme: ThemeMode): void {
  document.documentElement.setAttribute('data-theme', theme);
}
