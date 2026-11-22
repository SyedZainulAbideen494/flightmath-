import type { ButtonHTMLAttributes, ReactNode } from 'react'
import clsx from 'clsx'

type Variant = 'outline' | 'accent' | 'primary' | 'amber' | 'ghost' | 'danger'
type Size = 'sm' | 'md' | 'lg'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
  icon?: ReactNode
  trailing?: ReactNode
  full?: boolean
}

export function Button({
  variant = 'outline', size = 'md', icon, trailing, full, className, children, ...props
}: ButtonProps) {
  return (
    <button
      className={clsx(
        'btn',
        `btn-${variant}`,
        size === 'sm' && 'btn-sm',
        size === 'lg' && 'btn-lg',
        full && 'w-full',
        className,
      )}
      {...props}
    >
      {icon}
      {children}
      {trailing}
    </button>
  )
}

export function IconButton({ className, children, ...props }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      aria-label={props['aria-label']}
      className={clsx('btn btn-outline !h-11 !w-11 !min-h-0 !p-0', className)}
      {...props}
    >
      {children}
    </button>
  )
}
