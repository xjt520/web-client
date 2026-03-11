import { CardDisplay } from './CardDisplay'
import { sortCards } from '../../lib/gameUtils'

interface LandlordCardsProps {
  cards: Uint8Array
  revealed: boolean
}

export function LandlordCards({ cards, revealed }: LandlordCardsProps) {
  const cardsArray = Array.from(cards)
  const sortedCards = sortCards(cardsArray)

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="flex gap-1">
        {sortedCards.map((card, index) => (
          <CardDisplay
            key={`${card}-${index}`}
            card={card}
            faceDown={!revealed}
          />
        ))}
      </div>
    </div>
  )
}
