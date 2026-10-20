import type { ReactNode } from 'react'

const tones = {
  bull: 'bg-bull/15 text-bull',
  bear: 'bg-bear/15 text-bear',
  warn: 'bg-warn/15 text-warn',
  neutral: 'bg-white/5 text-muted',
  info: 'bg-accent/15 text-accent',
} as const

export function Badge({ tone, children }: { tone: keyof typeof tones; children: ReactNode }) {
  return (
    <span className={`inline-flex items-center rounded px-2 py-0.5 text-[11px] font-semibold tracking-wide ${tones[tone]}`}>
      {children}
    </span>
  )
}
