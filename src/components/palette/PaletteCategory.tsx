import type { ComponentCategory, ComponentDefinition } from '../../data/components';
import { PaletteItem } from './PaletteItem';

interface PaletteCategoryProps {
  id: ComponentCategory;
  label: string;
  items: ComponentDefinition[];
}

export function PaletteCategory({ label, items }: PaletteCategoryProps) {
  if (items.length === 0) return null;

  return (
    <div className="flex flex-col" style={{ gap: 'var(--sp-1)', marginBottom: 'var(--sp-4)' }}>
      <div
        style={{
          color: 'var(--text-muted)',
          fontSize: 'var(--text-xs)',
          fontFamily: 'var(--font-ui)',
          textTransform: 'uppercase',
          letterSpacing: '0.08em',
          padding: '0 var(--sp-3)',
        }}
      >
        {label}
      </div>
      <div className="flex flex-col">
        {items.map((item) => (
          <PaletteItem key={item.id} component={item} />
        ))}
      </div>
    </div>
  );
}
