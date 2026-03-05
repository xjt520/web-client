import { useState, useEffect } from 'react'
import { CardDisplay } from './CardDisplay'

interface DealAnimationProps {
  cards: number[]
  onComplete: () => void
  enabled: boolean
}

export function DealAnimation({ cards, onComplete, enabled }: DealAnimationProps) {
  const [dealtCards, setDealtCards] = useState<number[]>([])
  const [phase, setPhase] = useState<'dealing' | 'complete'>('dealing')

  useEffect(() => {
    if (!enabled) {
      onComplete()
      return
    }

    // 3秒内发完 17 张牌
    const dealInterval = 3000 / 17
    let index = 0

    const timer = setInterval(() => {
      if (index < cards.length) {
        setDealtCards(prev => [...prev, cards[index]])
        index++
      } else {
        clearInterval(timer)
        setPhase('complete')
        setTimeout(onComplete, 500)
      }
    }, dealInterval)

    return () => clearInterval(timer)
  }, [cards, enabled, onComplete])

  if (!enabled) return null

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
      <div className="relative">
        {/* 标题 */}
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold text-white mb-2">发牌中...</h2>
          <p className="text-gray-400">
            {phase === 'dealing' ? `已发 ${dealtCards.length}/${cards.length} 张` : '发牌完成!'}
          </p>
        </div>

        {/* 牌堆 */}
        <div className="relative h-32 mb-8">
          <div className="absolute left-1/2 top-0 -translate-x-1/2">
            {Array.from({ length: Math.max(0, cards.length - dealtCards.length) }).map((_, i) => (
              <div
                key={i}
                className="absolute w-16 h-24 bg-gradient-to-br from-blue-600 to-blue-800 rounded-lg border-2 border-blue-400 shadow-lg"
                style={{
                  transform: `translateX(${(i - 5) * 2}px)`,
                  zIndex: i,
                }}
              >
                <div className="w-full h-full flex items-center justify-center">
                  <span className="text-2xl">🃏</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 已发的牌 */}
        <div className="flex justify-center gap-1 flex-wrap max-w-lg">
          {dealtCards.map((card, i) => (
            <div
              key={i}
              className="animate-deal-card"
              style={{
                animationDelay: `${i * 50}ms`,
              }}
            >
              <CardDisplay card={card} />
            </div>
          ))}
        </div>
      </div>

      <style>{`
        @keyframes deal-card {
          0% {
            opacity: 0;
            transform: translateY(-50px) scale(0.5);
          }
          100% {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
        .animate-deal-card {
          animation: deal-card 0.3s ease-out forwards;
        }
      `}</style>
    </div>
  )
}
