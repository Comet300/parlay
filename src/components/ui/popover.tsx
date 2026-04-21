import { useEffect, useRef, type ReactNode } from 'react'
import { AnimatePresence, motion } from 'framer-motion'

interface PopoverProps {
  open: boolean
  onClose: () => void
  children: ReactNode
  anchorRef?: React.RefObject<HTMLElement | null>
  placement?: 'bottom' | 'top'
  className?: string
}

/**
 * Popover — --e3, --r-lg, 1px --border, fade+4px translate entrance.
 * z-index 300. Dismisses on outside click and Esc.
 */
export function Popover({
  open,
  onClose,
  children,
  anchorRef,
  placement = 'bottom',
  className = '',
}: PopoverProps) {
  const panelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      if (panelRef.current?.contains(e.target as Node)) return
      if (anchorRef?.current?.contains(e.target as Node)) return
      onClose()
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open, onClose, anchorRef])

  const offset = placement === 'bottom' ? 4 : -4

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          ref={panelRef}
          className={`bg-white border border-border rounded-lg shadow-e3 p-3.5 ${className}`}
          style={{ zIndex: 'var(--z-popover)' as unknown as number }}
          initial={{ opacity: 0, y: offset }}
          animate={{ opacity: 1, y: 0, transition: { duration: 0.15 } }}
          exit={{ opacity: 0, y: offset, transition: { duration: 0.15 } }}
          role="dialog"
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  )
}
