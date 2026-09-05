import { useEffect, useRef, useState } from 'react';
import { applyImportedText } from '../../data/importInfra';
import type { SavedDiagram } from '../../store/types';

interface PasteInfraModalProps {
  open: boolean;
  onClose: () => void;
  onImport: (diagrams: SavedDiagram[]) => void;
  onAdd?: (diagrams: SavedDiagram[]) => void;
}

export function PasteInfraModal({ open, onClose, onImport, onAdd }: PasteInfraModalProps) {
  const [text, setText] = useState('');
  const areaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (open) {
      setText('');
      requestAnimationFrame(() => areaRef.current?.focus());
    }
  }, [open]);

  if (!open) return null;

  const run = (handler: (diagrams: SavedDiagram[]) => void) => {
    if (!text.trim()) {
      window.alert('Paste JSON first.');
      return;
    }
    if (applyImportedText(text, handler)) onClose();
  };

  const readClipboard = async () => {
    try {
      const clip = await navigator.clipboard.readText();
      setText(clip);
    } catch {
      areaRef.current?.focus();
    }
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
          maxWidth: 560,
          maxHeight: '80vh',
          background: 'var(--surface-1)',
          border: '1px solid var(--surface-border)',
          borderRadius: 12,
          padding: 20,
          gap: 12,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ color: 'var(--text-primary)', fontSize: 'var(--text-md)', fontWeight: 600 }}>
          Paste infrastructure JSON
        </div>
        <div style={{ color: 'var(--text-muted)', fontSize: 'var(--text-xs)' }}>
          Paste an export, infra spec, Kubernetes JSON, or Terraform JSON.
          {onAdd ? ' Add to canvas keeps your current diagram.' : ''}
        </div>
        <textarea
          ref={areaRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="{ ... }"
          className="min-h-0 flex-1 outline-none"
          style={{
            minHeight: 220,
            background: 'var(--surface-2)',
            color: 'var(--text-primary)',
            border: '1px solid var(--surface-border)',
            borderRadius: 8,
            padding: 10,
            fontFamily: 'var(--font-mono)',
            fontSize: 'var(--text-xs)',
            resize: 'vertical',
          }}
        />
        <div className="flex items-center justify-between" style={{ gap: 8 }}>
          <button
            type="button"
            onClick={() => void readClipboard()}
            style={{
              background: 'transparent',
              color: 'var(--text-secondary)',
              border: '1px solid var(--surface-border)',
              borderRadius: 8,
              padding: '8px 12px',
              fontSize: 'var(--text-sm)',
              cursor: 'pointer',
              fontFamily: 'var(--font-ui)',
            }}
          >
            Read clipboard
          </button>
          <div className="flex" style={{ gap: 8 }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                background: 'transparent',
                color: 'var(--text-secondary)',
                border: '1px solid var(--surface-border)',
                borderRadius: 8,
                padding: '8px 12px',
                fontSize: 'var(--text-sm)',
                cursor: 'pointer',
                fontFamily: 'var(--font-ui)',
              }}
            >
              Cancel
            </button>
            {onAdd ? (
              <button
                type="button"
                onClick={() => run(onImport)}
                style={{
                  background: 'transparent',
                  color: 'var(--text-secondary)',
                  border: '1px solid var(--surface-border)',
                  borderRadius: 8,
                  padding: '8px 14px',
                  fontSize: 'var(--text-sm)',
                  cursor: 'pointer',
                  fontFamily: 'var(--font-ui)',
                }}
              >
                Replace diagram
              </button>
            ) : null}
            <button
              type="button"
              onClick={() => run(onAdd ?? onImport)}
              style={{
                background: 'var(--accent)',
                color: '#fff',
                border: 'none',
                borderRadius: 8,
                padding: '8px 14px',
                fontSize: 'var(--text-sm)',
                fontWeight: 600,
                cursor: 'pointer',
                fontFamily: 'var(--font-ui)',
              }}
            >
              {onAdd ? 'Add to canvas' : 'Load'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
