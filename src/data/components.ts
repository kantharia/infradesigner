import {
  Activity,
  AppWindow,
  ArrowLeftRight,
  Bookmark,
  Box,
  Braces,
  Circle,
  Cloud,
  Cog,
  Container,
  Cpu,
  Database,
  DatabaseZap,
  Flag,
  GitFork,
  GitGraph,
  Globe,
  HardDrive,
  Hash,
  Hexagon,
  KeyRound,
  Layers,
  List,
  Lock,
  Monitor,
  Puzzle,
  ScrollText,
  Server,
  Shapes,
  Shield,
  ShieldAlert,
  Sparkles,
  SquareDashed,
  Star,
  Tag,
  Waypoints,
  Zap,
} from 'lucide-react';

export type ComponentCategory =
  | 'networking'
  | 'compute'
  | 'application'
  | 'data'
  | 'security'
  | 'observability'
  | 'custom';

export interface ComponentDefinition {
  id: string;
  name: string;
  category: ComponentCategory;
  description: string;
  icon: string;           // Lucide icon name
  defaultLabel: string;
}

export const COMPONENT_CATALOGUE: ComponentDefinition[] = [
  // Networking
  { id: 'internet',       name: 'Internet',       category: 'networking',    description: 'Public internet entry point',              icon: 'Globe',          defaultLabel: 'Internet'         },
  { id: 'dns',            name: 'DNS',             category: 'networking',    description: 'Domain name resolution',                   icon: 'Waypoints',      defaultLabel: 'DNS'              },
  { id: 'load-balancer',  name: 'Load Balancer',   category: 'networking',    description: 'Distributes traffic across instances',     icon: 'GitFork',        defaultLabel: 'Load Balancer'    },
  { id: 'api-gateway',    name: 'API Gateway',     category: 'networking',    description: 'Manages and routes API traffic',           icon: 'Layers',         defaultLabel: 'API Gateway'      },
  { id: 'reverse-proxy',  name: 'Reverse Proxy',   category: 'networking',    description: 'Proxies requests to backend services',     icon: 'ArrowLeftRight', defaultLabel: 'Reverse Proxy'    },
  { id: 'firewall',       name: 'Firewall',        category: 'networking',    description: 'Controls inbound and outbound traffic',    icon: 'Shield',         defaultLabel: 'Firewall'         },
  { id: 'waf',            name: 'WAF',             category: 'networking',    description: 'Web application firewall',                 icon: 'ShieldAlert',    defaultLabel: 'WAF'              },
  // Compute
  { id: 'vm',             name: 'Virtual Machine', category: 'compute',       description: 'Virtualised compute instance',             icon: 'Monitor',        defaultLabel: 'VM'               },
  { id: 'physical-server',name: 'Physical Server', category: 'compute',       description: 'Bare metal server',                        icon: 'Server',         defaultLabel: 'Physical Server'  },
  { id: 'k8s-cluster',    name: 'K8s Cluster',     category: 'compute',       description: 'Kubernetes cluster',                       icon: 'Container',      defaultLabel: 'K8s Cluster'      },
  { id: 'k8s-node',       name: 'K8s Node',        category: 'compute',       description: 'Kubernetes worker node',                   icon: 'Cpu',            defaultLabel: 'K8s Node'         },
  { id: 'container',      name: 'Container',       category: 'compute',       description: 'Application container',                    icon: 'Box',            defaultLabel: 'Container'        },
  // Application
  { id: 'frontend',       name: 'Frontend',        category: 'application',   description: 'Web or mobile client application',        icon: 'AppWindow',      defaultLabel: 'Frontend'         },
  { id: 'backend-svc',    name: 'Backend Service', category: 'application',   description: 'Server-side application service',         icon: 'Braces',         defaultLabel: 'Backend Service'  },
  { id: 'microservice',   name: 'Microservice',    category: 'application',   description: 'Independently deployable service',         icon: 'Puzzle',         defaultLabel: 'Microservice'     },
  { id: 'worker',         name: 'Worker',          category: 'application',   description: 'Background processing service',            icon: 'Cog',            defaultLabel: 'Worker'           },
  // Data
  { id: 'rdb',            name: 'Relational DB',   category: 'data',          description: 'SQL relational database',                  icon: 'Database',       defaultLabel: 'Database'         },
  { id: 'nosql',          name: 'NoSQL Database',  category: 'data',          description: 'Document, key-value or graph store',       icon: 'DatabaseZap',    defaultLabel: 'NoSQL'            },
  { id: 'cache',          name: 'Cache',           category: 'data',          description: 'In-memory caching layer',                  icon: 'Zap',            defaultLabel: 'Cache'            },
  { id: 'queue',          name: 'Message Queue',   category: 'data',          description: 'Async message broker',                     icon: 'List',           defaultLabel: 'Message Queue'    },
  { id: 'object-storage', name: 'Object Storage',  category: 'data',          description: 'Blob and file storage',                    icon: 'HardDrive',      defaultLabel: 'Object Storage'   },
  // Security
  { id: 'identity',       name: 'Identity Provider', category: 'security',    description: 'Authentication and identity management',   icon: 'KeyRound',       defaultLabel: 'Identity Provider'},
  { id: 'secrets',        name: 'Secrets Manager', category: 'security',      description: 'Secrets and credential management',        icon: 'Lock',           defaultLabel: 'Secrets Manager'  },
  // Observability
  { id: 'monitoring',     name: 'Monitoring',      category: 'observability', description: 'Metrics collection and alerting',          icon: 'Activity',       defaultLabel: 'Monitoring'       },
  { id: 'logging',        name: 'Logging',         category: 'observability', description: 'Centralised log aggregation',              icon: 'ScrollText',     defaultLabel: 'Logging'          },
  { id: 'tracing',        name: 'Tracing',         category: 'observability', description: 'Distributed request tracing',              icon: 'GitGraph',       defaultLabel: 'Tracing'          },
  { id: 'boundary',       name: 'Boundary',        category: 'custom',        description: 'Dotted region to group components',        icon: 'SquareDashed',   defaultLabel: 'Boundary'         },
  { id: 'custom',         name: 'Custom',          category: 'custom',        description: 'Wildcard component with your own icon, colour, and properties', icon: 'Shapes', defaultLabel: 'Custom' },
];

export const CATEGORIES: { id: ComponentCategory; label: string }[] = [
  { id: 'networking',    label: 'Networking'    },
  { id: 'compute',       label: 'Compute'       },
  { id: 'application',   label: 'Application'   },
  { id: 'data',          label: 'Data'          },
  { id: 'security',      label: 'Security'      },
  { id: 'observability', label: 'Observability' },
  { id: 'custom',        label: 'Custom'        },
];

const ICONS: Record<string, typeof Box> = {
  Globe,
  Waypoints,
  GitFork,
  Layers,
  ArrowLeftRight,
  Shield,
  ShieldAlert,
  Monitor,
  Server,
  Container,
  Cpu,
  Box,
  AppWindow,
  Braces,
  Puzzle,
  Cog,
  Database,
  DatabaseZap,
  Zap,
  List,
  HardDrive,
  KeyRound,
  Lock,
  Activity,
  ScrollText,
  GitGraph,
  Bookmark,
  Circle,
  Cloud,
  Flag,
  Hash,
  Hexagon,
  Shapes,
  Sparkles,
  SquareDashed,
  Star,
  Tag,
};

export function getComponentIcon(name: string): typeof Box {
  return ICONS[name] ?? Box;
}

export const ICON_CHOICES = Object.keys(ICONS).sort();

export function categoryColorVar(category: string): string {
  return `var(--cat-${category})`;
}
