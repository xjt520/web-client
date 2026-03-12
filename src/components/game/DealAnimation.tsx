import { useState, useEffect, useCallback, useMemo } from 'react'
import { CardDisplay } from './CardDisplay'
import { soundManager } from '../../lib/SoundManager'
import './DealAnimation.css'

interface PlayerDealInfo {
  identity: string
  seatIndex: number
  cardCount: number
}

interface DealAnimationProps {
  playerHands: PlayerDealInfo[]
  landlordCards: number[]
  landlordCardsRevealed: boolean
  onComplete: () => void
  enabled: boolean
  audio?: {
    playDeal: () => void
  }
}

interface FlyingCard {
  id: number
  cardIndex: number
  targetSeat: number
  startX: number
  startY: number
  endX: number
  endY: number
  rotation: number
  delay: number
}

type Phase = 'dealing' | 'landlord-reveal' | 'landlord-deal' | 'complete'

const DEAL_DURATION = 2000
const CARD_DEAL_INTERVAL = DEAL_DURATION / 51
const LANDLORD_REVEAL_DELAY = 300
const LANDLORD_CARD_INTERVAL = 200

export function DealAnimation({
  playerHands,
  landlordCards,
  landlordCardsRevealed,
  onComplete,
  enabled,
  audio
}: DealAnimationProps) {
  const [phase, setPhase] = useState<Phase>('dealing')
  const [dealtCount, setDealtCount] = useState(0)
  const [flyingCards, setFlyingCards] = useState<FlyingCard[]>([])
  const [revealedLandlordCards, setRevealedLandlordCards] = useState<number[]>([])
  const [landlordDealIndex, setLandlordDealIndex] = useState(-1)

  const playerPositions = useMemo(() => ({
    0: { x: 0, y: 200, label: '我' },
    1: { x: -280, y: -80, label: '左' },
    2: { x: 280, y: -80, label: '右' }
  }), [])

  const generateFlyingCards = useCallback(() => {
    if (playerHands.length === 0) return []

    const cards: FlyingCard[] = []
    let cardIndex = 0

    for (let round = 0; round < 17; round++) {
      for (let seat = 0; seat < 3; seat++) {
        const pos = playerPositions[seat as keyof typeof playerPositions]
        cards.push({
          id: cardIndex,
          cardIndex,
          targetSeat: seat,
          startX: 0,
          startY: 0,
          endX: pos.x,
          endY: pos.y,
          rotation: (Math.random() - 0.5) * 30,
          delay: cardIndex * CARD_DEAL_INTERVAL
        })
        cardIndex++
      }
    }

    return cards
  }, [playerPositions])

  // 发牌阶段
  useEffect(() => {
    if (!enabled) return

    const cards = generateFlyingCards()
    setFlyingCards(cards)

    // 如果没有牌，直接跳到下一步
    if (cards.length === 0) {
      setPhase('landlord-reveal')
      return
    }

    let dealTimer: ReturnType<typeof setTimeout>
    let currentIndex = 0

    const dealNextCard = () => {
      if (currentIndex < cards.length) {
        setDealtCount(currentIndex + 1)
        if (currentIndex % 3 === 0) {
          audio?.playDeal()
        }
        currentIndex++
        dealTimer = setTimeout(dealNextCard, CARD_DEAL_INTERVAL)
      } else {
        setPhase('landlord-reveal')
      }
    }

    dealTimer = setTimeout(dealNextCard, 100)

    return () => clearTimeout(dealTimer)
  }, [enabled, generateFlyingCards, audio])

  // 底牌揭晓阶段
  useEffect(() => {
    if (phase !== 'landlord-reveal') return

    const cards = landlordCards.length > 0 ? landlordCards : [0, 0, 0]

    let revealIndex = 0
    const revealTimer = setInterval(() => {
      if (revealIndex < cards.length) {
        setRevealedLandlordCards(prev => [...prev, cards[revealIndex]])
        soundManager.play('tick')
        revealIndex++
      } else {
        clearInterval(revealTimer)
        setTimeout(() => setPhase('landlord-deal'), LANDLORD_REVEAL_DELAY)
      }
    }, LANDLORD_CARD_INTERVAL)

    return () => clearInterval(revealTimer)
  }, [phase, landlordCards])

  // 地主牌发放阶段
  useEffect(() => {
    if (phase !== 'landlord-deal') return

    const cardCount = landlordCards.length > 0 ? landlordCards.length : 3

    let dealIndex = 0
    const dealTimer = setInterval(() => {
      if (dealIndex < cardCount) {
        setLandlordDealIndex(dealIndex)
        audio?.playDeal()
        dealIndex++
      } else {
        clearInterval(dealTimer)
        setTimeout(() => {
          setPhase('complete')
          setTimeout(onComplete, 200)
        }, 150)
      }
    }, 200)

    return () => clearInterval(dealTimer)
  }, [phase, landlordCards.length, audio, onComplete])

  if (!enabled) return null

  const getCardStyle = (card: FlyingCard, index: number) => {
    const isActive = index < dealtCount

    return {
      '--delay': `${card.delay}ms`,
      '--end-x': `${card.endX}px`,
      '--end-y': `${card.endY}px`,
      '--rotation': `${card.rotation}deg`,
      opacity: isActive ? 1 : 0,
      transform: isActive
        ? `translate(${card.endX}px, ${card.endY}px) rotate(${card.rotation}deg)`
        : 'translate(0, 0) rotate(0deg)'
    } as React.CSSProperties
  }

  return (
    <div className="deal-animation-overlay" onClick={onComplete}>
      <div className="deal-animation-container">
        <div className="deal-title">
          {phase === 'dealing' && (
            <>
              <span className="deal-title-text">发牌中</span>
              <span className="deal-progress">{dealtCount}/51</span>
              <span className="deal-skip-hint">点击跳过</span>
            </>
          )}
          {phase === 'landlord-reveal' && (
            <span className="deal-title-text reveal">底牌揭晓</span>
          )}
          {phase === 'landlord-deal' && (
            <span className="deal-title-text">地主获得底牌</span>
          )}
        </div>

        <div className="deal-center">
          <div className="card-deck">
            {Array.from({ length: Math.max(0, 5 - Math.floor(dealtCount / 10)) }).map((_, i) => (
              <div key={i} className="deck-card" style={{ transform: `translateX(${i * 2}px)` }} />
            ))}
          </div>

          <div className="flying-cards">
            {flyingCards.map((card, index) => (
              <div
                key={card.id}
                className={`flying-card ${index < dealtCount ? 'dealt' : ''}`}
                style={getCardStyle(card, index)}
              >
                <div className="card-back">
                  <span>🃏</span>
                </div>
              </div>
            ))}
          </div>

          {(phase === 'landlord-reveal' || phase === 'landlord-deal') && (
            <div className="landlord-cards-reveal">
              {[0, 1, 2].map(i => (
                <div
                  key={i}
                  className={`landlord-card-slot ${revealedLandlordCards[i] !== undefined ? 'revealed' : ''}`}
                >
                  {revealedLandlordCards[i] !== undefined && landlordCards[i] !== undefined ? (
                    <div className="landlord-card-flip">
                      <CardDisplay card={landlordCards[i]} faceDown={!landlordCardsRevealed} />
                    </div>
                  ) : (
                    <div className="card-back mystery">
                      <span>?</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {phase === 'landlord-deal' && landlordCardsRevealed && (
            <div className="landlord-cards-falling">
              {landlordCards.slice(0, landlordDealIndex + 1).map((card, i) => (
                <div
                  key={i}
                  className="falling-card falling"
                >
                  <CardDisplay card={card} />
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="player-targets">
          {[0, 1, 2].map(seat => {
            const pos = playerPositions[seat as keyof typeof playerPositions]
            const player = playerHands.find(p => p.seatIndex === seat)
            return (
              <div
                key={seat}
                className="player-target"
                style={{
                  transform: `translate(${pos.x}px, ${pos.y}px)`
                }}
              >
                <div className="player-avatar">
                  <span>{pos.label}</span>
                </div>
                {player && (
                  <div className="player-card-count">
                    {Math.min(dealtCount, player.cardCount)}/{player.cardCount}
                  </div>
                )}
              </div>
            )
          })}
        </div>

        <div className="deal-particles">
          {Array.from({ length: 15 }).map((_, i) => (
            <div
              key={i}
              className="particle"
              style={{
                '--particle-delay': `${Math.random() * 2}s`,
                '--particle-x': `${(Math.random() - 0.5) * 400}px`,
                '--particle-y': `${(Math.random() - 0.5) * 400}px`
              } as React.CSSProperties}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
