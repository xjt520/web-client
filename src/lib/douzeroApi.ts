/**
 * DouZero AI API 服务层
 * 基于 DouZero 深度强化学习模型的斗地主 AI
 */

const DOUZERO_API_URL = import.meta.env.VITE_DOUZERO_API_URL || 'http://localhost:8000'

// 调试模式：通过环境变量控制
const DEBUG = import.meta.env.VITE_DOUZERO_DEBUG === 'true'

// 日志前缀
const LOG_PREFIX = '[DouZero]'

/**
 * 日志工具函数（仅调试模式）
 */
function log(...args: unknown[]) {
  if (DEBUG) console.log(LOG_PREFIX, new Date().toISOString(), ...args)
}

function logError(...args: unknown[]) {
  console.error(LOG_PREFIX, new Date().toISOString(), ...args)
}

function logWarn(...args: unknown[]) {
  if (DEBUG) console.warn(LOG_PREFIX, new Date().toISOString(), ...args)
}

/**
 * DouZero 卡牌编码格式
 * 3-2 对应 3456789TJQKA2
 * 小王=X，大王=D
 * 示例: "34567TJQKA2XD"
 */

/**
 * 内部卡牌值 (0-14) 到 DouZero 格式的映射
 * 0-12 = 3,4,5,6,7,8,9,T,J,Q,K,A,2
 * 13 = X (小王)
 * 14 = D (大王)
 */
const VALUE_TO_DOUZERO: Record<number, string> = {
  0: '3',
  1: '4',
  2: '5',
  3: '6',
  4: '7',
  5: '8',
  6: '9',
  7: 'T',
  8: 'J',
  9: 'Q',
  10: 'K',
  11: 'A',
  12: '2',
  13: 'X',
  14: 'D',
}

const DOUZERO_TO_VALUE: Record<string, number> = {
  '3': 0,
  '4': 1,
  '5': 2,
  '6': 3,
  '7': 4,
  '8': 5,
  '9': 6,
  'T': 7,
  'J': 8,
  'Q': 9,
  'K': 10,
  'A': 11,
  '2': 12,
  'X': 13,
  'D': 14,
}

/**
 * 获取卡牌的游戏值
 * 0-51: 标准52张牌，0-12=3-2
 * 52: 小王
 * 53: 大王
 */
function cardValue(card: number): number {
  if (card >= 0 && card <= 51) {
    return card % 13
  }
  if (card === 52) return 13
  if (card === 53) return 14
  return 0
}

/**
 * 将内部卡牌数组转换为 DouZero 格式字符串
 * @param cards 内部卡牌数组 (0-53)
 * @returns DouZero 格式字符串 (如 "34567TJQKA2XD")
 */
export function cardsToDouzero(cards: number[]): string {
  const values = cards.map(cardValue).sort((a, b) => a - b)
  const result = values.map((v) => VALUE_TO_DOUZERO[v]).join('')
  log('cardsToDouzero', { input: cards, output: result, values })
  return result
}

/**
 * 将 DouZero 格式字符串转换为内部卡牌值数组
 * 注意：返回的是卡牌值(0-14)，不是卡牌编号(0-53)
 * @param douzeroStr DouZero 格式字符串
 * @returns 卡牌值数组
 */
export function douzeroToValues(douzeroStr: string): number[] {
  const result = douzeroStr.split('').map((c) => DOUZERO_TO_VALUE[c] ?? 0)
  log('douzeroToValues', { input: douzeroStr, output: result })
  return result
}

/**
 * 从手牌中找出指定值对应的卡牌编号
 * @param handCards 手牌
 * @param values 要找的卡牌值
 * @returns 卡牌编号数组
 */
export function findCardsFromValues(handCards: number[], values: number[]): number[] {
  const result: number[] = []
  const usedCards = new Set<number>()

  for (const targetValue of values) {
    for (let i = 0; i < handCards.length; i++) {
      const card = handCards[i]
      if (!usedCards.has(i) && cardValue(card) === targetValue) {
        result.push(card)
        usedCards.add(i)
        break
      }
    }
  }

  // 验证是否找到所有请求的卡牌
  if (result.length !== values.length) {
    logWarn('findCardsFromValues: 无法找到所有请求的卡牌', {
      requested: values,
      requestedCount: values.length,
      found: result,
      foundCount: result.length,
      handCards,
      handCardsValues: handCards.map(cardValue),
    })
  }

  log('findCardsFromValues', { handCards, values, result })
  return result
}

/**
 * 位置类型
 */
export type DouzeroPosition = 'landlord' | 'landlord_up' | 'landlord_down'

/**
 * 叫分评估请求
 */
export interface BidRequest {
  cards: string
  threshold: number
}

/**
 * 叫分评估响应
 */
export interface BidResponse {
  should_bid: boolean
  win_rate: number
  confidence: number
  /** API 调用是否失败 */
  isError?: boolean
}

/**
 * 加倍决策请求
 */
export interface DoubleRequest {
  cards: string
  is_landlord: boolean
  landlord_cards?: string
}

/**
 * 加倍决策响应
 */
export interface DoubleResponse {
  should_double: boolean
  should_super_double: boolean
  win_rate: number
  /** API 调用是否失败 */
  isError?: boolean
}

/**
 * 已出牌记录
 */
export interface PlayedCards {
  landlord: string
  landlord_up: string
  landlord_down: string
}

/**
 * 各位置剩余牌数
 */
export interface CardsLeft {
  landlord: number
  landlord_up: number
  landlord_down: number
}

/**
 * 出牌建议请求
 */
export interface PlayRequest {
  position: DouzeroPosition
  my_cards: string
  played_cards: PlayedCards
  last_moves: string[]
  landlord_cards: string
  /** 各位置剩余牌数 */
  cards_left?: CardsLeft
  /** 已打出炸弹数量 */
  bomb_count?: number
  /** 4×3 叫分矩阵，表示 4 轮叫分中 3 个玩家的叫分情况 */
  bid_info?: number[][]
  /** 3元加倍状态向量: [base倍数, 地主加倍倍数, 农民加倍倍数] */
  multiply_info?: number[]
}

/**
 * 出牌建议响应
 */
export interface PlayResponse {
  cards: string
  action_type: string
  is_pass: boolean
  win_rate: number
  /** API 调用是否失败 */
  isError?: boolean
}

/**
 * DouZero API 客户端
 */
export const douzeroApi = {
  /**
   * 叫分评估
   * @param cards 手牌（DouZero 格式）
   * @param threshold 胜率阈值
   */
  async evaluateBid(cards: string, threshold = 0.5): Promise<BidResponse> {
    const url = `${DOUZERO_API_URL}/api/bid`
    const requestBody: BidRequest = { cards, threshold }
    
    log('========== 叫分评估开始 ==========')
    log('请求 URL:', url)
    log('请求参数:', JSON.stringify(requestBody, null, 2))
    log('手牌 (DouZero格式):', cards)
    log('胜率阈值:', threshold)
    
    const startTime = performance.now()
    
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      })

      log('响应状态:', response.status, response.statusText)

      if (!response.ok) {
        const errorText = await response.text()
        logError('叫分评估失败:', response.status, errorText)
        throw new Error(`Bid API error: ${response.status} - ${errorText}`)
      }

      const data = await response.json()
      const elapsed = performance.now() - startTime
      
      log('响应数据:', JSON.stringify(data, null, 2))
      log('耗时:', elapsed.toFixed(2), 'ms')
      log('========== 叫分评估成功 ==========')
      
      return data as BidResponse
    } catch (error) {
      const elapsed = performance.now() - startTime
      logError('========== 叫分评估失败 ==========')
      logError('错误详情:', error instanceof Error ? error.message : error)
      logError('耗时:', elapsed.toFixed(2), 'ms')
      return { should_bid: false, win_rate: 0, confidence: 0, isError: true }
    }
  },

  /**
   * 加倍决策
   * @param cards 手牌（DouZero 格式）
   * @param isLandlord 是否是地主
   * @param landlordCards 地主底牌（可选）
   */
  async evaluateDouble(
    cards: string,
    isLandlord: boolean,
    landlordCards?: string
  ): Promise<DoubleResponse> {
    const url = `${DOUZERO_API_URL}/api/double`
    const request: DoubleRequest = {
      cards,
      is_landlord: isLandlord,
      ...(landlordCards && { landlord_cards: landlordCards }),
    }
    
    log('========== 加倍决策开始 ==========')
    log('请求 URL:', url)
    log('请求参数:', JSON.stringify(request, null, 2))
    log('手牌 (DouZero格式):', cards)
    log('是否地主:', isLandlord)
    log('地主底牌:', landlordCards || '无')
    
    const startTime = performance.now()
    
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request),
      })

      log('响应状态:', response.status, response.statusText)

      if (!response.ok) {
        const errorText = await response.text()
        logError('加倍决策失败:', response.status, errorText)
        throw new Error(`Double API error: ${response.status} - ${errorText}`)
      }

      const data = await response.json()
      const elapsed = performance.now() - startTime
      
      log('响应数据:', JSON.stringify(data, null, 2))
      log('耗时:', elapsed.toFixed(2), 'ms')
      log('========== 加倍决策成功 ==========')
      
      return data as DoubleResponse
    } catch (error) {
      const elapsed = performance.now() - startTime
      logError('========== 加倍决策失败 ==========')
      logError('错误详情:', error instanceof Error ? error.message : error)
      logError('耗时:', elapsed.toFixed(2), 'ms')
      return { should_double: false, should_super_double: false, win_rate: 0, isError: true }
    }
  },

  /**
   * 获取最优出牌建议
   * @param request 出牌请求参数
   */
  async getBestPlay(request: PlayRequest): Promise<PlayResponse> {
    const url = `${DOUZERO_API_URL}/api/play`
    
    log('========== 出牌建议开始 ==========')
    log('请求 URL:', url)
    log('请求参数:', JSON.stringify(request, null, 2))
    log('我的位置:', request.position)
    log('我的手牌:', request.my_cards)
    log('已出牌:', request.played_cards)
    log('上一手牌:', request.last_moves)
    log('地主底牌:', request.landlord_cards)
    
    const startTime = performance.now()
    
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request),
      })

      log('响应状态:', response.status, response.statusText)

      if (!response.ok) {
        const errorText = await response.text()
        logError('出牌建议失败:', response.status, errorText)
        throw new Error(`Play API error: ${response.status} - ${errorText}`)
      }

      const data = await response.json()
      const elapsed = performance.now() - startTime
      
      log('响应数据:', JSON.stringify(data, null, 2))
      log('建议出牌:', data.cards)
      log('牌型:', data.action_type)
      log('是否不出:', data.is_pass)
      log('预测胜率:', data.win_rate)
      log('耗时:', elapsed.toFixed(2), 'ms')
      log('========== 出牌建议成功 ==========')
      
      return data as PlayResponse
    } catch (error) {
      const elapsed = performance.now() - startTime
      logError('========== 出牌建议失败 ==========')
      logError('错误详情:', error instanceof Error ? error.message : error)
      logError('耗时:', elapsed.toFixed(2), 'ms')
      return { cards: '', action_type: 'pass', is_pass: true, win_rate: 0, isError: true }
    }
  },

  /**
   * 检查 API 是否可用
   */
  async checkHealth(): Promise<boolean> {
    const url = `${DOUZERO_API_URL}/health`
    
    log('========== 健康检查开始 ==========')
    log('请求 URL:', url)
    
    const startTime = performance.now()
    
    try {
      const response = await fetch(url, {
        method: 'GET',
      })
      
      const elapsed = performance.now() - startTime
      const available = response.ok
      
      log('响应状态:', response.status, response.statusText)
      log('API 可用:', available)
      log('耗时:', elapsed.toFixed(2), 'ms')
      log('========== 健康检查完成 ==========')
      
      return available
    } catch (error) {
      const elapsed = performance.now() - startTime
      logWarn('========== 健康检查失败 ==========')
      logWarn('错误详情:', error instanceof Error ? error.message : error)
      logWarn('耗时:', elapsed.toFixed(2), 'ms')
      logWarn('API 地址:', DOUZERO_API_URL)
      logWarn('提示: 请确保 DouZero API 服务已启动')
      return false
    }
  },
}

/**
 * 将内部卡牌转换为 DouZero 格式并获取叫分建议
 */
export async function getBidSuggestion(cards: number[], threshold = 0.5): Promise<BidResponse> {
  log('getBidSuggestion 被调用', { cardCount: cards.length, threshold })
  const douzeroCards = cardsToDouzero(cards)
  return douzeroApi.evaluateBid(douzeroCards, threshold)
}

/**
 * 将内部卡牌转换为 DouZero 格式并获取加倍建议
 */
export async function getDoubleSuggestion(
  cards: number[],
  isLandlord: boolean,
  landlordCards?: number[]
): Promise<DoubleResponse> {
  log('getDoubleSuggestion 被调用', { cardCount: cards.length, isLandlord, landlordCardCount: landlordCards?.length })
  const douzeroCards = cardsToDouzero(cards)
  const douzeroLandlordCards = landlordCards ? cardsToDouzero(landlordCards) : undefined
  return douzeroApi.evaluateDouble(douzeroCards, isLandlord, douzeroLandlordCards)
}

/**
 * 获取出牌建议（使用内部卡牌格式）
 */
export async function getPlaySuggestion(params: {
  position: DouzeroPosition
  myCards: number[]
  playedCards: { landlord: number[]; landlord_up: number[]; landlord_down: number[] }
  lastMoves: number[][]
  landlordCards: number[]
}): Promise<PlayResponse & { suggestedCards: number[] }> {
  log('getPlaySuggestion 被调用', {
    position: params.position,
    myCardCount: params.myCards.length,
    playedCardsCounts: {
      landlord: params.playedCards.landlord.length,
      landlord_up: params.playedCards.landlord_up.length,
      landlord_down: params.playedCards.landlord_down.length,
    },
    lastMovesCount: params.lastMoves.length,
    landlordCardsCount: params.landlordCards.length,
  })
  
  const request: PlayRequest = {
    position: params.position,
    my_cards: cardsToDouzero(params.myCards),
    played_cards: {
      landlord: cardsToDouzero(params.playedCards.landlord),
      landlord_up: cardsToDouzero(params.playedCards.landlord_up),
      landlord_down: cardsToDouzero(params.playedCards.landlord_down),
    },
    last_moves: params.lastMoves.map(cardsToDouzero),
    landlord_cards: cardsToDouzero(params.landlordCards),
  }

  const response = await douzeroApi.getBestPlay(request)

  const suggestedValues = douzeroToValues(response.cards)
  const suggestedCards = findCardsFromValues(params.myCards, suggestedValues)

  log('出牌建议转换完成', {
    responseCards: response.cards,
    suggestedValues,
    suggestedCards,
  })

  return {
    ...response,
    suggestedCards,
  }
}
