import type { NodeTypeDescriptor, NodeTypeName } from './types'

// Canvas node components (lazy to avoid circular imports)
import { StartCanvasNode } from '~/components/builder/canvas-nodes/start-node'
import { EndCanvasNode } from '~/components/builder/canvas-nodes/end-node'
import { PageCanvasNode } from '~/components/builder/canvas-nodes/page-node'
import { PageGroupCanvasNode } from '~/components/builder/canvas-nodes/page-group-node'
import { GroupCanvasNode } from '~/components/builder/canvas-nodes/group-node'
import { ContentCanvasNode } from '~/components/builder/canvas-nodes/content-node'
import { CardCanvasNode } from '~/components/builder/canvas-nodes/card-node'
import { LLMCanvasNode } from '~/components/builder/canvas-nodes/llm-node'

// Editor components
import { StartEndEditor } from '~/components/builder/node-editors/start-end-editor'
import { PageEditor } from '~/components/builder/node-editors/page-editor'
import { PageGroupEditor } from '~/components/builder/node-editors/page-group-editor'
import { GroupEditor } from '~/components/builder/node-editors/group-editor'
import { LikertEditor } from '~/components/builder/node-editors/likert-editor'
import { SingleChoiceEditor } from '~/components/builder/node-editors/single-choice-editor'
import { MultiChoiceEditor } from '~/components/builder/node-editors/multi-choice-editor'
import { EmailCollectionEditor } from '~/components/builder/node-editors/email-collection-editor'
import { CardEditor } from '~/components/builder/node-editors/card-editor'
import { ScriptedLLMEditor } from '~/components/builder/node-editors/scripted-llm-editor'
import { RealLLMEditor } from '~/components/builder/node-editors/real-llm-editor'

const registry = new Map<NodeTypeName, NodeTypeDescriptor>()

function register(desc: NodeTypeDescriptor) {
  registry.set(desc.typeName, desc)
}

// ─── Anchor nodes ───────────────────────────────────────────────────
register({
  typeName: 'start',
  label: 'Start',
  icon: 'Play',
  tier: 'page',
  defaultData: () => ({ type: 'start', markdownContent: '' }),
  canvasComponent: StartCanvasNode,
  editorComponent: StartEndEditor,
})

register({
  typeName: 'end',
  label: 'End',
  icon: 'Square',
  tier: 'page',
  defaultData: () => ({ type: 'end', markdownContent: '' }),
  canvasComponent: EndCanvasNode,
  editorComponent: StartEndEditor,
})

// ─── Container nodes ────────────────────────────────────────────────
register({
  typeName: 'page',
  label: 'Page',
  icon: 'FileText',
  tier: 'page',
  isContainer: true,
  allowedChildren: ['group', 'card', 'likert', 'single_choice', 'multi_choice', 'email_collection'],
  defaultData: () => ({
    type: 'page',
    label: 'New Page',
    condition: '',
    allow_back: false,
    show_progress_bar: false,
    is_checkpoint: false,
    headerContent: '',
  }),
  canvasComponent: PageCanvasNode,
  editorComponent: PageEditor,
})

register({
  typeName: 'page_group',
  label: 'Page Group',
  icon: 'Layers',
  tier: 'page',
  isContainer: true,
  allowedChildren: ['group', 'card', 'likert', 'single_choice', 'multi_choice', 'email_collection'],
  defaultData: () => ({
    type: 'page_group',
    label: 'New Page Group',
    condition: '',
    allow_back: false,
    show_progress_bar: false,
    is_checkpoint: false,
    headerContent: '',
    headerOnAllPages: false,
    maxQuestionsPerPage: 3,
    shuffle: false,
  }),
  canvasComponent: PageGroupCanvasNode,
  editorComponent: PageGroupEditor,
})

register({
  typeName: 'group',
  label: 'Group',
  icon: 'Group',
  tier: 'content',
  isContainer: true,
  allowedChildren: ['card', 'likert', 'single_choice', 'multi_choice', 'email_collection'],
  defaultData: () => ({
    type: 'group',
    label: 'New Group',
    condition: '',
    shuffle: false,
  }),
  canvasComponent: GroupCanvasNode,
  editorComponent: GroupEditor,
})

// ─── Content nodes ──────────────────────────────────────────────────
register({
  typeName: 'likert',
  label: 'Likert Scale',
  icon: 'Sliders',
  tier: 'content',
  defaultData: () => ({
    type: 'likert',
    label: 'New Likert',
    slug: '',
    condition: '',
    record_response: true,
    required: true,
    min: 1,
    max: 7,
    minLabel: 'Strongly Disagree',
    maxLabel: 'Strongly Agree',
  }),
  canvasComponent: ContentCanvasNode,
  editorComponent: LikertEditor,
})

register({
  typeName: 'single_choice',
  label: 'Single Choice',
  icon: 'CircleDot',
  tier: 'content',
  defaultData: () => ({
    type: 'single_choice',
    label: 'New Single Choice',
    slug: '',
    condition: '',
    record_response: true,
    required: true,
    options: [
      { id: crypto.randomUUID(), label: 'Option 1' },
      { id: crypto.randomUUID(), label: 'Option 2' },
    ],
    shuffleOptions: false,
  }),
  canvasComponent: ContentCanvasNode,
  editorComponent: SingleChoiceEditor,
})

register({
  typeName: 'multi_choice',
  label: 'Multi Choice',
  icon: 'CheckSquare',
  tier: 'content',
  defaultData: () => ({
    type: 'multi_choice',
    label: 'New Multi Choice',
    slug: '',
    condition: '',
    record_response: true,
    required: true,
    options: [
      { id: crypto.randomUUID(), label: 'Option 1' },
      { id: crypto.randomUUID(), label: 'Option 2' },
    ],
    shuffleOptions: false,
  }),
  canvasComponent: ContentCanvasNode,
  editorComponent: MultiChoiceEditor,
})

register({
  typeName: 'email_collection',
  label: 'Email Collection',
  icon: 'Mail',
  tier: 'content',
  defaultData: () => ({
    type: 'email_collection',
    label: 'Enter your email address',
    slug: '',
    condition: '',
    record_response: true,
    required: true,
  }),
  canvasComponent: ContentCanvasNode,
  editorComponent: EmailCollectionEditor,
})

register({
  typeName: 'card',
  label: 'Card',
  icon: 'CreditCard',
  tier: 'content',
  defaultData: () => ({
    type: 'card',
    label: 'New Card',
    slug: '',
    condition: '',
    record_response: true,
    markdownContent: '',
    buttons: [{ id: crypto.randomUUID(), label: 'Continue' }],
  }),
  canvasComponent: CardCanvasNode,
  editorComponent: CardEditor,
})

// ─── LLM nodes ──────────────────────────────────────────────────────
register({
  typeName: 'scripted_llm',
  label: 'Scripted LLM',
  icon: 'MessageSquareCode',
  tier: 'page',
  defaultData: () => {
    const turnId = crypto.randomUUID()
    return {
      type: 'scripted_llm',
      label: 'New Scripted LLM',
      slug: '',
      condition: '',
      record_response: true,
      startTurnId: turnId,
      script: [
        {
          id: turnId,
          botMessage: 'Hello! How can I help you?',
          options: [
            { id: crypto.randomUUID(), label: 'Option 1', nextTurnId: null },
          ],
        },
      ],
    }
  },
  canvasComponent: LLMCanvasNode,
  editorComponent: ScriptedLLMEditor,
})

register({
  typeName: 'real_llm',
  label: 'Real LLM',
  icon: 'Bot',
  tier: 'page',
  defaultData: () => ({
    type: 'real_llm',
    label: 'New Real LLM',
    slug: '',
    condition: '',
    record_response: true,
    provider: '',
    model: '',
    setup_prompt: '',
    ending_condition: '',
    maxTurns: 10,
  }),
  canvasComponent: LLMCanvasNode,
  editorComponent: RealLLMEditor,
})

// ─── Exports ────────────────────────────────────────────────────────
export const NodeTypeRegistry = registry

/** Map of typeName → canvasComponent for React Flow's nodeTypes prop */
export function getCanvasNodeTypes(): Record<string, React.ComponentType<any>> {
  const result: Record<string, React.ComponentType<any>> = {}
  registry.forEach((desc, key) => {
    result[key] = desc.canvasComponent
  })
  return result
}
