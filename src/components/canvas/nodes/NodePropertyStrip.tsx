import { visibleNodeProperties } from '../../../data/configSchemas';

export function NodePropertyStrip({
  componentId,
  config,
  notes,
  compact = false,
}: {
  componentId: string;
  config?: Record<string, string>;
  notes?: string;
  compact?: boolean;
}) {
  const chips = visibleNodeProperties(componentId, config, notes);
  if (chips.length === 0) return null;

  return (
    <div
      className="nodrag nopan flex flex-wrap"
      style={{
        gap: 4,
        padding: compact ? '4px 10px 8px 14px' : '6px 2px 2px 5px',
        maxWidth: compact ? '100%' : 220,
        pointerEvents: 'none',
        background: compact ? 'var(--node-bg)' : 'transparent',
        borderBottom: compact ? '1px solid var(--surface-border)' : 'none',
      }}
    >
      {chips.map((chip) => (
        <span
          key={chip.key}
          title={chip.text}
          style={{
            color: compact ? 'var(--text-muted)' : 'rgba(139, 147, 167, 0.72)',
            fontSize: 10,
            lineHeight: '15px',
            fontFamily: 'var(--font-ui)',
            background: compact ? 'var(--surface-2)' : 'rgba(255, 255, 255, 0.32)',
            border: compact
              ? '1px solid var(--surface-border)'
              : '1px solid rgba(212, 219, 232, 0.4)',
            borderRadius: 999,
            padding: '1px 7px',
            opacity: compact ? 0.92 : 1,
            maxWidth: compact ? '100%' : 216,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {chip.text}
        </span>
      ))}
    </div>
  );
}
