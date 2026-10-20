import type { ReactNode } from 'react'

export function Card({
  title,
  action,
  children,
  className = '',
}: {
  title?: string
  action?: ReactNode
  children: ReactNode
  className?: string
}) {
  return (
    <section className={`rounded-xl border border-line bg-panel ${className}`}>
      {title ? (
        <header className="flex items-center justify-between gap-3 border-b border-line px-4 py-3">
          <h2 className="text-sm font-semibold">{title}</h2>
          {action}
        </header>
      ) : null}
      <div className="p-4">{children}</div>
    </section>
  )
}
