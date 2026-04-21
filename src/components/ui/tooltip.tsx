import { useState, useRef, useEffect, type ReactElement, cloneElement } from 'react'

interface TooltipProps {
  label: string
  children: ReactElement
  delay?: number
  side?: 'top' | 'bottom'
}

/**
 * Tooltip — stone-900 bg, white 12/500 label, 6px radius/padding.
 * 500ms open delay, 0ms close delay. z-index 600.
 */
export function Tooltip({ label, children, delay = 500, side = 'top' }: TooltipProps) {
  const [open, setOpen] = useState(false)
  const timer = useRef<number | null>(null)

  useEffect(() => () => {
    if (timer.current) window.clearTimeout(timer.current)
  }, [])

  function show() {
    if (timer.current) window.clearTimeout(timer.current)
    timer.current = window.setTimeout(() => setOpen(true), delay)
  }
  function hide() {
    if (timer.current) window.clearTimeout(timer.current)
    setOpen(false)
  }

  const childProps = children.props as Record<string, unknown>
  const child = cloneElement(children, {
    onMouseEnter: (e: React.MouseEvent) => {
      show()
      ;(childProps.onMouseEnter as ((e: React.MouseEvent) => void) | undefined)?.(e)
    },
    onMouseLeave: (e: React.MouseEvent) => {
      hide()
      ;(childProps.onMouseLeave as ((e: React.MouseEvent) => void) | undefined)?.(e)
    },
    onFocus: (e: React.FocusEvent) => {
      show()
      ;(childProps.onFocus as ((e: React.FocusEvent) => void) | undefined)?.(e)
    },
    onBlur: (e: React.FocusEvent) => {
      hide()
      ;(childProps.onBlur as ((e: React.FocusEvent) => void) | undefined)?.(e)
    },
  } as Record<string, unknown>)

  return (
    <span className="relative inline-flex">
      {child}
      {open && (
        <span
          role="tooltip"
          className="pointer-events-none absolute left-1/2 -translate-x-1/2 whitespace-nowrap rounded-md bg-stone-900 px-2.5 py-1.5 text-xs font-medium text-white"
          style={{
            zIndex: 'var(--z-tooltip)' as unknown as number,
            [side === 'top' ? 'bottom' : 'top']: 'calc(100% + 6px)',
          }}
        >
          {label}
        </span>
      )}
    </span>
  )
}
