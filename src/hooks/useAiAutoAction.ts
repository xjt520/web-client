import { useEffect, useRef, useCallback } from 'react'
import type { DbConnection } from '../lib/spacetime'
import type { Game, RoomPlayer, PlayerHand, CurrentPlay, LandlordCards, Bid, Doubling, Play } from '../module_bindings/types'
import { useDouzero, getPlayerPosition } from './useDouzero'

interface UseAiAutoActionProps {
  getConnection: () => DbConnection | null
  roomId: bigint | null
  isAiMode: boolean
  game: Game | null
  players: RoomPlayer[]
  allHands: PlayerHand[]
  currentPlay: CurrentPlay | null
  landlordCards: LandlordCards | null
  bids: Bid[]
  doublings: Doubling[]
  plays: Play[]
}

/** AI 思考延迟时间（毫秒） */
const AI_THINK_DELAY_MS = 1000

// 调试模式：通过环境变量控制
const DEBUG = import.meta.env.VITE_DOUZERO_DEBUG === 'true'

// 日志工具
const LOG_PREFIX = '[AI-Auto]'
function logAi(...args: unknown[]) {
  if (DEBUG) console.log(LOG_PREFIX, new Date().toISOString(), ...args)
}
function logAiError(...args: unknown[]) {
  console.error(LOG_PREFIX, new Date().toISOString(), ...args)
}
// AI 操作日志
function logAiAction(playerName: string, action: string, detail?: unknown) {
  if (DEBUG) console.log(`%c[AI 操作]%c 🤖 ${playerName} ${action}`, 'color: #4CAF50; font-weight: bold', 'color: inherit', detail ?? '')
}

/**
 * AI自动行动Hook - 在人机模式下使用 DouZero API 进行智能决策
 */
export function useAiAutoAction({
  getConnection,
  roomId,
  isAiMode,
  game,
  players,
  allHands,
  currentPlay,
  landlordCards,
  bids,
  doublings,
  plays,
}: UseAiAutoActionProps) {
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const processingRef = useRef(false)
  // 用于防止重复执行的唯一标识
  const lastActionIdRef = useRef<string>('')
  // 记录上一次的游戏状态，用于检测状态变化
  const lastGameStatusRef = useRef<string>('')
  const lastTurnIdentifierRef = useRef<string>('')

  // 使用 DouZero hook
  const douzero = useDouzero()

  // 监听游戏状态变化，重置 processing 状态（处理服务端 fallback 的情况）
  useEffect(() => {
    if (!game) return

    const turnIdentifier = game.status === 'bidding'
      ? `${bids.length}`
      : game.status === 'playing'
        ? `${game.currentTurn}`
        : `${game.currentDoublingTurn ?? 0}`

    const statusChanged = lastGameStatusRef.current !== '' && lastGameStatusRef.current !== game.status
    const turnChanged = lastTurnIdentifierRef.current !== '' && lastTurnIdentifierRef.current !== turnIdentifier

    if (statusChanged || turnChanged) {
      // 游戏状态或回合变化时，重置 processing 状态
      // 这处理了服务端 fallback 执行后客户端需要继续的情况
      if (processingRef.current) {
        logAi('检测到游戏状态变化，重置 processing 状态', {
          prevStatus: lastGameStatusRef.current,
          newStatus: game.status,
          prevTurn: lastTurnIdentifierRef.current,
          newTurn: turnIdentifier
        })
        processingRef.current = false
        lastActionIdRef.current = ''
      }
    }

    lastGameStatusRef.current = game.status
    lastTurnIdentifierRef.current = turnIdentifier
  }, [game, bids.length])

  // 获取当前需要行动的 AI 玩家
  const getCurrentAiPlayer = useCallback((): { player: RoomPlayer; hand: PlayerHand | undefined } | null => {
    if (!game || !isAiMode) {
      logAi('getCurrentAiPlayer: game 或 isAiMode 不满足', { hasGame: !!game, isAiMode })
      return null
    }

    // 根据游戏阶段确定当前玩家
    let currentSeat: number | undefined

    if (game.status === 'bidding') {
      // 叫分阶段：按座位顺序
      currentSeat = bids.length
      logAi('getCurrentAiPlayer: 叫分阶段', { bidsLength: bids.length, currentSeat })
    } else if (game.status === 'doubling') {
      // 加倍阶段：按加倍轮次
      currentSeat = game.currentDoublingTurn ?? undefined
      logAi('getCurrentAiPlayer: 加倍阶段', { currentDoublingTurn: game.currentDoublingTurn, currentSeat })
    } else if (game.status === 'playing') {
      // 出牌阶段
      currentSeat = game.currentTurn
      logAi('getCurrentAiPlayer: 出牌阶段', { currentTurn: game.currentTurn, currentSeat })
    }

    if (currentSeat === undefined) {
      logAi('getCurrentAiPlayer: currentSeat 为 undefined')
      return null
    }

    const currentPlayer = players.find(p => p.roomId === roomId && p.seatIndex === currentSeat)
    if (!currentPlayer) {
      logAi('getCurrentAiPlayer: 找不到座位', currentSeat, '的玩家，players:', players.map(p => ({ seat: p.seatIndex, name: p.playerName, isAi: p.isAi })))
      return null
    }

    logAi('getCurrentAiPlayer: 当前玩家:', currentPlayer.playerName, 'seatIndex:', currentPlayer.seatIndex, 'isAi:', currentPlayer.isAi)

    if (!currentPlayer.isAi) {
      logAi('getCurrentAiPlayer: 当前玩家不是 AI，跳过')
      return null
    }

    const playerHand = allHands.find(h =>
      h.roomId === roomId &&
      h.playerIdentity.toHexString() === currentPlayer.playerIdentity.toHexString()
    )

    if (!playerHand) {
      logAi('getCurrentAiPlayer: 找不到 AI 玩家手牌')
    }

    return { player: currentPlayer, hand: playerHand }
  }, [game, isAiMode, players, allHands, roomId, bids])

  // 检查玩家是否已经行动
  const hasPlayerActed = useCallback((player: RoomPlayer): boolean => {
    if (!game) return true

    const playerIdentity = player.playerIdentity.toHexString()
    logAi('hasPlayerActed: 检查玩家', player.playerName, 'identity:', playerIdentity.slice(0, 8), 'gameStatus:', game.status)

    if (game.status === 'bidding') {
      const hasBid = bids.some(b => b.playerIdentity.toHexString() === playerIdentity)
      logAi('hasPlayerActed: 叫分阶段', { hasBid, bidsCount: bids.length, bidIdentities: bids.map(b => b.playerIdentity.toHexString().slice(0, 8)) })
      return hasBid
    } else if (game.status === 'doubling') {
      const hasDoubled = doublings.some(d => d.playerIdentity.toHexString() === playerIdentity)
      logAi('hasPlayerActed: 加倍阶段', { hasDoubled, doublingsCount: doublings.length })
      return hasDoubled
    }

    logAi('hasPlayerActed: 非叫分/加倍阶段，返回 false')
    return false
  }, [game, bids, doublings])

  // 执行叫分
  const executeBid = useCallback(async (conn: DbConnection, player: RoomPlayer, hand: PlayerHand) => {
    logAi('executeBid: 开始执行', { 
      playerName: player.playerName, 
      isDouzeroAvailable: douzero.isAvailable,
      douzeroLoading: douzero.isLoading,
      douzeroError: douzero.error,
      cardCount: hand.cards.length 
    })
    
    if (!douzero.isAvailable) {
      logAi('executeBid: DouZero 不可用，使用默认叫分 0')
      try {
        await conn.reducers.placeBid({ roomId: roomId!, bidValue: 0 })
        logAi('executeBid: 默认叫分 0 成功')
      } catch (err) {
        logAiError('executeBid: 默认叫分失败', err)
        throw err
      }
      return
    }

    try {
      logAi('========== AI 叫分决策开始 ==========')
      logAi('玩家:', player.playerName, '手牌:', Array.from(hand.cards))

      const suggestion = await douzero.getBidSuggestion(Array.from(hand.cards))
      logAi('executeBid: 获取到建议', suggestion)

      if (suggestion) {
        const maxBid = bids.reduce((max, b) => Math.max(max, b.bidValue), 0)
        let bidValue = suggestion.suggestedBid

        // 叫分必须大于当前最高分
        if (bidValue > 0 && bidValue <= maxBid) {
          bidValue = 0
        }

        logAi('AI 叫分建议:', { suggestedBid: suggestion.suggestedBid, winRate: suggestion.win_rate, finalBid: bidValue })
        
        logAi('executeBid: 调用 placeBid reducer, roomId:', roomId!.toString(), 'bidValue:', bidValue)
        await conn.reducers.placeBid({ roomId: roomId!, bidValue })
        logAiAction(player.playerName, `叫分: ${bidValue}分`)
        logAi('executeBid: placeBid 调用成功')
      } else {
        logAi('获取叫分建议失败，默认不叫')
        await conn.reducers.placeBid({ roomId: roomId!, bidValue: 0 })
        logAiAction(player.playerName, '叫分: 不叫(0分)')
      }

      logAi('========== AI 叫分决策完成 ==========')
    } catch (err) {
      // 如果是"已叫分"错误，说明是竞态条件，不算真正的错误
      const errorMsg = err instanceof Error ? err.message : String(err)
      if (errorMsg.includes('已经叫过分')) {
        logAi('executeBid: 检测到竞态条件（已叫分），忽略此错误')
        return
      }
      logAiError('AI 叫分失败:', err)
      throw err
    }
  }, [douzero, roomId, bids])

  // 执行加倍
  const executeDouble = useCallback(async (conn: DbConnection, player: RoomPlayer, hand: PlayerHand) => {
    if (!douzero.isAvailable) {
      logAi('DouZero 不可用，使用默认不加倍')
      await conn.reducers.doubleBet({ roomId: roomId!, double: false })
      return
    }

    try {
      logAi('========== AI 加倍决策开始 ==========')
      logAi('玩家:', player.playerName, '是否地主:', hand.isLandlord)

      const landlordCardsArray = landlordCards ? Array.from(landlordCards.cards) : undefined
      const suggestion = await douzero.getDoubleSuggestion(
        Array.from(hand.cards),
        hand.isLandlord,
        landlordCardsArray
      )

      if (suggestion) {
        const shouldDouble = suggestion.suggestedDouble
        logAi('AI 加倍建议:', { shouldDouble, winRate: suggestion.win_rate })
        await conn.reducers.doubleBet({ roomId: roomId!, double: shouldDouble })
        logAiAction(player.playerName, `加倍: ${shouldDouble ? '是' : '否'}`)
      } else {
        logAi('获取加倍建议失败，默认不加倍')
        await conn.reducers.doubleBet({ roomId: roomId!, double: false })
        logAiAction(player.playerName, '加倍: 否(默认)')
      }

      logAi('========== AI 加倍决策完成 ==========')
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err)
      if (errorMsg.includes('已经加倍') || errorMsg.includes('已经选择')) {
        logAi('executeDouble: 检测到竞态条件（已加倍），忽略此错误')
        return
      }
      logAiError('AI 加倍失败:', err)
      throw err
    }
  }, [douzero, roomId, landlordCards])

  // 执行出牌
  const executePlay = useCallback(async (conn: DbConnection, player: RoomPlayer, hand: PlayerHand) => {
    if (!douzero.isAvailable) {
      logAi('DouZero 不可用，等待服务端处理')
      return
    }

    try {
      logAi('========== AI 出牌决策开始 ==========', '玩家:', player.playerName, '手牌:', Array.from(hand.cards))

      // 计算玩家位置
      const position = getPlayerPosition(player.seatIndex, game?.landlordSeat)
      if (!position) {
        logAiError('无法确定玩家位置，跳过出牌', { seatIndex: player.seatIndex, landlordSeat: game?.landlordSeat })
        return
      }
      logAi('玩家位置:', position, '地主座位:', game?.landlordSeat)

      // 构建已出的牌（根据位置）
      const playedCards = buildPlayedCards(plays, players, game?.landlordSeat)
      logAi('全局累计已出的牌:', {
        landlord: playedCards.landlord,
        landlord_up: playedCards.landlord_up,
        landlord_down: playedCards.landlord_down
      })

      // 获取最近出的牌（最近 3~5 手，用于判断是否需要跟牌）
      const lastMoves = buildLastMoves(plays, currentPlay, player.playerIdentity.toHexString())
      logAi('最近出牌 (lastMoves):', lastMoves, '是新一轮首家:', lastMoves.length === 0)
      logAi('currentPlay:', currentPlay ? {
        cards: Array.from(currentPlay.cards),
        playerIdentity: currentPlay.playerIdentity.toHexString().slice(0, 8)
      } : null)

      // 底牌
      const landlordCardsArray = landlordCards ? Array.from(landlordCards.cards) : []

      // 计算各位置剩余牌数
      const numCardsLeft = buildNumCardsLeft(allHands, players, game?.landlordSeat)
      logAi('各位置剩余牌数:', numCardsLeft)

      // 调试：输出原始数据
      logAi('=== 原始数据调试 ===')
      logAi('plays 数量:', plays.length)
      logAi('plays 详情:', plays.map(p => ({
        id: p.id,
        cards: Array.from(p.cards),
        playerIdentity: p.playerIdentity.toHexString().slice(0, 8)
      })))
      logAi('bids 数量:', bids.length)
      logAi('currentPlay:', currentPlay ? {
        cards: Array.from(currentPlay.cards),
        playerIdentity: currentPlay.playerIdentity.toHexString().slice(0, 8)
      } : null)
      logAi('landlordSeat:', game?.landlordSeat)
      logAi('===================')

      // 计算炸弹数量
      const bombCount = buildBombCount(game)
      logAi('炸弹数量:', bombCount)

      // 构建叫分信息
      const bidInfo = buildBidInfo(bids, players, game?.landlordSeat)
      logAi('叫分信息:', bidInfo)

      // 构建加倍信息
      const multiplyInfo = buildMultiplyInfo(doublings, players, game?.landlordSeat, game?.multiple ?? 1)
      logAi('加倍信息:', multiplyInfo)

      const suggestion = await douzero.getPlaySuggestion({
        myCards: Array.from(hand.cards),
        position,
        playedCards,
        lastMoves,
        landlordCards: landlordCardsArray,
        numCardsLeft,
        bombCount,
        bidInfo,
        multiplyInfo,
      })

      if (suggestion) {
        logAi('AI 出牌建议:', {
          actionType: suggestion.actionType,
          isPass: suggestion.isPass,
          cards: suggestion.suggestedCards,
          winRate: suggestion.winRate
        })

        if (suggestion.isPass) {
          // 过牌
          await conn.reducers.passTurn({ roomId: roomId! })
          logAiAction(player.playerName, '出牌: 过牌(pass)')
        } else if (suggestion.suggestedCards.length > 0) {
          // 出牌
          await conn.reducers.playCards({
            roomId: roomId!,
            cards: new Uint8Array(suggestion.suggestedCards)
          })
          logAiAction(player.playerName, `出牌: [${suggestion.suggestedCards.join(', ')}]`, { type: suggestion.actionType })
        }
      } else {
        logAi('获取出牌建议失败')
      }

      logAi('========== AI 出牌决策完成 ==========', )
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err)
      if (errorMsg.includes('不是你的回合') || errorMsg.includes('已经出过')) {
        logAi('executePlay: 检测到竞态条件（不是你的回合），忽略此错误')
        return
      }
      logAiError('AI 出牌失败:', err)
      throw err
    }
  }, [douzero, roomId, game, currentPlay, landlordCards, plays, players, allHands, bids, doublings])

  // 主行动逻辑
  const executeAiAction = useCallback(async () => {
    const callTime = Date.now()
    const callId = `call-${callTime}-${Math.random().toString(36).slice(2, 7)}`
    
    // 最优先检查：防止重复执行 - 使用"先设置后检查"模式避免竞态
    const wasProcessing = processingRef.current
    processingRef.current = true
    
    if (wasProcessing) {
      logAi(`executeAiAction [${callId}]: 正在处理中，跳过`)
      return
    }

    logAi(`executeAiAction [${callId}]: 开始执行`)

    const conn = getConnection()
    if (!conn || !roomId || !isAiMode || !game) {
      logAi(`executeAiAction [${callId}]: 基本条件不满足`, { hasConn: !!conn, hasRoomId: !!roomId, isAiMode, hasGame: !!game })
      processingRef.current = false
      return
    }

    const aiPlayerInfo = getCurrentAiPlayer()
    if (!aiPlayerInfo) {
      logAi(`executeAiAction [${callId}]: 当前不是 AI 玩家的回合`)
      processingRef.current = false
      return
    }

    const { player, hand } = aiPlayerInfo

    // 生成唯一的动作 ID，必须在检查 hasPlayerActed 之前
    // 出牌阶段使用 currentTurn 区分不同回合，叫分/加倍阶段使用座位顺序
    const turnIdentifier = game.status === 'playing' 
      ? `${game.currentTurn}` 
      : game.status === 'bidding' 
        ? `${bids.length}` 
        : `${game.currentDoublingTurn ?? 0}`
    const actionId = `${game.status}-${turnIdentifier}-${player.playerIdentity.toHexString()}`
    
    // 第二优先检查：防止同一动作重复执行
    if (lastActionIdRef.current === actionId) {
      logAi(`executeAiAction [${callId}]: 检测到重复动作 ID，跳过`, { lastActionId: lastActionIdRef.current, currentActionId: actionId })
      processingRef.current = false
      return
    }

    // 检查是否已行动
    if (hasPlayerActed(player)) {
      logAi(`executeAiAction [${callId}]: AI 玩家已行动，跳过`)
      processingRef.current = false
      return
    }

    if (!hand) {
      logAi(`executeAiAction [${callId}]: 找不到 AI 玩家手牌`)
      processingRef.current = false
      return
    }

    lastActionIdRef.current = actionId
    logAi(`executeAiAction [${callId}]: 开始执行 AI 动作`, { playerName: player.playerName, gameStatus: game.status, actionId })

    try {
      switch (game.status) {
        case 'bidding':
          await executeBid(conn, player, hand)
          break
        case 'doubling':
          await executeDouble(conn, player, hand)
          break
        case 'playing':
          await executePlay(conn, player, hand)
          break
        default:
          logAi(`executeAiAction [${callId}]: 未知游戏状态:`, game.status)
      }
    } catch (err) {
      logAiError(`executeAiAction [${callId}]: 执行出错`, err)
    } finally {
      processingRef.current = false
      logAi(`executeAiAction [${callId}]: 执行完成，processingRef 重置为 false`)
    }
  }, [getConnection, roomId, isAiMode, game, getCurrentAiPlayer, hasPlayerActed, executeBid, executeDouble, executePlay])

  useEffect(() => {
    const effectId = `effect-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
    
    // 清理之前的定时器
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
      timeoutRef.current = null
    }

    logAi(`=== useEffect [${effectId}] 触发 ===`, {
      isAiMode,
      roomId: roomId?.toString(),
      gameStatus: game?.status,
      bidsCount: bids.length,
      bidsPlayers: bids.map(b => b.playerIdentity.toHexString().slice(0, 8)),
      playersCount: players.length,
      playersInfo: players.map(p => ({ seat: p.seatIndex, name: p.playerName, isAi: p.isAi })),
      handsCount: allHands.length,
      processing: processingRef.current,
      lastActionId: lastActionIdRef.current
    })

    // 只在人机模式且游戏进行中时启动
    if (!isAiMode || !roomId || !game || game.status === 'waiting' || game.status === 'finished') {
      logAi(`useEffect [${effectId}]: 不满足基本条件，跳过`, { isAiMode, hasRoomId: !!roomId, hasGame: !!game, gameStatus: game?.status })
      return
    }

    const conn = getConnection()
    if (!conn) {
      logAi(`useEffect [${effectId}]: 连接不存在，跳过`)
      return
    }

    // 检查当前是否是 AI 玩家的回合
    const aiPlayerInfo = getCurrentAiPlayer()
    if (!aiPlayerInfo) {
      logAi(`useEffect [${effectId}]: 不是 AI 玩家的回合（getCurrentAiPlayer 返回 null）`)
      return
    }

    // 检查是否已行动
    const hasActed = hasPlayerActed(aiPlayerInfo.player)
    logAi(`useEffect [${effectId}]: AI 玩家已行动?`, hasActed, 'player:', aiPlayerInfo.player.playerName)
    
    // 生成当前动作 ID（包含回合信息，确保每次出牌都有唯一 ID）
    const turnIdentifier = game.status === 'bidding' 
      ? `${bids.length}` 
      : game.status === 'playing' 
        ? `${game.currentTurn}` 
        : `${game.currentDoublingTurn ?? 0}`
    const currentActionId = `${game.status}-${turnIdentifier}-${aiPlayerInfo.player.playerIdentity.toHexString()}`
    
    // 如果玩家已行动且 lastActionId 匹配，清除 lastActionId 允许下次行动
    if (hasActed && lastActionIdRef.current === currentActionId) {
      lastActionIdRef.current = ''
      logAi(`useEffect [${effectId}]: 已行动，清除 lastActionId`)
    }
    
    if (hasActed) {
      logAi(`useEffect [${effectId}]: AI 玩家已行动，跳过`)
      return
    }

    // 计算基于回合开始时间的延迟
    let delay = AI_THINK_DELAY_MS
    if (game.turnStartTime) {
      const turnStartMs = Number(game.turnStartTime.microsSinceUnixEpoch / 1000n)
      const elapsed = Date.now() - turnStartMs
      delay = Math.max(0, AI_THINK_DELAY_MS - elapsed)
    }

    logAi(`useEffect [${effectId}]: 设置 AI 行动定时器，延迟:`, delay, 'ms', 'player:', aiPlayerInfo.player.playerName)

    // 如果延迟为0，立即执行
    if (delay === 0) {
      logAi(`useEffect [${effectId}]: 延迟为0，立即调用 executeAiAction`)
      executeAiAction()
      return
    }

    // 延迟触发，让 AI 有"思考时间"
    timeoutRef.current = setTimeout(() => {
      logAi(`useEffect [${effectId}]: 定时器触发，执行 AI 行动`)
      executeAiAction()
    }, delay)

    // 清理函数
    return () => {
      logAi(`useEffect [${effectId}]: 清理函数执行，清除定时器`)
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
        timeoutRef.current = null
      }
    }
  }, [getConnection, roomId, isAiMode, game, bids, players, allHands, currentPlay, plays, doublings, getCurrentAiPlayer, hasPlayerActed, executeAiAction])

  return null
}

/**
 * 构建全局累计已出的牌（按位置分类）
 * DouZero API 期望的 played_cards 是全局累计，越完整越好（影响牌池分配）
 */
function buildPlayedCards(
  plays: Play[],
  players: RoomPlayer[],
  landlordSeat: number | undefined
): { landlord: number[]; landlord_up: number[]; landlord_down: number[] } {
  const result = {
    landlord: [] as number[],
    landlord_up: [] as number[],
    landlord_down: [] as number[],
  }

  if (landlordSeat === undefined) {
    logAi('buildPlayedCards: landlordSeat 未定义，返回空结果')
    return result
  }

  // 构建玩家 identity -> 位置的映射
  const playerPositions: Map<string, 'landlord' | 'landlord_up' | 'landlord_down'> = new Map()
  for (const player of players) {
    const pos = getPlayerPosition(player.seatIndex, landlordSeat)
    if (pos) {
      playerPositions.set(player.playerIdentity.toHexString(), pos)
      logAi(`buildPlayedCards: 玩家映射 ${player.playerIdentity.toHexString().slice(0, 8)} -> ${pos} (seatIndex=${player.seatIndex})`)
    }
  }

  logAi(`buildPlayedCards: 开始处理 ${plays.length} 条出牌记录`)

  // 累计所有已出的牌（全局累计）
  for (const play of plays) {
    const playIdentity = play.playerIdentity.toHexString()
    const pos = playerPositions.get(playIdentity)
    logAi(`buildPlayedCards: 出牌记录 identity=${playIdentity.slice(0, 8)}, cards=[${Array.from(play.cards).join(',')}], pos=${pos ?? '未找到'}`)
    if (pos) {
      result[pos].push(...Array.from(play.cards))
    }
  }

  logAi(`buildPlayedCards: 结果 landlord=[${result.landlord.join(',')}], landlord_up=[${result.landlord_up.join(',')}], landlord_down=[${result.landlord_down.join(',')}]`)

  return result
}

/**
 * 构建最近的出牌（用于判断是否需要跟牌）
 * 传最近 3~5 手即可，超 32 手无意义
 * 
 * 关键：如果当前玩家是新一轮首家（currentPlay 为空或自己出的），返回空数组
 */
function buildLastMoves(
  plays: Play[],
  currentPlay: CurrentPlay | null,
  currentPlayerIdentity: string
): number[][] {
  // 如果 currentPlay 为空，说明是新一轮首家，可以自由出牌
  if (!currentPlay) {
    return []
  }
  
  // 如果 currentPlay 是自己出的，说明新一轮开始，可以自由出牌
  if (currentPlay.playerIdentity.toHexString() === currentPlayerIdentity) {
    return []
  }
  
  // 需要跟牌，取最近 5 手牌
  const recentPlays = plays.slice(-5)
  
  // 转换为卡牌数组
  return recentPlays.map(play => Array.from(play.cards))
}

/**
 * 构建各位置剩余牌数
 */
function buildNumCardsLeft(
  allHands: PlayerHand[],
  players: RoomPlayer[],
  landlordSeat: number | undefined
): { landlord: number; landlord_up: number; landlord_down: number } {
  const result = {
    landlord: 20,
    landlord_up: 17,
    landlord_down: 17,
  }

  if (landlordSeat === undefined) {
    return result
  }

  // 构建玩家 identity -> 位置的映射
  const playerPositions: Map<string, 'landlord' | 'landlord_up' | 'landlord_down'> = new Map()
  for (const player of players) {
    const pos = getPlayerPosition(player.seatIndex, landlordSeat)
    if (pos) {
      playerPositions.set(player.playerIdentity.toHexString(), pos)
    }
  }

  // 根据手牌计算各位置剩余牌数
  for (const hand of allHands) {
    const pos = playerPositions.get(hand.playerIdentity.toHexString())
    if (pos) {
      result[pos] = hand.cards.length
    }
  }

  return result
}

/**
 * 从 Game 表获取已打出炸弹数量
 */
function buildBombCount(game: Game | null): number {
  return game?.bombCount ?? 0
}

/**
 * 构建 4×3 叫分矩阵
 * bid_info[row][col]: 第 row 轮，第 col 个玩家的叫分情况
 * -1 = 该玩家还未做出选择，0 = 不叫，1 = 叫
 * 
 * 注意：bids 表在叫分结束后会被清除，所以我们需要从其他数据推断
 * 使用 Game.multiple（底分）和 landlordSeat 来推断叫分情况
 */
function buildBidInfo(
  bids: { playerIdentity: { toHexString: () => string }; bidValue: number }[],
  players: RoomPlayer[],
  landlordSeat: number | undefined
): number[][] {
  // 初始化 4×3 矩阵，默认值 0
  const bidInfo: number[][] = [
    [0, 0, 0],
    [0, 0, 0],
    [0, 0, 0],
    [0, 0, 0],
  ]

  // 如果有 bids 数据（叫分阶段），使用实时数据
  if (bids.length > 0) {
    // 构建玩家 identity -> 座位索引的映射
    const playerSeats: Map<string, number> = new Map()
    for (const player of players) {
      playerSeats.set(player.playerIdentity.toHexString(), player.seatIndex)
    }

    // 按叫分顺序填充矩阵（第0轮）
    for (let i = 0; i < bids.length && i < 3; i++) {
      const bid = bids[i]
      const seatIndex = playerSeats.get(bid.playerIdentity.toHexString())
      if (seatIndex !== undefined) {
        bidInfo[0][seatIndex] = bid.bidValue > 0 ? 1 : 0
      }
    }
    return bidInfo
  }

  // 如果 bids 为空（出牌阶段已清除），从 landlordSeat 和 gameMultiple 推断
  if (landlordSeat === undefined) {
    return bidInfo
  }

  // 简化推断：假设地主叫了分，其他人没叫
  // 这不是完全准确的叫分历史，但可以帮助 AI 理解基本局势
  bidInfo[0][landlordSeat] = 1  // 地主叫了

  return bidInfo
}

/**
 * 构建 3 元加倍状态向量
 * multiply_info = [base倍数, 地主加倍倍数, 农民加倍倍数]
 */
function buildMultiplyInfo(
  doublings: { playerIdentity: { toHexString: () => string }; doubled: boolean }[],
  players: RoomPlayer[],
  landlordSeat: number | undefined,
  baseMultiple: number
): number[] {
  // 默认值：基础倍数，地主和农民都未加倍
  const multiplyInfo: number[] = [baseMultiple, 1, 1]

  if (landlordSeat === undefined) {
    return multiplyInfo
  }

  // 构建玩家 identity -> 是否地主的映射
  const playerIsLandlord: Map<string, boolean> = new Map()
  for (const player of players) {
    playerIsLandlord.set(player.playerIdentity.toHexString(), player.seatIndex === landlordSeat)
  }

  // 统计地主和农民的加倍情况
  let landlordDouble = 1
  let farmerDouble = 1

  for (const d of doublings) {
    const isLandlord = playerIsLandlord.get(d.playerIdentity.toHexString())
    if (isLandlord && d.doubled) {
      landlordDouble = 2
    } else if (!isLandlord && d.doubled) {
      farmerDouble = 2
    }
  }

  multiplyInfo[0] = baseMultiple
  multiplyInfo[1] = landlordDouble
  multiplyInfo[2] = farmerDouble

  return multiplyInfo
}
