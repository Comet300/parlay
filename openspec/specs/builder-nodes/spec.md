# builder-nodes Specification

## Purpose
Define the data schema, side panel editor fields, canvas appearance, and
node type registry for all node types in the builder.

## Requirements

### Requirement: Base content node data fields
Every content node type (card, likert, single_choice, multi_choice,
email_collection, scripted_llm, real_llm) SHALL store at minimum:
- slug: string — pattern /^[a-z0-9]+(?:-[a-z0-9]+)*$/, max 60 chars,
  unique within facet. Lowercase alphanumeric segments separated by
  single hyphens, no leading/trailing hyphens.
- condition: string (optional) — formula expression; absent = always render
- record_response: boolean (default true)

Content nodes do NOT have their own edges. They are children of
Page/PageGroup containers and are rendered within them.

### Requirement: Container node data fields (no slug)
Page, PageGroup, and Group nodes are virtual containers and SHALL NOT
have a slug field. They do not produce response data and are not
referenceable in formula conditions.

### Requirement: Container condition supersedes child conditions
If a container (Page, PageGroup, or Group) has a condition that evaluates
to false, the entire container and all its children are skipped — even if
individual child nodes have conditions that would evaluate to true.
Container-level skip takes absolute precedence.

### Requirement: Page data schema
Page nodes SHALL store:
- label: string
- condition: string (optional) — render condition formula
- allow_back: boolean (default false)
- show_progress_bar: boolean (default false)
- is_checkpoint: boolean (default false)
- headerContent: string (optional) — Milkdown WYSIWYG markdown content
  displayed at the top of the page before any child nodes

### Requirement: PageGroup data schema
PageGroup nodes SHALL store:
- label: string
- condition: string (optional) — render condition formula
- allow_back: boolean (default false)
- show_progress_bar: boolean (default false)
- is_checkpoint: boolean (default false)
- maxQuestionsPerPage: number (required, min 1)
- shuffle: boolean (default false) — randomize child node order at runtime
- headerContent: string (optional) — Milkdown WYSIWYG markdown content
- headerOnAllPages: boolean (default false) — when false, headerContent
  is shown only on the first virtual page; when true, shown on every
  virtual page

Virtual page splitting: The PageGroup collects all direct children
(content nodes + Groups) in canvas position order (top-to-bottom).
If shuffle = true, children are reordered using the session's shuffle
seed. Then they are chunked into virtual pages of maxQuestionsPerPage
items each. The last virtual page may have fewer items. Group nodes
count as 1 item toward the limit — a Group and all its children appear
together and are never split across virtual pages. Conditional nodes
that evaluate to false are excluded before chunking so virtual page
sizes stay dense.

### Requirement: Group data schema
Group nodes SHALL store:
- label: string
- condition: string (optional) — render condition formula
- shuffle: boolean (default false) — shuffle children at runtime

### Requirement: Likert data schema
The likert node data SHALL include:
- label: string (the question text)
- min: number (default 1)
- max: number (default 7)
- minLabel: string (e.g. "Strongly Disagree")
- maxLabel: string (e.g. "Strongly Agree")
- required: boolean (default true)

### Requirement: Single Choice data schema
The single_choice node data SHALL include:
- label: string (the question text)
- options: Array<{ id: string, label: string }>
- shuffleOptions: boolean (default false)
- required: boolean (default true)

### Requirement: Multi Choice data schema
The multi_choice node data SHALL include:
- label: string (the question text)
- options: Array<{ id: string, label: string }>
- shuffleOptions: boolean (default false)
- required: boolean (default true)

### Requirement: Email Collection data schema
The email_collection node data SHALL include:
- label: string (the prompt text, e.g. "Enter your email address")
- required: boolean (default true)

### Requirement: Node tier classification
Nodes are organized into tiers that determine where they can exist:

**Page-tier nodes** (exist on the canvas root, connected by edges):
- Start (semantic anchor)
- End (semantic anchor)
- Page (container)
- PageGroup (container)
- scripted_llm (full-screen takeover, no children allowed)
- real_llm (full-screen takeover, no children allowed)

**Content-tier nodes** (must be children of a Page or PageGroup):
- card, likert, single_choice, multi_choice, email_collection
- group (container for content-tier nodes)

LLM nodes (scripted_llm, real_llm) are page-tier because they take over
the full viewport. They cannot contain child nodes — their configuration
(script turns, setup prompt, etc.) is stored in the node's own data fields,
edited via the side panel.

### Requirement: Slug purpose and visibility
Slugs are internal identifiers used exclusively for referencing nodes in
formula condition expressions (e.g., `q-age > 18`). Slugs are NOT displayed
to respondents in the player UI. They appear only in the builder side panel
for the form creator.

### Requirement: Slug auto-generation
The system SHALL auto-generate slug from the node label on creation:
slugify to lowercase, strip non-alphanumeric characters (except hyphens),
replace spaces with hyphens, collapse consecutive hyphens, trim leading/
trailing hyphens, truncate to 60 characters.
The system SHALL show an inline validation error for duplicate or
invalid-pattern slugs in the side panel.
The system SHALL prevent saving while a slug conflict exists.

### Requirement: Node type registry
The system SHALL implement a NodeTypeRegistry map in
app/lib/node-registry/index.ts mapping NodeTypeName to NodeTypeDescriptor:

```typescript
interface NodeTypeDescriptor {
  typeName: NodeTypeName;
  label: string;
  icon: string;                // lucide-react icon name
  tier: 'page' | 'content';   // determines valid placement
  defaultData: () => Record<string, unknown>;
  editorComponent: React.ComponentType<{ node: FlowNode }>;
  rendererComponent: React.ComponentType<{ node: FlowNode; onAnswer?: Fn; preview?: boolean }>;
  canvasComponent: React.ComponentType<NodeProps>;
  isContainer?: boolean;
  allowedChildren?: NodeTypeName[];
}
```

### Requirement: Preview mode on renderers
Every renderer component SHALL accept a preview?: boolean prop.
When preview = true, the renderer SHALL render a static non-interactive
mockup using no hooks or effects requiring real session state.
This is required for use in the color scheme component gallery carousel.

### Requirement: Side panel common fields
The "Node" tab in the right panel SHALL show for content-tier nodes
(not containers, not Start/End):
- Slug field (editable text input with validation)
- Show if field (formula condition input with autocomplete)
- Record response checkbox (default true)

Additionally for question nodes (likert, single_choice, multi_choice)
and email_collection:
- Required checkbox (default true)

For Page (container panel):
- Show if field (formula condition input)
- Allow back checkbox (default false)
- Show progress bar checkbox (default false)
- Is checkpoint checkbox (default false; only visible when show_progress_bar
  is enabled on any Page/PageGroup in the flow)
- Header content: Milkdown WYSIWYG editor for headerContent

For PageGroup (container panel):
- All Page fields above, plus:
- Max questions per page number input
- Shuffle children checkbox (default false)
- Show header on all pages checkbox (default false; only visible when
  headerContent is non-empty)

For Group:
- Show if field (formula condition input)
- Shuffle children checkbox (default false)

For scripted_llm and real_llm (page-tier, side panel):
- Slug field, Show if field, Record response checkbox (base content fields)
- Plus their specific configuration fields (see builder-llm-nodes spec)

### Requirement: Node deletion
Nodes SHALL be deletable via the Delete/Backspace key when selected on
the canvas, or via a "Delete" button in the side panel.
When a container node (Page, PageGroup, Group) is deleted, all its
children SHALL be deleted as well.
When any node is deleted, all edges connected to it (incoming and outgoing)
SHALL be removed automatically.
The system SHALL show a confirmation dialog when deleting a container
that has children.

### Requirement: Start and End node data schema
Start and End nodes are semantic anchor nodes. Each SHALL store:
- markdownContent: string (optional) — Milkdown Crepe WYSIWYG markdown content

Start and End nodes have NO slug, NO condition, and NO record_response
fields. They are not content nodes and do not produce response data.

### Requirement: Milkdown Crepe editor integration
All WYSIWYG markdown editors in the builder (Start, End, Card, Page
headerContent, PageGroup headerContent) SHALL use the Milkdown Crepe
editor (`@milkdown/crepe`) with the `@milkdown/react` integration
(`useEditor` hook + `MilkdownProvider`):

```tsx
import { Crepe } from '@milkdown/crepe';
import { Milkdown, MilkdownProvider, useEditor } from '@milkdown/react';

const CrepeEditor: React.FC<{ defaultValue: string }> = ({ defaultValue }) => {
  const { get } = useEditor((root) => {
    return new Crepe({ root, defaultValue, featureConfigs: { /* ... */ } });
  });
  return <Milkdown />;
};

// Wrap in MilkdownProvider
<MilkdownProvider>
  <CrepeEditor defaultValue={existingMarkdown} />
</MilkdownProvider>
```

Content retrieval in React uses `get()?.getMarkdown()` from the `useEditor`
return value. Change detection for auto-save uses Crepe's event listener:
`crepe.on((listener) => listener.markdownUpdated((ctx, markdown) => { ... }))`.

The Crepe editor SHALL support image and file uploads:
- When a user pastes, drops, or inserts an image/file, the system SHALL
  upload it to Supabase Storage public bucket 'markdown-uploads' under
  the path {facetId}/{randomId}.{ext}
- The system SHALL replace the local blob/file reference in the markdown
  with the permanent public Supabase Storage URL
- The upload handler SHALL be implemented in app/lib/milkdown/upload.ts

The 'markdown-uploads' Supabase Storage bucket SHALL be created as public
(public only means public download URLs — uploads and deletes still require
policies). The following storage policies SHALL be created:

```sql
-- Allow authenticated users to upload files
CREATE POLICY "Authenticated users can upload markdown assets"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'markdown-uploads');

-- Allow authenticated users to delete their uploaded files
CREATE POLICY "Authenticated users can delete markdown assets"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'markdown-uploads');
```

Files SHALL be organized by facet ID. When a facet is deleted (CASCADE),
the application SHALL also delete the corresponding Storage folder
(using the service role key — see facets spec).

The Crepe editor SHALL be configured with the `ImageBlock` feature using
the `onUpload` handler to integrate with Supabase Storage:

```typescript
import { Crepe } from "@milkdown/crepe";

const crepe = new Crepe({
  root,
  defaultValue: existingMarkdown,
  featureConfigs: {
    [Crepe.Feature.ImageBlock]: {
      onUpload: async (file: File) => {
        // Upload to Supabase Storage markdown-uploads/{facetId}/{randomId}.{ext}
        // Return the permanent public URL
        return uploadToSupabaseStorage(file, facetId);
      },
    },
  },
});
```

Preview mode uses `crepe.setReadonly(true)`. The `@milkdown/react`
integration handles Crepe lifecycle (`create()` / `destroy()`)
automatically via the `useEditor` hook.

### Requirement: Start and End node editors
Start and End SHALL open the Milkdown Crepe editor in the right panel
when selected. Start content is shown as the form intro screen. End content
is shown as the form completion/thank-you screen.
A form with only Start -> End and no Pages in between is a broken/empty
form that renders nothing meaningful to the respondent.

### Requirement: Page and PageGroup canvas nodes
Page nodes SHALL render as React Flow native subgraph containers with a
visible border and label. All children are rendered inside the bordered area.
PageGroup nodes SHALL additionally show maxQuestionsPerPage in the canvas node.
Children SHALL be draggable in and out of containers on the canvas.

### Requirement: Group canvas node
Group nodes SHALL render as a lighter bordered subgraph inside their parent
Page or PageGroup. The shuffle toggle SHALL be visible in the side panel editor.

### Requirement: Scripted LLM side panel
The scripted_llm side panel SHALL show a decision-tree script editor:
a list of turns, each with:
- Bot message textarea
- Options list: each option has a label input and a next-turn dropdown
  populated with all turn IDs plus "End conversation" (nextTurnId = null)
- Add turn / remove turn controls

### Requirement: Real LLM side panel
The real_llm side panel SHALL show:
- Provider dropdown (populated from the owner's configured providers in
  settings — e.g. "openai", "anthropic", "google"). If no providers are
  configured, show a warning linking to /settings.
- Model text input (e.g. "gpt-4o") — the model identifier for the
  selected provider
- setup_prompt textarea labeled "Hidden from respondents"
- ending_condition textarea labeled "Hidden from respondents — instruct the
  LLM when to output [END_CONVERSATION]"
- maxTurns number input

#### Scenario: Duplicate slug validation
- GIVEN a content node with slug "q-age" already exists in the facet
- WHEN the user sets another content node's slug to "q-age"
- THEN the system shows an inline validation error in the slug field
- AND the save is blocked until the conflict is resolved

#### Scenario: Node type registry dynamic panel
- GIVEN the user selects a Likert node on the canvas
- WHEN the right panel renders
- THEN the system looks up the Likert NodeTypeDescriptor from the registry
- AND renders the Likert editorComponent in the Node tab

#### Scenario: PageGroup virtual page splitting
- GIVEN a PageGroup with maxQuestionsPerPage = 3 and 7 child nodes
- AND shuffle = false
- WHEN the player renders the PageGroup
- THEN it creates 3 virtual pages: [3 nodes], [3 nodes], [1 node]
- AND navigating Continue advances through virtual pages before leaving the PageGroup

#### Scenario: Delete container with children
- GIVEN a Page contains 3 Likert nodes and 1 Card node
- WHEN the user selects the Page and presses Delete
- THEN the system shows a confirmation dialog
- WHEN the user confirms
- THEN the Page and all 4 child nodes are deleted
- AND all edges connected to the Page are removed

#### Scenario: Page header content
- GIVEN a Page has headerContent "Please answer the following questions about your experience."
- WHEN the player renders the Page
- THEN the markdown content appears at the top of the page
- AND the child question nodes render below it

#### Scenario: PageGroup header on first page only
- GIVEN a PageGroup with headerContent and headerOnAllPages = false
- AND the PageGroup splits into 3 virtual pages
- WHEN the player renders virtual page 1
- THEN the header is shown above the questions
- WHEN the player navigates to virtual page 2
- THEN the header is NOT shown
