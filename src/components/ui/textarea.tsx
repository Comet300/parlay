import { forwardRef, type TextareaHTMLAttributes } from 'react'

type TextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement>

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className = '', ...props }, ref) => {
    return (
      <textarea
        ref={ref}
        className={`w-full min-h-20 bg-white border-[1.5px] border-border rounded-[var(--r)] px-3 py-2.5 text-sm leading-normal text-text placeholder:text-text-faint transition-[border-color,box-shadow] duration-fast focus:outline-none focus:border-primary-light focus:shadow-[0_0_0_3px_var(--primary-subtle)] disabled:opacity-50 resize-y ${className}`}
        {...props}
      />
    )
  },
)

Textarea.displayName = 'Textarea'
