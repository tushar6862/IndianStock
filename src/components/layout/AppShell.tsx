import { useEffect } from 'react'
import type { ReactNode } from 'react'
import { X } from 'lucide-react'
import { fetchFyersStatus } from '../../services/marketData/fyersClient.ts'
import { useMarketStore } from '../../store/useMarketStore.ts'
import { MobileNav, Sidebar } from './Sidebar.tsx'
import { TopBar } from './TopBar.tsx'

export function AppShell({ children }: { children: ReactNode }) {
  const theme = useMarketStore((state) => state.theme)
  const banner = useMarketStore((state) => state.banner)
  const dismissBanner = useMarketStore((state) => state.dismissBanner)

  useEffect(() => {
    document.documentElement.dataset.theme = theme
  }, [theme])

  useEffect(() => {
    let stop = false
    let refreshing = false
    const sync = async (quiet: boolean) => {
      if (refreshing) return
      refreshing = true
      try {
        const status = await fetchFyersStatus()
        if (stop || !status.connected) return
        const state = useMarketStore.getState()
        const using = state.origins.NIFTY50 === 'fyers' || state.origins.SENSEX === 'fyers'
        await state.loadFyers({ quiet: quiet && using })
      } catch {
        // The local API is down until npm run dev is started.
      } finally {
        refreshing = false
      }
    }
    void sync(true)
    const timer = window.setInterval(() => void sync(true), 20000)
    return () => {
      stop = true
      window.clearInterval(timer)
    }
  }, [])

  return (
    <div className="flex min-h-screen bg-bg text-text">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <MobileNav />
        <TopBar />
        {banner ? (
          <div
            role="status"
            className={`flex items-start justify-between gap-3 border-b px-4 py-2 text-sm ${
              banner.tone === 'error' ? 'border-bear/40 bg-bear/10 text-bear' : 'border-accent/30 bg-accent/10 text-text'
            }`}
          >
            <p>{banner.message}</p>
            <button type="button" onClick={dismissBanner} aria-label="Dismiss message" className="text-muted hover:text-text">
              <X size={16} />
            </button>
          </div>
        ) : null}
        <main className="min-w-0 flex-1 px-4 py-4">{children}</main>
      </div>
    </div>
  )
}
