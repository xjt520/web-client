const SUITS = ['spade', 'heart', 'club', 'diamond']
const RANKS = ['3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A', '2']

export function cardValue(card: number): number {
  if (card >= 0 && card <= 51) {
    return card % 13
  }
  if (card === 52) return 13
  if (card === 53) return 14
  return 0
}

export function cardSuit(card: number): string | null {
  if (card >= 0 && card <= 51) {
    return SUITS[Math.floor(card / 13)]
  }
  return null
}

export function cardRank(card: number): string {
  if (card >= 0 && card <= 51) {
    return RANKS[card % 13]
  }
  if (card === 52) return '小王'
  if (card === 53) return '大王'
  return '?'
}

export function getSuitSymbol(suit: string): string {
  switch (suit) {
    case 'spade':
      return '♠'
    case 'heart':
      return '♥'
    case 'club':
      return '♣'
    case 'diamond':
      return '♦'
    default:
      return '?'
  }
}

export function isRedCard(card: number): boolean {
  const suit = cardSuit(card)
  return suit === 'heart' || suit === 'diamond'
}

export function cardDisplay(card: number): string {
  const suit = cardSuit(card)
  if (suit) {
    return `${getSuitSymbol(suit)}${cardRank(card)}`
  }
  return cardRank(card)
}

export function sortCards(cards: number[]): number[] {
  return [...cards].sort((a, b) => {
    const valueA = cardValue(a)
    const valueB = cardValue(b)
    if (valueA !== valueB) {
      return valueA - valueB
    }
    // Same rank, sort by suit (spade > heart > club > diamond)
    const suitA = Math.floor(a / 13)
    const suitB = Math.floor(b / 13)
    return suitA - suitB
  })
}
