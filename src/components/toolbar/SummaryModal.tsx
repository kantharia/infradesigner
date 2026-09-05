import type { CSSProperties } from 'react';
import type { Node } from '@xyflow/react';
import { X } from 'lucide-react';
import type { InfraNodeData } from '../../store/types';
import { summarizeNodes } from '../../data/summary';

export function SummaryModal({
  open,
  onClose,
  nodes,
}: {
  open: boolean;
  onClose: () => void;
  nodes: Node<InfraNodeData>[];
}) {
  if (!open) return null;
  const { totals, nested } = summarizeNodes(nodes);
  const th: CSSProperties = {
    textAlign: 'left',
    color: 'var(--text-muted)',
    fontSize: 'var(--text-xs)',
    fontWeight: 600,
    padding: '6px 8px',
    borderBottom: '1px solid var(--surface-border)',
  };
  const td: CSSProperties = {
    color: 'var(--text-primary)',
    fontSize: 'var(--text-sm)',
    padding: '7px 8px',
    borderBottom: '1px solid var(--surface-border)',
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: 'rgba(15, 17, 23, 0.55)', fontFamily: 'var(--font-ui)' }}
      onClick={onClose}
    >
      <div
        className="flex w-full flex-col"
        style={{
          maxWidth: 720,
          maxHeight: '84vh',
          background: 'var(--surface-1)',
          border: '1px solid var(--surface-border)',
          borderRadius: 12,
          padding: 20,
          gap: 16,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <div>
            <div style={{ color: 'var(--text-primary)', fontSize: 'var(--text-md)', fontWeight: 600 }}>
              Architecture summary
            </div>
            <div style={{ color: 'var(--text-muted)', fontSize: 'var(--text-xs)', marginTop: 2 }}>
              {nodes.length} components total · {nested.length} nested
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-secondary)',
              cursor: 'pointer',
            }}
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto" style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <section>
            <div
              style={{
                color: 'var(--text-muted)',
                fontSize: 'var(--text-xs)',
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                marginBottom: 8,
              }}
            >
              Components in use
            </div>
            {totals.length === 0 ? (
              <div style={{ color: 'var(--text-muted)', fontSize: 'var(--text-sm)' }}>Canvas is empty.</div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    <th style={th}>Component</th>
                    <th style={{ ...th, width: 80, textAlign: 'right' }}>Count</th>
                  </tr>
                </thead>
                <tbody>
                  {totals.map((row) => (
                    <tr key={row.componentId}>
                      <td style={td}>{row.name}</td>
                      <td style={{ ...td, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{row.count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>

          <section>
            <div
              style={{
                color: 'var(--text-muted)',
                fontSize: 'var(--text-xs)',
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                marginBottom: 8,
              }}
            >
              Nested components
            </div>
            {nested.length === 0 ? (
              <div style={{ color: 'var(--text-muted)', fontSize: 'var(--text-sm)' }}>
                No components are nested inside containers or boundaries.
              </div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    <th style={th}>Parent</th>
                    <th style={th}>Parent type</th>
                    <th style={th}>Nested</th>
                    <th style={th}>Type</th>
                  </tr>
                </thead>
                <tbody>
                  {nested.map((row) => (
                    <tr key={row.childId}>
                      <td style={td}>{row.parentLabel}</td>
                      <td style={td}>{row.parentType}</td>
                      <td style={td}>{row.childLabel}</td>
                      <td style={td}>{row.childType}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
