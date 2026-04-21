import { forwardRef, type SelectHTMLAttributes } from 'react'
import { ChevronDown } from 'lucide-react'

type SelectProps = SelectHTMLAttributes<HTMLSelectElement>

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ className = '', children, ...props }, ref) => {
    return (
      <span className="relative inline-flex">
        <select
          ref={ref}
          className={`h-[38px] appearance-none bg-white border-[1.5px] border-border rounded-[var(--r)] pl-3 pr-9 text-sm text-text cursor-pointer transition-[border-color,box-shadow] duration-fast focus:outline-none focus:border-primary-light focus:shadow-[0_0_0_3px_var(--primary-subtle)] disabled:opacity-50 ${className}`}
          {...props}
        >
          {children}
        </select>
        <ChevronDown
          className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted"
          strokeWidth={2}
        />
      </span>
    )
  },
)

Select.displayName = 'Select'
