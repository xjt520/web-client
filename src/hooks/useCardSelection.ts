import { useState, useCallback } from 'react'

export function useCardSelection() {
  const [selectedCards, setSelectedCards] = useState<Set<number>>(new Set())

  const toggleCard = useCallback((card: number) => {
    setSelectedCards((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(card)) {
        newSet.delete(card)
      } else {
        newSet.add(card)
      }
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
