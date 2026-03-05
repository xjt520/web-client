import { cardRank, cardSuit, isRedCard, getSuitSymbol } from '../../lib/gameUtils'

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

  return (
    <div
      className={`card ${selected ? 'selected' : ''} ${red ? 'card-red' : 'card-black'} ${jokerClass}`}
      onClick={onClick}
    >
      {isJoker ? (
        <div className="flex flex-col items-center justify-center">
          <span className="text-xl">{card === 53 ? '👑' : '🃏'}</span>
          <span className="text-xs font-bold mt-1">{rank}</span>
        </div>
      ) : (
        <>
          <div className="card-suit-top">
            <div className="text-xs font-bold">{rank}</div>
            <div>{symbol}</div>
          </div>
          <div className="card-rank flex-1 flex items-center justify-center">
            <span className="text-2xl">{symbol}</span>
          </div>
          <div className="card-suit-bottom">
            <div>{symbol}</div>
            <div className="text-xs font-bold">{rank}</div>
          </div>
        </>
      )}
    </div>
  )
}
