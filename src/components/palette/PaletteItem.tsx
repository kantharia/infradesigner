import type { DragEvent } from 'react';
import { Trash2 } from 'lucide-react';
import type { ComponentDefinition } from '../../data/components';
import { categoryColorVar, getComponentIcon } from '../../data/components';
import { isContainerType } from '../../data/containment';

interface PaletteItemProps {
  component: ComponentDefinition;
  presetId?: string;
  onDelete?: () => void;
}

export function PaletteItem({ component, presetId, onDelete }: PaletteItemProps) {
  const Icon = getComponentIcon(component.icon);
  const catColor = categoryColorVar(component.category);

  const onDragStart = (event: DragEvent) => {
    event.dataTransfer.setData('componentId', component.id);
    if (presetId) event.dataTransfer.setData('presetId', presetId);
    event.dataTransfer.effectAllowed = 'move';
  };

  return (
    <div
      draggable
      onDragStart={onDragStart}
      className="group flex cursor-grab items-center"
      title={
        isContainerType(component.id)
          ? `${component.description} (container — drop components inside)`
          : component.description
      }
      style={{
        gap: 'var(--sp-2)',
        padding: 'var(--sp-2) var(--sp-3)',
        borderRadius: 6,
        color: 'var(--text-primary)',
        fontSize: 'var(--text-sm)',
        fontFamily: 'var(--font-ui)',
        transition: 'background var(--transition-fast)',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = 'var(--surface-3)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = 'transparent';
      }}
    >
      <Icon size={14} strokeWidth={1.75} style={{ color: catColor, flexShrink: 0 }} />
      <span className="truncate flex-1">{component.name}</span>
      {isContainerType(component.id) ? (
        <span style={{ color: 'var(--text-muted)', fontSize: 10 }}>nests</span>
      ) : null}
      {onDelete ? (
        <button
          type="button"
          draggable={false}
          aria-label={`Remove ${component.name} from palette`}
          title="Remove from palette"
          onMouseDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          className="opacity-0 group-hover:opacity-100"
          style={{
            background: 'transparent',
            border: 'none',
            color: 'var(--text-muted)',
            cursor: 'pointer',
            padding: 2,
            display: 'flex',
            flexShrink: 0,
          }}
        >
          <Trash2 size={12} />
        </button>
      ) : null}
    </div>
  );
}
