import { useEffect, useRef, useCallback } from 'react'
import { Crepe } from '@milkdown/crepe'
import { useBuilderStore } from '~/lib/stores/builder-store'
import { uploadToSupabaseStorage } from '~/lib/milkdown/upload'

import '@milkdown/crepe/theme/common/style.css'
import '@milkdown/crepe/theme/frame.css'

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
    })

    return () => {
      console.log('[crepe] useEffect cleanup — destroying Crepe instance')
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
      className="min-h-[120px] rounded-md border border-gray-200 bg-white overflow-hidden text-sm [&_.milkdown]:min-h-[100px] [&_.milkdown]:px-3 [&_.milkdown]:py-2"
    />
  )
}
