import type { Node, Edge, NodeProps, Viewport } from '@xyflow/react'

// ─── Node type names ────────────────────────────────────────────────
export const NODE_TYPE_NAMES = [
  'start',
  'end',
  'page',
  'page_group',
  'group',
  'likert',
  'single_choice',
  'multi_choice',
  'email_collection',
  'card',
  'scripted_llm',
  'real_llm',
] as const

export type NodeTypeName = (typeof NODE_TYPE_NAMES)[number]

// ─── Tier classification ────────────────────────────────────────────
export type NodeTier = 'page' | 'content'

export const PAGE_TIER_TYPES = new Set<NodeTypeName>([
  'start',
  'end',
  'page',
  'page_group',
  'scripted_llm',
  'real_llm',
])

export const CONTENT_TIER_TYPES = new Set<NodeTypeName>([
  'group',
  'likert',
  'single_choice',
  'multi_choice',
  'email_collection',
  'card',
])

export const CONTAINER_TYPES = new Set<NodeTypeName>([
  'page',
  'page_group',
  'group',
])

/** Parent type → allowed child types */
export const ALLOWED_CHILDREN: Record<string, Set<NodeTypeName>> = {
  page: new Set<NodeTypeName>(['group', 'card', 'likert', 'single_choice', 'multi_choice', 'email_collection']),
  page_group: new Set<NodeTypeName>(['group', 'card', 'likert', 'single_choice', 'multi_choice', 'email_collection']),
  group: new Set<NodeTypeName>(['card', 'likert', 'single_choice', 'multi_choice', 'email_collection']),
}

// ─── Node data shapes ───────────────────────────────────────────────
// Index signature required by React Flow's Record<string, unknown> constraint
interface NodeDataBase {
  [key: string]: unknown
}

export interface StartNodeData extends NodeDataBase {
  type: 'start'
  markdownContent: string
}

export interface EndNodeData extends NodeDataBase {
  type: 'end'
  markdownContent: string
}

export interface PageNodeData extends NodeDataBase {
  type: 'page'
  label: string
  condition: string
  allow_back: boolean
  show_progress_bar: boolean
  is_checkpoint: boolean
  headerContent: string
}

export interface PageGroupNodeData extends NodeDataBase {
  type: 'page_group'
  label: string
  condition: string
  allow_back: boolean
  show_progress_bar: boolean
  is_checkpoint: boolean
  headerContent: string
  headerOnAllPages: boolean
  maxQuestionsPerPage: number
  shuffle: boolean
}

export interface GroupNodeData extends NodeDataBase {
  type: 'group'
  label: string
  condition: string
  shuffle: boolean
}

export interface LikertNodeData extends NodeDataBase {
  type: 'likert'
  label: string
  alias: string
  condition: string
  record_response: boolean
  required: boolean
  min: number
  max: number
  minLabel: string
  maxLabel: string
}

export interface SingleChoiceNodeData extends NodeDataBase {
  type: 'single_choice'
  label: string
  alias: string
  condition: string
  record_response: boolean
  required: boolean
  options: { id: string; label: string }[]
  shuffleOptions: boolean
}

export interface MultiChoiceNodeData extends NodeDataBase {
  type: 'multi_choice'
  label: string
  alias: string
  condition: string
  record_response: boolean
  required: boolean
  options: { id: string; label: string }[]
  shuffleOptions: boolean
}

export interface EmailCollectionNodeData extends NodeDataBase {
  type: 'email_collection'
  label: string
  alias: string
  condition: string
  record_response: boolean
  required: boolean
}

export interface CardNodeData extends NodeDataBase {
  type: 'card'
  label: string
  alias: string
  condition: string
  record_response: boolean
  markdownContent: string
  buttons: { id: string; label: string }[]
}

export interface ScriptedLLMTurn {
  id: string
  botMessage: string
  options: {
    id: string
    label: string
    nextTurnId: string | null
  }[]
}

export interface ScriptedLLMNodeData extends NodeDataBase {
  type: 'scripted_llm'
  label: string
  alias: string
  condition: string
  record_response: boolean
  script: ScriptedLLMTurn[]
  startTurnId: string
}

export interface RealLLMNodeData extends NodeDataBase {
  type: 'real_llm'
  label: string
  alias: string
  condition: string
  record_response: boolean
  provider: string
  model: string
  setup_prompt: string
  ending_condition: string
  maxTurns: number
}

// ─── Discriminated union ────────────────────────────────────────────
export type FlowNodeData =
  | StartNodeData
  | EndNodeData
  | PageNodeData
  | PageGroupNodeData
  | GroupNodeData
  | LikertNodeData
  | SingleChoiceNodeData
  | MultiChoiceNodeData
  | EmailCollectionNodeData
  | CardNodeData
  | ScriptedLLMNodeData
  | RealLLMNodeData

// ─── Typed React Flow node and edge ─────────────────────────────────
export type FlowNode = Node<FlowNodeData, NodeTypeName>
export type FlowEdge = Edge<Record<string, never>>

// ─── Flow definition shape persisted to DB ──────────────────────────
export interface FlowDefinition {
  nodes: FlowNode[]
  edges: FlowEdge[]
  viewport: Viewport
}

// ─── Node type registry descriptor ──────────────────────────────────
export interface NodeTypeDescriptor {
  typeName: NodeTypeName
  label: string
  icon: string // lucide-react icon name
  tier: NodeTier
  defaultData: () => FlowNodeData
  canvasComponent: React.ComponentType<NodeProps<FlowNode>>
  editorComponent: React.ComponentType<{ nodeId: string }>
  rendererComponent?: React.ComponentType<{
    node: FlowNode
    onAnswer?: (...args: unknown[]) => void
    preview?: boolean
  }>
  isContainer?: boolean
  allowedChildren?: NodeTypeName[]
}

// ─── Alias info returned by the store's derived aliases selector ───
export interface AliasInfo {
  alias: string
  label: string
  type: NodeTypeName
  nodeId: string
}

// ─── Dead path info returned by getDeadPaths() ─────────────────────
export interface DeadPathInfo {
  nodeId: string
  handleId?: string // present for card button handles
}
