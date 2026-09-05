import { useState, type ReactNode } from 'react';
import { Moon, Sun, FilePlus, FolderOpen, Save, Trash2, Download, Upload, Copy, ClipboardPaste, ClipboardCopy, Table2, FileImage, BringToFront, SendToBack } from 'lucide-react';
import { useCanvasStore } from '../../store/canvasStore';
import {
  copyTextToClipboard,
  diagramToExportJson,
  downloadTextFile,
  importInfraFromFile,
} from '../../data/importInfra';
import { PasteInfraModal } from '../io/PasteInfraModal';
import { SummaryModal } from './SummaryModal';
import { shortcutMod } from '../../data/clipboard';
import { downloadSelectionSvg } from '../../data/exportSvg';

function IconBtn({
  label,
  onClick,
  children,
  danger = false,
  disabled = false,
}: {
  label: string;
  onClick: () => void;
  children: ReactNode;
  danger?: boolean;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
      className="flex items-center justify-center"
      style={{
        color: danger ? 'var(--cat-security)' : 'var(--text-secondary)',
        background: 'transparent',
        border: 'none',
        borderRadius: 6,
        width: 32,
        height: 32,
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.4 : 1,
      }}
      onMouseEnter={(e) => {
        if (disabled) return;
        e.currentTarget.style.background = 'var(--surface-3)';
        if (danger) e.currentTarget.style.color = 'var(--cat-security)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = 'transparent';
        e.currentTarget.style.color = danger ? 'var(--cat-security)' : 'var(--text-secondary)';
      }}
    >
      {children}
    </button>
  );
}

export function Toolbar() {
  const nodeCount = useCanvasStore((s) => s.nodes.length);
  const edgeCount = useCanvasStore((s) => s.edges.length);
  const theme = useCanvasStore((s) => s.theme);
  const setTheme = useCanvasStore((s) => s.setTheme);
  const currentName = useCanvasStore((s) => s.currentName);
  const setCurrentName = useCanvasStore((s) => s.setCurrentName);
  const dirty = useCanvasStore((s) => s.dirty);
  const saveCurrent = useCanvasStore((s) => s.saveCurrent);
  const importIntoSession = useCanvasStore((s) => s.importIntoSession);
  const addImportedDiagrams = useCanvasStore((s) => s.addImportedDiagrams);
  const nodes = useCanvasStore((s) => s.nodes);
  const edges = useCanvasStore((s) => s.edges);
  const viewport = useCanvasStore((s) => s.viewport);
  const showStartScreen = useCanvasStore((s) => s.showStartScreen);
  const startNew = useCanvasStore((s) => s.startNew);
  const deleteSelected = useCanvasStore((s) => s.deleteSelected);
  const bringSelectedToFront = useCanvasStore((s) => s.bringSelectedToFront);
  const sendSelectedToBack = useCanvasStore((s) => s.sendSelectedToBack);
  const copySelected = useCanvasStore((s) => s.copySelected);
  const pasteClipboard = useCanvasStore((s) => s.pasteClipboard);
  const hasClipboard = useCanvasStore((s) => s.hasClipboard);
  const hasSelection = useCanvasStore(
    (s) => s.nodes.some((n) => n.selected) || s.edges.some((e) => e.selected),
  );
  const [pasteOpen, setPasteOpen] = useState(false);
  const [summaryOpen, setSummaryOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const exportJson = () =>
    diagramToExportJson({ name: currentName, nodes, edges, viewport });

  return (
    <header
      className="flex items-center justify-between"
      style={{
        height: 48,
        background: 'var(--surface-1)',
        borderBottom: '1px solid var(--surface-border)',
        padding: '0 var(--sp-4)',
        fontFamily: 'var(--font-ui)',
      }}
    >
      <div className="flex min-w-0 items-center" style={{ gap: 'var(--sp-3)' }}>
        <span
          style={{
            color: 'var(--text-primary)',
            fontSize: 'var(--text-md)',
            fontWeight: 600,
            whiteSpace: 'nowrap',
          }}
        >
          Infra Designer
        </span>
        <span style={{ width: 1, height: 16, background: 'var(--surface-border)' }} />
        <input
          value={currentName}
          onChange={(e) => setCurrentName(e.target.value)}
          className="outline-none"
          style={{
            background: 'var(--surface-2)',
            border: '1px solid var(--surface-border)',
            borderRadius: 6,
            color: 'var(--text-primary)',
            fontSize: 'var(--text-sm)',
            fontFamily: 'var(--font-ui)',
            padding: '4px 10px',
            width: 180,
          }}
        />
        {dirty ? (
          <span style={{ color: 'var(--text-muted)', fontSize: 'var(--text-xs)' }}>unsaved</span>
        ) : null}
      </div>

      <div className="flex items-center" style={{ gap: 2 }}>
        <IconBtn label="New architecture" onClick={() => startNew()}>
          <FilePlus size={16} />
        </IconBtn>
        <IconBtn label="Open" onClick={showStartScreen}>
          <FolderOpen size={16} />
        </IconBtn>
        <IconBtn label="Save" onClick={saveCurrent}>
          <Save size={16} />
        </IconBtn>
        <IconBtn label="Import JSON onto canvas" onClick={() => void importInfraFromFile(addImportedDiagrams)}>
          <Upload size={16} />
        </IconBtn>
        <IconBtn
          label="Export JSON file"
          onClick={() => {
            const slug = currentName.trim().toLowerCase().replace(/\s+/g, '-') || 'architecture';
            downloadTextFile(`${slug}.json`, exportJson());
          }}
        >
          <Download size={16} />
        </IconBtn>
        <IconBtn
          label={copied ? 'Copied' : 'Copy JSON'}
          onClick={() => {
            void copyTextToClipboard(exportJson()).then((ok) => {
              if (!ok) {
                window.alert('Could not copy. Use Export instead.');
                return;
              }
              setCopied(true);
              window.setTimeout(() => setCopied(false), 1400);
            });
          }}
        >
          <Copy size={16} />
        </IconBtn>
        <IconBtn label="Paste JSON onto canvas" onClick={() => setPasteOpen(true)}>
          <ClipboardPaste size={16} />
        </IconBtn>
        <IconBtn label="Summary" onClick={() => setSummaryOpen(true)}>
          <Table2 size={16} />
        </IconBtn>
      </div>

      <div className="flex items-center" style={{ gap: 'var(--sp-2)' }}>
        <IconBtn
          label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
        >
          {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
        </IconBtn>
        <IconBtn
          label="Bring to front"
          disabled={!hasSelection}
          onClick={() => bringSelectedToFront()}
        >
          <BringToFront size={16} />
        </IconBtn>
        <IconBtn
          label="Send to back"
          disabled={!hasSelection}
          onClick={() => sendSelectedToBack()}
        >
          <SendToBack size={16} />
        </IconBtn>
        <IconBtn
          label={`Copy selected (${shortcutMod()}C)`}
          disabled={!hasSelection}
          onClick={() => copySelected()}
        >
          <ClipboardCopy size={16} />
        </IconBtn>
        <IconBtn
          label={
            hasSelection
              ? 'Download selected as animated SVG'
              : 'Download canvas as animated SVG'
          }
          disabled={nodeCount === 0}
          onClick={() => {
            const slug = currentName.trim().toLowerCase().replace(/\s+/g, '-') || 'architecture';
            const suffix = hasSelection ? '-selection' : '';
            void downloadSelectionSvg(nodes, edges, `${slug}${suffix}.svg`);
          }}
        >
          <FileImage size={16} />
        </IconBtn>
        <IconBtn
          label={`Paste (${shortcutMod()}V)`}
          disabled={!hasClipboard}
          onClick={() => pasteClipboard()}
        >
          <ClipboardPaste size={16} />
        </IconBtn>
        <IconBtn
          label="Delete selected"
          danger
          disabled={!hasSelection}
          onClick={deleteSelected}
        >
          <Trash2 size={16} />
        </IconBtn>
        <span style={{ color: 'var(--text-muted)', fontSize: 'var(--text-sm)' }}>
          {nodeCount} nodes · {edgeCount} lines
        </span>
      </div>
      <PasteInfraModal
        open={pasteOpen}
        onClose={() => setPasteOpen(false)}
        onImport={importIntoSession}
        onAdd={addImportedDiagrams}
      />
      <SummaryModal open={summaryOpen} onClose={() => setSummaryOpen(false)} nodes={nodes} />
    </header>
  );
}
