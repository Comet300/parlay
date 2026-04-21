import type { HTMLAttributes, ThHTMLAttributes, TdHTMLAttributes } from 'react'

/**
 * Response-viewer / admin table primitives per design-system ›
 * Table conventions.
 */
export function Table({ className = '', children, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={`w-full border border-border rounded-md overflow-hidden bg-white ${className}`} {...props}>
      <table className="w-full border-collapse text-sm">{children}</table>
    </div>
  )
}

export function THead({ className = '', ...props }: HTMLAttributes<HTMLTableSectionElement>) {
  return <thead className={className} {...props} />
}

export function TBody({ className = '', ...props }: HTMLAttributes<HTMLTableSectionElement>) {
  return <tbody className={className} {...props} />
}

export function Tr({ className = '', ...props }: HTMLAttributes<HTMLTableRowElement>) {
  return (
    <tr
      className={`transition-[background-color] duration-fast hover:bg-[rgba(240,249,255,0.4)] [&>td]:border-b [&>td]:border-border-light [&:last-child>td]:border-b-0 ${className}`}
      {...props}
    />
  )
}

export function Th({
  className = '',
  align = 'left',
  ...props
}: ThHTMLAttributes<HTMLTableCellElement> & { align?: 'left' | 'right' }) {
  return (
    <th
      className={`bg-bg border-b border-border px-3.5 py-2.5 text-[10px] font-bold uppercase tracking-[0.08em] text-text-faint ${align === 'right' ? 'text-right' : 'text-left'} ${className}`}
      {...props}
    />
  )
}

export function Td({
  className = '',
  align = 'left',
  numeric = false,
  ...props
}: TdHTMLAttributes<HTMLTableCellElement> & { align?: 'left' | 'right'; numeric?: boolean }) {
  return (
    <td
      className={`px-3.5 py-3 ${align === 'right' ? 'text-right' : ''} ${numeric ? 'tabular-nums' : ''} ${className}`}
      {...props}
    />
  )
}
