import { forwardRef, type InputHTMLAttributes } from 'react'

type RadioProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> & {
  label?: string
}

export const Radio = forwardRef<HTMLInputElement, RadioProps>(
  ({ label, className = '', ...props }, ref) => {
    return (
      <label className={`inline-flex items-center gap-2 cursor-pointer select-none text-sm text-text ${className}`}>
        <span className="relative inline-flex h-[18px] w-[18px] items-center justify-center">
          <input
            ref={ref}
            type="radio"
            className="peer absolute inset-0 opacity-0 cursor-pointer"
            {...props}
          />
          <span className="h-full w-full rounded-full border-[1.5px] border-border bg-white transition-all duration-fast peer-checked:border-primary peer-focus-visible:shadow-[0_0_0_3px_var(--primary-subtle)]" />
          <span className="pointer-events-none absolute h-2 w-2 rounded-full bg-primary opacity-0 transition-opacity peer-checked:opacity-100" />
        </span>
        {label && <span>{label}</span>}
      </label>
    )
  },
)

Radio.displayName = 'Radio'
