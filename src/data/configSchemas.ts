import { parseCustomKv } from './appearance';

export type FieldType = 'text' | 'textarea' | 'number' | 'select' | 'toggle';

export interface ConfigField {
  key: string;
  label: string;
  type: FieldType;
  placeholder?: string;
  options?: string[];
  optionLabels?: Record<string, string>;
  defaultValue: string;
}

const env: ConfigField = {
  key: 'environment',
  label: 'Environment',
  type: 'select',
  options: ['dev', 'staging', 'prod'],
  defaultValue: 'dev',
};

const owner: ConfigField = {
  key: 'owner',
  label: 'Owner',
  type: 'text',
  placeholder: 'Team or person',
  defaultValue: '',
};

function t(key: string, label: string, placeholder = '', defaultValue = ''): ConfigField {
  return { key, label, type: 'text', placeholder, defaultValue };
}

function n(key: string, label: string, defaultValue = ''): ConfigField {
  return { key, label, type: 'number', placeholder: defaultValue, defaultValue };
}

function s(key: string, label: string, options: string[], defaultValue: string): ConfigField {
  return { key, label, type: 'select', options, defaultValue };
}

function b(key: string, label: string, defaultValue = 'false'): ConfigField {
  return { key, label, type: 'toggle', defaultValue };
}

const COMMON: ConfigField[] = [env, owner];

const SCHEMAS: Record<string, ConfigField[]> = {
  internet: [
    s('provider', 'Provider', ['Public internet', 'Private WAN', 'Partner'], 'Public internet'),
    t('bandwidth', 'Bandwidth', 'e.g. 1 Gbps'),
    b('cdnFronted', 'Behind CDN'),
  ],
  dns: [
    t('zone', 'DNS zone', 'example.com'),
    s('recordType', 'Primary record', ['A', 'AAAA', 'CNAME', 'MX'], 'A'),
    t('ttl', 'TTL (seconds)', '300', '300'),
    s('provider', 'Provider', ['Cloud DNS', 'Route53', 'Cloudflare', 'Bind'], 'Cloud DNS'),
  ],
  'load-balancer': [
    s('algorithm', 'Algorithm', ['round-robin', 'least-connections', 'ip-hash'], 'round-robin'),
    t('listenPort', 'Listen port', '443', '443'),
    s('protocol', 'Protocol', ['HTTP', 'HTTPS', 'TCP', 'UDP'], 'HTTPS'),
    b('healthChecks', 'Health checks', 'true'),
  ],
  'api-gateway': [
    s('technology', 'Technology', ['APISIX', 'Kong', 'Amazon API Gateway', 'NGINX'], ''),
    t('basePath', 'Base path', '/api/v1', '/api'),
    s('auth', 'Auth', ['none', 'API key', 'JWT', 'mTLS'], 'JWT'),
    n('rateLimit', 'Rate limit (rpm)', '1000'),
    b('cors', 'CORS enabled', 'true'),
  ],
  'reverse-proxy': [
    s('technology', 'Technology', ['Nginx', 'Envoy', 'HAProxy', 'Traefik'], ''),
    t('upstream', 'Upstream', 'http://service:8080'),
    s('tls', 'TLS', ['passthrough', 'terminate', 'none'], 'terminate'),
    t('timeout', 'Timeout', '30s', '30s'),
  ],
  firewall: [
    s('direction', 'Direction', ['inbound', 'outbound', 'both'], 'inbound'),
    t('allowPorts', 'Allow ports', '80, 443'),
    t('denyCidrs', 'Deny CIDRs'),
    b('stateful', 'Stateful', 'true'),
  ],
  waf: [
    s('technology', 'Technology', ['Cloudflare', 'AWS WAF', 'ModSecurity'], ''),
    s('mode', 'Mode', ['detect', 'block'], 'block'),
    t('ruleset', 'Ruleset', 'OWASP CRS'),
    b('botProtection', 'Bot protection', 'true'),
  ],
  vm: [
    t('os', 'OS', 'Ubuntu 24.04'),
    n('vcpu', 'vCPU', '2'),
    t('memory', 'Memory', '8 GiB', '8 GiB'),
    t('disk', 'Disk', '50 GiB SSD'),
  ],
  'physical-server': [
    t('cpu', 'CPU', 'e.g. 32 cores'),
    t('memory', 'Memory', '256 GiB'),
    t('rack', 'Rack / location'),
    s('raid', 'RAID', ['none', 'RAID1', 'RAID10', 'RAID6'], 'RAID10'),
  ],
  'k8s-cluster': [
    t('version', 'Kubernetes version', '1.31'),
    s('distro', 'Distro', ['EKS', 'GKE', 'AKS', 'k3s', 'kubeadm'], 'kubeadm'),
    n('nodeCount', 'Node count', '3'),
    b('autoscaling', 'Cluster autoscaler'),
  ],
  'k8s-node': [
    s('role', 'Role', ['worker', 'control-plane'], 'worker'),
    t('instanceType', 'Instance type', 'm6i.large'),
    t('zone', 'Availability zone'),
  ],
  container: [
    t('image', 'Image', 'ghcr.io/org/app:tag'),
    n('cpuLimit', 'CPU limit (m)', '500'),
    t('memoryLimit', 'Memory limit', '512Mi', '512Mi'),
    n('replicas', 'Replicas', '1'),
  ],
  frontend: [
    s('framework', 'Framework', ['React', 'Vue', 'Angular', 'Svelte', 'Next.js'], 'React'),
    t('publicUrl', 'Public URL', 'https://app.example.com'),
    s('hosting', 'Hosting', ['CDN', 'Nginx', 'Object storage', 'App platform'], 'CDN'),
  ],
  'backend-svc': [
    s('language', 'Language', ['Go', 'TypeScript', 'Python', 'Java', 'Rust'], 'TypeScript'),
    t('listenPort', 'Port', '8080', '8080'),
    n('replicas', 'Replicas', '2'),
    t('healthPath', 'Health path', '/health', '/health'),
  ],
  microservice: [
    t('serviceName', 'Service name'),
    s('protocol', 'Protocol', ['HTTP', 'gRPC', 'GraphQL'], 'HTTP'),
    n('replicas', 'Replicas', '2'),
    b('circuitBreaker', 'Circuit breaker'),
  ],
  worker: [
    t('queue', 'Consumes from'),
    n('concurrency', 'Concurrency', '4'),
    s('runtime', 'Runtime', ['container', 'VM', 'serverless'], 'container'),
  ],
  rdb: [
    s('engine', 'Engine', ['PostgreSQL', 'MySQL', 'SQL Server', 'MariaDB'], 'PostgreSQL'),
    t('version', 'Version', '16'),
    t('storage', 'Storage', '100 GiB'),
    b('multiAz', 'Multi-AZ'),
  ],
  nosql: [
    s('engine', 'Engine', ['MongoDB', 'DynamoDB', 'Cassandra', 'Redis', 'Neo4j'], 'MongoDB'),
    t('consistency', 'Consistency', 'eventual'),
    t('storage', 'Storage'),
  ],
  cache: [
    s('engine', 'Engine', ['Redis', 'Memcached', 'KeyDB'], 'Redis'),
    t('eviction', 'Eviction', 'allkeys-lru', 'allkeys-lru'),
    t('memory', 'Memory', '4 GiB', '4 GiB'),
    b('clustered', 'Clustered'),
  ],
  queue: [
    s('engine', 'Engine', ['Kafka', 'RabbitMQ', 'SQS', 'NATS', 'Pub/Sub'], 'Kafka'),
    t('topic', 'Topic / queue name'),
    n('partitions', 'Partitions', '3'),
    b('persistent', 'Persistent', 'true'),
  ],
  'object-storage': [
    s('provider', 'Provider', ['S3', 'GCS', 'Azure Blob', 'MinIO'], 'S3'),
    t('bucket', 'Bucket name'),
    s('access', 'Access', ['private', 'public-read'], 'private'),
    b('versioning', 'Versioning'),
  ],
  identity: [
    s('technology', 'Technology', ['Keycloak', 'Auth0', 'Okta', 'Cognito'], ''),
    s('protocol', 'Protocol', ['OIDC', 'SAML', 'LDAP'], 'OIDC'),
    t('issuer', 'Issuer URL'),
    s('mfa', 'MFA', ['optional', 'required', 'off'], 'optional'),
  ],
  secrets: [
    s('backend', 'Backend', ['Vault', 'AWS SM', 'GCP SM', 'Azure KV'], 'Vault'),
    t('path', 'Secrets path', 'secret/app'),
    b('rotation', 'Auto rotation'),
  ],
  monitoring: [
    s('stack', 'Stack', ['Prometheus', 'Datadog', 'CloudWatch', 'Grafana Cloud'], 'Prometheus'),
    t('scrapeInterval', 'Scrape interval', '15s', '15s'),
    t('retention', 'Retention', '15d', '15d'),
  ],
  logging: [
    s('stack', 'Stack', ['Loki', 'ELK', 'CloudWatch', 'Datadog'], 'Loki'),
    t('retention', 'Retention', '30d', '30d'),
    b('structured', 'Structured logs', 'true'),
  ],
  tracing: [
    s('stack', 'Stack', ['Tempo', 'Jaeger', 'Zipkin', 'Honeycomb'], 'Tempo'),
    s('sampling', 'Sampling', ['always', 'probabilistic', 'tail'], 'probabilistic'),
    t('sampleRate', 'Sample rate', '0.1', '0.1'),
  ],
  boundary: [
    t('caption', 'Caption', 'e.g. DMZ / VPC / Availability zone'),
    n('dotSize', 'Dot size (px)', '3'),
  ],
  custom: [],
};

export const APPEARANCE_FIELDS: ConfigField[] = [
  s('accent', 'Accent colour', ['default', 'networking', 'compute', 'application', 'data', 'security', 'observability'], 'default'),
];

export const COMPUTE_FIELDS: ConfigField[] = [
  n('vmCount', 'No. of VMs', '1'),
  t('os', 'OS', 'Ubuntu'),
  t('osVersion', 'OS version', '24.04'),
  t('vcpu', 'vCPU', '2'),
  t('memory', 'RAM', '8 GiB', '8 GiB'),
  t('disk', 'Storage', '50 GiB SSD'),
];

const COMPUTE_FIELD_KEYS = new Set(COMPUTE_FIELDS.map((f) => f.key));

const DEFAULT_COMPUTE_TYPES = new Set(['vm', 'physical-server', 'k8s-node', 'container']);

export function isComputeEnabled(
  componentId: string,
  config: Record<string, string> | undefined,
): boolean {
  const raw = config?.isCompute;
  if (raw === 'true') return true;
  if (raw === 'false') return false;
  return DEFAULT_COMPUTE_TYPES.has(componentId);
}

export function getConfigFields(componentId: string, config?: Record<string, string>): ConfigField[] {
  const fields = [...COMMON, ...(SCHEMAS[componentId] ?? [t('notesExtra', 'Notes')])];
  if (!isComputeEnabled(componentId, config)) return fields;
  return fields.filter((f) => !COMPUTE_FIELD_KEYS.has(f.key));
}

export function emptyConfig(): Record<string, string> {
  return {};
}

export interface PropertyChip {
  key: string;
  text: string;
}

export function visibleNodeProperties(
  componentId: string,
  config: Record<string, string> | undefined,
  notes: string | undefined,
): PropertyChip[] {
  const chips: PropertyChip[] = [];
  const cfg = config ?? {};

  for (const field of [...APPEARANCE_FIELDS, ...getConfigFields(componentId, cfg)]) {
    if (field.key === 'accent' || field.key === 'fillColor' || field.key === 'fillOpacity' || field.key === 'dotColor' || field.key === 'dotSize' || field.key === 'iconName' || field.key === 'customKv' || field.key === 'typeLabel') continue;
    const raw = (cfg[field.key] ?? '').trim();
    if (!raw) continue;
    if (field.type === 'toggle') {
      if (raw === 'true') chips.push({ key: field.key, text: field.label });
      continue;
    }
    chips.push({ key: field.key, text: `${field.label}: ${raw}` });
  }

  for (const row of parseCustomKv(cfg.customKv)) {
    chips.push({ key: `kv-${row.key}`, text: `${row.key}: ${row.value}` });
  }

  if (isComputeEnabled(componentId, cfg)) {
    for (const field of COMPUTE_FIELDS) {
      const raw = (cfg[field.key] ?? '').trim();
      if (raw) chips.push({ key: field.key, text: `${field.label}: ${raw}` });
    }
    for (const row of parseCustomKv(cfg.computeExtraStorage)) {
      chips.push({ key: `stor-${row.key}`, text: `${row.key}: ${row.value}` });
    }
  }

  const note = (notes ?? '').trim();
  if (note) {
    chips.push({ key: 'notes', text: note });
  }

  return chips;
}
