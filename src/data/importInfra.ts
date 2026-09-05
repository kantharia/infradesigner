import { nanoid } from 'nanoid';
import type { Edge, Node } from '@xyflow/react';
import type { InfraNodeData, SavedDiagram } from '../store/types';
import { COMPONENT_CATALOGUE } from './components';
import { emptyConfig } from './configSchemas';
import { GROUP_SIZE, GROUP_HEADER, getAbsPosition, getNodeSize, isContainerType, sortParentsFirst } from './containment';
import type { ElementClipboard } from './clipboard';
import {
  clampAnimationDots,
  clampAnimationSpeed,
  defaultEdgeData,
  markersForDirection,
  normalizeAnimationDotColor,
  readEdgeData,
  type EdgeDirection,
} from './edgeProps';
import { withResolvedHandles } from './joints';

export interface InfraSpecComponent {
  id: string;
  type: string;
  label?: string;
  notes?: string;
  parent?: string;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  config?: Record<string, string>;
}

export interface InfraSpec {
  name?: string;
  components: InfraSpecComponent[];
  connections?: Array<{
    from: string;
    to: string;
    label?: string;
    direction?: EdgeDirection;
    lineStyle?: 'solid' | 'dashed';
    animated?: boolean;
    animationSpeed?: number;
    animationDots?: number;
    animationDotColor?: string;
  }>;
}

export interface ImportResult {
  diagrams: SavedDiagram[];
  warnings: string[];
}

const CATALOGUE_IDS = new Set(COMPONENT_CATALOGUE.map((c) => c.id));

const TYPE_ALIASES: Record<string, string> = {
  postgresql: 'rdb',
  postgres: 'rdb',
  mysql: 'rdb',
  mariadb: 'rdb',
  rds: 'rdb',
  sql: 'rdb',
  mongodb: 'nosql',
  dynamodb: 'nosql',
  cassandra: 'nosql',
  redis: 'cache',
  memcached: 'cache',
  elasticache: 'cache',
  kafka: 'queue',
  rabbitmq: 'queue',
  sqs: 'queue',
  nats: 'queue',
  pubsub: 'queue',
  s3: 'object-storage',
  minio: 'object-storage',
  gcs: 'object-storage',
  blob: 'object-storage',
  kubernetes: 'k8s-cluster',
  k8s: 'k8s-cluster',
  eks: 'k8s-cluster',
  gke: 'k8s-cluster',
  aks: 'k8s-cluster',
  node: 'k8s-node',
  worker: 'worker',
  ec2: 'vm',
  instance: 'vm',
  virtualmachine: 'vm',
  virtual_machine: 'vm',
  baremetal: 'physical-server',
  server: 'physical-server',
  docker: 'container',
  pod: 'container',
  deployment: 'microservice',
  service: 'backend-svc',
  nginx: 'reverse-proxy',
  haproxy: 'reverse-proxy',
  envoy: 'reverse-proxy',
  alb: 'load-balancer',
  nlb: 'load-balancer',
  elb: 'load-balancer',
  ingress: 'api-gateway',
  apigateway: 'api-gateway',
  cognito: 'identity',
  auth0: 'identity',
  okta: 'identity',
  keycloak: 'identity',
  vault: 'secrets',
  prometheus: 'monitoring',
  datadog: 'monitoring',
  cloudwatch: 'monitoring',
  grafana: 'monitoring',
  loki: 'logging',
  elasticsearch: 'logging',
  elk: 'logging',
  jaeger: 'tracing',
  zipkin: 'tracing',
  tempo: 'tracing',
  react: 'frontend',
  wildcard: 'custom',
  generic: 'custom',
  custom: 'custom',
  zone: 'boundary',
  region: 'boundary',
  vpc: 'boundary',
  boundary: 'boundary',
};

function resolveType(raw: string): string | null {
  const key = raw.trim().toLowerCase().replace(/[\s_]+/g, '-');
  if (CATALOGUE_IDS.has(key)) return key;
  const compact = key.replace(/-/g, '');
  if (TYPE_ALIASES[key]) return TYPE_ALIASES[key];
  if (TYPE_ALIASES[compact]) return TYPE_ALIASES[compact];
  const byName = COMPONENT_CATALOGUE.find((c) => c.name.toLowerCase() === raw.trim().toLowerCase());
  return byName?.id ?? null;
}

function defFor(componentId: string) {
  return COMPONENT_CATALOGUE.find((c) => c.id === componentId);
}

function buildNode(
  spec: InfraSpecComponent,
  componentId: string,
  warnings: string[],
): Node<InfraNodeData> {
  const def = defFor(componentId)!;
  const group = isContainerType(componentId);
  const defaultSize = group ? GROUP_SIZE[componentId] : undefined;
  const node: Node<InfraNodeData> = {
    id: spec.id || nanoid(),
    type: group ? 'infraGroup' : 'infra',
    position: { x: spec.x ?? 0, y: spec.y ?? 0 },
    parentId: spec.parent,
    extent: spec.parent ? 'parent' : undefined,
    style: group
      ? {
          width: spec.width ?? defaultSize!.width,
          height: spec.height ?? defaultSize!.height,
        }
      : undefined,
    data: {
      componentId,
      label: spec.label ?? def.defaultLabel,
      category: def.category,
      notes: spec.notes ?? '',
      config: { ...(spec.config ?? {}) },
    },
  };
  if (spec.parent && !spec.x && !spec.y) {
    warnings.push(`Placed "${node.data.label}" inside its parent without coordinates.`);
  }
  return node;
}

function layoutMissingPositions(nodes: Node<InfraNodeData>[]): Node<InfraNodeData>[] {
  const byParent = new Map<string | undefined, Node<InfraNodeData>[]>();
  for (const n of nodes) {
    const key = n.parentId;
    const list = byParent.get(key) ?? [];
    list.push(n);
    byParent.set(key, list);
  }

  const COL = 220;
  const ROW = 100;
  const INNER_COL = 200;
  const INNER_ROW = 88;

  const next = nodes.map((n) => ({ ...n, position: { ...n.position } }));
  const map = new Map(next.map((n) => [n.id, n]));

  const roots = byParent.get(undefined) ?? [];
  roots.forEach((n, i) => {
    if (n.position.x === 0 && n.position.y === 0 && i > 0) {
      n.position = { x: 80 + (i % 4) * COL, y: 80 + Math.floor(i / 4) * (isContainerType(String(n.data.componentId)) ? 320 : ROW) };
    } else if (roots.length === 1 && n.position.x === 0 && n.position.y === 0) {
      n.position = { x: 80, y: 80 };
    }
  });

  for (const [parentId, children] of byParent) {
    if (!parentId) continue;
    children.forEach((n, i) => {
      const allZero = n.position.x === 0 && n.position.y === 0;
      if (allZero) {
        n.position = {
          x: 16 + (i % 3) * INNER_COL,
          y: GROUP_HEADER + 8 + Math.floor(i / 3) * INNER_ROW,
        };
      }
      const parent = map.get(parentId);
      if (parent?.style) {
        const w = Number(parent.style.width) || 400;
        const h = Number(parent.style.height) || 240;
        parent.style = {
          ...parent.style,
          width: Math.max(w, n.position.x + 200),
          height: Math.max(h, n.position.y + 80),
        };
      }
    });
  }

  return next;
}

function specToDiagram(spec: InfraSpec, warnings: string[]): SavedDiagram {
  const nodes: Node<InfraNodeData>[] = [];
  const idSet = new Set<string>();

  for (const item of spec.components) {
    const type = resolveType(item.type);
    if (!type) {
      warnings.push(`Skipped unknown type "${item.type}" (${item.id}).`);
      continue;
    }
    if (!item.id) {
      warnings.push(`Skipped a component of type ${type} with no id.`);
      continue;
    }
    if (idSet.has(item.id)) {
      warnings.push(`Duplicate id "${item.id}" skipped.`);
      continue;
    }
    idSet.add(item.id);
    nodes.push(buildNode(item, type, warnings));
  }

  const validIds = new Set(nodes.map((n) => n.id));
  for (const n of nodes) {
    if (n.parentId && !validIds.has(n.parentId)) {
      warnings.push(`Parent "${n.parentId}" missing for "${n.data.label}". Placed on canvas.`);
      n.parentId = undefined;
      n.extent = undefined;
    }
  }

  const laidOut = layoutMissingPositions(nodes);
  const edges: Edge[] = (spec.connections ?? []).flatMap((c) => {
    if (!validIds.has(c.from) || !validIds.has(c.to)) {
      warnings.push(`Skipped connection ${c.from} → ${c.to}.`);
      return [];
    }
    const resolved = withResolvedHandles(
      { source: c.from, target: c.to },
      laidOut,
    );
    return [{
      id: nanoid(),
      source: resolved.source,
      target: resolved.target,
      sourceHandle: resolved.sourceHandle,
      targetHandle: resolved.targetHandle,
      zIndex: resolved.zIndex,
      type: 'infra',
      label: c.label,
      data: {
        ...defaultEdgeData(),
        direction: c.direction ?? 'forward',
        lineStyle: c.lineStyle ?? 'solid',
        animated: Boolean(c.animated),
        animationSpeed: clampAnimationSpeed(c.animationSpeed),
        animationDots: clampAnimationDots(c.animationDots),
        animationDotColor: normalizeAnimationDotColor(c.animationDotColor),
      },
      ...markersForDirection(c.direction ?? 'forward'),
    }];
  });

  return {
    id: nanoid(),
    name: spec.name?.trim() || 'Imported architecture',
    updatedAt: new Date().toISOString(),
    nodes: sortParentsFirst(laidOut),
    edges,
    viewport: { x: 0, y: 0, zoom: 1 },
  };
}

function isSavedDiagram(value: unknown): value is SavedDiagram {
  if (!value || typeof value !== 'object') return false;
  const v = value as SavedDiagram;
  return Array.isArray(v.nodes) && Array.isArray(v.edges);
}

function sanitizeDiagram(raw: SavedDiagram): SavedDiagram {
  const nodes = sortParentsFirst(
    raw.nodes.map((n) => {
      const componentId = String(n.data?.componentId ?? '');
      const def = defFor(componentId);
      const group = isContainerType(componentId);
      return {
        ...n,
        type: group ? 'infraGroup' : n.type || 'infra',
        selected: false,
        data: {
          componentId,
          label: String(n.data?.label ?? def?.defaultLabel ?? componentId),
          category: def?.category ?? String(n.data?.category ?? 'compute'),
          notes: String(n.data?.notes ?? ''),
          config: { ...(n.data?.config ?? emptyConfig()) },
        },
      } as Node<InfraNodeData>;
    }),
  );
  return {
    id: raw.id || nanoid(),
    name: raw.name?.trim() || 'Imported architecture',
    updatedAt: raw.updatedAt || new Date().toISOString(),
    nodes,
    edges: raw.edges.map((e) => {
      const meta = readEdgeData(e);
      return {
        ...e,
        selected: false,
        type: e.type || 'infra',
        data: { ...defaultEdgeData(), ...e.data, ...meta },
        ...markersForDirection(meta.direction),
      };
    }),
    viewport: raw.viewport ?? { x: 0, y: 0, zoom: 1 },
  };
}

function k8sKindToType(kind: string): string | null {
  switch (kind) {
    case 'Deployment':
    case 'ReplicaSet':
      return 'microservice';
    case 'StatefulSet':
      return 'backend-svc';
    case 'DaemonSet':
    case 'Job':
    case 'CronJob':
      return 'worker';
    case 'Pod':
      return 'container';
    case 'Service':
      return 'load-balancer';
    case 'Ingress':
      return 'api-gateway';
    case 'ConfigMap':
    case 'Secret':
      return 'secrets';
    case 'PersistentVolumeClaim':
    case 'PersistentVolume':
      return 'object-storage';
    case 'Namespace':
      return 'k8s-cluster';
    default:
      return null;
  }
}

function fromKubernetesJson(data: Record<string, unknown>, warnings: string[]): InfraSpec | null {
  const items: Record<string, unknown>[] = [];
  if (Array.isArray(data.items)) {
    items.push(...(data.items as Record<string, unknown>[]));
  } else if (typeof data.kind === 'string' && data.metadata) {
    items.push(data);
  } else {
    return null;
  }

  const components: InfraSpecComponent[] = [];
  const clusterId = 'imported-cluster';
  const hasWorkload = items.some((it) =>
    ['Deployment', 'StatefulSet', 'DaemonSet', 'Pod', 'Job', 'CronJob'].includes(String(it.kind)),
  );
  if (hasWorkload) {
    components.push({
      id: clusterId,
      type: 'k8s-cluster',
      label: 'Imported cluster',
      x: 80,
      y: 80,
    });
  }

  items.forEach((item, i) => {
    const kind = String(item.kind ?? '');
    const type = k8sKindToType(kind);
    if (!type) {
      warnings.push(`Skipped Kubernetes kind "${kind}".`);
      return;
    }
    const meta = (item.metadata ?? {}) as { name?: string; uid?: string };
    const id = String(meta.uid || meta.name || `${kind}-${i}`);
    const nest =
      hasWorkload && type !== 'k8s-cluster' && ['microservice', 'backend-svc', 'worker', 'container'].includes(type);
    components.push({
      id,
      type,
      label: meta.name || kind,
      parent: nest ? clusterId : undefined,
    });
  });

  if (components.length === 0) return null;
  return { name: 'Imported Kubernetes', components };
}

function fromTerraformJson(data: Record<string, unknown>, warnings: string[]): InfraSpec | null {
  const resource = data.resource;
  if (!resource || typeof resource !== 'object') return null;
  const components: InfraSpecComponent[] = [];
  for (const [tfType, instances] of Object.entries(resource as Record<string, unknown>)) {
    const mapped = resolveType(tfType.replace(/^aws_/, '').replace(/^google_/, '').replace(/^azurerm_/, ''))
      ?? resolveType(tfType);
    if (!mapped) {
      const extra: Record<string, string> = {
        aws_lb: 'load-balancer',
        aws_alb: 'load-balancer',
        aws_ecs_service: 'backend-svc',
        aws_ecs_task_definition: 'container',
        aws_eks_cluster: 'k8s-cluster',
        aws_eks_node_group: 'k8s-node',
        aws_instance: 'vm',
        aws_db_instance: 'rdb',
        aws_elasticache_cluster: 'cache',
        aws_sqs_queue: 'queue',
        aws_s3_bucket: 'object-storage',
        aws_cognito_user_pool: 'identity',
        aws_secretsmanager_secret: 'secrets',
        kubernetes_deployment: 'microservice',
        kubernetes_service: 'load-balancer',
      };
      const hit = extra[tfType];
      if (!hit) {
        warnings.push(`Skipped Terraform type "${tfType}".`);
        continue;
      }
      if (instances && typeof instances === 'object') {
        for (const name of Object.keys(instances as object)) {
          components.push({ id: `${tfType}.${name}`, type: hit, label: name });
        }
      }
      continue;
    }
    if (instances && typeof instances === 'object') {
      for (const name of Object.keys(instances as object)) {
        components.push({ id: `${tfType}.${name}`, type: mapped, label: name });
      }
    }
  }
  if (components.length === 0) return null;
  return { name: 'Imported Terraform', components };
}

export function parseInfraImport(jsonText: string): ImportResult {
  const warnings: string[] = [];
  let data: unknown;
  try {
    data = JSON.parse(jsonText);
  } catch {
    throw new Error('File is not valid JSON.');
  }

  if (Array.isArray(data) && data.every(isSavedDiagram)) {
    return { diagrams: data.map(sanitizeDiagram), warnings };
  }

  if (data && typeof data === 'object' && Array.isArray((data as { diagrams?: unknown }).diagrams)) {
    const list = (data as { diagrams: unknown[] }).diagrams.filter(isSavedDiagram).map(sanitizeDiagram);
    if (list.length) return { diagrams: list, warnings };
  }

  if (isSavedDiagram(data)) {
    return { diagrams: [sanitizeDiagram(data)], warnings };
  }

  if (data && typeof data === 'object' && Array.isArray((data as InfraSpec).components)) {
    return { diagrams: [specToDiagram(data as InfraSpec, warnings)], warnings };
  }

  if (data && typeof data === 'object') {
    const k8s = fromKubernetesJson(data as Record<string, unknown>, warnings);
    if (k8s) return { diagrams: [specToDiagram(k8s, warnings)], warnings };
    const tf = fromTerraformJson(data as Record<string, unknown>, warnings);
    if (tf) return { diagrams: [specToDiagram(tf, warnings)], warnings };
  }

  throw new Error(
    'Unrecognised format. Use an Infra Designer export, an infra spec ({ components, connections }), Kubernetes JSON, or Terraform JSON.',
  );
}

export function diagramToExportJson(diagram: {
  name: string;
  nodes: Node<InfraNodeData>[];
  edges: Edge[];
  viewport: SavedDiagram['viewport'];
}): string {
  const payload: SavedDiagram = {
    id: nanoid(),
    name: diagram.name,
    updatedAt: new Date().toISOString(),
    nodes: diagram.nodes.map((n) => ({ ...n, selected: false })),
    edges: diagram.edges.map((e) => ({ ...e, selected: false })),
    viewport: diagram.viewport,
  };
  return JSON.stringify(payload, null, 2);
}

export function downloadTextFile(filename: string, contents: string, mime = 'application/json'): void {
  const blob = new Blob([contents], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function pickJsonFile(): Promise<string> {
  return new Promise((resolve, reject) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/json,.json';
    input.onchange = () => {
      const file = input.files?.[0];
      if (!file) {
        reject(new Error('No file selected.'));
        return;
      }
      file.text().then(resolve).catch(reject);
    };
    input.click();
  });
}

export async function importInfraFromFile(
  importIntoSession: (diagrams: SavedDiagram[]) => void,
): Promise<void> {
  try {
    const text = await pickJsonFile();
    applyImportedText(text, importIntoSession);
  } catch (err) {
    if (err instanceof Error && err.message === 'No file selected.') return;
    window.alert(err instanceof Error ? err.message : 'Import failed.');
  }
}

export function applyImportedText(
  text: string,
  importIntoSession: (diagrams: SavedDiagram[]) => void,
): boolean {
  try {
    const result = parseInfraImport(text);
    importIntoSession(result.diagrams);
    if (result.warnings.length > 0) {
      window.alert(result.warnings.slice(0, 16).join('\n'));
    }
    return true;
  } catch (err) {
    window.alert(err instanceof Error ? err.message : 'Import failed.');
    return false;
  }
}

export function diagramToClipboard(diagram: SavedDiagram): ElementClipboard {
  const abs: Record<string, { x: number; y: number }> = {};
  for (const node of diagram.nodes) {
    abs[node.id] = getAbsPosition(node, diagram.nodes);
  }
  return { nodes: diagram.nodes, abs, edges: diagram.edges };
}

export function placementOffset(
  incoming: Node<InfraNodeData>[],
  live: Node<InfraNodeData>[],
): { x: number; y: number } {
  let inMinX = Infinity;
  let inMinY = Infinity;
  for (const node of incoming) {
    const abs = getAbsPosition(node, incoming);
    inMinX = Math.min(inMinX, abs.x);
    inMinY = Math.min(inMinY, abs.y);
  }
  if (!Number.isFinite(inMinX)) {
    inMinX = 0;
    inMinY = 0;
  }
  if (live.length === 0) {
    return { x: 80 - inMinX, y: 80 - inMinY };
  }
  let maxX = 0;
  let minY = Infinity;
  for (const node of live) {
    if (node.parentId) continue;
    const abs = getAbsPosition(node, live);
    const size = getNodeSize(node);
    maxX = Math.max(maxX, abs.x + size.width);
    minY = Math.min(minY, abs.y);
  }
  return {
    x: maxX + 80 - inMinX,
    y: (Number.isFinite(minY) ? minY : 80) - inMinY,
  };
}

export async function copyTextToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    try {
      const area = document.createElement('textarea');
      area.value = text;
      area.style.position = 'fixed';
      area.style.left = '-9999px';
      document.body.appendChild(area);
      area.select();
      const ok = document.execCommand('copy');
      document.body.removeChild(area);
      return ok;
    } catch {
      return false;
    }
  }
}
