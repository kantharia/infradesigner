import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { ChevronDown } from 'lucide-react';
import { DOT_COLOR_PRESETS, dotColorLabel } from '../../data/edgeProps';

function ColorSwatch({ hex, size = 14 }: { hex: string; size?: number }) {
  return (
    <span
      style={{
        width: size,
        height: size,
        flexShrink: 0,
        borderRadius: 4,
        background: hex || 'var(--edge-animated)',
        border: '1px solid var(--surface-border)',
      }}
    />
  );
}

export function ColorDropdown({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (hex: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const [menuPos, setMenuPos] = useState({ top: 0, left: 0, width: 0 });
  const options = [{ hex: '', label: 'Default' }, ...DOT_COLOR_PRESETS];

  useEffect(() => {
    if (!open) return;
    const onDoc = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const place = () => {
      const box = rootRef.current?.querySelector('button')?.getBoundingClientRect();
      if (!box) return;
      setMenuPos({ top: box.bottom + 4, left: box.left, width: box.width });
    };
    place();
    document.addEventListener('mousedown', onDoc);
    window.addEventListener('resize', place);
    window.addEventListener('scroll', place, true);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      window.removeEventListener('resize', place);
      window.removeEventListener('scroll', place, true);
    };
  }, [open]);

  const trigger: CSSProperties = {
    width: '100%',
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    background: 'var(--surface-2)',
    color: 'var(--text-primary)',
    border: '1px solid var(--surface-border)',
    borderRadius: 6,
    fontSize: 'var(--text-sm)',
    fontFamily: 'var(--font-ui)',
    padding: '6px 8px',
    cursor: 'pointer',
    textAlign: 'left',
  };

  return (
    <div ref={rootRef} className="relative flex flex-col" style={{ gap: 4 }}>
      <span style={{ color: 'var(--text-muted)', fontSize: 'var(--text-xs)' }}>{label}</span>
      <button type="button" onClick={() => setOpen((v) => !v)} style={trigger}>
        <ColorSwatch hex={value} />
        <span className="min-w-0 flex-1 truncate">{dotColorLabel(value)}</span>
        <ChevronDown size={14} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
      </button>
      {open ? (
        <div
          style={{
            position: 'fixed',
            top: menuPos.top,
            left: menuPos.left,
            width: menuPos.width,
            zIndex: 60,
            background: 'var(--surface-1)',
            border: '1px solid var(--surface-border)',
            borderRadius: 8,
            padding: 4,
            maxHeight: 280,
            overflowY: 'auto',
            boxShadow: '0 8px 24px rgba(0, 0, 0, 0.18)',
          }}
        >
          {options.map((opt) => (
            <button
              key={opt.label}
              type="button"
              onClick={() => {
                onChange(opt.hex);
                setOpen(false);
              }}
              style={{
                ...trigger,
                border: 'none',
                background: value === opt.hex ? 'var(--surface-3)' : 'transparent',
                borderRadius: 6,
              }}
            >
              <ColorSwatch hex={opt.hex} />
              <span className="flex-1">{opt.label}</span>
            </button>
          ))}
          <label
            className="flex items-center"
            style={{
              gap: 8,
              padding: '6px 8px',
              color: 'var(--text-primary)',
              fontSize: 'var(--text-sm)',
              fontFamily: 'var(--font-ui)',
              cursor: 'pointer',
            }}
          >
            <input
              type="color"
              value={value || '#3b7dee'}
              onChange={(e) => onChange(e.target.value)}
              style={{
                width: 18,
                height: 18,
                padding: 0,
                border: '1px solid var(--surface-border)',
                borderRadius: 4,
                background: 'transparent',
                cursor: 'pointer',
              }}
            />
            Custom…
          </label>
        </div>
      ) : null}
    </div>
  );
}
