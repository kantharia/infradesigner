import { memo, useCallback, useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { Handle, Position } from '@xyflow/react';
import { COMPONENT_CATALOGUE, categoryColorVar } from '../../../data/components';
import { fillFromConfig, displayTypeLabel } from '../../../data/appearance';
import { TechIcon, providerHintFromConfig } from '../../../data/providerIcons';
import { useCanvasStore } from '../../../store/canvasStore';
import type { InfraNodeProps } from './InfraNode.types';
import { NodePropertyStrip } from './NodePropertyStrip';

function InfraNodeComponent({ id, data, selected }: InfraNodeProps) {
  const updateNode = useCanvasStore((s) => s.updateNode);
  const updateNodeConfig = useCanvasStore((s) => s.updateNodeConfig);
  const [editing, setEditing] = useState<'label' | 'type' | null>(null);
  const [draft, setDraft] = useState(data.label);
  const inputRef = useRef<HTMLInputElement>(null);

  const def = COMPONENT_CATALOGUE.find((c) => c.id === data.componentId);
  const hint = providerHintFromConfig(data.config);
  const isCustom = data.componentId === 'custom';
  const catColor = categoryColorVar(
    data.config?.accent && data.config.accent !== 'default'
      ? data.config.accent
      : data.category,
  );
  const typeName = displayTypeLabel(
    String(data.componentId),
    data.config,
    def?.name ?? data.componentId,
  );

  useEffect(() => {
    if (editing === 'type') setDraft(data.config?.typeLabel ?? '');
    else setDraft(data.label);
  }, [data.label, data.config?.typeLabel, editing]);

  useEffect(() => {
    if (editing) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [editing]);

  const commit = useCallback(() => {
    if (editing === 'type') {
      const next = draft.trim();
      setEditing(null);
      if (next !== (data.config?.typeLabel ?? '').trim()) {
        updateNodeConfig(id, { typeLabel: next });
      }
      return;
    }
    const next = draft.trim() || data.label;
    setDraft(next);
    setEditing(null);
    if (next !== data.label) {
      updateNode(id, { label: next });
    }
  }, [data.config?.typeLabel, data.label, draft, editing, id, updateNode, updateNodeConfig]);

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      commit();
    }
    if (event.key === 'Escape') {
      setDraft(editing === 'type' ? (data.config?.typeLabel ?? '') : data.label);
      setEditing(null);
    }
  };

  const editInput = (
    <input
      ref={inputRef}
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={onKeyDown}
      className="outline-none"
      style={{
        background: 'transparent',
        color: editing === 'type' ? 'var(--text-secondary)' : 'var(--text-primary)',
        fontSize: editing === 'type' ? 'var(--text-sm)' : 'var(--text-base)',
        fontFamily: 'var(--font-ui)',
        border: 'none',
        padding: 0,
        width: 140,
      }}
    />
  );

  return (
    <div className="relative flex flex-col">
      <div
        className="infra-node relative flex items-center"
        style={{
          minWidth: 180,
          minHeight: 64,
          background: fillFromConfig(data.config, 'var(--node-bg)', 100),
          border: `1px solid ${selected ? 'var(--node-border-selected)' : 'var(--node-border)'}`,
          borderRadius: 'var(--node-radius)',
          boxShadow: selected ? 'var(--node-shadow-selected)' : 'none',
          transition: `border-color var(--transition-base), box-shadow var(--transition-fast)`,
        }}
      >
      <div
        className="absolute inset-y-0 left-0"
        style={{ width: 3, background: catColor }}
      />

      <Handle type="source" position={Position.Top} id="top" className="infra-handle" />
      <Handle type="source" position={Position.Right} id="right" className="infra-handle" />
      <Handle type="source" position={Position.Bottom} id="bottom" className="infra-handle" />
      <Handle type="source" position={Position.Left} id="left" className="infra-handle" />

      <div
        className="flex items-center"
        style={{ gap: 'var(--sp-3)', padding: 'var(--sp-3) var(--sp-4) var(--sp-3) var(--sp-5)' }}
      >
        <span
          className="flex items-center justify-center"
          style={{
            width: 28,
            height: 28,
            flexShrink: 0,
            borderRadius: 6,
            background: 'var(--surface-3)',
            border: '1px solid var(--surface-border)',
          }}
        >
          <TechIcon
            hint={hint}
            fallbackName={data.config?.iconName || def?.icon || 'Box'}
            size={18}
            color={catColor}
          />
        </span>
        <div className="flex min-w-0 flex-col" style={{ gap: 2 }}>
          {editing === 'label' ? (
            editInput
          ) : (
            <button
              type="button"
              className="truncate text-left"
              style={{
                color: 'var(--text-primary)',
                fontSize: 'var(--text-base)',
                fontFamily: 'var(--font-ui)',
                background: 'none',
                border: 'none',
                padding: 0,
                cursor: 'text',
              }}
              onDoubleClick={(e) => {
                e.stopPropagation();
                setDraft(data.label);
                setEditing('label');
              }}
            >
              {data.label}
            </button>
          )}
          {editing === 'type' && isCustom ? (
            editInput
          ) : isCustom ? (
            <button
              type="button"
              className="truncate text-left"
              style={{
                color: 'var(--text-secondary)',
                fontSize: 'var(--text-sm)',
                fontFamily: 'var(--font-ui)',
                background: 'none',
                border: 'none',
                padding: 0,
                cursor: 'text',
              }}
              onDoubleClick={(e) => {
                e.stopPropagation();
                setDraft(data.config?.typeLabel ?? '');
                setEditing('type');
              }}
            >
              {typeName}
            </button>
          ) : (
            <span
              className="truncate"
              style={{
                color: 'var(--text-secondary)',
                fontSize: 'var(--text-sm)',
                fontFamily: 'var(--font-ui)',
              }}
            >
              {typeName}
            </span>
          )}
        </div>
      </div>
      </div>
      <NodePropertyStrip
        componentId={String(data.componentId)}
        config={data.config}
        notes={data.notes}
      />
    </div>
  );
}

export const InfraNode = memo(InfraNodeComponent);
