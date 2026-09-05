import { useState } from 'react';
import { FilePlus, Trash2, Upload, ClipboardPaste } from 'lucide-react';
import { useCanvasStore } from '../../store/canvasStore';
import { importInfraFromFile } from '../../data/importInfra';
import { PasteInfraModal } from '../io/PasteInfraModal';

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

export function StartScreen() {
  const diagrams = useCanvasStore((s) => s.diagrams);
  const startNew = useCanvasStore((s) => s.startNew);
  const openDiagram = useCanvasStore((s) => s.openDiagram);
  const deleteSavedDiagram = useCanvasStore((s) => s.deleteSavedDiagram);
  const importIntoSession = useCanvasStore((s) => s.importIntoSession);
  const [pasteOpen, setPasteOpen] = useState(false);

  return (
    <div
      className="flex h-full w-full items-center justify-center"
      style={{ background: 'var(--surface-0)', fontFamily: 'var(--font-ui)' }}
    >
      <div
        className="flex w-full flex-col"
        style={{
          maxWidth: 480,
          background: 'var(--surface-1)',
          border: '1px solid var(--surface-border)',
          borderRadius: 12,
          padding: 'var(--sp-6)',
          gap: 'var(--sp-4)',
        }}
      >
        <div>
          <div style={{ color: 'var(--text-primary)', fontSize: 18, fontWeight: 600 }}>
            Infra Designer
          </div>
          <div style={{ color: 'var(--text-secondary)', fontSize: 'var(--text-sm)', marginTop: 4 }}>
            Start a new architecture, import existing infra, or open a saved one.
          </div>
        </div>

        <button
          type="button"
          onClick={() => startNew()}
          className="flex items-center"
          style={{
            gap: 'var(--sp-2)',
            background: 'var(--accent)',
            color: '#fff',
            border: 'none',
            borderRadius: 8,
            padding: '10px 14px',
            fontSize: 'var(--text-md)',
            fontWeight: 600,
            cursor: 'pointer',
            fontFamily: 'var(--font-ui)',
          }}
        >
          <FilePlus size={16} />
          New architecture
        </button>

        <button
          type="button"
          onClick={() => void importInfraFromFile(importIntoSession)}
          className="flex items-center"
          style={{
            gap: 'var(--sp-2)',
            background: 'var(--surface-2)',
            color: 'var(--text-primary)',
            border: '1px solid var(--surface-border)',
            borderRadius: 8,
            padding: '10px 14px',
            fontSize: 'var(--text-md)',
            fontWeight: 500,
            cursor: 'pointer',
            fontFamily: 'var(--font-ui)',
          }}
        >
          <Upload size={16} />
          Import JSON file
        </button>

        <button
          type="button"
          onClick={() => setPasteOpen(true)}
          className="flex items-center"
          style={{
            gap: 'var(--sp-2)',
            background: 'var(--surface-2)',
            color: 'var(--text-primary)',
            border: '1px solid var(--surface-border)',
            borderRadius: 8,
            padding: '10px 14px',
            fontSize: 'var(--text-md)',
            fontWeight: 500,
            cursor: 'pointer',
            fontFamily: 'var(--font-ui)',
          }}
        >
          <ClipboardPaste size={16} />
          Paste JSON
        </button>

        <div
          style={{
            color: 'var(--text-muted)',
            fontSize: 'var(--text-xs)',
            lineHeight: 1.45,
          }}
        >
          Accepts Infra Designer exports, a simple spec with components and connections,
          Kubernetes JSON (kubectl get -o json), or Terraform JSON resource maps.
        </div>

        <div>
          <div
            style={{
              color: 'var(--text-muted)',
              fontSize: 'var(--text-xs)',
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              marginBottom: 'var(--sp-2)',
            }}
          >
            Saved locally
          </div>
          {diagrams.length === 0 ? (
            <div style={{ color: 'var(--text-muted)', fontSize: 'var(--text-sm)' }}>
              Nothing saved yet. Create a diagram and press Save.
            </div>
          ) : (
            <div className="flex flex-col" style={{ gap: 6, maxHeight: 320, overflowY: 'auto' }}>
              {diagrams.map((d) => (
                <div
                  key={d.id}
                  className="flex items-center justify-between"
                  style={{
                    background: 'var(--surface-2)',
                    border: '1px solid var(--surface-border)',
                    borderRadius: 8,
                    padding: '10px 12px',
                    gap: 'var(--sp-2)',
                  }}
                >
                  <button
                    type="button"
                    onClick={() => openDiagram(d.id)}
                    className="min-w-0 flex-1 text-left"
                    style={{
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      padding: 0,
                      fontFamily: 'var(--font-ui)',
                    }}
                  >
                    <div
                      className="truncate"
                      style={{ color: 'var(--text-primary)', fontSize: 'var(--text-sm)', fontWeight: 500 }}
                    >
                      {d.name}
                    </div>
                    <div style={{ color: 'var(--text-muted)', fontSize: 'var(--text-xs)' }}>
                      {d.nodes.length} nodes · {formatDate(d.updatedAt)}
                    </div>
                  </button>
                  <button
                    type="button"
                    aria-label={`Delete ${d.name}`}
                    onClick={() => deleteSavedDiagram(d.id)}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: 'var(--text-muted)',
                      cursor: 'pointer',
                      padding: 4,
                    }}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      <PasteInfraModal
        open={pasteOpen}
        onClose={() => setPasteOpen(false)}
        onImport={importIntoSession}
      />
    </div>
  );
}
