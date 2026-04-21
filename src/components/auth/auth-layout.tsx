import type { ReactNode } from 'react'
import { Card } from '~/components/ui/card'

export function AuthLayout({
  children,
  title,
}: {
  children: ReactNode
  title: string
}) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-bg px-4">
      <Card className="w-full max-w-md p-8">
        <h1 className="mb-6 text-center text-2xl font-bold text-text">
          {title}
        </h1>
        {children}
      </Card>
    </div>
  )
}
