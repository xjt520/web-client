import { CardDisplay } from './CardDisplay'
import { sortCards } from '../../lib/gameUtils'
import type { CurrentPlay, RoomPlayer } from '../../module_bindings/types'

interface PlayAreaProps {
  currentPlay: CurrentPlay | null
  players: RoomPlayer[]
}

export function PlayArea({ currentPlay, players }: PlayAreaProps) {
  if (!currentPlay) {
    return (
      <div className="w-48 h-24 bg-gray-800/50 rounded-lg flex items-center justify-center">
        <span className="text-gray-500">等待出牌...</span>
      </div>
    )
  }

  const player = players.find(
    (p) => p.playerIdentity.toHexString() === currentPlay.playerIdentity.toHexString()
  )

  const cardsArray = Array.from(currentPlay.cards)
  const sortedCards = sortCards(cardsArray)

  return (
    <div className="flex flex-col items-center gap-2">
      {player && (
        <span className="text-gray-300 text-sm">{player.playerName}</span>
      )}

      <div className="flex gap-1 flex-wrap justify-center max-w-xs">
        {sortedCards.map((card, index) => (
          <CardDisplay key={`${card}-${index}`} card={card} />
        ))}
      </div>

      <span className="text-gray-400 text-xs">{currentPlay.combinationType}</span>
    </div>
  )
}
