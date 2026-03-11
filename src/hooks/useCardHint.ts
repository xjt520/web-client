/**
 * 智能提示 Hook
 * 提供可出牌组合高亮、牌型识别、最优出牌推荐功能
 */

import { useMemo } from 'react'
import {
  CombinationType,
  PlayableCombination,
  validateCombination,
  canBeat,
  findAllPlayableCombinations,
  selectBestPlay,
  getPlayableCards,
  COMBINATION_NAMES,
} from '../lib/combination'

export interface UseCardHintReturn {
  /** 所有可出组合 */
  playableCombinations: PlayableCombination[]
  /** 当前选中牌型 */
  selectedCombinationType: CombinationType
  /** 当前选中牌是否可出 */
  canPlaySelected: boolean
  /** 推荐最佳出牌 */
  bestPlay: PlayableCombination | null
  /** 所有可出牌的集合（用于高亮） */
  playableCards: Set<number>
  /** 获取牌型名称 */
  getCombinationName: (type: CombinationType) => string
}

interface UseCardHintParams {
  /** 当前玩家的手牌 */
  handCards: number[]
  /** 当前选中的牌 */
  selectedCards: Set<number>
  /** 上家出的牌（null 表示自由出牌） */
  currentPlay: number[] | null
  /** 是否是当前玩家的回合 */
  isMyTurn: boolean
}

/**
 * 智能提示 Hook
 */
export function useCardHint({
  handCards,
  selectedCards,
  currentPlay,
  isMyTurn,
}: UseCardHintParams): UseCardHintReturn {
  // 计算所有可出的组合
  const playableCombinations = useMemo(() => {
    if (!isMyTurn || handCards.length === 0) {
      return []
    }
    return findAllPlayableCombinations(handCards, currentPlay)
  }, [handCards, currentPlay, isMyTurn])

  // 获取所有可出牌的集合（用于高亮）
  const playableCards = useMemo(() => {
    return getPlayableCards(playableCombinations)
  }, [playableCombinations])

  // 计算当前选中牌的牌型
  const selectedCombinationType = useMemo(() => {
    if (selectedCards.size === 0) {
      return CombinationType.Invalid
    }
    const cards = Array.from(selectedCards)
    return validateCombination(cards)
  }, [selectedCards])

  // 判断当前选中牌是否可出
  const canPlaySelected = useMemo(() => {
    if (selectedCards.size === 0 || !isMyTurn) {
      return false
    }
    const cards = Array.from(selectedCards)
    // 自由出牌时，只要牌型有效即可
    if (!currentPlay || currentPlay.length === 0) {
      return validateCombination(cards) !== CombinationType.Invalid
    }
    // 跟牌时，需要能打过
    return canBeat(cards, currentPlay)
  }, [selectedCards, currentPlay, isMyTurn])

  // 选择最优出牌
  const bestPlay = useMemo(() => {
    if (!isMyTurn || playableCombinations.length === 0) {
      return null
    }
    return selectBestPlay(playableCombinations, handCards)
  }, [playableCombinations, handCards, isMyTurn])

  // 获取牌型名称
  const getCombinationName = (type: CombinationType): string => {
    return COMBINATION_NAMES[type] || '未知牌型'
  }

  return {
    playableCombinations,
    selectedCombinationType,
    canPlaySelected,
    bestPlay,
    playableCards,
    getCombinationName,
  }
}
