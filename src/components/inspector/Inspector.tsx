import type { CSSProperties, ChangeEvent, ReactNode } from 'react';
import { BookmarkPlus, Plus, Trash2 } from 'lucide-react';
import {
  APPEARANCE_FIELDS,
  COMPUTE_FIELDS,
  getConfigFields,
  isComputeEnabled,
  type ConfigField,
} from '../../data/configSchemas';
import { COMPONENT_CATALOGUE, ICON_CHOICES, getComponentIcon } from '../../data/components';
import { TechIcon, resolveProviderSlug } from '../../data/providerIcons';
import {
  childCountLabel,
  componentName,
  getAllowedChildIds,
  isContainerType,
} from '../../data/containment';
import { parseCustomKv, stringifyCustomKv } from '../../data/appearance';
import { useCanvasStore } from '../../store/canvasStore';
import { markersForDirection, readEdgeData, type EdgeDirection } from '../../data/edgeProps';
import {
  HANDLE_SIDES,
  inwardEdgeZIndex,
  isGroupNode,
  parseHandleId,
  toHandleId,
  withResolvedHandles,
  type HandleSide,
  type JointFacing,
} from '../../data/joints';
import { ColorDropdown } from '../ui/ColorDropdown';
import type { Edge } from '@xyflow/react';

function FieldControl({
  field,
  value,
  onChange,
}: {
  field: ConfigField;
  value: string;
  onChange: (value: string) => void;
}) {
  const base: CSSProperties = {
    width: '100%',
    background: 'var(--surface-2)',
    color: 'var(--text-primary)',
    border: '1px solid var(--surface-border)',
    borderRadius: 6,
    fontSize: 'var(--text-sm)',
    fontFamily: 'var(--font-ui)',
    padding: '6px 8px',
    outline: 'none',
  };

  if (field.type === 'textarea') {
    return (
      <textarea
        rows={3}
        value={value}
        placeholder={field.placeholder}
        onChange={(e) => onChange(e.target.value)}
        style={{ ...base, resize: 'vertical' }}
      />
    );
  }

  if (field.type === 'select') {
    return (
      <select value={value} onChange={(e) => onChange(e.target.value)} style={base}>
        <option value="">Select…</option>
        {(field.options ?? []).map((opt) => (
          <option key={opt} value={opt}>
            {field.optionLabels?.[opt] ?? opt}
          </option>
        ))}
      </select>
    );
  }

  if (field.type === 'toggle') {
    const on = value === 'true';
    return (
      <button
        type="button"
        onClick={() => onChange(on ? 'false' : 'true')}
        style={{
          ...base,
          textAlign: 'left',
          cursor: 'pointer',
          color: on ? 'var(--accent)' : 'var(--text-secondary)',
        }}
      >
        {on ? 'On' : 'Off'}
      </button>
    );
  }

  return (
    <input
      type={field.type === 'number' ? 'number' : 'text'}
      value={value}
      placeholder={field.placeholder}
      onChange={(e: ChangeEvent<HTMLInputElement>) => onChange(e.target.value)}
      style={base}
    />
  );
}

function FieldBlock({
  field,
  value,
  onChange,
}: {
  field: ConfigField;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="flex flex-col" style={{ gap: 4 }}>
      <span style={{ color: 'var(--text-muted)', fontSize: 'var(--text-xs)' }}>{field.label}</span>
      <div className="flex items-center" style={{ gap: 8 }}>
        {field.type === 'select' && resolveProviderSlug(value) ? (
          <TechIcon hint={value} fallbackName="Box" size={16} />
        ) : null}
        <div className="min-w-0 flex-1">
          <FieldControl field={field} value={value} onChange={onChange} />
        </div>
      </div>
    </label>
  );
}

export function Inspector() {
  const nodes = useCanvasStore((s) => s.nodes);
  const edges = useCanvasStore((s) => s.edges);
  const updateNode = useCanvasStore((s) => s.updateNode);
  const updateNodeConfig = useCanvasStore((s) => s.updateNodeConfig);
  const removeNode = useCanvasStore((s) => s.removeNode);
  const deleteSelected = useCanvasStore((s) => s.deleteSelected);

  const selectedNodes = nodes.filter((n) => n.selected);
  const selectedEdges = edges.filter((e) => e.selected);

  return (
    <aside
      className="flex h-full flex-col overflow-hidden"
      style={{
        width: 280,
        background: 'var(--surface-1)',
        borderLeft: '1px solid var(--surface-border)',
        fontFamily: 'var(--font-ui)',
      }}
    >
      <div
        style={{
          padding: '12px 14px',
          borderBottom: '1px solid var(--surface-border)',
          color: 'var(--text-primary)',
          fontSize: 'var(--text-sm)',
          fontWeight: 600,
        }}
      >
        Inspector
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto" style={{ padding: 14 }}>
        {selectedNodes.length === 1 && selectedEdges.length === 0 ? (
          <NodeInspector
            nodeId={selectedNodes[0].id}
            parentId={selectedNodes[0].parentId}
            label={String(selectedNodes[0].data.label ?? '')}
            notes={String(selectedNodes[0].data.notes ?? '')}
            componentId={String(selectedNodes[0].data.componentId ?? '')}
            config={selectedNodes[0].data.config ?? {}}
            onLabel={(label) => updateNode(selectedNodes[0].id, { label })}
            onNotes={(notes) => updateNode(selectedNodes[0].id, { notes })}
            onConfig={(key, value) => updateNodeConfig(selectedNodes[0].id, { [key]: value })}
            onDelete={() => removeNode(selectedNodes[0].id)}
          />
        ) : selectedEdges.length === 1 && selectedNodes.length === 0 ? (
          <EdgeInspector edge={selectedEdges[0]} />
        ) : selectedNodes.length + selectedEdges.length > 1 ? (
          <div className="flex flex-col" style={{ gap: 12 }}>
            <div style={{ color: 'var(--text-secondary)', fontSize: 'var(--text-sm)' }}>
              {selectedNodes.length} components and {selectedEdges.length} lines selected.
            </div>
            <DeleteButton onClick={deleteSelected} label="Delete selected" />
          </div>
        ) : (
          <div style={{ color: 'var(--text-muted)', fontSize: 'var(--text-sm)' }}>
            Select a component or line to configure it.
          </div>
        )}
      </div>
    </aside>
  );
}

function NodeInspector({
  nodeId,
  parentId,
  label,
  notes,
  componentId,
  config,
  onLabel,
  onNotes,
  onConfig,
  onDelete,
}: {
  nodeId: string;
  parentId?: string;
  label: string;
  notes: string;
  componentId: string;
  config: Record<string, string>;
  onLabel: (v: string) => void;
  onNotes: (v: string) => void;
  onConfig: (key: string, value: string) => void;
  onDelete: () => void;
}) {
  const def = COMPONENT_CATALOGUE.find((c) => c.id === componentId);
  const nodes = useCanvasStore((s) => s.nodes);
  const detachNode = useCanvasStore((s) => s.detachNode);
  const saveCustomComponent = useCanvasStore((s) => s.saveCustomComponent);
  const parent = parentId ? nodes.find((n) => n.id === parentId) : undefined;
  const children = nodes.filter((n) => n.parentId === nodeId);
  const allowed = getAllowedChildIds(componentId);

  return (
    <div className="flex flex-col" style={{ gap: 14 }}>
      <div>
        <div style={{ color: 'var(--text-primary)', fontSize: 'var(--text-md)', fontWeight: 600 }}>
          {label || def?.name || componentId}
        </div>
        <div style={{ color: 'var(--text-muted)', fontSize: 'var(--text-xs)', marginTop: 2 }}>
          {componentId === 'custom' && (config.typeLabel ?? '').trim()
            ? (config.typeLabel ?? '').trim()
            : def?.description}
        </div>
      </div>

      <Section title="Nesting">
        <div style={{ color: 'var(--text-secondary)', fontSize: 'var(--text-sm)' }}>
          {parent
            ? `Inside ${String(parent.data.label)} (${componentName(String(parent.data.componentId))})`
            : 'On canvas'}
        </div>
        {parent ? (
          <button
            type="button"
            onClick={() => detachNode(nodeId)}
            style={{
              background: 'var(--surface-2)',
              color: 'var(--text-primary)',
              border: '1px solid var(--surface-border)',
              borderRadius: 6,
              padding: '6px 8px',
              fontSize: 'var(--text-sm)',
              cursor: 'pointer',
              fontFamily: 'var(--font-ui)',
              textAlign: 'left',
            }}
          >
            Move to canvas
          </button>
        ) : null}
        {isContainerType(componentId) ? (
          <>
            <div style={{ color: 'var(--text-secondary)', fontSize: 'var(--text-sm)' }}>
              {childCountLabel(children.length)}
              {children.length > 0
                ? `: ${children.map((c) => String(c.data.label)).join(', ')}`
                : '. Drop allowed components inside.'}
            </div>
            <div style={{ color: 'var(--text-muted)', fontSize: 'var(--text-xs)' }}>
              Accepts: {allowed.map(componentName).join(', ')}
            </div>
          </>
        ) : null}
      </Section>

      <Section title="Identity">
        <FieldBlock
          field={{ key: 'label', label: 'Display name', type: 'text', defaultValue: '' }}
          value={label}
          onChange={onLabel}
        />
        {componentId === 'custom' ? (
          <FieldBlock
            field={{
              key: 'typeLabel',
              label: 'Type label',
              type: 'text',
              placeholder: 'Custom',
              defaultValue: '',
            }}
            value={config.typeLabel ?? ''}
            onChange={(v) => onConfig('typeLabel', v)}
          />
        ) : null}
        <FieldBlock
          field={{
            key: 'notes',
            label: 'Notes',
            type: 'textarea',
            placeholder: 'Purpose, constraints, links…',
            defaultValue: '',
          }}
          value={notes}
          onChange={onNotes}
        />
      </Section>

      <Section title="Appearance">
        {APPEARANCE_FIELDS.map((field) => (
          <FieldBlock
            key={field.key}
            field={field}
            value={config[field.key] ?? ''}
            onChange={(v) => onConfig(field.key, v)}
          />
        ))}
        <ColorDropdown
          label="Fill colour"
          value={config.fillColor ?? ''}
          onChange={(hex) => onConfig('fillColor', hex)}
        />
        <FieldBlock
          field={{
            key: 'fillOpacity',
            label: 'Fill opacity (%)',
            type: 'number',
            placeholder: '100 = solid, 0 = invisible',
            defaultValue: '100',
          }}
          value={config.fillOpacity ?? ''}
          onChange={(v) => onConfig('fillOpacity', v)}
        />
        {componentId === 'custom' ? (
          <label className="flex flex-col" style={{ gap: 4 }}>
            <span style={{ color: 'var(--text-muted)', fontSize: 'var(--text-xs)' }}>Icon</span>
            <div className="flex items-center" style={{ gap: 8 }}>
              {(() => {
                const Icon = getComponentIcon(config.iconName || 'Shapes');
                return <Icon size={16} style={{ color: 'var(--text-secondary)', flexShrink: 0 }} />;
              })()}
              <select
                value={config.iconName ?? ''}
                onChange={(e) => onConfig('iconName', e.target.value)}
                style={{
                  width: '100%',
                  background: 'var(--surface-2)',
                  color: 'var(--text-primary)',
                  border: '1px solid var(--surface-border)',
                  borderRadius: 6,
                  fontSize: 'var(--text-sm)',
                  fontFamily: 'var(--font-ui)',
                  padding: '6px 8px',
                }}
              >
                <option value="">Select…</option>
                {ICON_CHOICES.map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </select>
            </div>
          </label>
        ) : null}
        {componentId === 'boundary' ? (
          <ColorDropdown
            label="Dot colour"
            value={config.dotColor ?? ''}
            onChange={(hex) => onConfig('dotColor', hex)}
          />
        ) : null}
      </Section>

      <Section title="Configuration">
        {getConfigFields(componentId, config).map((field) => (
          <FieldBlock
            key={field.key}
            field={field}
            value={config[field.key] ?? ''}
            onChange={(v) => onConfig(field.key, v)}
          />
        ))}
        {componentId === 'custom' ? (
          <CustomKvEditor
            rows={parseCustomKv(config.customKv)}
            onChange={(rows) => onConfig('customKv', stringifyCustomKv(rows))}
          />
        ) : null}
      </Section>

      <Section title="Compute">
        <label className="flex items-center" style={{ gap: 8, cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={isComputeEnabled(componentId, config)}
            onChange={(e) => onConfig('isCompute', e.target.checked ? 'true' : 'false')}
            style={{ accentColor: 'var(--accent)', width: 14, height: 14 }}
          />
          <span style={{ color: 'var(--text-primary)', fontSize: 'var(--text-sm)' }}>
            This is a compute resource
          </span>
        </label>
        {isComputeEnabled(componentId, config) ? (
          <>
            {COMPUTE_FIELDS.map((field) => (
              <FieldBlock
                key={field.key}
                field={field}
                value={config[field.key] ?? ''}
                onChange={(v) => onConfig(field.key, v)}
              />
            ))}
            <CustomKvEditor
              title="Additional storage"
              keyPlaceholder="Volume"
              valuePlaceholder="Size"
              addLabel="Add storage"
              rows={parseCustomKv(config.computeExtraStorage)}
              onChange={(rows) => onConfig('computeExtraStorage', stringifyCustomKv(rows))}
            />
          </>
        ) : null}
      </Section>

      {componentId === 'custom' ? (
        <button
          type="button"
          onClick={() => saveCustomComponent(nodeId)}
          className="flex items-center"
          style={{
            gap: 6,
            background: 'var(--surface-2)',
            color: 'var(--text-primary)',
            border: '1px solid var(--surface-border)',
            borderRadius: 8,
            padding: '8px 10px',
            fontSize: 'var(--text-sm)',
            cursor: 'pointer',
            fontFamily: 'var(--font-ui)',
          }}
        >
          <BookmarkPlus size={14} />
          Save to palette
        </button>
      ) : null}

      <DeleteButton onClick={onDelete} label={isContainerType(componentId) ? 'Delete container and nested' : 'Delete component'} />
    </div>
  );
}

function EdgeInspector({ edge }: { edge: Edge }) {
  const updateEdge = useCanvasStore((s) => s.updateEdge);
  const removeEdge = useCanvasStore((s) => s.removeEdge);
  const nodes = useCanvasStore((s) => s.nodes);
  const meta = readEdgeData(edge);
  const label = edge.label != null ? String(edge.label) : '';
  const sourceNode = nodes.find((n) => n.id === edge.source);
  const targetNode = nodes.find((n) => n.id === edge.target);
  const sourceGroup = isGroupNode(sourceNode);
  const targetGroup = isGroupNode(targetNode);
  const sourceJoint = parseHandleId(edge.sourceHandle);
  const targetJoint = parseHandleId(edge.targetHandle);

  const setDirection = (direction: EdgeDirection) => {
    updateEdge(edge.id, {
      data: { ...edge.data, direction },
      ...markersForDirection(direction),
    });
  };

  const setEndHandle = (
    end: 'source' | 'target',
    next: { side?: HandleSide; facing?: JointFacing },
  ) => {
    const isSource = end === 'source';
    const grouped = isSource ? sourceGroup : targetGroup;
    const current = parseHandleId(isSource ? edge.sourceHandle : edge.targetHandle);
    const handle = toHandleId(
      next.side ?? current.side,
      grouped ? (next.facing ?? current.facing) : 'out',
      grouped,
    );
    const sourceHandle = isSource ? handle : edge.sourceHandle;
    const targetHandle = isSource ? edge.targetHandle : handle;
    updateEdge(edge.id, {
      sourceHandle,
      targetHandle,
      zIndex: inwardEdgeZIndex(sourceHandle, targetHandle),
    });
  };

  const reverse = () => {
    updateEdge(edge.id, {
      source: edge.target,
      target: edge.source,
      sourceHandle: edge.targetHandle,
      targetHandle: edge.sourceHandle,
    });
  };

  const resetJoints = () => {
    const resolved = withResolvedHandles(
      { source: edge.source, target: edge.target },
      nodes,
    );
    updateEdge(edge.id, {
      sourceHandle: resolved.sourceHandle,
      targetHandle: resolved.targetHandle,
      zIndex: resolved.zIndex,
    });
  };

  return (
    <div className="flex flex-col" style={{ gap: 14 }}>
      <div style={{ color: 'var(--text-primary)', fontSize: 'var(--text-md)', fontWeight: 600 }}>
        Connection
      </div>
      <Section title="Joints">
        <FieldBlock
          field={{
            key: 'sourceSide',
            label: `From side${sourceNode ? ` (${String(sourceNode.data.label)})` : ''}`,
            type: 'select',
            options: [...HANDLE_SIDES],
            defaultValue: 'right',
          }}
          value={sourceJoint.side}
          onChange={(v) => setEndHandle('source', { side: v as HandleSide })}
        />
        {sourceGroup ? (
          <FieldBlock
            field={{
              key: 'sourceJoint',
              label: 'From joint',
              type: 'select',
              options: ['outward', 'inward'],
              defaultValue: 'outward',
            }}
            value={sourceJoint.facing === 'in' ? 'inward' : 'outward'}
            onChange={(v) =>
              setEndHandle('source', { facing: v === 'inward' ? 'in' : 'out' })
            }
          />
        ) : null}
        <FieldBlock
          field={{
            key: 'targetSide',
            label: `To side${targetNode ? ` (${String(targetNode.data.label)})` : ''}`,
            type: 'select',
            options: [...HANDLE_SIDES],
            defaultValue: 'right',
          }}
          value={targetJoint.side}
          onChange={(v) => setEndHandle('target', { side: v as HandleSide })}
        />
        {targetGroup ? (
          <FieldBlock
            field={{
              key: 'targetJoint',
              label: 'To joint',
              type: 'select',
              options: ['outward', 'inward'],
              defaultValue: 'outward',
            }}
            value={targetJoint.facing === 'in' ? 'inward' : 'outward'}
            onChange={(v) =>
              setEndHandle('target', { facing: v === 'inward' ? 'in' : 'out' })
            }
          />
        ) : null}
        <button
          type="button"
          onClick={resetJoints}
          style={{
            background: 'var(--surface-2)',
            color: 'var(--text-primary)',
            border: '1px solid var(--surface-border)',
            borderRadius: 6,
            padding: '6px 8px',
            fontSize: 'var(--text-sm)',
            cursor: 'pointer',
            fontFamily: 'var(--font-ui)',
            textAlign: 'left',
          }}
        >
          Reset joints (auto)
        </button>
      </Section>
      <Section title="Line">
        <FieldBlock
          field={{
            key: 'label',
            label: 'Label',
            type: 'text',
            placeholder: 'e.g. HTTPS / gRPC',
            defaultValue: '',
          }}
          value={label}
          onChange={(v) => updateEdge(edge.id, { label: v })}
        />
        <FieldBlock
          field={{
            key: 'direction',
            label: 'Arrow direction',
            type: 'select',
            options: ['forward', 'back', 'both', 'sync', 'none'],
            optionLabels: {
              forward: 'Forward',
              back: 'Back',
              both: 'Both (same line)',
              sync: 'Sync (⇄ pair)',
              none: 'None',
            },
            defaultValue: 'forward',
          }}
          value={meta.direction}
          onChange={(v) => setDirection(v as EdgeDirection)}
        />
        <FieldBlock
          field={{
            key: 'lineStyle',
            label: 'Line style',
            type: 'select',
            options: ['solid', 'dashed'],
            defaultValue: 'solid',
          }}
          value={meta.lineStyle}
          onChange={(v) =>
            updateEdge(edge.id, { data: { ...edge.data, lineStyle: v } })
          }
        />
        <FieldBlock
          field={{
            key: 'animated',
            label: 'Animated flow',
            type: 'toggle',
            defaultValue: 'false',
          }}
          value={meta.animated ? 'true' : 'false'}
          onChange={(v) =>
            updateEdge(edge.id, { data: { ...edge.data, animated: v === 'true' } })
          }
        />
        {meta.animated ? (
          <>
            <FieldBlock
              field={{
                key: 'animationSpeed',
                label: 'Flow speed (seconds)',
                type: 'number',
                placeholder: '1.5',
                defaultValue: '1.5',
              }}
              value={String(meta.animationSpeed)}
              onChange={(v) =>
                updateEdge(edge.id, {
                  data: { ...edge.data, animationSpeed: v },
                })
              }
            />
            <FieldBlock
              field={{
                key: 'animationDots',
                label: 'Dots on line',
                type: 'number',
                placeholder: '3',
                defaultValue: '3',
              }}
              value={String(meta.animationDots)}
              onChange={(v) =>
                updateEdge(edge.id, {
                  data: { ...edge.data, animationDots: v },
                })
              }
            />
            <ColorDropdown
              label="Dot colour"
              value={meta.animationDotColor}
              onChange={(hex) =>
                updateEdge(edge.id, {
                  data: { ...edge.data, animationDotColor: hex },
                })
              }
            />
          </>
        ) : null}
        <button
          type="button"
          onClick={reverse}
          style={{
            background: 'var(--surface-2)',
            color: 'var(--text-primary)',
            border: '1px solid var(--surface-border)',
            borderRadius: 6,
            padding: '6px 8px',
            fontSize: 'var(--text-sm)',
            cursor: 'pointer',
            fontFamily: 'var(--font-ui)',
            textAlign: 'left',
          }}
        >
          Reverse source and target
        </button>
      </Section>
      <DeleteButton onClick={() => removeEdge(edge.id)} label="Delete line" />
    </div>
  );
}

function CustomKvEditor({
  rows,
  onChange,
  title = 'Custom labels (saved with this component)',
  keyPlaceholder = 'Label',
  valuePlaceholder = 'Value',
  addLabel = 'Add label',
}: {
  rows: { key: string; value: string }[];
  onChange: (rows: { key: string; value: string }[]) => void;
  title?: string;
  keyPlaceholder?: string;
  valuePlaceholder?: string;
  addLabel?: string;
}) {
  const input: CSSProperties = {
    width: '100%',
    background: 'var(--surface-2)',
    color: 'var(--text-primary)',
    border: '1px solid var(--surface-border)',
    borderRadius: 6,
    fontSize: 'var(--text-sm)',
    fontFamily: 'var(--font-ui)',
    padding: '6px 8px',
    outline: 'none',
  };

  return (
    <div className="flex flex-col" style={{ gap: 6 }}>
      <span style={{ color: 'var(--text-muted)', fontSize: 'var(--text-xs)' }}>
        {title}
      </span>
      {rows.map((row, i) => (
        <div key={i} className="flex items-center" style={{ gap: 6 }}>
          <input
            value={row.key}
            placeholder={keyPlaceholder}
            onChange={(e) => {
              const next = rows.map((r, idx) => (idx === i ? { ...r, key: e.target.value } : r));
              onChange(next);
            }}
            style={input}
          />
          <input
            value={row.value}
            placeholder={valuePlaceholder}
            onChange={(e) => {
              const next = rows.map((r, idx) => (idx === i ? { ...r, value: e.target.value } : r));
              onChange(next);
            }}
            style={input}
          />
          <button
            type="button"
            aria-label="Remove property"
            onClick={() => onChange(rows.filter((_, idx) => idx !== i))}
            style={{
              background: 'transparent',
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
      <button
        type="button"
        onClick={() => onChange([...rows, { key: '', value: '' }])}
        className="flex items-center"
        style={{
          gap: 6,
          background: 'var(--surface-2)',
          color: 'var(--text-primary)',
          border: '1px solid var(--surface-border)',
          borderRadius: 6,
          padding: '6px 8px',
          fontSize: 'var(--text-sm)',
          cursor: 'pointer',
          fontFamily: 'var(--font-ui)',
        }}
      >
        <Plus size={14} />
        {addLabel}
      </button>
    </div>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="flex flex-col" style={{ gap: 8 }}>
      <div
        style={{
          color: 'var(--text-muted)',
          fontSize: 'var(--text-xs)',
          textTransform: 'uppercase',
          letterSpacing: '0.08em',
        }}
      >
        {title}
      </div>
      {children}
    </div>
  );
}

function DeleteButton({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center justify-center"
      style={{
        gap: 6,
        marginTop: 8,
        background: 'transparent',
        color: 'var(--cat-security)',
        border: '1px solid var(--surface-border)',
        borderRadius: 8,
        padding: '8px 10px',
        fontSize: 'var(--text-sm)',
        cursor: 'pointer',
        fontFamily: 'var(--font-ui)',
      }}
    >
      <Trash2 size={14} />
      {label}
    </button>
  );
}
