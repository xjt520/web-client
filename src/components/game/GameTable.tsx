import { useEffect, useState, useRef, useCallback, useMemo } from 'react'
import { PlayerHand } from './PlayerHand'
import { OpponentHand } from './OpponentHand'
import { PlayArea } from './PlayArea'
import { LandlordCards } from './LandlordCards'
import { TrustControl } from './TrustControl'
import { PlayHistory } from './PlayHistory'
import { ToastContainer } from '../common/ToastContainer'
import { ConfirmDialog } from '../common/ConfirmDialog'
import { ActionConfirmDialog } from './ActionConfirmDialog'
import { CombinationPreview } from './CombinationPreview'
import { DealAnimation } from './DealAnimation'
import { GestureHandler } from './GestureHandler'
import './GestureHandler.css'
import { useAchievements } from '../../hooks/useAchievements'
import { ActionType } from './PlayerActionTimer'
import { OrientationPrompt } from './OrientationPrompt'
import { FullscreenToggle } from './FullscreenToggle'
import { EmojiWheel } from './EmojiWheel'
import { QuickChat } from './QuickChat'
import { CombinationEffects, useCardEffects } from './CombinationEffects'
import './CombinationEffects.css'
import { AutoTrustNotification } from './AutoTrustNotification'
import './PhasedTimer.css'
import { useCardSelection } from '../../hooks/useCardSelection'
import { useCardHint } from '../../hooks/useCardHint'
import { useToast } from '../../hooks/useToast'
import { useAiAutoAction } from '../../hooks/useAiAutoAction'
import { useDouzero, getPlayerPosition } from '../../hooks/useDouzero'
import { AISuggestionBadge } from './AISuggestionPanel'
import { useScreenOrientation } from '../../hooks/useScreenOrientation'
import { useGameDuration, formatDuration, getGameStatusText } from '../../hooks/useGameDuration'
import { useTurnTimer } from '../../hooks/useTurnTimer'
import { useChat } from '../../hooks/useChat'
import { EmojiType, type QuickChatMessage } from '../../lib/emotes'
import { getTheme, type ThemeId } from '../../config/themes'
import type { DbConnection } from '../../lib/spacetime'
import type { Room, Game, PlayerHand as PlayerHandType, RoomPlayer, CurrentPlay, LandlordCards as LandlordCardsType, Bid, Doubling, GameResult, Play, PlayerActionEvent } from '../../module_bindings/types'
import type { Timestamp } from 'spacetimedb'
import type { EventContext } from '../../module_bindings'

interface GameTableProps {
  room: Room
  getConnection: () => DbConnection | null
  audio?: {
    initialize: () => void
    playCard: (cardValue?: number) => void
    playCombination: (combinationType: string, cards?: number[]) => void
    playBomb: () => void
    playRocket: () => void
    playWin: () => void
    playLose: () => void
    playTick: () => void
    playBid: () => void
    playBidScore: (score: number) => void
    playNoBid: () => void
    playDouble: () => void
    playNoDouble: () => void
    playPass: () => void
    playDeal: () => void
    playStart: () => void
    playGameMusic: () => void
    stopMusic: () => void
    playQuickChat: (soundFile: string) => void
  }
  onFirstInteraction?: () => void
  tableTheme?: ThemeId
}

export function GameTable({ room, getConnection, audio, onFirstInteraction, tableTheme = 'classic' }: GameTableProps) {
  const [game, setGame] = useState<Game | null>(null)
  const [myHand, setMyHand] = useState<PlayerHandType | null>(null)
  const [allHands, setAllHands] = useState<PlayerHandType[]>([]) // 所有玩家手牌
  const [players, setPlayers] = useState<RoomPlayer[]>([])
  const [currentPlay, setCurrentPlay] = useState<CurrentPlay | null>(null)
  const [landlordCards, setLandlordCards] = useState<LandlordCardsType | null>(null)
  const [bids, setBids] = useState<Bid[]>([])
  const [doublings, setDoublings] = useState<Doubling[]>([])
  const [gameResults, setGameResults] = useState<GameResult[]>([])
  const [plays, setPlays] = useState<Play[]>([])
  const [actionEvents, setActionEvents] = useState<PlayerActionEvent[]>([])
  const [showEndGameConfirm, setShowEndGameConfirm] = useState(false)

  // 叫分/加倍确认对话框状态
  const [bidConfirm, setBidConfirm] = useState<{ value: number } | null>(null)
  const [doubleConfirm, setDoubleConfirm] = useState<{ double: boolean } | null>(null)

  // 发牌动画状态
  const [showDealAnimation, setShowDealAnimation] = useState(false)
  const hasShownDealAnimation = useRef(false)

  // 主题配置
  const theme = getTheme(tableTheme)

  // 游戏结束时保存手牌快照，用于显示剩余手牌
  const finishedHandsRef = useRef<PlayerHandType[]>([])
  const isGameFinishedRef = useRef(false)

  const processedPlayerIds = useRef<Set<string>>(new Set())
  const processedBidIds = useRef<Set<string>>(new Set())
  const processedDoublingIds = useRef<Set<string>>(new Set())
  const processedGameResultIds = useRef<Set<string>>(new Set())
  const processedPlayIds = useRef<Set<string>>(new Set())
  const processedActionEventIds = useRef<Set<string>>(new Set())
  const lastPlayedCards = useRef<string | null>(null)
  const hasRecordedAchievement = useRef(false)

  const { selectedCards, toggleCard, clearSelection, getSelectedCards, isSelected, setSelection } = useCardSelection()
  const { toasts, removeToast, error, success, warning, info } = useToast()
  const conn = getConnection()

  // Card combination visual effects
  const { effect: cardEffect, screenShake, triggerEffect: triggerCardEffect } = useCardEffects()

  // 成就系统
  const {
    recordGameResult
  } = useAchievements()

  // 超时自动托管提示
  const [showAutoTrust, setShowAutoTrust] = useState(false)

  // 首次点击初始化音频
  const handleFirstClick = useCallback(() => {
    onFirstInteraction?.()
  }, [onFirstInteraction])

  // 屏幕方向检测
  const { isMobileLandscape, isCompactScreen, isMobilePortrait, isTouch } = useScreenOrientation()

  // 紧凑布局模式（移动端横屏或小屏幕电脑）
  const isCompactLayout = isMobileLandscape || isCompactScreen

  // 是否显示横屏提示（此时隐藏重复的按钮）
  const showOrientationPrompt = isTouch && isMobilePortrait

  useEffect(() => {
    if (!conn) return

    const db = conn.db
    const roomId = room.id

    db.room_player.onInsert((_ctx: EventContext, player: RoomPlayer) => {
      if (player.roomId.toString() !== roomId.toString()) return
      const playerId = `${player.roomId}-${player.playerIdentity.toHexString()}`
      if (processedPlayerIds.current.has(playerId)) return
      processedPlayerIds.current.add(playerId)
      setPlayers((prev) => [...prev, player])
    })

    db.room_player.onDelete((_ctx: EventContext, player: RoomPlayer) => {
      const playerId = `${player.roomId}-${player.playerIdentity.toHexString()}`
      processedPlayerIds.current.delete(playerId)
      setPlayers((prev) => prev.filter((p) => `${p.roomId}-${p.playerIdentity.toHexString()}` !== playerId))
    })

    db.room_player.onUpdate((_ctx: EventContext, _oldPlayer: RoomPlayer, newPlayer: RoomPlayer) => {
      setPlayers((prev) =>
        prev.map((p) =>
          `${p.roomId}-${p.playerIdentity.toHexString()}` ===
          `${newPlayer.roomId}-${newPlayer.playerIdentity.toHexString()}`
            ? newPlayer
            : p
        )
      )
    })

    db.game.onInsert((_ctx: EventContext, g: Game) => {
      if (g.roomId.toString() === roomId.toString()) {
        setGame(g)
      }
    })

    db.game.onUpdate((_ctx: EventContext, oldGame: Game, newGame: Game) => {
      if (newGame.roomId.toString() !== roomId.toString()) return
      setGame(newGame)

      // 游戏开始音效：从加倍阶段进入出牌阶段
      if (oldGame.status === 'doubling' && newGame.status === 'playing') {
        audio?.playStart()
      }
    })

    db.player_hand.onInsert((_ctx: EventContext, hand: PlayerHandType) => {
      if (hand.roomId.toString() !== roomId.toString()) return

      // 更新所有手牌列表
      setAllHands((prev) => [...prev, hand])

      // 更新当前用户手牌
      if (conn.identity && hand.playerIdentity.toHexString() === conn.identity.toHexString()) {
        setMyHand(hand)
      }
    })

    db.player_hand.onUpdate((_ctx: EventContext, _oldHand: PlayerHandType, newHand: PlayerHandType) => {
      if (newHand.roomId.toString() !== roomId.toString()) return

      // 更新所有手牌列表
      setAllHands((prev) =>
        prev.map((h) =>
          h.playerIdentity.toHexString() === newHand.playerIdentity.toHexString()
            ? newHand
            : h
        )
      )

      // 更新当前用户手牌
      if (conn.identity && newHand.playerIdentity.toHexString() === conn.identity.toHexString()) {
        setMyHand(newHand)
        // 清除不在新手牌中的选中牌，防止出牌时报错"您没有这张牌"
        const newCardsSet = new Set(Array.from(newHand.cards))
        const validSelections = Array.from(selectedCards).filter(card => newCardsSet.has(card))
        if (validSelections.length !== selectedCards.size) {
          setSelection(validSelections)
        }
      }
    })

    db.player_hand.onDelete((_ctx: EventContext, hand: PlayerHandType) => {
      if (hand.roomId.toString() !== roomId.toString()) return

      // 游戏结束时保留手牌用于显示
      if (isGameFinishedRef.current) {
        return
      }

      // 从所有手牌列表中移除
      setAllHands((prev) =>
        prev.filter((h) => h.playerIdentity.toHexString() !== hand.playerIdentity.toHexString())
      )

      // 如果删除的是当前用户的手牌，清空
      if (conn.identity && hand.playerIdentity.toHexString() === conn.identity.toHexString()) {
        setMyHand(null)
      }
    })

    db.current_play.onInsert((_ctx: EventContext, play: CurrentPlay) => {
      if (play.roomId.toString() === roomId.toString()) {
        setCurrentPlay(play)
      }
    })

    db.current_play.onDelete((_ctx: EventContext, _play: CurrentPlay) => {
      setCurrentPlay(null)
    })

    db.current_play.onUpdate((_ctx: EventContext, _oldPlay: CurrentPlay, newPlay: CurrentPlay) => {
      if (newPlay.roomId.toString() === roomId.toString()) {
        setCurrentPlay(newPlay)
      }
    })

    db.landlord_cards.onInsert((_ctx: EventContext, cards: LandlordCardsType) => {
      if (cards.roomId.toString() === roomId.toString()) {
        setLandlordCards(cards)
      }
    })

    db.landlord_cards.onUpdate((_ctx: EventContext, _oldCards: LandlordCardsType, newCards: LandlordCardsType) => {
      if (newCards.roomId.toString() === roomId.toString()) {
        setLandlordCards(newCards)
      }
    })

    db.bid.onInsert((_ctx: EventContext, bid: Bid) => {
      if (bid.roomId.toString() !== roomId.toString()) return
      const bidId = bid.id.toString()
      if (processedBidIds.current.has(bidId)) return
      processedBidIds.current.add(bidId)
      setBids((prev) => [...prev, bid])
    })

    db.bid.onDelete((_ctx: EventContext, bid: Bid) => {
      const bidId = bid.id.toString()
      processedBidIds.current.delete(bidId)
      setBids((prev) => prev.filter((b) => b.id.toString() !== bidId))
    })

    // Doubling 表监听
    db.doubling.onInsert((_ctx: EventContext, doubling: Doubling) => {
      if (doubling.roomId.toString() !== roomId.toString()) return
      const doublingId = doubling.id.toString()
      if (processedDoublingIds.current.has(doublingId)) return
      processedDoublingIds.current.add(doublingId)
      setDoublings((prev) => [...prev, doubling])
    })

    db.doubling.onDelete((_ctx: EventContext, doubling: Doubling) => {
      const doublingId = doubling.id.toString()
      processedDoublingIds.current.delete(doublingId)
      setDoublings((prev) => prev.filter((d) => d.id.toString() !== doublingId))
    })

    // GameResult 表监听
    db.game_result.onInsert((_ctx: EventContext, result: GameResult) => {
      if (result.roomId.toString() !== roomId.toString()) return
      const resultId = result.id.toString()
      if (processedGameResultIds.current.has(resultId)) return
      processedGameResultIds.current.add(resultId)
      setGameResults((prev) => [...prev, result])
    })

    db.game_result.onDelete((_ctx: EventContext, result: GameResult) => {
      const resultId = result.id.toString()
      processedGameResultIds.current.delete(resultId)
      setGameResults((prev) => prev.filter((r) => r.id.toString() !== resultId))
    })

    // Play 表监听
    db.play.onInsert((_ctx: EventContext, play: Play) => {
      if (play.roomId.toString() !== roomId.toString()) return
      const playId = play.id.toString()
      if (processedPlayIds.current.has(playId)) return
      processedPlayIds.current.add(playId)
      setPlays((prev) => [...prev, play])
    })

    db.play.onDelete((_ctx: EventContext, play: Play) => {
      const playId = play.id.toString()
      processedPlayIds.current.delete(playId)
      setPlays((prev) => prev.filter((p) => p.id.toString() !== playId))
    })

    // PlayerActionEvent 表监听 - 用于播放其他玩家的动作音效
    db.player_action_event.onInsert((_ctx: EventContext, event: PlayerActionEvent) => {
      if (event.roomId.toString() !== roomId.toString()) return
      const eventId = event.id.toString()
      if (processedActionEventIds.current.has(eventId)) return
      processedActionEventIds.current.add(eventId)

      // 添加到 actionEvents state
      setActionEvents((prev) => [...prev, event])

      // 只播放其他玩家的音效（自己的音效在 reducer 调用时已经播放）
      if (conn?.identity && event.playerIdentity.toHexString() !== conn.identity.toHexString()) {
        switch (event.actionType) {
          case 'bid':
            try {
              const data = JSON.parse(event.actionData)
              audio?.playBidScore(data.bidValue)
            } catch {
              audio?.playBid()
            }
            break
          case 'no_bid':
            audio?.playNoBid()
            break
          case 'double':
            audio?.playDouble()
            break
          case 'no_double':
            audio?.playNoDouble()
            break
          case 'pass':
            audio?.playPass()
            break
        }
      }
    })

    conn.subscriptionBuilder()
      .onApplied(() => {
        const initialPlayers = Array.from(db.room_player.iter()) as unknown as RoomPlayer[]
        const initialGames = Array.from(db.game.iter()) as unknown as Game[]
        const initialHands = Array.from(db.player_hand.iter()) as unknown as PlayerHandType[]
        const initialCurrentPlays = Array.from(db.current_play.iter()) as unknown as CurrentPlay[]
        const initialLandlordCards = Array.from(db.landlord_cards.iter()) as unknown as LandlordCardsType[]
        const initialBids = Array.from(db.bid.iter()) as unknown as Bid[]
        const initialDoublings = Array.from(db.doubling.iter()) as unknown as Doubling[]
        const initialGameResults = Array.from(db.game_result.iter()) as unknown as GameResult[]
        const initialPlays = Array.from(db.play.iter()) as unknown as Play[]

        const roomPlayers = initialPlayers.filter(
          (p) => p.roomId.toString() === roomId.toString()
        )
        roomPlayers.forEach((p) =>
          processedPlayerIds.current.add(`${p.roomId}-${p.playerIdentity.toHexString()}`)
        )

        setPlayers(roomPlayers)

        const roomGame = initialGames.find(
          (g) => g.roomId.toString() === roomId.toString()
        )
        setGame(roomGame || null)

        if (conn.identity) {
          const myHand = initialHands.find(
            (h) =>
              h.roomId.toString() === roomId.toString() &&
              h.playerIdentity.toHexString() === conn.identity!.toHexString()
          )
          setMyHand(myHand || null)
        }

        // 初始化所有玩家手牌
        const roomHands = initialHands.filter(
          (h) => h.roomId.toString() === roomId.toString()
        )
        setAllHands(roomHands)

        const roomCurrentPlay = initialCurrentPlays.find(
          (p) => p.roomId.toString() === roomId.toString()
        )
        setCurrentPlay(roomCurrentPlay || null)

        const roomLandlordCards = initialLandlordCards.find(
          (c) => c.roomId.toString() === roomId.toString()
        )
        setLandlordCards(roomLandlordCards || null)

        const roomBids = initialBids.filter(
          (b) => b.roomId.toString() === roomId.toString()
        )
        roomBids.forEach((b) => processedBidIds.current.add(b.id.toString()))
        setBids(roomBids)

        const roomDoublings = initialDoublings.filter(
          (d) => d.roomId.toString() === roomId.toString()
        )
        roomDoublings.forEach((d) => processedDoublingIds.current.add(d.id.toString()))
        setDoublings(roomDoublings)

        const roomGameResults = initialGameResults.filter(
          (r) => r.roomId.toString() === roomId.toString()
        )
        roomGameResults.forEach((r) => processedGameResultIds.current.add(r.id.toString()))
        setGameResults(roomGameResults)

        const roomPlays = initialPlays.filter(
          (p) => p.roomId.toString() === roomId.toString()
        )
        roomPlays.forEach((p) => processedPlayIds.current.add(p.id.toString()))
        setPlays(roomPlays)

        // 初始化 PlayerActionEvent（跳过已有的事件，避免重复播放音效）
        const initialActionEvents = Array.from(db.player_action_event.iter()) as unknown as PlayerActionEvent[]
        const roomActionEvents = initialActionEvents.filter(
          (e) => e.roomId.toString() === roomId.toString()
        )
        roomActionEvents.forEach((e) => processedActionEventIds.current.add(e.id.toString()))
        setActionEvents(roomActionEvents)
      })
      .subscribe([
        'SELECT * FROM room_player',
        'SELECT * FROM game',
        'SELECT * FROM player_hand',
        'SELECT * FROM current_play',
        'SELECT * FROM landlord_cards',
        'SELECT * FROM bid',
        'SELECT * FROM doubling',
        'SELECT * FROM game_result',
        'SELECT * FROM play',
        'SELECT * FROM player_action_event',
      ])
  }, [conn, room.id])

  // 发牌动画触发 - 当游戏开始发牌时显示
  useEffect(() => {
    const gameStatus = game?.status || room.status

    // 当游戏进入叫分阶段且所有玩家都收到手牌时，显示发牌动画
    if (
      gameStatus === 'bidding' &&
      !hasShownDealAnimation.current &&
      allHands.length === 3 &&
      landlordCards
    ) {
      hasShownDealAnimation.current = true
      setShowDealAnimation(true)
    }
  }, [game?.status, room.status, allHands.length, landlordCards])

  // 新游戏开始时清除出牌历史（从 finished 变为 bidding）
  const prevGameStatusForHistoryRef = useRef<string | null>(null)
  useEffect(() => {
    const gameStatus = game?.status || room.status
    const prevStatus = prevGameStatusForHistoryRef.current
    prevGameStatusForHistoryRef.current = gameStatus

    // 从 finished 变为 bidding 时清除历史
    if (prevStatus === 'finished' && gameStatus === 'bidding') {
      setPlays([])
      setActionEvents([])
      processedPlayIds.current.clear()
      processedActionEventIds.current.clear()
      // 清空手牌快照和重置状态
      finishedHandsRef.current = []
      isGameFinishedRef.current = false
      hasRecordedAchievement.current = false
    }
  }, [game?.status, room.status])

  // 人机模式AI自动行动
  useAiAutoAction({
    getConnection,
    roomId: room.id,
    isAiMode: room.isAiMode || false,
    game,
    players,
    allHands,
    currentPlay,
    landlordCards,
    bids,
    doublings,
    plays,
  })

  const isMyTurn = useCallback(() => {
    if (!game || !conn?.identity) return false
    const myPlayer = players.find(
      (p) => p.playerIdentity.toHexString() === conn.identity!.toHexString()
    )
    return myPlayer?.seatIndex === game.currentTurn
  }, [game, players, conn])

  const isMyDoublingTurn = useCallback(() => {
    if (!game || !conn?.identity || game.currentDoublingTurn === null) return false
    const myPlayer = players.find(
      (p) => p.playerIdentity.toHexString() === conn.identity!.toHexString()
    )
    return myPlayer?.seatIndex === game.currentDoublingTurn
  }, [game, players, conn])

  // 智能提示 Hook
  const {
    bestPlay,
    playableCards,
  } = useCardHint({
    handCards: myHand ? Array.from(myHand.cards) : [],
    selectedCards,
    currentPlay: currentPlay ? Array.from(currentPlay.cards) : null,
    isMyTurn: isMyTurn(),
  })

  // DouZero AI Hook
  const {
    isAvailable: isDouzeroAvailable,
    isLoading: isDouzeroLoading,
    lastBidSuggestion,
    lastDoubleSuggestion,
    lastPlaySuggestion,
    getBidSuggestion: fetchBidSuggestion,
    getDoubleSuggestion: fetchDoubleSuggestion,
    getPlaySuggestion: fetchPlaySuggestion,
    clearPlaySuggestion,
  } = useDouzero()

  // 当回合变化时清除出牌建议，确保每次新回合都能获取新建议
  useEffect(() => {
    // 不是我的回合时清除建议
    if (!isMyTurn()) {
      clearPlaySuggestion()
    }
  }, [isMyTurn, clearPlaySuggestion])

  // 聊天系统 Hook - 通过 SpacetimeDB 同步
  const { messages: chatMessages, sendChatMessage } = useChat(getConnection, room.id)

  // 表情轮盘和快捷语状态
  const [showEmojiWheel, setShowEmojiWheel] = useState(false)
  const [emojiWheelPosition, setEmojiWheelPosition] = useState({ x: 0, y: 0 })
  const [showQuickChat, setShowQuickChat] = useState(false)
  const [quickChatPosition, setQuickChatPosition] = useState({ x: 0, y: 0 })

  // 一键选择推荐出牌
  const handleApplyHint = useCallback(
    (cards: number[]) => {
      setSelection(cards)
    },
    [setSelection]
  )

  // 判断当前选中的是否是推荐的牌
  const isSelectedHint = useMemo(() => {
    if (!bestPlay || selectedCards.size !== bestPlay.cards.length) {
      return false
    }
    return bestPlay.cards.every((card) => selectedCards.has(card))
  }, [bestPlay, selectedCards])

  // 提示按钮点击处理
  const handleHintClick = useCallback(() => {
    if (isSelectedHint) {
      // 已选中推荐的牌，取消选择
      clearSelection()
    } else {
      // 未选中推荐的牌，选择推荐牌
      if (bestPlay) {
        handleApplyHint(bestPlay.cards)
      }
    }
  }, [isSelectedHint, bestPlay, clearSelection, handleApplyHint])

  const handlePlayCards = useCallback(async () => {
    if (!conn || !isMyTurn()) return

    const cards = getSelectedCards()
    if (cards.length === 0) return

    try {
      await conn.reducers.playCards({ roomId: room.id, cards: new Uint8Array(cards) })
      clearSelection()
    } catch (err) {
      console.error('Play cards error:', err)
      const errorMessage = err instanceof Error ? err.message : String(err)
      error(errorMessage)
    }
  }, [conn, isMyTurn, getSelectedCards, room.id, clearSelection])

  const handlePass = useCallback(() => {
    if (!conn || !isMyTurn()) return

    try {
      conn.reducers.passTurn({ roomId: room.id })
      // 播放不出音效
      audio?.playPass()
    } catch (err) {
      console.error('Pass turn error:', err)
      const errorMessage = err instanceof Error ? err.message : String(err)
      error(errorMessage)
    }
  }, [conn, isMyTurn, room.id, audio])

  // 叫分按钮点击 - 显示确认对话框
  const handleBidClick = useCallback((value: number) => {
    setBidConfirm({ value })
  }, [])

  // 确认叫分
  const handleBidConfirm = useCallback(() => {
    if (!conn || !bidConfirm) return

    try {
      conn.reducers.placeBid({ roomId: room.id, bidValue: bidConfirm.value })
      // 播放叫分/不叫音效
      if (bidConfirm.value > 0) {
        audio?.playBidScore(bidConfirm.value)
      } else {
        audio?.playNoBid()
      }
      setBidConfirm(null)
    } catch (err) {
      console.error('Bid error:', err)
      const errorMessage = err instanceof Error ? err.message : String(err)
      error(errorMessage)
    }
  }, [conn, room.id, audio, bidConfirm, error])

  // 加倍按钮点击 - 显示确认对话框
  const handleDoubleClick = useCallback((double: boolean) => {
    setDoubleConfirm({ double })
  }, [])

  // 确认加倍
  const handleDoubleConfirm = useCallback(() => {
    if (!conn || !doubleConfirm) return

    try {
      conn.reducers.doubleBet({ roomId: room.id, double: doubleConfirm.double })
      // 播放加倍/不加倍音效
      if (doubleConfirm.double) {
        audio?.playDouble()
      } else {
        audio?.playNoDouble()
      }
      setDoubleConfirm(null)
    } catch (err) {
      console.error('Double error:', err)
      const errorMessage = err instanceof Error ? err.message : String(err)
      error(errorMessage)
    }
  }, [conn, room.id, doubleConfirm, error])

  const handleSetTrusted = useCallback(
    (trusted: boolean) => {
      if (!conn) return

      try {
        conn.reducers.setTrusted({ roomId: room.id, trusted })
        if (trusted) {
          info('已开启托管，系统将自动为您出牌')
        } else {
          success('已取消托管')
        }
      } catch (err) {
        console.error('Set trusted error:', err)
        const errorMessage = err instanceof Error ? err.message : String(err)
        error(errorMessage)
      }
    },
    [conn, room.id]
  )

  const handleLeaveRoom = useCallback(() => {
    if (!conn) return

    const status = game?.status || room.status
    if (status === 'bidding' || status === 'doubling' || status === 'playing') {
      warning('游戏进行中无法离开房间，请点击"结束游戏"按钮强制结束游戏。')
      return
    }

    try {
      conn.reducers.leaveRoom({ roomId: room.id })
    } catch (err) {
      console.error('Leave room error:', err)
      const errorMessage = err instanceof Error ? err.message : String(err)
      error(errorMessage)
    }
  }, [conn, room.id, game?.status, room.status])

  const handleEndGame = useCallback(() => {
    if (!conn) return

    try {
      conn.reducers.endGame({ roomId: room.id })
    } catch (err) {
      console.error('End game error:', err)
      const errorMessage = err instanceof Error ? err.message : String(err)
      error(errorMessage)
    }
  }, [conn, room.id])

  const handleRestart = useCallback(() => {
    if (!conn) return

    try {
      conn.reducers.restartGame({ roomId: room.id })
    } catch (err) {
      console.error('Restart game error:', err)
      const errorMessage = err instanceof Error ? err.message : String(err)
      error(errorMessage)
    }
  }, [conn, room.id])

  // 获取当前玩家的托管状态
  const myPlayer = players.find(
    (p) => conn?.identity && p.playerIdentity.toHexString() === conn.identity.toHexString()
  )
  const isTrusted = myPlayer?.isTrusted ?? false

  const mySeatIndex = myPlayer?.seatIndex ?? 0

  const leftPlayer = players.find((p) => p.seatIndex === (mySeatIndex + 1) % 3)
  const rightPlayer = players.find((p) => p.seatIndex === (mySeatIndex + 2) % 3)

  // 获取对手的牌数（动态计算）
  const getOpponentCardCount = useCallback((playerIdentity: string) => {
    const hand = allHands.find(h => h.playerIdentity.toHexString() === playerIdentity)
    return hand?.cards.length ?? 17
  }, [allHands])

  // 获取对手的手牌（用于游戏结束时明牌展示）
  const getOpponentCards = useCallback((playerIdentity: string): number[] => {
    // 优先使用保存的手牌快照
    const handsToUse = finishedHandsRef.current.length > 0 ? finishedHandsRef.current : allHands
    const hand = handsToUse.find(h => h.playerIdentity.toHexString() === playerIdentity)
    return hand ? Array.from(hand.cards) : []
  }, [allHands])

  const gameStatus = game?.status || room.status
  const isBidding = gameStatus === 'bidding'
  const isDoubling = gameStatus === 'doubling'
  const isPlaying = gameStatus === 'playing'
  const isFinished = gameStatus === 'finished'

  // 获取当前玩家用于显示的手牌（游戏结束时使用快照）
  const displayMyHand = useMemo(() => {
    const myIdentity = conn?.identity
    if (isFinished && finishedHandsRef.current.length > 0 && myIdentity) {
      const hand = finishedHandsRef.current.find(
        h => h.playerIdentity.toHexString() === myIdentity.toHexString()
      )
      return hand || myHand
    }
    return myHand
  }, [isFinished, myHand, conn?.identity])

  // 确定当前操作类型
  const currentActionType: ActionType | null = useMemo(() => {
    if (isBidding) return 'bidding'
    if (isDoubling) return 'doubling'
    if (isPlaying) return 'playing'
    return null
  }, [isBidding, isDoubling, isPlaying])

  // 获取当前回合的玩家（用于显示倒计时）
  const getCurrentTurnSeat = useCallback(() => {
    if (!game) return null
    // 游戏结束时不再显示倒计时
    if (isFinished) return null
    if (isPlaying) return game.currentTurn
    if (isDoubling && game.currentDoublingTurn !== null) return game.currentDoublingTurn
    // 叫分阶段按座位顺序
    if (isBidding) {
      const bidCount = bids.length
      // 第一个叫分的从座位0开始，然后按顺序
      return bidCount % 3
    }
    return null
  }, [game, isPlaying, isDoubling, isBidding, isFinished, bids.length])

  const currentTurnSeat = getCurrentTurnSeat()

  // 判断每个玩家是否是当前回合
  const isLeftPlayerTurn = leftPlayer && currentTurnSeat === leftPlayer.seatIndex
  const isRightPlayerTurn = rightPlayer && currentTurnSeat === rightPlayer.seatIndex
  const isMyPlayerTurn = myPlayer && currentTurnSeat === myPlayer.seatIndex

  const canPass = isPlaying && isMyTurn() && currentPlay !== null

  // ========== DouZero AI 建议功能 ==========

  // AI 日志函数（静默，不输出）
  const logAi = useCallback((_message: string, _data?: unknown) => {
    // 调试时取消下面注释:
    // console.log('[GameTable AI]', new Date().toISOString(), _message, _data ?? '')
  }, [])

  // 获取 AI 叫分建议
  useEffect(() => {
    logAi('叫分建议 Effect 触发', {
      isBidding,
      hasMyHand: !!myHand,
      isDouzeroAvailable,
      hasLastBidSuggestion: !!lastBidSuggestion,
      myCards: myHand ? Array.from(myHand.cards) : null,
    })

    if (isBidding && myHand && isDouzeroAvailable && !lastBidSuggestion) {
      logAi('开始获取叫分建议, 手牌:', Array.from(myHand.cards))
      fetchBidSuggestion(Array.from(myHand.cards))
    } else {
      logAi('跳过获取叫分建议', {
        reason: !isBidding ? '不在叫分阶段' :
                !myHand ? '没有手牌' :
                !isDouzeroAvailable ? 'AI不可用' :
                '已有建议'
      })
    }
  }, [isBidding, myHand, isDouzeroAvailable, lastBidSuggestion, fetchBidSuggestion, logAi])

  // 获取 AI 加倍建议
  useEffect(() => {
    logAi('加倍建议 Effect 触发', {
      isDoubling,
      hasMyHand: !!myHand,
      isDouzeroAvailable,
      isMyDoublingTurn: isMyDoublingTurn(),
      hasLastDoubleSuggestion: !!lastDoubleSuggestion,
    })

    if (isDoubling && myHand && isDouzeroAvailable && isMyDoublingTurn() && !lastDoubleSuggestion) {
      logAi('开始获取加倍建议', {
        cards: Array.from(myHand.cards),
        isLandlord: myHand.isLandlord,
        landlordCards: landlordCards ? Array.from(landlordCards.cards) : null,
      })
      fetchDoubleSuggestion(
        Array.from(myHand.cards),
        myHand.isLandlord,
        landlordCards ? Array.from(landlordCards.cards) : undefined
      )
    } else {
      logAi('跳过获取加倍建议', {
        reason: !isDoubling ? '不在加倍阶段' :
                !myHand ? '没有手牌' :
                !isDouzeroAvailable ? 'AI不可用' :
                !isMyDoublingTurn() ? '不是我的加倍回合' :
                '已有建议'
      })
    }
  }, [isDoubling, myHand, isDouzeroAvailable, isMyDoublingTurn, lastDoubleSuggestion, fetchDoubleSuggestion, landlordCards, logAi])

  // 获取 AI 出牌建议
  useEffect(() => {
    logAi('出牌建议 Effect 触发', {
      isPlaying,
      hasMyHand: !!myHand,
      isDouzeroAvailable,
      isMyTurn: isMyTurn(),
      landlordSeat: game?.landlordSeat,
      hasLastPlaySuggestion: !!lastPlaySuggestion,
    })

    if (isPlaying && myHand && isDouzeroAvailable && isMyTurn() && game?.landlordSeat !== undefined && !lastPlaySuggestion) {
      const myPosition = getPlayerPosition(mySeatIndex, game.landlordSeat)
      if (!myPosition) {
        logAi('跳过获取出牌建议: 无法确定玩家位置', { mySeatIndex, landlordSeat: game.landlordSeat })
        return
      }
      const landlordCardsArray = landlordCards ? Array.from(landlordCards.cards) : []

      // 构建已出的牌（根据位置）- 使用 plays 表而不是手牌
      const playedCardsData = buildPlayedCardsForSuggestion(plays, players, game.landlordSeat)

      // 构建需要跟的牌（最近5手）
      // - 如果 currentPlay 为空，说明是新一轮首家，可以自由出牌
      // - 如果 currentPlay 是自己出的，说明新一轮开始，可以自由出牌
      // - 否则需要跟牌，取最近5手牌
      const myIdentity = conn?.identity?.toHexString()
      const isFirstInRound = !currentPlay || currentPlay.playerIdentity.toHexString() === myIdentity
      const lastMoves = isFirstInRound
        ? []
        : plays.slice(-5).map(p => Array.from(p.cards))

      // 计算各位置剩余牌数
      const numCardsLeft = buildNumCardsLeftForSuggestion(allHands, players, game.landlordSeat)

      logAi('开始获取出牌建议', {
        myCards: Array.from(myHand.cards),
        myPosition,
        mySeatIndex,
        landlordSeat: game.landlordSeat,
        playedCards: playedCardsData,
        lastMoves,
        landlordCards: landlordCardsArray,
        numCardsLeft,
      })

      fetchPlaySuggestion({
        myCards: Array.from(myHand.cards),
        position: myPosition,
        playedCards: playedCardsData,
        lastMoves,
        landlordCards: landlordCardsArray,
        numCardsLeft,
      })
    } else {
      logAi('跳过获取出牌建议', {
        reason: !isPlaying ? '不在出牌阶段' :
                !myHand ? '没有手牌' :
                !isDouzeroAvailable ? 'AI不可用' :
                !isMyTurn() ? '不是我的回合' :
                game?.landlordSeat === undefined ? '地主座位未确定' :
                '已有建议'
      })
    }
  }, [isPlaying, myHand, isDouzeroAvailable, isMyTurn, game?.landlordSeat, mySeatIndex, lastPlaySuggestion, fetchPlaySuggestion, landlordCards, players, plays, currentPlay, conn, allHands, logAi])

  // 应用 AI 叫分建议
  const handleApplyAiBid = useCallback(() => {
    logAi('应用 AI 叫分建议', {
      hasSuggestion: !!lastBidSuggestion,
      suggestedBid: lastBidSuggestion?.suggestedBid,
    })
    if (lastBidSuggestion && lastBidSuggestion.suggestedBid !== undefined) {
      logAi('执行叫分:', lastBidSuggestion.suggestedBid)
      handleBidClick(lastBidSuggestion.suggestedBid)
    }
  }, [lastBidSuggestion, handleBidClick, logAi])

  // 应用 AI 加倍建议
  const handleApplyAiDouble = useCallback(() => {
    logAi('应用 AI 加倍建议', {
      hasSuggestion: !!lastDoubleSuggestion,
      suggestedDouble: lastDoubleSuggestion?.suggestedDouble,
    })
    if (lastDoubleSuggestion) {
      logAi('执行加倍:', lastDoubleSuggestion.suggestedDouble ? '加倍' : '不加倍')
      handleDoubleClick(lastDoubleSuggestion.suggestedDouble)
    }
  }, [lastDoubleSuggestion, handleDoubleClick, logAi])

  // 应用 AI 出牌建议
  const handleApplyAiPlay = useCallback(() => {
    logAi('应用 AI 出牌建议', {
      hasSuggestion: !!lastPlaySuggestion,
      isPass: lastPlaySuggestion?.isPass,
      suggestedCards: lastPlaySuggestion?.suggestedCards,
    })
    if (lastPlaySuggestion) {
      if (lastPlaySuggestion.isPass) {
        logAi('执行: 不出')
        handlePass()
      } else if (lastPlaySuggestion.suggestedCards.length > 0) {
        logAi('执行: 选择卡牌', lastPlaySuggestion.suggestedCards)
        setSelection(lastPlaySuggestion.suggestedCards)
      }
    }
  }, [lastPlaySuggestion, handlePass, setSelection, logAi])

  // ========== 结束 DouZero AI 建议功能 ==========

  // 检查是否已经加倍
  const hasDoubled = doublings.some(
    (d) =>
      conn?.identity &&
      d.playerIdentity.toHexString() === conn.identity.toHexString()
  )

  // ========== 聊天系统处理函数 ==========

  // 打开快捷语面板
  const handleOpenQuickChat = useCallback((event: React.MouseEvent) => {
    const rect = event.currentTarget.getBoundingClientRect()
    setQuickChatPosition({ x: rect.left, y: rect.top - 250 })
    setShowQuickChat(true)
    setShowEmojiWheel(false)
  }, [])

  // 选择表情（通过 SpacetimeDB 同步给所有玩家）
  const handleSelectEmoji = useCallback((emojiType: EmojiType) => {
    if (!conn?.identity) return
    sendChatMessage('emoji', emojiType)
    setShowEmojiWheel(false)
  }, [conn?.identity, sendChatMessage])

  // 选择快捷语（通过 SpacetimeDB 同步给所有玩家）
  const handleSelectQuickChat = useCallback((message: QuickChatMessage) => {
    if (!conn?.identity) return
    sendChatMessage('text', message.text)
    // 播放快捷语语音
    audio?.playQuickChat(message.soundFile)
    setShowQuickChat(false)
  }, [conn?.identity, sendChatMessage, audio])

  // 获取玩家的聊天消息
  const getPlayerChatMessage = useCallback((playerIdentity: string) => {
    const playerMsgs = chatMessages.filter(m => m.senderIdentity === playerIdentity)
    return playerMsgs.length > 0 ? playerMsgs[playerMsgs.length - 1] : null
  }, [chatMessages])

  // 左边对手长按处理（发送表情到对方）
  const handleLeftPlayerLongPress = useCallback(() => {
    // 表情轮盘宽度约300px，左边留20px边距
    setEmojiWheelPosition({ x: 20, y: window.innerHeight / 2 })
    setShowEmojiWheel(true)
    setShowQuickChat(false)
  }, [])

  // 右边对手长按处理（发送表情到对方）
  const handleRightPlayerLongPress = useCallback(() => {
    // 表情轮盘宽度约300px，右边留20px边距
    setEmojiWheelPosition({ x: window.innerWidth - 320, y: window.innerHeight / 2 })
    setShowEmojiWheel(true)
    setShowQuickChat(false)
  }, [])

  // ========== 结束聊天系统处理函数 ==========

  // 游戏结束时播放胜负音效
  useEffect(() => {
    if (isFinished && gameResults.length > 0 && game && conn?.identity) {
      const myResult = gameResults.find(
        (r) => r.playerIdentity.toHexString() === conn.identity!.toHexString()
      )

      if (myResult) {
        const isWinner =
          (game.winner === 'landlord' && myResult.isLandlord) ||
          (game.winner === 'farmer' && !myResult.isLandlord)

        // 保存手牌快照，用于显示剩余手牌
        finishedHandsRef.current = [...allHands]
        isGameFinishedRef.current = true

        if (isWinner) {
          audio?.playWin()
        } else {
          audio?.playLose()
        }
        // 停止背景音乐
        audio?.stopMusic()

        // 记录成就数据（只记录一次）
        if (!hasRecordedAchievement.current) {
          hasRecordedAchievement.current = true
          const bombCount = plays.filter(p => p.combinationType === 'Bomb').length
          const rocketCount = plays.filter(p => p.combinationType === 'Rocket').length
          const gameDuration = game?.createdAt
            ? (Date.now() - Number(game.createdAt) / 1_000_000) / 1000
            : 0

          recordGameResult(isWinner, {
            bombCount,
            rocketCount,
            isSpring: game?.isSpring || false,
            remainingCards: myHand?.cards.length || 0,
            gameDuration
          })
        }

      }
    }
  }, [isFinished, gameResults, game, conn?.identity, audio, plays, myHand, recordGameResult, allHands])


  // 监听 currentPlay 变化播放出牌音效和视觉特效
  useEffect(() => {
    if (!currentPlay || !audio) return

    // 生成唯一标识，避免重复播放
    const playId = `${currentPlay.playerIdentity.toHexString()}-${Array.from(currentPlay.cards).join(',')}`

    // 如果已经播放过这组牌，跳过
    if (lastPlayedCards.current === playId) return
    lastPlayedCards.current = playId

    // 播放对应的牌型音效
    const cardsArray = Array.from(currentPlay.cards)
    audio.playCombination(currentPlay.combinationType, cardsArray)

    // 触发视觉特效
    triggerCardEffect(currentPlay.combinationType, cardsArray)
  }, [currentPlay, audio, triggerCardEffect])

  // 倒计时音效（阶段化心跳）
  const {
    phase: myTimerPhase,
    shouldPlayHeartbeat,
    heartbeatInterval
  } = useTurnTimer({
    turnStartTime: game?.turnStartTime ?? null,
    enabled: isMyPlayerTurn && !!game?.turnStartTime,
    onTimeout: () => {
      // 超时时显示自动托管提示
      setShowAutoTrust(true)
    }
  })

  // 心跳音效 - 基于间隔播放
  useEffect(() => {
    if (!isMyPlayerTurn || !shouldPlayHeartbeat || !audio) return

    const playHeartbeat = () => {
      audio.playTick()
    }

    // 立即播放一次
    playHeartbeat()

    // 设置定时播放
    const intervalId = setInterval(playHeartbeat, heartbeatInterval)

    return () => clearInterval(intervalId)
  }, [isMyPlayerTurn, shouldPlayHeartbeat, heartbeatInterval, audio])

  return (
    <div
      className={`h-screen bg-gradient-to-br ${theme.background.gradient} relative overflow-hidden ${screenShake ? 'screen-shake' : ''}`}
      onClick={handleFirstClick}
    >
      {/* 横屏提示 */}
      <OrientationPrompt />
      <ToastContainer toasts={toasts} onRemove={removeToast} />
      {/* 牌型视觉特效 */}
      <CombinationEffects effect={cardEffect} screenShake={screenShake} />

      {/* 发牌动画 */}
      {showDealAnimation && (
        <DealAnimation
          playerHands={players.map(p => ({
            identity: p.playerIdentity.toHexString(),
            seatIndex: p.seatIndex,
            cardCount: 17
          }))}
          landlordCards={landlordCards ? Array.from(landlordCards.cards) : []}
          landlordCardsRevealed={landlordCards?.revealed ?? false}
          onComplete={() => setShowDealAnimation(false)}
          enabled={showDealAnimation}
          audio={audio}
        />
      )}

      {/* 手势处理 - 快速出牌/不出 */}
      <GestureHandler
        onQuickPass={canPass ? handlePass : undefined}
        onQuickPlay={isPlaying && isMyTurn() && getSelectedCards().length > 0 ? handlePlayCards : undefined}
        onShake={() => {
          const emojis = [EmojiType.Happy, EmojiType.Angry, EmojiType.Thinking, EmojiType.ThumbUp, EmojiType.Sad, EmojiType.Victory]
          const randomEmoji = emojis[Math.floor(Math.random() * emojis.length)]
          handleSelectEmoji(randomEmoji)
        }}
        canPass={canPass && !isTrusted}
        canPlay={isPlaying && isMyTurn() && getSelectedCards().length > 0 && !isTrusted}
      >
        <div className="h-full flex flex-col overflow-hidden">
        {/* 顶部工具栏 - 紧凑布局时更紧凑 */}
        <div className={`flex-shrink-0 flex justify-between items-start ${isCompactLayout ? 'p-2' : 'p-3'}`}>
          <div className={`flex gap-1.5 ${isCompactLayout ? 'flex-nowrap' : 'flex-wrap'}`}>
            <button
              onClick={handleLeaveRoom}
              className={`${isCompactLayout ? 'px-2.5 py-1 text-xs' : 'px-3 py-1.5 text-sm'} bg-gray-800/80 hover:bg-gray-700 text-gray-300 rounded-md transition-colors`}
            >
              ← 离开
            </button>

            {/* 横屏切换按钮（横屏提示显示时隐藏，避免重复） */}
            {!showOrientationPrompt && <FullscreenToggle />}

            {(isBidding || isDoubling || isPlaying) && (
              <button
                onClick={() => setShowEndGameConfirm(true)}
                className={`${isCompactLayout ? 'px-2.5 py-1 text-xs' : 'px-3 py-1.5 text-sm'} bg-red-600/80 hover:bg-red-500 text-white rounded-md transition-colors font-medium`}
              >
                结束
              </button>
            )}

            {(isDoubling || isPlaying) && (
              <TrustControl
                isTrusted={isTrusted}
                onToggle={handleSetTrusted}
                isCompact={isCompactLayout}
              />
            )}

            {(isDoubling || isPlaying || isFinished) && (
              <PlayHistory
                plays={plays}
                players={players}
                actionEvents={actionEvents}
                landlordSeat={game?.landlordSeat}
              />
            )}

            {isFinished && (
              <button
                onClick={handleRestart}
                className={`${isCompactLayout ? 'px-2.5 py-1 text-xs' : 'px-3 py-1.5 text-sm'} bg-blue-600/80 hover:bg-blue-500 text-white rounded-md transition-colors font-medium`}
              >
                再来一局
              </button>
            )}
          </div>

          <div className={`flex items-center ${isCompactLayout ? 'gap-1.5' : 'gap-2'}`}>
            {/* 显示当前倍数 */}
            {(isDoubling || isPlaying) && game && (
              <div className={`${isCompactLayout ? 'px-2.5 py-1 text-xs' : 'px-3 py-1.5 text-sm'} bg-yellow-600/30 rounded-md text-yellow-300 font-medium`}>
                {game.multiple * game.doublingMultiple}x
              </div>
            )}

            {landlordCards && (
              <LandlordCards
                cards={landlordCards.cards}
                revealed={landlordCards.revealed}
              />
            )}
          </div>
        </div>

        {/* 中间区域 - 限制最大高度，确保底部手牌可见 */}
        <div className="flex-1 flex items-center justify-center min-h-0 overflow-hidden">
          {/* 显示对手手牌 */}
          <div className={`relative w-full h-full max-h-full ${isCompactLayout ? 'max-w-full' : 'max-w-4xl'}`}>
            {leftPlayer && (
              <div className={`absolute ${isCompactLayout ? 'left-2' : 'left-0'} top-1/2 -translate-y-1/2`}>
                <OpponentHand
                  playerName={leftPlayer.playerName}
                  cardsCount={getOpponentCardCount(leftPlayer.playerIdentity.toHexString())}
                  isLandlord={game?.landlordSeat === leftPlayer.seatIndex}
                  isTrusted={leftPlayer.isTrusted}
                  isCurrentTurn={!!isLeftPlayerTurn}
                  actionType={currentActionType ?? undefined}
                  turnStartTime={game?.turnStartTime}
                  onLongPress={handleLeftPlayerLongPress}
                  chatMessage={getPlayerChatMessage(leftPlayer.playerIdentity.toHexString())}
                  isFinished={isFinished}
                  revealedCards={getOpponentCards(leftPlayer.playerIdentity.toHexString())}
                />
              </div>
            )}

            {rightPlayer && (
              <div className={`absolute ${isCompactLayout ? 'right-2' : 'right-0'} top-1/2 -translate-y-1/2`}>
                <OpponentHand
                  playerName={rightPlayer.playerName}
                  cardsCount={getOpponentCardCount(rightPlayer.playerIdentity.toHexString())}
                  isLandlord={game?.landlordSeat === rightPlayer.seatIndex}
                  isTrusted={rightPlayer.isTrusted}
                  isCurrentTurn={!!isRightPlayerTurn}
                  actionType={currentActionType ?? undefined}
                  turnStartTime={game?.turnStartTime}
                  onLongPress={handleRightPlayerLongPress}
                  chatMessage={getPlayerChatMessage(rightPlayer.playerIdentity.toHexString())}
                  isFinished={isFinished}
                  revealedCards={getOpponentCards(rightPlayer.playerIdentity.toHexString())}
                />
              </div>
            )}

            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
              <PlayArea currentPlay={currentPlay} players={players} />
            </div>
          </div>
        </div>

        {/* 手牌区域 - 固定在底部，确保始终可见 */}
        <div className={`flex-shrink-0 ${isCompactLayout ? 'py-1 px-2' : 'py-2 px-4'}`}>
          {/* 显示手牌（叫分、加倍、出牌、结束阶段都显示）*/}
          {(isBidding || isDoubling || isPlaying || isFinished) && displayMyHand && (
            <div className="flex flex-col items-center gap-0 relative">
              {/* 当前玩家聊天气泡 */}
              {conn?.identity && getPlayerChatMessage(conn.identity.toHexString()) && (
                <div className="chat-bubble-floating" key={getPlayerChatMessage(conn.identity.toHexString())!.id}>
                  {getPlayerChatMessage(conn.identity.toHexString())!.type === 'emoji' ? (
                    <span className="text-2xl animate-bounce">{getPlayerChatMessage(conn.identity.toHexString())!.content}</span>
                  ) : (
                    <span className="text-xs text-white bg-black/70 px-2 py-1 rounded-lg max-w-32 text-center break-words">
                      {getPlayerChatMessage(conn.identity.toHexString())!.content}
                    </span>
                  )}
                </div>
              )}
              <PlayerHand
                cards={displayMyHand.cards}
                selectedCards={selectedCards}
                onToggleCard={toggleCard}
                isSelected={isSelected}
                onDragSelect={setSelection}
                playableCards={isPlaying && isMyTurn() && !isTrusted ? playableCards : undefined}
                shouldShake={isMyPlayerTurn && myTimerPhase === 'urgent'}
              />
            </div>
          )}
        </div>

        {/* 牌型预览 - 出牌阶段显示当前选中的牌型 */}
        {isPlaying && (
          <CombinationPreview
            selectedCards={selectedCards}
            currentPlay={currentPlay ? Array.from(currentPlay.cards) : null}
            isMyTurn={isMyTurn()}
          />
        )}

        {/* 操作工具栏 - 在手牌和底部状态栏之间 */}
        {(isBidding || isDoubling || isPlaying) && (
          <div className="action-toolbar">
            <div className="action-toolbar-inner">
              {/* 叫分阶段按钮 */}
              {isBidding && !bids.some(
                (b) =>
                  conn?.identity &&
                  b.playerIdentity.toHexString() === conn.identity.toHexString()
              ) && (
                <>
                  {[0, 1, 2, 3]
                    .filter((v) => v === 0 || v > Math.max(...bids.map((b) => b.bidValue), 0))
                    .map((value) => (
                      <button
                        key={value}
                        onClick={() => handleBidClick(value)}
                        className={`action-btn ${value === 0 ? 'action-btn-secondary' : 'action-btn-primary'}`}
                      >
                        {value === 0 ? '不叫' : `${value}分`}
                      </button>
                    ))}
                  {/* AI 叫分建议 */}
                  {isDouzeroAvailable && myHand && (
                    <AISuggestionBadge
                      type="bid"
                      suggestion={
                        lastBidSuggestion
                          ? lastBidSuggestion.suggestedBid === 0
                            ? '不叫'
                            : `${lastBidSuggestion.suggestedBid}分`
                          : 'AI建议'
                      }
                      winRate={lastBidSuggestion?.win_rate}
                      isLoading={isDouzeroLoading && !lastBidSuggestion}
                      onClick={handleApplyAiBid}
                      isCompact={isCompactLayout}
                    />
                  )}
                </>
              )}

              {/* 叫分阶段已叫分提示 */}
              {isBidding && bids.some(
                (b) =>
                  conn?.identity &&
                  b.playerIdentity.toHexString() === conn.identity.toHexString()
              ) && (
                <span className="action-hint">等待其他玩家叫分...</span>
              )}

              {/* 加倍阶段按钮 */}
              {isDoubling && game && !hasDoubled && isMyDoublingTurn() && (
                <>
                  <button
                    onClick={() => handleDoubleClick(true)}
                    className="action-btn action-btn-danger"
                  >
                    加倍
                  </button>
                  <button
                    onClick={() => handleDoubleClick(false)}
                    className="action-btn action-btn-secondary"
                  >
                    不加倍
                  </button>
                  {/* AI 加倍建议 */}
                  {isDouzeroAvailable && myHand && (
                    <AISuggestionBadge
                      type="double"
                      suggestion={
                        lastDoubleSuggestion
                          ? lastDoubleSuggestion.suggestedDouble
                            ? '加倍'
                            : '不加倍'
                          : 'AI建议'
                      }
                      winRate={lastDoubleSuggestion?.win_rate}
                      isLoading={isDouzeroLoading && !lastDoubleSuggestion}
                      onClick={handleApplyAiDouble}
                      isCompact={isCompactLayout}
                    />
                  )}
                </>
              )}

              {/* 加倍阶段等待提示 */}
              {isDoubling && game && (!isMyDoublingTurn() || hasDoubled) && (
                <span className="action-hint">
                  {hasDoubled ? `已选择 · ${game.doublingMultiple}x` : '等待其他玩家选择...'}
                </span>
              )}

              {/* 出牌阶段按钮 */}
              {isPlaying && (
                <>
                  <button
                    onClick={handlePlayCards}
                    disabled={!isMyTurn() || getSelectedCards().length === 0 || isTrusted}
                    className="action-btn action-btn-primary"
                  >
                    {isTrusted ? '托管中...' : '出牌'}
                  </button>

                  {/* 提示按钮 */}
                  {isMyTurn() && !isTrusted && bestPlay && (
                    <button
                      onClick={handleHintClick}
                      className={`action-btn ${isSelectedHint ? 'action-btn-secondary' : 'action-btn-success'}`}
                    >
                      {isSelectedHint ? '取消' : '提示'}
                    </button>
                  )}

                  {/* AI 出牌建议 */}
                  {isDouzeroAvailable && isMyTurn() && !isTrusted && (
                    <AISuggestionBadge
                      type="play"
                      suggestion={
                        lastPlaySuggestion
                          ? lastPlaySuggestion.isPass
                            ? '不出'
                            : 'AI推荐'
                          : 'AI建议'
                      }
                      winRate={lastPlaySuggestion?.winRate}
                      isLoading={isDouzeroLoading && !lastPlaySuggestion}
                      onClick={handleApplyAiPlay}
                      isCompact={isCompactLayout}
                    />
                  )}

                  <button
                    onClick={handlePass}
                    disabled={!canPass || isTrusted}
                    className="action-btn action-btn-secondary"
                  >
                    不出
                  </button>

                  {/* 聊天按钮 */}
                  <button
                    onClick={handleOpenQuickChat}
                    className="action-btn action-btn-chat"
                    title="发送快捷语"
                  >
                    💬
                  </button>
                </>
              )}
            </div>
          </div>
        )}

        {/* 底部状态栏 - 游戏时长和状态 */}
        <GameStatusBar
          game={game}
          gameStatus={gameStatus}
          isCompactLayout={isCompactLayout}
          isMyTurn={isMyPlayerTurn}
          isLandlord={myHand?.isLandlord ?? false}
          cardsCount={myHand?.cards.length}
          turnStartTime={game?.turnStartTime}
          actionType={currentActionType ?? undefined}
        />

        {/* 结束游戏确认对话框 */}
        <ConfirmDialog
          isOpen={showEndGameConfirm}
          title="结束游戏"
          message="确定要结束游戏吗？这将强制结束当前游戏，所有玩家将返回等待状态。"
          confirmText="结束游戏"
          cancelText="继续游戏"
          variant="danger"
          onConfirm={() => {
            setShowEndGameConfirm(false)
            handleEndGame()
          }}
          onCancel={() => setShowEndGameConfirm(false)}
        />

        {/* 表情轮盘 */}
        {showEmojiWheel && (
          <EmojiWheel
            position={emojiWheelPosition}
            onSelect={handleSelectEmoji}
            onClose={() => setShowEmojiWheel(false)}
          />
        )}

        {/* 快捷语面板 */}
        {showQuickChat && (
          <QuickChat
            position={quickChatPosition}
            onSelect={handleSelectQuickChat}
            onClose={() => setShowQuickChat(false)}
          />
        )}

        {/* 叫分确认对话框 */}
        <ActionConfirmDialog
          isOpen={bidConfirm !== null}
          title="确认叫分"
          message={bidConfirm ? `确定要${bidConfirm.value === 0 ? '不叫' : `叫 ${bidConfirm.value} 分`}吗？此操作不可撤销。` : ''}
          confirmText={bidConfirm ? (bidConfirm.value === 0 ? '不叫' : `${bidConfirm.value}分`) : ''}
          cancelText="再想想"
          variant={bidConfirm?.value === 0 ? 'primary' : 'warning'}
          onConfirm={handleBidConfirm}
          onCancel={() => setBidConfirm(null)}
        />

        {/* 加倍确认对话框 */}
        <ActionConfirmDialog
          isOpen={doubleConfirm !== null}
          title="确认加倍"
          message={doubleConfirm?.double
            ? '确定要加倍吗？获胜将获得双倍积分，失败也会扣除双倍积分。'
            : '确定不加倍吗？保持当前倍数不变。'}
          confirmText={doubleConfirm?.double ? '加倍' : '不加倍'}
          cancelText="再想想"
          variant={doubleConfirm?.double ? 'danger' : 'primary'}
          onConfirm={handleDoubleConfirm}
          onCancel={() => setDoubleConfirm(null)}
        />





        {/* 超时自动托管提示 */}
        <AutoTrustNotification
          isVisible={showAutoTrust}
          onComplete={() => setShowAutoTrust(false)}
        />
      </div>
      </GestureHandler>
    </div>
  )
}

/**
 * 底部状态栏组件 - 显示游戏时长和状态
 */
interface GameStatusBarProps {
  game: Game | null
  gameStatus: string
  isCompactLayout: boolean
  isMyTurn?: boolean
  isLandlord?: boolean
  cardsCount?: number
  turnStartTime?: bigint | Timestamp | null
  actionType?: ActionType
}

function GameStatusBar({ game, gameStatus, isCompactLayout, isMyTurn, isLandlord, cardsCount, turnStartTime, actionType }: GameStatusBarProps) {
  // 计算游戏时长（从游戏创建开始）
  const duration = useGameDuration(
    game?.createdAt ?? null,
    gameStatus !== 'waiting'
  )

  // 倒计时（阶段化）
  const { remainingSeconds, phase, shouldShakeCards } = useTurnTimer({
    turnStartTime: turnStartTime ?? null,
    enabled: isMyTurn && !!turnStartTime,
  })

  // 只在游戏进行中显示
  if (gameStatus === 'waiting') {
    return null
  }

  const statusColors: Record<string, string> = {
    bidding: 'text-blue-400 bg-blue-900/30',
    doubling: 'text-orange-400 bg-orange-900/30',
    playing: 'text-green-400 bg-green-900/30',
    finished: 'text-gray-400 bg-gray-900/30',
  }

  const statusIcons: Record<string, string> = {
    bidding: '📢',
    doubling: '⚡',
    playing: '🃏',
    finished: '🏁',
  }

  // 获取操作类型文字
  const getActionText = (type: ActionType): string => {
    switch (type) {
      case 'bidding': return '叫分'
      case 'doubling': return '加倍'
      case 'playing': return '出牌'
    }
  }

  // 阶段对应的样式
  const getPhaseStyles = () => {
    switch (phase) {
      case 'calm':
        return {
          bg: 'bg-green-600',
          text: 'text-white',
          extra: ''
        }
      case 'breathing':
        return {
          bg: 'bg-yellow-600',
          text: 'text-white',
          extra: 'timer-breathing'
        }
      case 'urgent':
        return {
          bg: 'bg-red-600',
          text: 'text-white',
          extra: 'timer-urgent'
        }
      case 'timeout':
        return {
          bg: 'bg-gray-600',
          text: 'text-gray-300',
          extra: 'timer-timeout'
        }
      default:
        return { bg: 'bg-green-600', text: 'text-white', extra: '' }
    }
  }

  const phaseStyles = getPhaseStyles()
  const isFinal = remainingSeconds <= 5 && remainingSeconds > 0

  return (
    <div className={`flex-shrink-0 flex justify-center items-center gap-4 ${isCompactLayout ? 'py-1 px-2 text-xs' : 'py-1.5 px-4 text-sm'} bg-gray-900/50 border-t border-gray-700/50`}>
      {/* 轮到您出牌提示 + 倒计时 */}
      {isMyTurn && turnStartTime != null && turnStartTime !== undefined && actionType && (
        <>
          <div className={`flex items-center gap-2 px-3 py-0.5 ${phaseStyles.bg} rounded-lg ${phaseStyles.text} font-medium border-2 border-transparent ${phaseStyles.extra}`}>
            <span className="timer-icon">⏰</span>
            <span>{getActionText(actionType)}</span>
            <span className={`font-mono font-bold timer-number ${isFinal ? 'timer-final-countdown' : ''}`}>
              {remainingSeconds}s
            </span>
          </div>
          <div className="w-px h-4 bg-gray-700" />
        </>
      )}

      {/* 我的身份和剩余卡牌 */}
      {cardsCount !== undefined && cardsCount > 0 && (
        <>
          <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded-lg ${isLandlord ? 'text-yellow-400 bg-yellow-900/30' : 'text-green-400 bg-green-900/30'} ${shouldShakeCards ? 'cards-shaking' : ''}`}>
            <span>{isLandlord ? '👑' : '🌾'}</span>
            <span className="font-medium">{isLandlord ? '地主' : '农民'}</span>
            <span className="text-gray-500">·</span>
            <span className="font-mono">{cardsCount}张</span>
          </div>
          <div className="w-px h-4 bg-gray-700" />
        </>
      )}

      {/* 游戏时长 */}
      <div className="flex items-center gap-1.5">
        <span className="text-gray-500">⏱️</span>
        <span className="text-gray-400 font-mono">{formatDuration(duration)}</span>
      </div>

      {/* 分隔符 */}
      <div className="w-px h-4 bg-gray-700" />

      {/* 游戏状态 */}
      <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full ${statusColors[gameStatus] || 'text-gray-400 bg-gray-900/30'}`}>
        <span>{statusIcons[gameStatus] || '🎮'}</span>
        <span className="font-medium">{getGameStatusText(gameStatus)}</span>
      </div>

      {/* 倍数显示（出牌阶段） */}
      {gameStatus === 'playing' && game && (
        <>
          <div className="w-px h-4 bg-gray-700" />
          <div className="flex items-center gap-1.5 text-yellow-400">
            <span>💰</span>
            <span className="font-mono font-medium">{game.multiple * game.doublingMultiple}x</span>
          </div>
        </>
      )}
    </div>
  )
}

/**
 * 构建全局累计已出的牌（按位置分类）
 * DouZero API 期望的 played_cards 是全局累计，越完整越好（影响牌池分配）
 */
function buildPlayedCardsForSuggestion(
  plays: Play[],
  players: RoomPlayer[],
  landlordSeat: number
): { landlord: number[]; landlord_up: number[]; landlord_down: number[] } {
  const result = {
    landlord: [] as number[],
    landlord_up: [] as number[],
    landlord_down: [] as number[],
  }

  // 构建玩家 identity -> 位置的映射
  const playerPositions: Map<string, 'landlord' | 'landlord_up' | 'landlord_down'> = new Map()
  for (const player of players) {
    const pos = getPlayerPosition(player.seatIndex, landlordSeat)
    if (pos) {
      playerPositions.set(player.playerIdentity.toHexString(), pos)
    }
  }

  // 累计所有已出的牌（全局累计）
  for (const play of plays) {
    const pos = playerPositions.get(play.playerIdentity.toHexString())
    if (pos) {
      result[pos].push(...Array.from(play.cards))
    }
  }

  return result
}

/**
 * 构建各位置剩余牌数
 * 用于 DouZero API 的 num_cards_left 参数
 */
function buildNumCardsLeftForSuggestion(
  allHands: PlayerHandType[],
  players: RoomPlayer[],
  landlordSeat: number
): { landlord: number; landlord_up: number; landlord_down: number } {
  const result = {
    landlord: 20,
    landlord_up: 17,
    landlord_down: 17,
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
