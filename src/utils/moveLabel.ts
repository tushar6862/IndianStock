import type { Bias, NextCandleBias } from '../types/prediction.ts'

export interface MoveLabel {
  title: string
  line: string
  tone: 'bull' | 'bear' | 'warn' | 'neutral'
}

export function moveLabel(bias: Bias | NextCandleBias): MoveLabel {
  if (bias === 'BULLISH') {
    return { title: 'UPAR', line: 'Score upar ki move dikha raha hai', tone: 'bull' }
  }
  if (bias === 'BEARISH') {
    return { title: 'NEECHE', line: 'Score neeche ki move dikha raha hai', tone: 'bear' }
  }
  if (bias === 'NEUTRAL' || bias === 'SIDEWAYS') {
    return { title: 'SIDEWAYS', line: 'Clear direction nahi hai, wait karo', tone: 'warn' }
  }
  return { title: 'DATA NAHI', line: 'Pehle candles load karo, tab move dikhegi', tone: 'neutral' }
}
