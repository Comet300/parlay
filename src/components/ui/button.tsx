import type { ButtonHTMLAttributes, CSSProperties } from 'react'

type Variant = 'primary' | 'secondary' | 'accent' | 'destructive' | 'ghost'

interface Recipe {
  base: string
  style: CSSProperties
  hoverStyle: CSSProperties
}

const variantStyles: Record<Variant, Recipe> = {
  primary: {
    base: 'text-white',
    style: {
      background: 'linear-gradient(180deg, #38BDF8 0%, #0EA5E9 100%)',
      boxShadow:
        'inset 0 1px 0 rgba(255,255,255,0.3), 0 1px 0 #0369A1, 0 2px 4px rgba(14,165,233,0.3)',
    },
    hoverStyle: {
      boxShadow:
        'inset 0 1px 0 rgba(255,255,255,0.3), 0 1px 0 #0369A1, 0 4px 12px rgba(14,165,233,0.4)',
    },
  },
  secondary: {
    base: 'text-text',
    style: {
      background: 'linear-gradient(180deg, #FFFFFF 0%, #FAFAF9 100%)',
      boxShadow:
        'inset 0 1px 0 rgba(255,255,255,1), 0 1px 0 var(--border), 0 2px 4px rgba(0,0,0,0.05), inset 0 0 0 1px var(--border)',
    },
    hoverStyle: {
      boxShadow:
        'inset 0 1px 0 rgba(255,255,255,1), 0 1px 0 var(--border), 0 3px 8px rgba(0,0,0,0.08), inset 0 0 0 1px #D6D3D1',
    },
  },
  accent: {
    base: 'text-white',
    style: {
      background: 'linear-gradient(180deg, #FB923C 0%, #F97316 100%)',
      boxShadow:
        'inset 0 1px 0 rgba(255,255,255,0.3), 0 1px 0 #C2410C, 0 2px 4px rgba(249,115,22,0.3)',
    },
    hoverStyle: {
      boxShadow:
        'inset 0 1px 0 rgba(255,255,255,0.3), 0 1px 0 #C2410C, 0 4px 12px rgba(249,115,22,0.4)',
    },
  },
  destructive: {
    base: 'text-error',
    style: {
      background: 'linear-gradient(180deg, #FEF2F2 0%, #FEE2E2 100%)',
      boxShadow:
        'inset 0 1px 0 rgba(255,255,255,1), 0 1px 0 #FECACA, inset 0 0 0 1px #FECACA',
    },
    hoverStyle: {
      boxShadow:
        'inset 0 1px 0 rgba(255,255,255,1), 0 1px 0 #FECACA, 0 3px 8px rgba(239,68,68,0.2), inset 0 0 0 1px #FCA5A5',
    },
  },
  ghost: {
    base: 'text-text-muted hover:bg-border-light hover:text-text',
    style: { background: 'transparent', boxShadow: 'none' },
    hoverStyle: {},
  },
}

const sizeStyles = {
  sm: 'h-8 px-3 text-sm gap-1.5',
  md: 'h-[38px] px-4 text-sm gap-1.5',
  lg: 'h-11 px-6 text-base gap-2',
} as const

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: keyof typeof sizeStyles
}

export function Button({
  variant = 'primary',
  size = 'md',
  className = '',
  disabled,
  style,
  onMouseEnter,
  onMouseLeave,
  ...props
}: ButtonProps) {
  const v = variantStyles[variant]
  return (
    <button
      className={`group inline-flex items-center justify-center rounded-[var(--r)] font-semibold tracking-[-0.005em] transition-[transform,box-shadow] duration-instant ease-out active:translate-y-px disabled:opacity-50 disabled:cursor-not-allowed disabled:active:translate-y-0 ${sizeStyles[size]} ${v.base} ${className}`}
      disabled={disabled}
      style={{ ...v.style, ...style }}
      onMouseEnter={(e) => {
        if (!disabled && v.hoverStyle.boxShadow) {
          Object.assign(e.currentTarget.style, v.hoverStyle)
        }
        onMouseEnter?.(e)
      }}
      onMouseLeave={(e) => {
        if (!disabled) {
          Object.assign(e.currentTarget.style, v.style)
        }
        onMouseLeave?.(e)
      }}
      {...props}
    />
  )
}
