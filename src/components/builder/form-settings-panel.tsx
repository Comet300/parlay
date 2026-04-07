import { X } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useBuilderStore } from '~/lib/stores/builder-store'
import { useMediaQuery } from '~/lib/hooks/use-media-query'
import { updateFormRoundRobin } from '~/lib/server/forms'
import { EditorField, EditorInput } from './node-editors/editor-field'

interface FormSettingsPanelProps {
  open: boolean
  onClose: () => void
  formId: string
  roundRobinEnabled: boolean
  siblingCount: number
  onRefresh?: () => void
}

export function FormSettingsPanel({
  open,
  onClose,
  formId,
  roundRobinEnabled,
  siblingCount,
  onRefresh,
}: FormSettingsPanelProps) {
  const isMobile = useMediaQuery('(max-width: 767px)')
  const colorScheme = useBuilderStore((s) => s.colorScheme) as {
    primary?: string
    accent?: string
    background?: string
    theme?: string
  } | null
  const setColorScheme = useBuilderStore((s) => s.setColorScheme)

  const scheme = colorScheme ?? {
    primary: '#EA4C89',
    accent: '#C4307A',
    background: '#FFFFFF',
    theme: 'default',
  }

  function updateColor(key: string, value: string) {
    setColorScheme({ ...scheme, [key]: value, theme: 'custom' })
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ x: '100%' }}
          animate={{ x: 0 }}
          exit={{ x: '100%' }}
          transition={{ type: 'spring', damping: 25, stiffness: 200 }}
          className={`absolute right-0 top-0 z-30 h-full bg-white border-l border-gray-200 shadow-lg overflow-y-auto ${isMobile ? 'w-full' : 'w-80'}`}
        >
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
            <span className="text-sm font-semibold text-gray-700">
              Form Settings
            </span>
            <button
              onClick={onClose}
              className="p-0.5 rounded hover:bg-gray-100"
            >
              <X className="h-4 w-4 text-gray-400" />
            </button>
          </div>

          <div className="p-4 space-y-6">
            {/* Color Scheme */}
            <section>
              <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
                Color Scheme
              </h4>
              <EditorField label="Primary">
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={scheme.primary ?? '#EA4C89'}
                    onChange={(e) => updateColor('primary', e.target.value)}
                    className="h-8 w-8 rounded border border-gray-200 cursor-pointer"
                  />
                  <EditorInput
                    value={scheme.primary ?? '#EA4C89'}
                    onChange={(v) => updateColor('primary', v)}
                  />
                </div>
              </EditorField>
              <EditorField label="Accent">
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={scheme.accent ?? '#C4307A'}
                    onChange={(e) => updateColor('accent', e.target.value)}
                    className="h-8 w-8 rounded border border-gray-200 cursor-pointer"
                  />
                  <EditorInput
                    value={scheme.accent ?? '#C4307A'}
                    onChange={(v) => updateColor('accent', v)}
                  />
                </div>
              </EditorField>
              <EditorField label="Background">
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={scheme.background ?? '#FFFFFF'}
                    onChange={(e) => updateColor('background', e.target.value)}
                    className="h-8 w-8 rounded border border-gray-200 cursor-pointer"
                  />
                  <EditorInput
                    value={scheme.background ?? '#FFFFFF'}
                    onChange={(v) => updateColor('background', v)}
                  />
                </div>
              </EditorField>
              <p className="text-[10px] text-gray-400">
                Theme picker and component gallery carousel will be added in a follow-up.
              </p>
            </section>

            {/* Component Gallery placeholder */}
            <section>
              <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
                Component Gallery
              </h4>
              <div className="flex gap-3 overflow-x-auto py-2">
                <div
                  className="shrink-0 w-36 h-24 rounded-lg border border-gray-200 flex items-center justify-center text-xs text-gray-400"
                  style={{
                    backgroundColor: scheme.background,
                    borderColor: scheme.primary,
                  }}
                >
                  Preview
                </div>
              </div>
            </section>

            {/* Round-robin */}
            {siblingCount > 1 && (
              <section>
                <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
                  Round-Robin
                </h4>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={roundRobinEnabled}
                    onChange={async () => {
                      await updateFormRoundRobin({
                        data: { formId, enabled: !roundRobinEnabled },
                      })
                      onRefresh?.()
                    }}
                    className="rounded border-gray-300"
                  />
                  <span className="text-sm text-gray-700">
                    {roundRobinEnabled ? 'Enabled' : 'Disabled'}
                  </span>
                </label>
                <p className="text-[10px] text-gray-400 mt-1">
                  Also available in the Facet Switcher dropdown.
                </p>
              </section>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
