import type { ReactNode } from 'react'

export function EditorField({
  label,
  children,
  className,
}: {
  label: string
  children: ReactNode
  className?: string
}) {
  return (
    <label className={`block mb-3 ${className ?? ''}`}>
      <span className="text-xs font-medium text-text-muted mb-1 block shrink-0">{label}</span>
      {children}
    </label>
  )
}

export function EditorInput({
  value,
  onChange,
  placeholder,
  type = 'text',
}: {
  value: string | number
  onChange: (v: string) => void
  placeholder?: string
  type?: string
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full rounded-md border border-border bg-white px-2.5 py-1.5 text-sm text-text focus:border-primary-light focus:outline-none focus:ring-1 focus:ring-primary-light"
    />
  )
}

export function EditorTextarea({
  value,
  onChange,
  placeholder,
  rows = 3,
}: {
  value: string
  onChange: (v: string) => void
  placeholder?: string
  rows?: number
}) {
  return (
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      rows={rows}
      className="w-full rounded-md border border-border bg-white px-2.5 py-1.5 text-sm text-text focus:border-primary-light focus:outline-none focus:ring-1 focus:ring-primary-light resize-y"
    />
  )
}

export function EditorCheckbox({
  label,
  checked,
  onChange,
}: {
  label: string
  checked: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <label className="flex items-center gap-2 mb-2 cursor-pointer">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="rounded border-border text-blue-500 focus:ring-primary-light"
      />
      <span className="text-xs text-text">{label}</span>
    </label>
  )
}
