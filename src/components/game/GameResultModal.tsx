import { useMemo } from 'react'
import type { GameResult, RoomPlayer } from '../../module_bindings/types'
import { useScreenOrientation } from '../../hooks/useScreenOrientation'
import { CardDisplay } from './CardDisplay'
import { sortCards } from '../../lib/gameUtils'

interface PlayerCards {
  identityHex: string
  cards: number[]
}

interface GameResultModalProps {
  winner: string | undefined
  gameResults: GameResult[]
  players: RoomPlayer[]
  playerCards?: PlayerCards[]
  isSpring?: boolean
  isAntiSpring?: boolean
  myIdentityHex: string
  onRestart: () => void
  onLeave: () => void
}

function FanCards({ cards, isCompact }: { cards: number[]; isCompact: boolean }) {
  const sortedCards = useMemo(() => sortCards([...cards]), [cards])
  const cardCount = sortedCards.length

  const fanConfig = useMemo(() => {
    if (cardCount === 0) return { radius: 0, maxHeight: 0, containerWidth: 0 }

    if (isCompact) {
      return {
        radius: 100,
        maxHeight: 45,
        containerWidth: Math.min(cardCount * 16 + 40, 260),
      }
    }
    return {
      radius: 140,
      maxHeight: 58,
      containerWidth: Math.min(cardCount * 20 + 50, 360),
    }
  }, [cardCount, isCompact])

  const fanAngle = useMemo(() => {
    return Math.min(cardCount * 2.8, 90)
  }, [cardCount])

  const startAngle = -fanAngle / 2
  const angleStep = cardCount > 1 ? fanAngle / (cardCount - 1) : 0

  const cardStyles = useMemo(() => {
    return sortedCards.map((_, index) => {
      const angle = startAngle + index * angleStep
      const radians = (angle * Math.PI) / 180

      const x = Math.sin(radians) * fanConfig.radius
      const y = (1 - Math.cos(radians)) * fanConfig.radius * 0.12

      return {
        transform: `translate(${x}px, ${y}px) rotate(${angle}deg)`,
        zIndex: index,
      }
    })
  }, [sortedCards, startAngle, angleStep, fanConfig.radius])

  if (cardCount === 0) return null

  return (
    <div
      className="relative mt-2"
      style={{
        width: `${fanConfig.containerWidth}px`,
        height: `${fanConfig.maxHeight}px`,
      }}
    >
      {sortedCards.map((card, index) => {
        const style = cardStyles[index]
        return (
          <div
            key={`${card}-${index}`}
            className="absolute left-1/2 -translate-x-1/2 origin-bottom"
            style={{
              ...style,
              zIndex: index,
            }}
          >
            <div className={`${isCompact ? 'scale-70' : 'scale-80'} origin-bottom`}>
              <CardDisplay card={card} selected={false} />
            </div>
          </div>
        )
      })}
    </div>
  )
}

export function GameResultModal({
  winner,
  gameResults,
  players,
  playerCards = [],
  isSpring = false,
  isAntiSpring = false,
  myIdentityHex,
  onLeave,
}: GameResultModalProps) {
  const { isMobileLandscape, isCompactScreen } = useScreenOrientation()
  const isCompact = isMobileLandscape || isCompactScreen

  const myResult = gameResults.find(
    (r) => r.playerIdentity.toHexString() === myIdentityHex
  )
  const isLandlord = myResult?.isLandlord ?? false
  const isWinner =
    (winner === 'landlord' && isLandlord) ||
    (winner === 'farmer' && !isLandlord)

  const getPlayerName = (identityHex: string) => {
    const player = players.find((p) => p.playerIdentity.toHexString() === identityHex)
    return player?.playerName || '未知'
  }

  const getPlayerCards = (identityHex: string): number[] => {
    const pc = playerCards.find((p) => p.identityHex === identityHex)
    return pc?.cards || []
  }

  const getResultText = () => {
    if (winner === 'none') return { title: '流局', icon: '😐' }
    if (winner === 'ai') return { title: '游戏结束', icon: '👋' }
    if (isSpring) return { title: '春天', icon: '🌸' }
    if (isAntiSpring) return { title: '反春天', icon: '🌿' }
    if (isWinner) return { title: '胜利', icon: '🏆' }
    return { title: '失败', icon: '💔' }
  }

  const { title, icon } = getResultText()

  const sortedResults = [...gameResults].sort((a, b) => {
    if (a.isLandlord && !b.isLandlord) return -1
    if (!a.isLandlord && b.isLandlord) return 1
    return 0
  })

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onLeave} />

      <div className={`
        relative bg-gray-900/95 rounded-2xl shadow-2xl border border-gray-700/50
        ${isCompact ? 'w-full max-w-md' : 'w-full max-w-lg'}
        max-h-[90vh] overflow-y-auto
      `}>
        <div className="p-5 text-center">
          <div className="text-4xl mb-2">
            {icon}
          </div>
          <h2 className={`
            text-2xl font-bold mb-1
            ${isWinner ? 'text-yellow-400' : winner === 'none' ? 'text-gray-400' : 'text-gray-300'}
          `}>
            {title}
          </h2>
          {isSpring && <p className="text-pink-400 text-xs">完美碾压</p>}
          {isAntiSpring && <p className="text-emerald-400 text-xs">绝地反击</p>}
          {winner === 'none' && <p className="text-gray-500 text-xs">全部不叫</p>}
        </div>

        <div className="border-t border-gray-700/50 px-4 py-3 space-y-4">
          {sortedResults.map((result, index) => {
            const identityHex = result.playerIdentity.toHexString()
            const isMe = identityHex === myIdentityHex
            const playerIsWinner =
              (winner === 'landlord' && result.isLandlord) ||
              (winner === 'farmer' && !result.isLandlord)
            const cards = getPlayerCards(identityHex)

            return (
              <div
                key={index}
                className={`
                  py-3 px-3 rounded-lg
                  ${isMe ? 'bg-blue-900/30 border border-blue-500/30' : 'bg-gray-800/50'}
                `}
              >
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-base">
                      {result.isLandlord ? '👑' : '🌾'}
                    </span>
                    <span className={`truncate ${isMe ? 'text-blue-300 font-medium' : 'text-gray-300'}`}>
                      {getPlayerName(identityHex)}
                      {isMe && <span className="text-blue-400 text-xs ml-1">(你)</span>}
                    </span>
                    {playerIsWinner && <span className="text-yellow-400 text-xs">✓</span>}
                  </div>
                  <div className={`
                    font-bold text-lg shrink-0 ml-2
                    ${result.finalScore > 0 ? 'text-green-400' : result.finalScore < 0 ? 'text-red-400' : 'text-gray-400'}
                  `}>
                    {result.finalScore > 0 ? '+' : ''}{result.finalScore}
                  </div>
                </div>
                {cards.length > 0 && (
                  <div className="flex justify-center">
                    <FanCards cards={cards} isCompact={isCompact} />
                  </div>
                )}
              </div>
            )
          })}
        </div>

      </div>


    </div>
  )
}
