/**
 * 牌型验证和比较逻辑
 * 移植自 Rust 后端 combination.rs
 */

import { cardValue } from './gameUtils'

/**
 * 牌型枚举
 */
export enum CombinationType {
  /** 单张 */
  Single = 'Single',
  /** 对子 */
  Pair = 'Pair',
  /** 三张 */
  Triple = 'Triple',
  /** 三带一 */
  TripleWithSingle = 'TripleWithSingle',
  /** 三带对 */
  TripleWithPair = 'TripleWithPair',
  /** 顺子（5张及以上连续单牌） */
  Straight = 'Straight',
  /** 连对（3对及以上连续对子） */
  DoubleStraight = 'DoubleStraight',
  /** 飞机不带（2个及以上连续三张） */
  TripleStraight = 'TripleStraight',
  /** 飞机不带翅膀 */
  Airplane = 'Airplane',
  /** 飞机带单 */
  AirplaneWithSingle = 'AirplaneWithSingle',
  /** 飞机带对 */
  AirplaneWithPair = 'AirplaneWithPair',
  /** 炸弹（四张相同） */
  Bomb = 'Bomb',
  /** 火箭（双王） */
  Rocket = 'Rocket',
  /** 四带二（单或对） */
  FourWithTwo = 'FourWithTwo',
  /** 无效牌型 */
  Invalid = 'Invalid',
}

/**
 * 牌型名称映射
 */
export const COMBINATION_NAMES: Record<CombinationType, string> = {
  [CombinationType.Single]: '单张',
  [CombinationType.Pair]: '对子',
  [CombinationType.Triple]: '三张',
  [CombinationType.TripleWithSingle]: '三带一',
  [CombinationType.TripleWithPair]: '三带对',
  [CombinationType.Straight]: '顺子',
  [CombinationType.DoubleStraight]: '连对',
  [CombinationType.TripleStraight]: '飞机不带',
  [CombinationType.Airplane]: '飞机',
  [CombinationType.AirplaneWithSingle]: '飞机带单',
  [CombinationType.AirplaneWithPair]: '飞机带对',
  [CombinationType.Bomb]: '炸弹',
  [CombinationType.Rocket]: '火箭',
  [CombinationType.FourWithTwo]: '四带二',
  [CombinationType.Invalid]: '无效牌型',
}

/**
 * 可出组合接口
 */
export interface PlayableCombination {
  cards: number[]
  type: CombinationType
  coreValue: number
}

/**
 * 获取卡牌的游戏值数组
 */
export function getCardValues(cards: number[]): number[] {
  const values = cards.map((c) => cardValue(c))
  values.sort((a, b) => a - b)
  return values
}

/**
 * 统计各牌值出现次数
 */
export function countValues(values: number[]): Map<number, number> {
  const counts = new Map<number, number>()
  for (const v of values) {
    counts.set(v, (counts.get(v) || 0) + 1)
  }
  return counts
}

/**
 * 检查数值是否连续
 */
export function isConsecutive(values: number[]): boolean {
  if (values.length < 2) {
    return true
  }
  const sorted = [...values].sort((a, b) => a - b)
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i] !== sorted[i - 1] + 1) {
      return false
    }
  }
  return true
}

/**
 * 验证牌型
 */
export function validateCombination(cards: number[]): CombinationType {
  if (cards.length === 0) {
    return CombinationType.Invalid
  }

  const values = getCardValues(cards)
  const counts = countValues(values)
  const len = cards.length

  // 单张
  if (len === 1) {
    return CombinationType.Single
  }

  // 对子或火箭
  if (len === 2) {
    if (values[0] === values[1]) {
      return CombinationType.Pair
    }
    // 火箭：双王
    if ((cards[0] === 52 && cards[1] === 53) || (cards[0] === 53 && cards[1] === 52)) {
      return CombinationType.Rocket
    }
    return CombinationType.Invalid
  }

  // 三张
  if (len === 3 && counts.size === 1) {
    return CombinationType.Triple
  }

  // 四张：炸弹或三带一
  if (len === 4) {
    if (counts.size === 1) {
      return CombinationType.Bomb
    }
    if (counts.size === 2) {
      const hasTriple = Array.from(counts.values()).some((c) => c === 3)
      if (hasTriple) {
        return CombinationType.TripleWithSingle
      }
    }
    return CombinationType.Invalid
  }

  // 五张：三带对或顺子
  if (len === 5) {
    // 三带对
    if (counts.size === 2) {
      const hasTriple = Array.from(counts.values()).some((c) => c === 3)
      const hasPair = Array.from(counts.values()).some((c) => c === 2)
      if (hasTriple && hasPair) {
        return CombinationType.TripleWithPair
      }
    }
    // 顺子
    if (counts.size === 5 && isConsecutive(values)) {
      if (values.every((v) => v <= 11)) {
        return CombinationType.Straight
      }
    }
    return CombinationType.Invalid
  }

  // 顺子（5张及以上，每张各一）
  if (len >= 5 && counts.size === len) {
    if (isConsecutive(values) && values.every((v) => v <= 11)) {
      return CombinationType.Straight
    }
  }

  // 连对（3对及以上）
  if (len >= 6 && len % 2 === 0) {
    const allPairs = Array.from(counts.values()).every((c) => c === 2)
    if (allPairs) {
      const pairValues = Array.from(counts.keys())
      if (isConsecutive(pairValues) && pairValues.every((v) => v <= 11)) {
        return CombinationType.DoubleStraight
      }
    }
  }

  // 飞机不带（2个及以上连续三张）
  if (len >= 6 && len % 3 === 0) {
    const allTriples = Array.from(counts.values()).every((c) => c === 3)
    if (allTriples && isConsecutive(values) && values.every((v) => v <= 11)) {
      return CombinationType.TripleStraight
    }
  }

  // 飞机带单
  if (len >= 6) {
    const tripleCount = Array.from(counts.values()).filter((c) => c === 3).length
    const singleCount = Array.from(counts.values()).filter((c) => c === 1).length

    if (tripleCount >= 2 && singleCount === tripleCount) {
      const tripleValues = Array.from(counts.entries())
        .filter(([, c]) => c === 3)
        .map(([v]) => v)

      const tripleSet = new Set(tripleValues)

      const singleValues = Array.from(counts.entries())
        .filter(([, c]) => c === 1)
        .map(([v]) => v)

      const singlesValid = singleValues.every((v) => !tripleSet.has(v))

      if (
        isConsecutive(tripleValues) &&
        tripleValues.every((v) => v <= 11) &&
        singlesValid
      ) {
        return CombinationType.AirplaneWithSingle
      }
    }
  }

  // 飞机带对
  if (len >= 8 && len % 2 === 0) {
    const tripleCount = Array.from(counts.values()).filter((c) => c === 3).length
    const pairCount = Array.from(counts.values()).filter((c) => c === 2).length

    if (tripleCount >= 2 && pairCount === tripleCount) {
      const tripleValues = Array.from(counts.entries())
        .filter(([, c]) => c === 3)
        .map(([v]) => v)

      const tripleSet = new Set(tripleValues)

      const pairValues = Array.from(counts.entries())
        .filter(([, c]) => c === 2)
        .map(([v]) => v)

      const pairsValid = pairValues.every((v) => !tripleSet.has(v))

      if (
        isConsecutive(tripleValues) &&
        tripleValues.every((v) => v <= 11) &&
        pairsValid
      ) {
        return CombinationType.AirplaneWithPair
      }
    }
  }

  // 四带二（单）
  if (len === 6) {
    const fourEntry = Array.from(counts.entries()).find(([, c]) => c === 4)
    if (fourEntry) {
      const remaining = Array.from(counts.entries())
        .filter(([, c]) => c !== 4)
        .map(([, c]) => c)
      // 剩余2张可以是[1,1]两张单牌或[2]一对
      if (remaining.length === 2 && remaining.every((c) => c === 1)) {
        return CombinationType.FourWithTwo
      }
      if (remaining.length === 1 && remaining[0] === 2) {
        return CombinationType.FourWithTwo
      }
    }
  }

  // 四带两对
  if (len === 8) {
    const hasFour = Array.from(counts.values()).some((c) => c === 4)
    const pairs = Array.from(counts.values()).filter((c) => c === 2).length
    if (hasFour && pairs === 2) {
      return CombinationType.FourWithTwo
    }
  }

  return CombinationType.Invalid
}

/**
 * 获取牌组中核心牌的值
 * 三带一/三带对/飞机/四带二返回三张/四张的牌值
 */
export function getCoreValue(cards: number[], combinationType: CombinationType): number {
  const values = getCardValues(cards)
  const counts = countValues(values)

  switch (combinationType) {
    // 三带一、三带对：返回三张的牌值
    case CombinationType.TripleWithSingle:
    case CombinationType.TripleWithPair: {
      const tripleEntry = Array.from(counts.entries()).find(([, c]) => c === 3)
      return tripleEntry ? tripleEntry[0] : 0
    }
    // 飞机系列：返回最大三张的牌值
    case CombinationType.TripleStraight:
    case CombinationType.Airplane:
    case CombinationType.AirplaneWithSingle:
    case CombinationType.AirplaneWithPair: {
      const tripleValues = Array.from(counts.entries())
        .filter(([, c]) => c === 3)
        .map(([v]) => v)
      return Math.max(...tripleValues, 0)
    }
    // 四带二：返回四张的牌值
    case CombinationType.FourWithTwo: {
      const fourEntry = Array.from(counts.entries()).find(([, c]) => c === 4)
      return fourEntry ? fourEntry[0] : 0
    }
    // 其他牌型：返回最大牌值
    default:
      return Math.max(...values, 0)
  }
}

/**
 * 判断当前牌是否能打过上一手牌
 */
export function canBeat(current: number[], previous: number[]): boolean {
  const currentType = validateCombination(current)
  const previousType = validateCombination(previous)

  if (currentType === CombinationType.Invalid) {
    return false
  }

  // 火箭最大
  if (currentType === CombinationType.Rocket) {
    return true
  }

  // 火箭无法被打过
  if (previousType === CombinationType.Rocket) {
    return false
  }

  // 炸弹可以打非炸弹
  if (currentType === CombinationType.Bomb) {
    if (previousType === CombinationType.Bomb) {
      // 炸弹比大小
      const currentMax = Math.max(...getCardValues(current))
      const previousMax = Math.max(...getCardValues(previous))
      return currentMax > previousMax
    }
    return true
  }

  // 非炸弹无法打过炸弹
  if (previousType === CombinationType.Bomb) {
    return false
  }

  // 牌型必须相同
  if (currentType !== previousType) {
    return false
  }

  // 张数必须相同
  if (current.length !== previous.length) {
    return false
  }

  // 根据牌型比较核心牌值
  const currentCore = getCoreValue(current, currentType)
  const previousCore = getCoreValue(previous, previousType)

  return currentCore > previousCore
}

/**
 * 判断是否是炸弹或火箭（特殊牌型）
 */
export function isSpecialCombination(type: CombinationType): boolean {
  return type === CombinationType.Bomb || type === CombinationType.Rocket
}

/**
 * 找出所有可出的牌型组合
 */
export function findAllPlayableCombinations(
  cards: number[],
  previousPlay: number[] | null
): PlayableCombination[] {
  const combinations: PlayableCombination[] = []
  const values = getCardValues(cards)
  const counts = countValues(values)

  // 如果没有上家出牌，自由出牌，找出所有有效组合
  if (!previousPlay || previousPlay.length === 0) {
    // 单张
    for (const card of cards) {
      combinations.push({
        cards: [card],
        type: CombinationType.Single,
        coreValue: cardValue(card),
      })
    }

    // 对子
    for (const [value, count] of counts.entries()) {
      if (count >= 2) {
        const pairCards = cards.filter((c) => cardValue(c) === value).slice(0, 2)
        combinations.push({
          cards: pairCards,
          type: CombinationType.Pair,
          coreValue: value,
        })
      }
    }

    // 三张
    for (const [value, count] of counts.entries()) {
      if (count >= 3) {
        const tripleCards = cards.filter((c) => cardValue(c) === value).slice(0, 3)
        combinations.push({
          cards: tripleCards,
          type: CombinationType.Triple,
          coreValue: value,
        })
      }
    }

    // 三带一
    for (const [tripleValue, tripleCount] of counts.entries()) {
      if (tripleCount >= 3) {
        const tripleCards = cards.filter((c) => cardValue(c) === tripleValue).slice(0, 3)
        for (const [singleValue] of counts.entries()) {
          if (singleValue !== tripleValue) {
            const singleCard = cards.find((c) => cardValue(c) === singleValue)
            if (singleCard !== undefined) {
              const combo = [...tripleCards, singleCard]
              combinations.push({
                cards: combo,
                type: CombinationType.TripleWithSingle,
                coreValue: tripleValue,
              })
            }
          }
        }
      }
    }

    // 三带对
    for (const [tripleValue, tripleCount] of counts.entries()) {
      if (tripleCount >= 3) {
        const tripleCards = cards.filter((c) => cardValue(c) === tripleValue).slice(0, 3)
        for (const [pairValue, pairCount] of counts.entries()) {
          if (pairValue !== tripleValue && pairCount >= 2) {
            const pairCards = cards.filter((c) => cardValue(c) === pairValue).slice(0, 2)
            const combo = [...tripleCards, ...pairCards]
            combinations.push({
              cards: combo,
              type: CombinationType.TripleWithPair,
              coreValue: tripleValue,
            })
          }
        }
      }
    }

    // 顺子（5张及以上）
    for (let startValue = 0; startValue <= 7; startValue++) {
      // 最多从8开始（8,9,10,J,Q,K,A）
      for (let length = 5; length <= 12 - startValue; length++) {
        const straightValues: number[] = []
        for (let v = startValue; v < startValue + length; v++) {
          if (counts.get(v) && counts.get(v)! >= 1) {
            straightValues.push(v)
          } else {
            break
          }
        }
        if (straightValues.length === length) {
          const straightCards: number[] = []
          for (const v of straightValues) {
            const card = cards.find((c) => cardValue(c) === v)
            if (card !== undefined) straightCards.push(card)
          }
          if (straightCards.length === length) {
            combinations.push({
              cards: straightCards,
              type: CombinationType.Straight,
              coreValue: startValue + length - 1,
            })
          }
        }
      }
    }

    // 连对（3对及以上）
    for (let startValue = 0; startValue <= 9; startValue++) {
      for (let length = 3; length <= 12 - startValue; length++) {
        const pairValues: number[] = []
        for (let v = startValue; v < startValue + length; v++) {
          if (counts.get(v) && counts.get(v)! >= 2) {
            pairValues.push(v)
          } else {
            break
          }
        }
        if (pairValues.length === length) {
          const pairCards: number[] = []
          for (const v of pairValues) {
            const cardsForValue = cards.filter((c) => cardValue(c) === v).slice(0, 2)
            pairCards.push(...cardsForValue)
          }
          if (pairCards.length === length * 2) {
            combinations.push({
              cards: pairCards,
              type: CombinationType.DoubleStraight,
              coreValue: startValue + length - 1,
            })
          }
        }
      }
    }

    // 飞机不带（2个及以上连续三张）
    for (let startValue = 0; startValue <= 10; startValue++) {
      for (let length = 2; length <= 12 - startValue; length++) {
        const tripleValues: number[] = []
        for (let v = startValue; v < startValue + length; v++) {
          if (counts.get(v) && counts.get(v)! >= 3) {
            tripleValues.push(v)
          } else {
            break
          }
        }
        if (tripleValues.length === length) {
          const tripleCards: number[] = []
          for (const v of tripleValues) {
            const cardsForValue = cards.filter((c) => cardValue(c) === v).slice(0, 3)
            tripleCards.push(...cardsForValue)
          }
          if (tripleCards.length === length * 3) {
            combinations.push({
              cards: tripleCards,
              type: CombinationType.TripleStraight,
              coreValue: startValue + length - 1,
            })
          }
        }
      }
    }

    // 飞机带单（2个及以上连续三张 + 等量单牌）
    for (let startValue = 0; startValue <= 10; startValue++) {
      for (let length = 2; length <= 12 - startValue; length++) {
        const tripleValues: number[] = []
        for (let v = startValue; v < startValue + length; v++) {
          if (counts.get(v) && counts.get(v)! >= 3) {
            tripleValues.push(v)
          } else {
            break
          }
        }
        if (tripleValues.length === length) {
          const tripleCards: number[] = []
          for (const v of tripleValues) {
            const cardsForValue = cards.filter((c) => cardValue(c) === v).slice(0, 3)
            tripleCards.push(...cardsForValue)
          }
          // 找出可用的单牌（不能是三张的牌值）
          const tripleSet = new Set(tripleValues)
          const availableSingles = cards.filter(
            (c) => !tripleSet.has(cardValue(c)) || !tripleCards.includes(c)
          )
          // 从每个牌值取一张
          const usedSingleValues = new Set<number>()
          const singleCards: number[] = []
          for (const card of availableSingles) {
            const v = cardValue(card)
            if (!usedSingleValues.has(v) && singleCards.length < length) {
              singleCards.push(card)
              usedSingleValues.add(v)
            }
          }
          if (singleCards.length === length) {
            combinations.push({
              cards: [...tripleCards, ...singleCards],
              type: CombinationType.AirplaneWithSingle,
              coreValue: startValue + length - 1,
            })
          }
        }
      }
    }

    // 飞机带对（2个及以上连续三张 + 等量对子）
    for (let startValue = 0; startValue <= 10; startValue++) {
      for (let length = 2; length <= 12 - startValue; length++) {
        const tripleValues: number[] = []
        for (let v = startValue; v < startValue + length; v++) {
          if (counts.get(v) && counts.get(v)! >= 3) {
            tripleValues.push(v)
          } else {
            break
          }
        }
        if (tripleValues.length === length) {
          const tripleCards: number[] = []
          for (const v of tripleValues) {
            const cardsForValue = cards.filter((c) => cardValue(c) === v).slice(0, 3)
            tripleCards.push(...cardsForValue)
          }
          // 找出可用的对子（不能是三张的牌值）
          const tripleSet = new Set(tripleValues)
          const availablePairValues = Array.from(counts.entries())
            .filter(([v, c]) => !tripleSet.has(v) && c >= 2)
            .map(([v]) => v)
          if (availablePairValues.length >= length) {
            const pairCards: number[] = []
            for (let i = 0; i < length; i++) {
              const v = availablePairValues[i]
              const cardsForValue = cards.filter((c) => cardValue(c) === v).slice(0, 2)
              pairCards.push(...cardsForValue)
            }
            if (pairCards.length === length * 2) {
              combinations.push({
                cards: [...tripleCards, ...pairCards],
                type: CombinationType.AirplaneWithPair,
                coreValue: startValue + length - 1,
              })
            }
          }
        }
      }
    }

    // 炸弹
    for (const [value, count] of counts.entries()) {
      if (count === 4) {
        const bombCards = cards.filter((c) => cardValue(c) === value)
        combinations.push({
          cards: bombCards,
          type: CombinationType.Bomb,
          coreValue: value,
        })
      }
    }

    // 火箭
    const hasSmallJoker = cards.includes(52)
    const hasBigJoker = cards.includes(53)
    if (hasSmallJoker && hasBigJoker) {
      combinations.push({
        cards: [52, 53],
        type: CombinationType.Rocket,
        coreValue: 14,
      })
    }

    // 四带二（单）
    for (const [fourValue, fourCount] of counts.entries()) {
      if (fourCount === 4) {
        const fourCards = cards.filter((c) => cardValue(c) === fourValue)
        // 带两张单
        const otherValues = Array.from(counts.entries())
          .filter(([v]) => v !== fourValue)
          .map(([v]) => v)
        if (otherValues.length >= 2) {
          for (let i = 0; i < otherValues.length - 1; i++) {
            for (let j = i + 1; j < otherValues.length; j++) {
              const card1 = cards.find((c) => cardValue(c) === otherValues[i])
              const card2 = cards.find((c) => cardValue(c) === otherValues[j])
              if (card1 !== undefined && card2 !== undefined) {
                combinations.push({
                  cards: [...fourCards, card1, card2],
                  type: CombinationType.FourWithTwo,
                  coreValue: fourValue,
                })
              }
            }
          }
        }
        // 带一对
        for (const [pairValue, pairCount] of counts.entries()) {
          if (pairValue !== fourValue && pairCount >= 2) {
            const pairCards = cards.filter((c) => cardValue(c) === pairValue).slice(0, 2)
            combinations.push({
              cards: [...fourCards, ...pairCards],
              type: CombinationType.FourWithTwo,
              coreValue: fourValue,
            })
          }
        }
      }
    }

    // 四带两对
    for (const [fourValue, fourCount] of counts.entries()) {
      if (fourCount === 4) {
        const fourCards = cards.filter((c) => cardValue(c) === fourValue)
        const availablePairValues = Array.from(counts.entries())
          .filter(([v, c]) => v !== fourValue && c >= 2)
          .map(([v]) => v)
        if (availablePairValues.length >= 2) {
          for (let i = 0; i < availablePairValues.length - 1; i++) {
            for (let j = i + 1; j < availablePairValues.length; j++) {
              const pair1Cards = cards
                .filter((c) => cardValue(c) === availablePairValues[i])
                .slice(0, 2)
              const pair2Cards = cards
                .filter((c) => cardValue(c) === availablePairValues[j])
                .slice(0, 2)
              combinations.push({
                cards: [...fourCards, ...pair1Cards, ...pair2Cards],
                type: CombinationType.FourWithTwo,
                coreValue: fourValue,
              })
            }
          }
        }
      }
    }

    return combinations
  }

  // 有上家出牌，需要找出能打过的组合
  const previousType = validateCombination(previousPlay)
  const previousCore = getCoreValue(previousPlay, previousType)
  const previousLength = previousPlay.length

  // 单张
  if (previousType === CombinationType.Single) {
    for (const card of cards) {
      if (cardValue(card) > previousCore) {
        combinations.push({
          cards: [card],
          type: CombinationType.Single,
          coreValue: cardValue(card),
        })
      }
    }
  }

  // 对子
  if (previousType === CombinationType.Pair) {
    for (const [value, count] of counts.entries()) {
      if (count >= 2 && value > previousCore) {
        const pairCards = cards.filter((c) => cardValue(c) === value).slice(0, 2)
        combinations.push({
          cards: pairCards,
          type: CombinationType.Pair,
          coreValue: value,
        })
      }
    }
  }

  // 三张
  if (previousType === CombinationType.Triple) {
    for (const [value, count] of counts.entries()) {
      if (count >= 3 && value > previousCore) {
        const tripleCards = cards.filter((c) => cardValue(c) === value).slice(0, 3)
        combinations.push({
          cards: tripleCards,
          type: CombinationType.Triple,
          coreValue: value,
        })
      }
    }
  }

  // 三带一
  if (previousType === CombinationType.TripleWithSingle) {
    for (const [tripleValue, tripleCount] of counts.entries()) {
      if (tripleCount >= 3 && tripleValue > previousCore) {
        const tripleCards = cards.filter((c) => cardValue(c) === tripleValue).slice(0, 3)
        for (const [singleValue] of counts.entries()) {
          if (singleValue !== tripleValue) {
            const singleCard = cards.find((c) => cardValue(c) === singleValue)
            if (singleCard !== undefined) {
              combinations.push({
                cards: [...tripleCards, singleCard],
                type: CombinationType.TripleWithSingle,
                coreValue: tripleValue,
              })
            }
          }
        }
      }
    }
  }

  // 三带对
  if (previousType === CombinationType.TripleWithPair) {
    for (const [tripleValue, tripleCount] of counts.entries()) {
      if (tripleCount >= 3 && tripleValue > previousCore) {
        const tripleCards = cards.filter((c) => cardValue(c) === tripleValue).slice(0, 3)
        for (const [pairValue, pairCount] of counts.entries()) {
          if (pairValue !== tripleValue && pairCount >= 2) {
            const pairCards = cards.filter((c) => cardValue(c) === pairValue).slice(0, 2)
            combinations.push({
              cards: [...tripleCards, ...pairCards],
              type: CombinationType.TripleWithPair,
              coreValue: tripleValue,
            })
          }
        }
      }
    }
  }

  // 顺子
  if (previousType === CombinationType.Straight) {
    const startValue = previousCore - previousLength + 1
    for (let newStart = startValue + 1; newStart <= 12 - previousLength; newStart++) {
      const straightValues: number[] = []
      for (let v = newStart; v < newStart + previousLength; v++) {
        if (counts.get(v) && counts.get(v)! >= 1) {
          straightValues.push(v)
        } else {
          break
        }
      }
      if (straightValues.length === previousLength) {
        const straightCards: number[] = []
        for (const v of straightValues) {
          const card = cards.find((c) => cardValue(c) === v)
          if (card !== undefined) straightCards.push(card)
        }
        if (straightCards.length === previousLength) {
          combinations.push({
            cards: straightCards,
            type: CombinationType.Straight,
            coreValue: newStart + previousLength - 1,
          })
        }
      }
    }
  }

  // 连对
  if (previousType === CombinationType.DoubleStraight) {
    const pairCount = previousLength / 2
    const startValue = previousCore - pairCount + 1
    for (let newStart = startValue + 1; newStart <= 12 - pairCount; newStart++) {
      const pairValues: number[] = []
      for (let v = newStart; v < newStart + pairCount; v++) {
        if (counts.get(v) && counts.get(v)! >= 2) {
          pairValues.push(v)
        } else {
          break
        }
      }
      if (pairValues.length === pairCount) {
        const pairCards: number[] = []
        for (const v of pairValues) {
          const cardsForValue = cards.filter((c) => cardValue(c) === v).slice(0, 2)
          pairCards.push(...cardsForValue)
        }
        if (pairCards.length === previousLength) {
          combinations.push({
            cards: pairCards,
            type: CombinationType.DoubleStraight,
            coreValue: newStart + pairCount - 1,
          })
        }
      }
    }
  }

  // 飞机不带
  if (previousType === CombinationType.TripleStraight) {
    const tripleCount = previousLength / 3
    const startValue = previousCore - tripleCount + 1
    for (let newStart = startValue + 1; newStart <= 12 - tripleCount; newStart++) {
      const tripleValues: number[] = []
      for (let v = newStart; v < newStart + tripleCount; v++) {
        if (counts.get(v) && counts.get(v)! >= 3) {
          tripleValues.push(v)
        } else {
          break
        }
      }
      if (tripleValues.length === tripleCount) {
        const tripleCards: number[] = []
        for (const v of tripleValues) {
          const cardsForValue = cards.filter((c) => cardValue(c) === v).slice(0, 3)
          tripleCards.push(...cardsForValue)
        }
        if (tripleCards.length === previousLength) {
          combinations.push({
            cards: tripleCards,
            type: CombinationType.TripleStraight,
            coreValue: newStart + tripleCount - 1,
          })
        }
      }
    }
  }

  // 飞机带单
  if (previousType === CombinationType.AirplaneWithSingle) {
    const tripleCount = (previousLength / 4) | 0
    const startValue = previousCore - tripleCount + 1
    for (let newStart = startValue + 1; newStart <= 12 - tripleCount; newStart++) {
      const tripleValues: number[] = []
      for (let v = newStart; v < newStart + tripleCount; v++) {
        if (counts.get(v) && counts.get(v)! >= 3) {
          tripleValues.push(v)
        } else {
          break
        }
      }
      if (tripleValues.length === tripleCount) {
        const tripleCards: number[] = []
        for (const v of tripleValues) {
          const cardsForValue = cards.filter((c) => cardValue(c) === v).slice(0, 3)
          tripleCards.push(...cardsForValue)
        }
        const tripleSet = new Set(tripleValues)
        const availableSingles = cards.filter(
          (c) => !tripleSet.has(cardValue(c)) || !tripleCards.includes(c)
        )
        const usedSingleValues = new Set<number>()
        const singleCards: number[] = []
        for (const card of availableSingles) {
          const v = cardValue(card)
          if (!usedSingleValues.has(v) && singleCards.length < tripleCount) {
            singleCards.push(card)
            usedSingleValues.add(v)
          }
        }
        if (singleCards.length === tripleCount) {
          combinations.push({
            cards: [...tripleCards, ...singleCards],
            type: CombinationType.AirplaneWithSingle,
            coreValue: newStart + tripleCount - 1,
          })
        }
      }
    }
  }

  // 飞机带对
  if (previousType === CombinationType.AirplaneWithPair) {
    const tripleCount = (previousLength / 5) | 0
    const startValue = previousCore - tripleCount + 1
    for (let newStart = startValue + 1; newStart <= 12 - tripleCount; newStart++) {
      const tripleValues: number[] = []
      for (let v = newStart; v < newStart + tripleCount; v++) {
        if (counts.get(v) && counts.get(v)! >= 3) {
          tripleValues.push(v)
        } else {
          break
        }
      }
      if (tripleValues.length === tripleCount) {
        const tripleCards: number[] = []
        for (const v of tripleValues) {
          const cardsForValue = cards.filter((c) => cardValue(c) === v).slice(0, 3)
          tripleCards.push(...cardsForValue)
        }
        const tripleSet = new Set(tripleValues)
        const availablePairValues = Array.from(counts.entries())
          .filter(([v, c]) => !tripleSet.has(v) && c >= 2)
          .map(([v]) => v)
        if (availablePairValues.length >= tripleCount) {
          const pairCards: number[] = []
          for (let i = 0; i < tripleCount; i++) {
            const v = availablePairValues[i]
            const cardsForValue = cards.filter((c) => cardValue(c) === v).slice(0, 2)
            pairCards.push(...cardsForValue)
          }
          if (pairCards.length === tripleCount * 2) {
            combinations.push({
              cards: [...tripleCards, ...pairCards],
              type: CombinationType.AirplaneWithPair,
              coreValue: newStart + tripleCount - 1,
            })
          }
        }
      }
    }
  }

  // 四带二
  if (previousType === CombinationType.FourWithTwo) {
    for (const [fourValue, fourCount] of counts.entries()) {
      if (fourCount === 4 && fourValue > previousCore) {
        const fourCards = cards.filter((c) => cardValue(c) === fourValue)
        // 带两张单
        if (previousLength === 6) {
          const otherValues = Array.from(counts.entries())
            .filter(([v]) => v !== fourValue)
            .map(([v]) => v)
          if (otherValues.length >= 2) {
            for (let i = 0; i < otherValues.length - 1; i++) {
              for (let j = i + 1; j < otherValues.length; j++) {
                const card1 = cards.find((c) => cardValue(c) === otherValues[i])
                const card2 = cards.find((c) => cardValue(c) === otherValues[j])
                if (card1 !== undefined && card2 !== undefined) {
                  combinations.push({
                    cards: [...fourCards, card1, card2],
                    type: CombinationType.FourWithTwo,
                    coreValue: fourValue,
                  })
                }
              }
            }
          }
        }
        // 带一对或两对
        if (previousLength === 6 || previousLength === 8) {
          const availablePairValues = Array.from(counts.entries())
            .filter(([v, c]) => v !== fourValue && c >= 2)
            .map(([v]) => v)
          if (previousLength === 6 && availablePairValues.length >= 1) {
            const pairCards = cards
              .filter((c) => cardValue(c) === availablePairValues[0])
              .slice(0, 2)
            combinations.push({
              cards: [...fourCards, ...pairCards],
              type: CombinationType.FourWithTwo,
              coreValue: fourValue,
            })
          }
          if (previousLength === 8 && availablePairValues.length >= 2) {
            for (let i = 0; i < availablePairValues.length - 1; i++) {
              for (let j = i + 1; j < availablePairValues.length; j++) {
                const pair1Cards = cards
                  .filter((c) => cardValue(c) === availablePairValues[i])
                  .slice(0, 2)
                const pair2Cards = cards
                  .filter((c) => cardValue(c) === availablePairValues[j])
                  .slice(0, 2)
                combinations.push({
                  cards: [...fourCards, ...pair1Cards, ...pair2Cards],
                  type: CombinationType.FourWithTwo,
                  coreValue: fourValue,
                })
              }
            }
          }
        }
      }
    }
  }

  // 炸弹（可以打任何非炸弹牌型，或比小的炸弹大）
  if (previousType !== CombinationType.Rocket) {
    const minBombValue =
      previousType === CombinationType.Bomb ? previousCore + 1 : 0
    for (const [value, count] of counts.entries()) {
      if (count === 4 && value >= minBombValue) {
        const bombCards = cards.filter((c) => cardValue(c) === value)
        combinations.push({
          cards: bombCards,
          type: CombinationType.Bomb,
          coreValue: value,
        })
      }
    }
  }

  // 火箭（可以打任何牌）
  const hasSmallJoker = cards.includes(52)
  const hasBigJoker = cards.includes(53)
  if (hasSmallJoker && hasBigJoker) {
    combinations.push({
      cards: [52, 53],
      type: CombinationType.Rocket,
      coreValue: 14,
    })
  }

  return combinations
}

/**
 * 选择最优出牌策略
 */
export function selectBestPlay(
  combinations: PlayableCombination[],
  _allCards: number[]
): PlayableCombination | null {
  if (combinations.length === 0) {
    return null
  }

  // 过滤掉炸弹和火箭（除非只有这些可选）
  const nonBombs = combinations.filter(
    (c) => c.type !== CombinationType.Bomb && c.type !== CombinationType.Rocket
  )

  const candidates = nonBombs.length > 0 ? nonBombs : combinations

  // 排序规则：
  // 1. 牌数多的优先（快速减少手牌）
  // 2. 牌值小的优先（保留大牌）
  candidates.sort((a, b) => {
    // 牌数多的优先
    if (b.cards.length !== a.cards.length) {
      return b.cards.length - a.cards.length
    }
    // 牌值小的优先
    return a.coreValue - b.coreValue
  })

  return candidates[0]
}

/**
 * 获取所有可出牌的集合（用于高亮显示）
 */
export function getPlayableCards(
  combinations: PlayableCombination[]
): Set<number> {
  const playableCards = new Set<number>()
  for (const combo of combinations) {
    for (const card of combo.cards) {
      playableCards.add(card)
    }
  }
  return playableCards
}
