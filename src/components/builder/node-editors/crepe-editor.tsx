import { useEffect, useRef, useCallback } from 'react'
import { Crepe } from '@milkdown/crepe'
import { $prose } from '@milkdown/kit/utils'
import { Plugin } from '@milkdown/kit/prose/state'
import { keymap } from '@milkdown/kit/prose/keymap'
import { setBlockType } from '@milkdown/kit/prose/commands'
import { useBuilderStore } from '~/lib/stores/builder-store'
import { uploadToSupabaseStorage } from '~/lib/milkdown/upload'

import '@milkdown/crepe/theme/common/style.css'
import '@milkdown/crepe/theme/frame.css'
import './crepe-compact.css'

interface CrepeEditorProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
}

export function CrepeEditorField({ value, onChange, placeholder }: CrepeEditorProps) {
  console.log('[crepe] render, value:', JSON.stringify(value).slice(0, 60))
  const wrapperRef = useRef<HTMLDivElement>(null)
  const crepeRef = useRef<Crepe | null>(null)
  const onChangeRef = useRef(onChange)
  onChangeRef.current = onChange
  const lastValueRef = useRef(value)

  const facetId = useBuilderStore((s) => s.facetId)

  const handleUpload = useCallback(
    async (file: File): Promise<string> => {
      if (!facetId) throw new Error('No facet ID for upload')
      return uploadToSupabaseStorage(file, facetId)
    },
    [facetId],
  )

  useEffect(() => {
    console.log('[crepe] useEffect — mounting Crepe instance')
    const wrapper = wrapperRef.current
    if (!wrapper) return

    // Create a dedicated div for Crepe that React doesn't manage.
    // This prevents "removeChild" errors when React unmounts while
    // Crepe has modified the DOM tree.
    const editorDiv = document.createElement('div')
    wrapper.appendChild(editorDiv)

    const features: Partial<Record<(typeof Crepe.Feature)[keyof typeof Crepe.Feature], boolean>> = {
      [Crepe.Feature.ImageBlock]: true,
      [Crepe.Feature.Toolbar]: true,
      [Crepe.Feature.TopBar]: true,
      [Crepe.Feature.BlockEdit]: true,
    }
    if (placeholder) {
      features[Crepe.Feature.Placeholder] = true
    }

    const crepe = new Crepe({
      root: editorDiv,
      defaultValue: value,
      features,
      featureConfigs: {
        [Crepe.Feature.ImageBlock]: {
          onUpload: handleUpload,
        },
        ...(placeholder
          ? { [Crepe.Feature.Placeholder]: { text: placeholder } }
          : {}),
      },
    } as any)

    // Custom keymap: Backspace on empty heading → convert to paragraph
    // instead of Milkdown's default cycling (H3→H2→H1→paragraph).
    const backspaceHeadingPlugin = $prose(() => {
      return keymap({
        Backspace: (state, dispatch) => {
          const { $from } = state.selection
          if ($from.parentOffset !== 0) return false
          const node = $from.parent
          if (node.type.name !== 'heading') return false
          if (node.content.size !== 0) return false
          // Convert directly to paragraph
          return setBlockType(state.schema.nodes.paragraph)(state, dispatch)
        },
      })
    })
    crepe.editor.use(backspaceHeadingPlugin)

    crepe.on((listener) => {
      listener.markdownUpdated((_ctx, markdown) => {
        console.log('[crepe] markdownUpdated', JSON.stringify(markdown).slice(0, 80), 'last:', JSON.stringify(lastValueRef.current).slice(0, 80))
        if (markdown === lastValueRef.current) {
          console.log('[crepe] skipped — same value')
          return
        }
        lastValueRef.current = markdown
        console.log('[crepe] calling onChange')
        onChangeRef.current(markdown)
      })
    })

    crepe.create().then(() => {
      crepeRef.current = crepe
      console.log('[crepe] instance created successfully')

      // Prevent TopBar buttons from stealing focus from ProseMirror.
      // Crepe's Vue code programmatically calls .focus() on the heading
      // button, so tabIndex=-1 alone doesn't work. We neuter .focus().
      const pm = editorDiv.querySelector('.ProseMirror') as HTMLElement | null

      function neuterTopBarFocus() {
        editorDiv.querySelectorAll<HTMLElement>(
          '.milkdown-top-bar button, .milkdown-top-bar .top-bar-heading-button, .milkdown-top-bar .top-bar-item, .milkdown-top-bar .operation-item'
        ).forEach((el) => {
          el.tabIndex = -1
          // Override .focus() to prevent programmatic focus stealing
          el.focus = () => { /* neutered */ }
        })
      }
      neuterTopBarFocus()

      // Re-apply after Vue re-renders the TopBar
      const topBar = editorDiv.querySelector('.milkdown-top-bar')
      if (topBar) {
        const observer = new MutationObserver(neuterTopBarFocus)
        observer.observe(topBar, { childList: true, subtree: true })
      }

      // Safety net: if anything in the top bar steals focus, give it back
      editorDiv.querySelector('.milkdown-top-bar')?.addEventListener('focusin', (e) => {
        console.log('[crepe] TopBar stole focus, returning to ProseMirror')
        if (pm) {
          e.preventDefault()
          pm.focus()
        }
      })

      // Debug: track focus/blur on the ProseMirror editor
      const pmDebug = editorDiv.querySelector('.ProseMirror')
      if (pmDebug) {
        pmDebug.addEventListener('focus', () => {
          console.log('[crepe] ProseMirror FOCUS')
        })
        pmDebug.addEventListener('blur', (e) => {
          const related = (e as FocusEvent).relatedTarget as HTMLElement | null
          console.log('[crepe] ProseMirror BLUR, relatedTarget:', related?.tagName, related?.className?.slice(0, 80))
        })
        pmDebug.addEventListener('mousedown', () => {
          console.log('[crepe] ProseMirror MOUSEDOWN')
        })
        pmDebug.addEventListener('pointerdown', () => {
          console.log('[crepe] ProseMirror POINTERDOWN')
        })
      }

      // Debug: track focus on ALL elements inside the editor
      editorDiv.addEventListener('focusin', (e) => {
        const t = e.target as HTMLElement
        console.log('[crepe] FOCUSIN:', t.tagName, t.className?.slice(0, 80), 'contentEditable:', t.contentEditable)
      })
      editorDiv.addEventListener('focusout', (e) => {
        const t = e.target as HTMLElement
        const related = (e as FocusEvent).relatedTarget as HTMLElement | null
        console.log('[crepe] FOCUSOUT:', t.tagName, t.className?.slice(0, 60), '→ relatedTarget:', related?.tagName, related?.className?.slice(0, 60))
      })
    })

    return () => {
      console.log('[crepe] useEffect cleanup — destroying Crepe instance')
      console.trace('[crepe] DESTROY STACK TRACE')
      crepeRef.current = null
      crepe.destroy().finally(() => {
        // Manually remove the editor div so React's wrapper div is clean
        if (wrapper.contains(editorDiv)) {
          wrapper.removeChild(editorDiv)
        }
      })
    }
    // Only create/destroy on mount/unmount — value updates handled by editor
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [handleUpload])

  return (
    <div
      ref={wrapperRef}
      className="crepe-compact min-h-[120px] flex-1 rounded-md border border-gray-200 bg-white overflow-visible flex flex-col"
    />
  )
}
