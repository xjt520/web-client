export interface Player {
  identity: string
  name: string
  seatIndex: number
  ready: boolean
  isLandlord: boolean
  cardsCount: number
}

export interface GameState {
  roomId: number
  status: 'waiting' | 'bidding' | 'playing' | 'finished'
  landlord: string | null
  currentTurn: number
  multiple: number
  winner: 'landlord' | 'farmer' | null
}

export interface CardCombo {
  type: string
  cards: number[]
}
