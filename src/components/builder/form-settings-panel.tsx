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
    primary: '#0EA5E9',
    accent: '#F97316',
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
          className={`absolute right-0 top-0 z-sticky h-full bg-white border-l border-border shadow-e3 overflow-y-auto ${isMobile ? 'w-full' : 'w-80'}`}
        >
          <div className="flex items-center justify-between px-4 py-3 border-b border-border-light">
            <span className="text-sm font-semibold text-text">
              Form Settings
            </span>
            <button
              onClick={onClose}
              className="p-0.5 rounded hover:bg-border-light"
            >
              <X className="h-4 w-4 text-text-faint" />
            </button>
          </div>

          <div className="p-4 space-y-6">
            {/* Color Scheme */}
            <section>
              <h4 className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-3">
                Color Scheme
              </h4>
              <EditorField label="Primary">
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={scheme.primary ?? '#0EA5E9'}
                    onChange={(e) => updateColor('primary', e.target.value)}
                    className="h-8 w-8 rounded border border-border cursor-pointer"
                  />
                  <EditorInput
                    value={scheme.primary ?? '#0EA5E9'}
                    onChange={(v) => updateColor('primary', v)}
                  />
                </div>
              </EditorField>
              <EditorField label="Accent">
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={scheme.accent ?? '#F97316'}
                    onChange={(e) => updateColor('accent', e.target.value)}
                    className="h-8 w-8 rounded border border-border cursor-pointer"
                  />
                  <EditorInput
                    value={scheme.accent ?? '#F97316'}
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
                    className="h-8 w-8 rounded border border-border cursor-pointer"
                  />
                  <EditorInput
                    value={scheme.background ?? '#FFFFFF'}
                    onChange={(v) => updateColor('background', v)}
                  />
                </div>
              </EditorField>
              <p className="text-[10px] text-text-faint">
                Theme picker and component gallery carousel will be added in a follow-up.
              </p>
            </section>

            {/* Component Gallery placeholder */}
            <section>
              <h4 className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-3">
                Component Gallery
              </h4>
              <div className="flex gap-3 overflow-x-auto py-2">
                <div
                  className="shrink-0 w-36 h-24 rounded-lg border border-border flex items-center justify-center text-xs text-text-faint"
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
                <h4 className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-3">
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
                    className="rounded border-border"
                  />
                  <span className="text-sm text-text">
                    {roundRobinEnabled ? 'Enabled' : 'Disabled'}
                  </span>
                </label>
                <p className="text-[10px] text-text-faint mt-1">
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
