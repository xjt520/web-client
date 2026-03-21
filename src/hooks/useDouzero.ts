/**
 * DouZero AI Hook
 * 提供基于 DouZero 深度强化学习模型的斗地主 AI 决策
 */

import { useState, useCallback, useEffect, useRef } from 'react'
import {
  douzeroApi,
  cardsToDouzero,
  douzeroToValues,
  findCardsFromValues,
  getBidSuggestion as apiGetBidSuggestion,
  getDoubleSuggestion as apiGetDoubleSuggestion,
  type DouzeroPosition,
  type BidResponse,
  type DoubleResponse,
} from '../lib/douzeroApi'

// 调试模式：通过环境变量控制
const DEBUG = import.meta.env.VITE_DOUZERO_DEBUG === 'true'

// 日志前缀
const LOG_PREFIX = '[DouzeroHook]'

function log(...args: unknown[]) {
  if (DEBUG) console.log(LOG_PREFIX, new Date().toISOString(), ...args)
}

function logError(...args: unknown[]) {
  console.error(LOG_PREFIX, new Date().toISOString(), ...args)
}

function logWarn(...args: unknown[]) {
  if (DEBUG) console.warn(LOG_PREFIX, new Date().toISOString(), ...args)
}

export interface DouzeroState {
  /** API 是否可用 */
  isAvailable: boolean
  /** 是否正在加载 */
  isLoading: boolean
  /** 最后一次错误 */
  error: string | null
}

export interface BidSuggestion extends BidResponse {
  /** 建议的叫分值（0-3） */
  suggestedBid: number
}

export interface DoubleSuggestion extends DoubleResponse {
  /** 建议是否加倍 */
  suggestedDouble: boolean
}

export interface PlaySuggestion {
  /** 建议出的牌（内部格式） */
  suggestedCards: number[]
  /** 牌型类型 */
  actionType: string
  /** 是否不出 */
  isPass: boolean
  /** 预测胜率 */
  winRate: number
}

export interface UseDouzeroReturn extends DouzeroState {
  /** 获取叫分建议 */
  getBidSuggestion: (cards: number[], threshold?: number) => Promise<BidSuggestion | null>
  /** 获取加倍建议 */
  getDoubleSuggestion: (
    cards: number[],
    isLandlord: boolean,
    landlordCards?: number[]
  ) => Promise<DoubleSuggestion | null>
  /** 获取出牌建议 */
  getPlaySuggestion: (params: {
    myCards: number[]
    position: DouzeroPosition
    playedCards: { landlord: number[]; landlord_up: number[]; landlord_down: number[] }
    lastMoves: number[][]
    landlordCards: number[]
    /** 各位置剩余牌数 */
    numCardsLeft?: { landlord: number; landlord_up: number; landlord_down: number }
    /** 已打出炸弹数量 */
    bombCount?: number
    /** 4×3 叫分矩阵 */
    bidInfo?: number[][]
    /** 3元加倍状态向量 */
    multiplyInfo?: number[]
  }) => Promise<PlaySuggestion | null>
  /** 重新检查 API 可用性 */
  checkAvailability: () => Promise<boolean>
  /** 最后一次叫分建议 */
  lastBidSuggestion: BidSuggestion | null
  /** 最后一次加倍建议 */
  lastDoubleSuggestion: DoubleSuggestion | null
  /** 最后一次出牌建议 */
  lastPlaySuggestion: PlaySuggestion | null
  /** 清除出牌建议 */
  clearPlaySuggestion: () => void
  /** 清除叫分建议 */
  clearBidSuggestion: () => void
  /** 清除加倍建议 */
  clearDoubleSuggestion: () => void
}

/**
 * 获取玩家位置
 * @param seatIndex 玩家座位索引
 * @param landlordSeat 地主座位索引
 * @returns 玩家位置，如果地主未确定则返回 null
 */
export function getPlayerPosition(seatIndex: number, landlordSeat: number | undefined): DouzeroPosition | null {
  // 地主未确定时无法计算位置
  if (landlordSeat === undefined) {
    logWarn('getPlayerPosition: 地主座位未确定，无法计算位置', { seatIndex, landlordSeat })
    return null
  }

  let position: DouzeroPosition
  if (seatIndex === landlordSeat) {
    position = 'landlord'
  } else if (seatIndex === (landlordSeat + 1) % 3) {
    position = 'landlord_down'
  } else {
    position = 'landlord_up'
  }

  return position
}

/**
 * DouZero AI Hook
 * 提供斗地主 AI 决策支持
 */
export function useDouzero(): UseDouzeroReturn {
  log('========== useDouzero Hook 初始化 ==========')
  
  const [state, setState] = useState<DouzeroState>({
    isAvailable: false,
    isLoading: false,
    error: null,
  })

  const [lastBidSuggestion, setLastBidSuggestion] = useState<BidSuggestion | null>(null)
  const [lastDoubleSuggestion, setLastDoubleSuggestion] = useState<DoubleSuggestion | null>(null)
  const [lastPlaySuggestion, setLastPlaySuggestion] = useState<PlaySuggestion | null>(null)

  const checkInProgress = useRef(false)

  // 检查 API 可用性
  const checkAvailability = useCallback(async (): Promise<boolean> => {
    if (checkInProgress.current) {
      logWarn('健康检查正在进行中，跳过重复检查')
      return state.isAvailable
    }

    log('========== 开始检查 API 可用性 ==========')
    checkInProgress.current = true
    
    try {
      const available = await douzeroApi.checkHealth()
      log('API 可用性结果:', available)
      setState((prev) => ({ ...prev, isAvailable: available, error: available ? null : 'DouZero API 不可用' }))
      log('========== API 可用性检查完成 ==========')
      return available
    } catch (error) {
      logError('API 可用性检查异常:', error)
      setState((prev) => ({ ...prev, isAvailable: false, error: 'DouZero API 连接失败' }))
      log('========== API 可用性检查失败 ==========')
      return false
    } finally {
      checkInProgress.current = false
    }
  }, [state.isAvailable])

  // 初始化时检查可用性
  useEffect(() => {
    log('组件挂载，执行初始可用性检查')
    checkAvailability()
  }, [])

  // 获取叫分建议
  const getBidSuggestionHandler = useCallback(
    async (cards: number[], threshold = 0.5): Promise<BidSuggestion | null> => {
      log('========== Hook: 开始获取叫分建议 ==========')
      log('输入参数:', { cardCount: cards.length, threshold, cards })
      
      setState((prev) => ({ ...prev, isLoading: true, error: null }))

      try {
        log('调用 API 层 getBidSuggestion...')
        const response = await apiGetBidSuggestion(cards, threshold)
        log('API 响应:', response)

        // 根据胜率和阈值计算建议叫分
        let suggestedBid = 0
        if (response.should_bid && response.win_rate > threshold) {
          // 根据胜率决定叫分值
          if (response.win_rate > 0.8) {
            suggestedBid = 3
          } else if (response.win_rate > 0.65) {
            suggestedBid = 2
          } else {
            suggestedBid = 1
          }
        }

        const suggestion: BidSuggestion = {
          ...response,
          suggestedBid,
        }

        log('计算结果:', {
          should_bid: response.should_bid,
          win_rate: response.win_rate,
          threshold,
          suggestedBid
        })

        setLastBidSuggestion(suggestion)
        setState((prev) => ({ ...prev, isLoading: false }))
        log('========== Hook: 叫分建议获取完成 ==========')
        return suggestion
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : '获取叫分建议失败'
        logError('获取叫分建议失败:', error)
        setState((prev) => ({ ...prev, isLoading: false, error: errorMsg }))
        log('========== Hook: 叫分建议获取失败 ==========')
        return null
      }
    },
    []
  )

  // 获取加倍建议
  const getDoubleSuggestionHandler = useCallback(
    async (
      cards: number[],
      isLandlord: boolean,
      landlordCards?: number[]
    ): Promise<DoubleSuggestion | null> => {
      log('========== Hook: 开始获取加倍建议 ==========')
      log('输入参数:', { 
        cardCount: cards.length, 
        isLandlord, 
        landlordCardCount: landlordCards?.length,
        cards,
        landlordCards 
      })
      
      setState((prev) => ({ ...prev, isLoading: true, error: null }))

      try {
        log('调用 API 层 getDoubleSuggestion...')
        const response = await apiGetDoubleSuggestion(cards, isLandlord, landlordCards)
        log('API 响应:', response)

        const suggestion: DoubleSuggestion = {
          ...response,
          suggestedDouble: response.should_double,
        }

        log('计算结果:', {
          should_double: response.should_double,
          should_super_double: response.should_super_double,
          win_rate: response.win_rate,
          suggestedDouble: suggestion.suggestedDouble
        })

        setLastDoubleSuggestion(suggestion)
        setState((prev) => ({ ...prev, isLoading: false }))
        log('========== Hook: 加倍建议获取完成 ==========')
        return suggestion
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : '获取加倍建议失败'
        logError('获取加倍建议失败:', error)
        setState((prev) => ({ ...prev, isLoading: false, error: errorMsg }))
        log('========== Hook: 加倍建议获取失败 ==========')
        return null
      }
    },
    []
  )

  // 获取出牌建议
  const getPlaySuggestionHandler = useCallback(
    async (params: {
      myCards: number[]
      position: DouzeroPosition
      playedCards: { landlord: number[]; landlord_up: number[]; landlord_down: number[] }
      lastMoves: number[][]
      landlordCards: number[]
      numCardsLeft?: { landlord: number; landlord_up: number; landlord_down: number }
      /** 已打出炸弹数量 */
      bombCount?: number
      /** 4×3 叫分矩阵 */
      bidInfo?: number[][]
      /** 3元加倍状态向量 */
      multiplyInfo?: number[]
    }): Promise<PlaySuggestion | null> => {
      log('========== Hook: 开始获取出牌建议 ==========')
      log('输入参数:', {
        position: params.position,
        myCardCount: params.myCards.length,
        myCards: params.myCards,
        playedCardsCounts: {
          landlord: params.playedCards.landlord.length,
          landlord_up: params.playedCards.landlord_up.length,
          landlord_down: params.playedCards.landlord_down.length,
        },
        playedCards: params.playedCards,
        lastMovesCount: params.lastMoves.length,
        lastMoves: params.lastMoves,
        landlordCardsCount: params.landlordCards.length,
        landlordCards: params.landlordCards,
        numCardsLeft: params.numCardsLeft,
      })
      
      setState((prev) => ({ ...prev, isLoading: true, error: null }))

      try {
        // 构建请求
        const request = {
          position: params.position,
          my_cards: cardsToDouzero(params.myCards),
          played_cards: {
            landlord: cardsToDouzero(params.playedCards.landlord),
            landlord_up: cardsToDouzero(params.playedCards.landlord_up),
            landlord_down: cardsToDouzero(params.playedCards.landlord_down),
          },
          last_moves: params.lastMoves.map(cardsToDouzero),
          landlord_cards: cardsToDouzero(params.landlordCards),
          ...(params.numCardsLeft && { cards_left: params.numCardsLeft }),
          ...(params.bombCount !== undefined && { bomb_count: params.bombCount }),
          ...(params.bidInfo && { bid_info: params.bidInfo }),
          ...(params.multiplyInfo && { multiply_info: params.multiplyInfo }),
        }
        
        log('转换后的 API 请求:', request)
        log('调用 API 层 getBestPlay...')

        const response = await douzeroApi.getBestPlay(request)
        log('API 响应:', response)

        // 将 DouZero 格式转换回内部格式
        const suggestedValues = douzeroToValues(response.cards)
        log('转换后的卡牌值:', suggestedValues)
        
        const suggestedCards = findCardsFromValues(params.myCards, suggestedValues)
        log('匹配后的卡牌编号:', suggestedCards)

        const suggestion: PlaySuggestion = {
          suggestedCards,
          actionType: response.action_type,
          isPass: response.is_pass,
          winRate: response.win_rate,
        }

        log('最终建议:', {
          suggestedCards,
          actionType: response.action_type,
          isPass: response.is_pass,
          winRate: response.win_rate
        })

        setLastPlaySuggestion(suggestion)
        setState((prev) => ({ ...prev, isLoading: false }))
        log('========== Hook: 出牌建议获取完成 ==========')
        return suggestion
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : '获取出牌建议失败'
        logError('获取出牌建议失败:', error)
        setState((prev) => ({ ...prev, isLoading: false, error: errorMsg }))
        log('========== Hook: 出牌建议获取失败 ==========')
        return null
      }
    },
    []
  )

  // 清除出牌建议
  const clearPlaySuggestionHandler = useCallback(() => {
    log('清除出牌建议')
    setLastPlaySuggestion(null)
  }, [])

  // 清除叫分建议
  const clearBidSuggestionHandler = useCallback(() => {
    log('清除叫分建议')
    setLastBidSuggestion(null)
  }, [])

  // 清除加倍建议
  const clearDoubleSuggestionHandler = useCallback(() => {
    log('清除加倍建议')
    setLastDoubleSuggestion(null)
  }, [])

  log('当前 Hook 状态:', { 
    isAvailable: state.isAvailable, 
    isLoading: state.isLoading, 
    error: state.error,
    hasBidSuggestion: !!lastBidSuggestion,
    hasDoubleSuggestion: !!lastDoubleSuggestion,
    hasPlaySuggestion: !!lastPlaySuggestion,
  })

  return {
    ...state,
    getBidSuggestion: getBidSuggestionHandler,
    getDoubleSuggestion: getDoubleSuggestionHandler,
    getPlaySuggestion: getPlaySuggestionHandler,
    checkAvailability,
    lastBidSuggestion,
    lastDoubleSuggestion,
    lastPlaySuggestion,
    clearPlaySuggestion: clearPlaySuggestionHandler,
    clearBidSuggestion: clearBidSuggestionHandler,
    clearDoubleSuggestion: clearDoubleSuggestionHandler,
  }
}

/**
 * 轻量级 DouZero 状态指示器 Hook
 * 只提供 API 可用性状态，不包含建议缓存
 */
export function useDouzeroStatus(): { isAvailable: boolean; isLoading: boolean } {
  log('useDouzeroStatus Hook 初始化')
  
  const [isAvailable, setIsAvailable] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    let mounted = true

    const check = async () => {
      log('useDouzeroStatus: 执行健康检查')
      try {
        const available = await douzeroApi.checkHealth()
        if (mounted) {
          log('useDouzeroStatus: 设置 isAvailable =', available)
          setIsAvailable(available)
          setIsLoading(false)
        }
      } catch {
        if (mounted) {
          logWarn('useDouzeroStatus: 健康检查失败')
          setIsAvailable(false)
          setIsLoading(false)
        }
      }
    }

    check()

    return () => {
      mounted = false
    }
  }, [])

  return { isAvailable, isLoading }
}
