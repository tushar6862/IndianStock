import { useEffect, useState } from 'react'
import { getMarketSession } from '../utils/session.ts'

export function useClock() {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 1000)
    return () => window.clearInterval(timer)
  }, [])
  return { now, session: getMarketSession(now) }
}
