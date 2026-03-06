import { useState, useCallback } from 'react'

export function useCardSelection() {
  const [selectedCards, setSelectedCards] = useState<Set<number>>(new Set())

  const toggleCard = useCallback((card: number) => {
    console.log('[toggleCard] called with card:', card)
    setSelectedCards((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(card)) {
        console.log('[toggleCard] removing card:', card)
        newSet.delete(card)
      } else {
        console.log('[toggleCard] adding card:', card)
        newSet.add(card)
      }
      console.log('[toggleCard] new selection size:', newSet.size, 'cards:', Array.from(newSet))
      return newSet
    })
  }, [])

  const clearSelection = useCallback(() => {
    setSelectedCards(new Set())
  }, [])

  const getSelectedCards = useCallback(() => {
    return Array.from(selectedCards).sort((a, b) => a - b)
  }, [selectedCards])

  const setSelection = useCallback((cards: number[]) => {
    setSelectedCards(new Set(cards))
  }, [])

  return {
    selectedCards,
    toggleCard,
    clearSelection,
    getSelectedCards,
    isSelected: (card: number) => {
      const result = selectedCards.has(card)
      return result
    },
    setSelection,
  }
}
