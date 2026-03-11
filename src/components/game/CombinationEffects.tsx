/**
 * Card combination visual effects
 * Animations and effects for different card combinations
 */

import { useEffect, useState, useCallback, useRef } from 'react'

export type CombinationEffectType =
  | 'single'
  | 'pair'
  | 'triple'
  | 'triple_with'
  | 'straight'
  | 'double_straight'
  | 'airplane'
  | 'bomb'
  | 'rocket'
  | 'none'

interface CardEffectState {
  type: CombinationEffectType
  cards: number[]
  timestamp: number
}

const EFFECT_DURATION = {
  single: 600,
  pair: 600,
  triple: 800,
  triple_with: 1000,
  straight: 1200,
  double_straight: 1200,
  airplane: 2000,
  bomb: 2000,
  rocket: 3000,
  none: 0,
}

export function useCardEffects() {
  const [effect, setEffect] = useState<CardEffectState>({ type: 'none', cards: [], timestamp: 0 })
  const [screenShake, setScreenShake] = useState(false)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const triggerEffect = useCallback((combinationType: string, cards: number[]) => {
    const effectType = mapCombinationToEffect(combinationType)
    
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }

    const timestamp = Date.now()
    setEffect({ type: effectType, cards, timestamp })

    if (effectType === 'bomb' || effectType === 'rocket') {
      setScreenShake(true)
      setTimeout(() => setScreenShake(false), 500)
    }

    timeoutRef.current = setTimeout(() => {
      setEffect({ type: 'none', cards: [], timestamp: 0 })
    }, EFFECT_DURATION[effectType])
  }, [])

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [])

  return { effect, screenShake, triggerEffect }
}

function mapCombinationToEffect(combinationType: string): CombinationEffectType {
  switch (combinationType) {
    case 'Single':
      return 'single'
    case 'Pair':
      return 'pair'
    case 'Triple':
      return 'triple'
    case 'TripleWithSingle':
    case 'TripleWithPair':
      return 'triple_with'
    case 'Straight':
      return 'straight'
    case 'DoubleStraight':
      return 'double_straight'
    case 'TripleStraight':
    case 'Airplane':
    case 'AirplaneWithSingle':
    case 'AirplaneWithPair':
      return 'airplane'
    case 'Bomb':
      return 'bomb'
    case 'Rocket':
      return 'rocket'
    default:
      return 'single'
  }
}

interface CombinationEffectsProps {
  effect: CardEffectState
  screenShake: boolean
}

export function CombinationEffects({ effect, screenShake }: CombinationEffectsProps) {
  if (effect.type === 'none') return null

  return (
    <div className="combination-effects-container">
      {screenShake && <ScreenShakeEffect />}
      {effect.type === 'bomb' && <BombEffect key={effect.timestamp} />}
      {effect.type === 'rocket' && <RocketEffect key={effect.timestamp} />}
      {effect.type === 'straight' && <StraightEffect key={effect.timestamp} />}
      {effect.type === 'double_straight' && <StraightEffect key={effect.timestamp} variant="double" />}
      {effect.type === 'airplane' && <AirplaneEffect key={effect.timestamp} />}
      {effect.type === 'triple_with' && <TripleWithEffect key={effect.timestamp} />}
    </div>
  )
}

function ScreenShakeEffect() {
  return <div className="screen-shake-overlay" />
}

function BombEffect() {
  return (
    <div className="bomb-effect">
      <div className="bomb-particles">
        {Array.from({ length: 20 }).map((_, i) => (
          <div key={i} className="bomb-particle" style={{ '--delay': `${i * 0.05}s`, '--angle': `${i * 18}deg` } as React.CSSProperties} />
        ))}
      </div>
      <div className="bomb-flash" />
      <div className="bomb-text">💥 炸弹!</div>
    </div>
  )
}

function RocketEffect() {
  return (
    <div className="rocket-effect">
      <div className="rocket-bg-flash" />
      <div className="rocket-trail">
        <div className="rocket-body">🚀</div>
      </div>
      <div className="rocket-text">
        <span className="rocket-text-small">王</span>
        <span className="rocket-text-large">炸</span>
        <span className="rocket-text-small">!</span>
      </div>
      <div className="rocket-stars">
        {Array.from({ length: 12 }).map((_, i) => (
          <div key={i} className="rocket-star" style={{ '--delay': `${i * 0.1}s`, '--x': `${Math.random() * 100}%`, '--y': `${Math.random() * 100}%` } as React.CSSProperties}>✨</div>
        ))}
      </div>
    </div>
  )
}

function StraightEffect({ variant = 'single' }: { variant?: 'single' | 'double' }) {
  return (
    <div className={`straight-effect ${variant}`}>
      <div className="straight-flow">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="straight-card-flow" style={{ '--delay': `${i * 0.1}s` } as React.CSSProperties}>
            🃏
          </div>
        ))}
      </div>
      <div className="straight-text">{variant === 'double' ? '连对!' : '顺子!'}</div>
    </div>
  )
}

function AirplaneEffect() {
  return (
    <div className="airplane-effect">
      <div className="airplane-container">
        <div className="airplane-body">✈️</div>
        <div className="airplane-trail" />
      </div>
      <div className="airplane-text">飞机!</div>
    </div>
  )
}

function TripleWithEffect() {
  return (
    <div className="triple-with-effect">
      <div className="triple-arc" />
      <div className="triple-text">三带!</div>
    </div>
  )
}

export function CardPlayAnimation({ children, effectType }: { children: React.ReactNode; effectType: CombinationEffectType }) {
  return (
    <div className={`card-play-animation ${effectType}`}>
      {children}
    </div>
  )
}
