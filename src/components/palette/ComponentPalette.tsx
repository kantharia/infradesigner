import { useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import { CATEGORIES, COMPONENT_CATALOGUE } from '../../data/components';
import { PaletteCategory } from './PaletteCategory';
import { PaletteItem } from './PaletteItem';
import { useCanvasStore } from '../../store/canvasStore';

export function ComponentPalette() {
  const [query, setQuery] = useState('');
  const trimmed = query.trim().toLowerCase();
  const saved = useCanvasStore((s) => s.customComponents);
  const deleteCustomComponent = useCanvasStore((s) => s.deleteCustomComponent);

  const filtered = useMemo(() => {
    if (!trimmed) return COMPONENT_CATALOGUE;
    return COMPONENT_CATALOGUE.filter((c) => c.name.toLowerCase().includes(trimmed));
  }, [trimmed]);

  const savedFiltered = useMemo(() => {
    if (!trimmed) return saved;
    return saved.filter(
      (c) =>
        c.name.toLowerCase().includes(trimmed) ||
        c.label.toLowerCase().includes(trimmed),
    );
  }, [saved, trimmed]);

  return (
    <aside
      className="flex h-full flex-col overflow-hidden"
      style={{
        width: 240,
        background: 'var(--surface-1)',
        borderRight: '1px solid var(--surface-border)',
      }}
    >
      <div style={{ padding: 'var(--sp-3)' }}>
        <div className="relative">
          <Search
            size={14}
            style={{
              position: 'absolute',
              left: 10,
              top: '50%',
              transform: 'translateY(-50%)',
              color: 'var(--text-muted)',
              pointerEvents: 'none',
            }}
          />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search components"
            className="w-full outline-none"
            style={{
              background: 'var(--surface-2)',
              color: 'var(--text-primary)',
              fontSize: 'var(--text-sm)',
              fontFamily: 'var(--font-ui)',
              border: '1px solid var(--surface-border)',
              borderRadius: 6,
              padding: '8px 10px 8px 30px',
            }}
          />
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto" style={{ padding: '0 var(--sp-2) var(--sp-4)' }}>
        {trimmed ? (
          <div className="flex flex-col">
            {filtered.map((item) => (
              <PaletteItem key={item.id} component={item} />
            ))}
            {savedFiltered.map((item) => (
              <PaletteItem
                key={item.id}
                presetId={item.id}
                component={{
                  id: 'custom',
                  name: item.name,
                  category: 'custom',
                  description: item.label,
                  icon: item.config.iconName || 'Shapes',
                  defaultLabel: item.label,
                }}
                onDelete={() => deleteCustomComponent(item.id)}
              />
            ))}
            {filtered.length === 0 && savedFiltered.length === 0 ? (
              <div
                style={{
                  color: 'var(--text-muted)',
                  fontSize: 'var(--text-sm)',
                  padding: 'var(--sp-3)',
                }}
              >
                No matches
              </div>
            ) : null}
          </div>
        ) : (
          <>
            {CATEGORIES.map((cat) => (
              <PaletteCategory
                key={cat.id}
                id={cat.id}
                label={cat.label}
                items={COMPONENT_CATALOGUE.filter((c) => c.category === cat.id)}
              />
            ))}
            {saved.length > 0 ? (
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
                  Saved
                </div>
                <div className="flex flex-col">
                  {saved.map((item) => (
                    <PaletteItem
                      key={item.id}
                      presetId={item.id}
                      component={{
                        id: 'custom',
                        name: item.name,
                        category: 'custom',
                        description: item.label,
                        icon: item.config.iconName || 'Shapes',
                        defaultLabel: item.label,
                      }}
                      onDelete={() => deleteCustomComponent(item.id)}
                    />
                  ))}
                </div>
              </div>
            ) : null}
          </>
        )}
      </div>
    </aside>
  );
}
