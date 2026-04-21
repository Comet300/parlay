import { toast as sonnerToast } from 'sonner'
import type { ReactNode } from 'react'

type Status = 'success' | 'warning' | 'error' | 'info'

const BAR_COLOR: Record<Status, string> = {
  success: 'var(--success)',
  warning: 'var(--warning)',
  error: 'var(--error)',
  info: 'var(--primary)',
}

function ToastBody({ status, message }: { status: Status; message: ReactNode }) {
  return (
    <div className="flex items-center gap-2.5">
      <span
        aria-hidden
        style={{
          width: 3,
          height: 18,
          borderRadius: 2,
          background: BAR_COLOR[status],
          flexShrink: 0,
        }}
      />
      <span className="text-[13px] font-medium text-text">{message}</span>
    </div>
  )
}

function fire(status: Status, message: ReactNode) {
  return sonnerToast.custom(() => <ToastBody status={status} message={message} />, {
    duration: 4000,
  })
}

export const toast = {
  success: (message: ReactNode) => fire('success', message),
  warning: (message: ReactNode) => fire('warning', message),
  error: (message: ReactNode) => fire('error', message),
  info: (message: ReactNode) => fire('info', message),
  dismiss: sonnerToast.dismiss,
}
