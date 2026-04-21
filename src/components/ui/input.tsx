import { forwardRef, type InputHTMLAttributes } from 'react'

type InputProps = InputHTMLAttributes<HTMLInputElement>

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className = '', ...props }, ref) => {
    return (
      <input
        ref={ref}
        className={`h-[38px] w-full bg-white border-[1.5px] border-border rounded-[var(--r)] px-3 text-sm text-text placeholder:text-text-faint transition-[border-color,box-shadow] duration-fast focus:outline-none focus:border-primary-light focus:shadow-[0_0_0_3px_var(--primary-subtle)] disabled:opacity-50 ${className}`}
        {...props}
      />
    )
  },
)

Input.displayName = 'Input'
