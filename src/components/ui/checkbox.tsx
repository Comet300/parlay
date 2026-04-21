import { forwardRef, type InputHTMLAttributes } from 'react'
import { Check } from 'lucide-react'

type CheckboxProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> & {
  label?: string
}

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
  ({ label, className = '', ...props }, ref) => {
    return (
      <label className={`inline-flex items-center gap-2 cursor-pointer select-none text-sm text-text ${className}`}>
        <span className="relative inline-flex h-[18px] w-[18px] items-center justify-center">
          <input
            ref={ref}
            type="checkbox"
            className="peer absolute inset-0 opacity-0 cursor-pointer"
            {...props}
          />
          <span className="h-full w-full rounded-[6px] border-[1.5px] border-border bg-white transition-all duration-fast peer-checked:bg-primary peer-checked:border-primary peer-focus-visible:shadow-[0_0_0_3px_var(--primary-subtle)]" />
          <Check
            className="pointer-events-none absolute h-3 w-3 text-white opacity-0 transition-opacity peer-checked:opacity-100"
            strokeWidth={3.5}
          />
        </span>
        {label && <span>{label}</span>}
      </label>
    )
  },
)

Checkbox.displayName = 'Checkbox'
