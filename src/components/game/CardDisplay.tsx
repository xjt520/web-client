import { cardRank, cardSuit, isRedCard, getSuitSymbol } from '../../lib/gameUtils'
import { useScreenOrientation } from '../../hooks/useScreenOrientation'

interface CardDisplayProps {
  card: number
  selected?: boolean
  onClick?: () => void
  faceDown?: boolean
}

export function CardDisplay({
  card,
  selected = false,
  onClick,
  faceDown = false,
}: CardDisplayProps) {
  const { isMobileLandscape, isMobileLandscapeSm } = useScreenOrientation()

  if (faceDown) {
    return (
      <div className="card card-back" onClick={onClick}>
        <div className="w-full h-full flex items-center justify-center">
          <span className="text-2xl opacity-50">🎴</span>
        </div>
      </div>
    )
  }

  const suit = cardSuit(card)
  const rank = cardRank(card)
  const red = isRedCard(card)
  const symbol = suit ? getSuitSymbol(suit) : ''
  const isJoker = card >= 52

  // 大小王特殊样式
  const jokerClass = isJoker
    ? 'card-joker ' + (card === 53 ? 'card-joker-red' : 'card-joker-black')
    : ''

  // 响应式字体大小
  const rankSize = isMobileLandscapeSm ? 'text-[0.5rem]' : isMobileLandscape ? 'text-[0.625rem]' : 'text-xs'
  const symbolSize = isMobileLandscapeSm ? 'text-[0.625rem]' : isMobileLandscape ? 'text-xs' : 'text-sm'
  const centerSymbolSize = isMobileLandscapeSm ? 'text-base' : isMobileLandscape ? 'text-lg' : 'text-2xl'
  const jokerIconSize = isMobileLandscapeSm ? 'text-sm' : isMobileLandscape ? 'text-base' : 'text-xl'

  return (
    <div
      className={`card ${selected ? 'selected' : ''} ${red ? 'card-red' : 'card-black'} ${jokerClass}`}
      onClick={onClick}
    >
      {isJoker ? (
        <div className="flex flex-col items-center justify-center">
          <span className={jokerIconSize}>{card === 53 ? '👑' : '🃏'}</span>
          <span className={`${rankSize} font-bold mt-0.5`}>{rank}</span>
        </div>
      ) : (
        <>
          <div className="card-suit-top">
            <div className={`${rankSize} font-bold`}>{rank}</div>
            <div className={symbolSize}>{symbol}</div>
          </div>
          <div className="card-rank flex-1 flex items-center justify-center">
            <span className={centerSymbolSize}>{symbol}</span>
          </div>
          <div className="card-suit-bottom">
            <div className={symbolSize}>{symbol}</div>
            <div className={`${rankSize} font-bold`}>{rank}</div>
          </div>
        </>
      )}
    </div>
  )
}
