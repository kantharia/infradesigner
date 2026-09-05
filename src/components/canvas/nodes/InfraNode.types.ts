import type { Node, NodeProps } from '@xyflow/react';
import type { InfraNodeData } from '../../../store/types';

export type InfraNodeType = Node<InfraNodeData, 'infra' | 'infraGroup'>;
export type InfraNodeProps = NodeProps<InfraNodeType>;
