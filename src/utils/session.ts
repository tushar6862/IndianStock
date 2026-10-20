export interface MarketSession {
  phase: 'pre-open' | 'open' | 'closed'
  label: string
  detail: string
}

export function getMarketSession(now = new Date()): MarketSession {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Kolkata',
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(now)
  const pick = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value ?? ''
  const weekday = pick('weekday')
  let hour = Number(pick('hour'))
  const minute = Number(pick('minute'))
  if (hour === 24) hour = 0
  const minutes = hour * 60 + minute
  if (weekday === 'Sat' || weekday === 'Sun') {
    return {
      phase: 'closed',
      label: 'Market closed',
      detail: 'Weekend · NSE/BSE cash session. Holidays are not listed.',
    }
  }
  if (minutes >= 9 * 60 && minutes < 9 * 60 + 15) {
    return { phase: 'pre-open', label: 'Pre-open', detail: '09:00–09:15 IST' }
  }
  if (minutes >= 9 * 60 + 15 && minutes <= 15 * 60 + 30) {
    return { phase: 'open', label: 'Market open', detail: '09:15–15:30 IST' }
  }
  return {
    phase: 'closed',
    label: 'Market closed',
    detail: 'Cash session 09:15–15:30 IST. Holidays are not listed.',
  }
}
