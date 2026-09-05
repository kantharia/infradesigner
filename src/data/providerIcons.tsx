import type { SimpleIcon } from 'simple-icons';
import {
  siAngular,
  siApache,
  siApachecassandra,
  siApachekafka,
  siAuth0,
  siCloudflare,
  siDatadog,
  siDocker,
  siElasticsearch,
  siEnvoyproxy,
  siGo,
  siGooglecloud,
  siGrafana,
  siJaeger,
  siK3s,
  siKeycloak,
  siKong,
  siKubernetes,
  siMariadb,
  siMinio,
  siMongodb,
  siMysql,
  siNatsdotio,
  siNeo4j,
  siNextdotjs,
  siNginx,
  siOkta,
  siOpenjdk,
  siPostgresql,
  siPrometheus,
  siPython,
  siRabbitmq,
  siReact,
  siRedis,
  siRust,
  siSvelte,
  siTraefikproxy,
  siTypescript,
  siUbuntu,
  siVault,
  siVuedotjs,
} from 'simple-icons';
import { getComponentIcon } from './components';

const BY_SLUG: Record<string, SimpleIcon> = {
  postgresql: siPostgresql,
  mysql: siMysql,
  mariadb: siMariadb,
  mongodb: siMongodb,
  redis: siRedis,
  neo4j: siNeo4j,
  apachecassandra: siApachecassandra,
  apachekafka: siApachekafka,
  rabbitmq: siRabbitmq,
  natsdotio: siNatsdotio,
  googlecloud: siGooglecloud,
  minio: siMinio,
  prometheus: siPrometheus,
  datadog: siDatadog,
  grafana: siGrafana,
  elasticsearch: siElasticsearch,
  jaeger: siJaeger,
  kubernetes: siKubernetes,
  k3s: siK3s,
  react: siReact,
  vuedotjs: siVuedotjs,
  angular: siAngular,
  svelte: siSvelte,
  nextdotjs: siNextdotjs,
  go: siGo,
  typescript: siTypescript,
  python: siPython,
  openjdk: siOpenjdk,
  rust: siRust,
  nginx: siNginx,
  cloudflare: siCloudflare,
  vault: siVault,
  keycloak: siKeycloak,
  auth0: siAuth0,
  okta: siOkta,
  apache: siApache,
  kong: siKong,
  envoyproxy: siEnvoyproxy,
  traefikproxy: siTraefikproxy,
  docker: siDocker,
  ubuntu: siUbuntu,
};

const ALIASES: Record<string, string> = {
  postgresql: 'postgresql',
  postgres: 'postgresql',
  mysql: 'mysql',
  mariadb: 'mariadb',
  'sql server': 'amazonwebservices',
  mongodb: 'mongodb',
  dynamodb: 'amazonwebservices',
  cassandra: 'apachecassandra',
  redis: 'redis',
  neo4j: 'neo4j',
  memcached: 'memcached',
  kafka: 'apachekafka',
  rabbitmq: 'rabbitmq',
  sqs: 'amazonwebservices',
  nats: 'natsdotio',
  'pub/sub': 'googlecloud',
  pubsub: 'googlecloud',
  s3: 'amazonwebservices',
  gcs: 'googlecloud',
  'azure blob': 'microsoftazure',
  minio: 'minio',
  prometheus: 'prometheus',
  datadog: 'datadog',
  cloudwatch: 'amazonwebservices',
  'grafana cloud': 'grafana',
  grafana: 'grafana',
  loki: 'grafana',
  elk: 'elasticsearch',
  elasticsearch: 'elasticsearch',
  tempo: 'grafana',
  jaeger: 'jaeger',
  kubernetes: 'kubernetes',
  k8s: 'kubernetes',
  eks: 'amazonwebservices',
  gke: 'googlecloud',
  aks: 'microsoftazure',
  k3s: 'k3s',
  kubeadm: 'kubernetes',
  react: 'react',
  vue: 'vuedotjs',
  angular: 'angular',
  svelte: 'svelte',
  'next.js': 'nextdotjs',
  nextjs: 'nextdotjs',
  go: 'go',
  typescript: 'typescript',
  python: 'python',
  java: 'openjdk',
  rust: 'rust',
  nginx: 'nginx',
  cloudflare: 'cloudflare',
  route53: 'amazonwebservices',
  'cloud dns': 'googlecloud',
  vault: 'vault',
  'hashicorp vault': 'vault',
  'aws sm': 'amazonwebservices',
  'gcp sm': 'googlecloud',
  'azure kv': 'microsoftazure',
  keycloak: 'keycloak',
  auth0: 'auth0',
  okta: 'okta',
  cognito: 'amazonwebservices',
  apisix: 'apache',
  'apache apisix': 'apache',
  kong: 'kong',
  'amazon api gateway': 'amazonwebservices',
  envoy: 'envoyproxy',
  haproxy: 'haproxy',
  traefik: 'traefikproxy',
  docker: 'docker',
  ubuntu: 'ubuntu',
};

const HINT_KEYS = [
  'technology',
  'engine',
  'stack',
  'provider',
  'backend',
  'framework',
  'language',
  'distro',
  'hosting',
];

function normalize(value: string): string {
  return value.trim().toLowerCase().replace(/[_]+/g, ' ');
}

export function resolveProviderIcon(value: string | undefined): SimpleIcon | null {
  if (!value) return null;
  const key = normalize(value);
  const slug = ALIASES[key] ?? ALIASES[key.replace(/[\s./-]+/g, '')];
  if (slug && BY_SLUG[slug]) return BY_SLUG[slug];
  if (BY_SLUG[key.replace(/\s+/g, '')]) return BY_SLUG[key.replace(/\s+/g, '')];
  return null;
}

export function resolveProviderSlug(value: string | undefined): string | null {
  return resolveProviderIcon(value)?.slug ?? null;
}

export function providerHintFromConfig(config: Record<string, string> | undefined): string {
  const cfg = config ?? {};
  for (const key of HINT_KEYS) {
    if (cfg[key]?.trim()) return cfg[key];
  }
  return '';
}

function contrastFill(hex: string): string {
  const r = parseInt(hex.slice(0, 2), 16);
  const g = parseInt(hex.slice(2, 4), 16);
  const b = parseInt(hex.slice(4, 6), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance < 0.18 ? 'var(--text-primary)' : `#${hex}`;
}

export function TechIcon({
  hint,
  fallbackName,
  size = 20,
  color,
}: {
  hint?: string;
  fallbackName: string;
  size?: number;
  color?: string;
}) {
  const brand = resolveProviderIcon(hint);
  const Fallback = getComponentIcon(fallbackName);

  if (!brand) {
    return (
      <Fallback
        size={size}
        strokeWidth={1.75}
        color={color}
        style={{ color, flexShrink: 0, display: 'block' }}
      />
    );
  }

  return (
    <svg
      role="img"
      viewBox="0 0 24 24"
      width={size}
      height={size}
      aria-label={brand.title}
      style={{ flexShrink: 0, display: 'block' }}
    >
      <path d={brand.path} fill={contrastFill(brand.hex)} />
    </svg>
  );
}
