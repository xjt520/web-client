import { useEffect, useState, useRef, useCallback, useMemo } from 'react'
import { PlayerHand } from './PlayerHand'
import { OpponentHand } from './OpponentHand'
import { PlayArea } from './PlayArea'
import { BiddingPanel } from './BiddingPanel'
import { DoublingPanel } from './DoublingPanel'
import { TurnIndicator } from './TurnIndicator'
import { LandlordCards } from './LandlordCards'
import { GameResultModal } from './GameResultModal'
import { TrustControl } from './TrustControl'
import { PlayHistory } from './PlayHistory'
import { ToastContainer } from '../common/ToastContainer'
import { ConfirmDialog } from '../common/ConfirmDialog'
import { PlayerActionTimer, ActionType } from './PlayerActionTimer'
import { OrientationPrompt } from './OrientationPrompt'
import { FullscreenToggle } from './FullscreenToggle'
import { useCardSelection } from '../../hooks/useCardSelection'
import { useToast } from '../../hooks/useToast'
import { useAiAutoAction } from '../../hooks/useAiAutoAction'
import { useScreenOrientation } from '../../hooks/useScreenOrientation'
import type { DbConnection } from '../../lib/spacetime'
import type { Room, Game, PlayerHand as PlayerHandType, RoomPlayer, CurrentPlay, LandlordCards as LandlordCardsType, Bid, Doubling, GameResult, Play } from '../../module_bindings/types'
import type { EventContext } from '../../module_bindings'

interface GameTableProps {
  room: Room
  getConnection: () => DbConnection | null
}

export function GameTable({ room, getConnection }: GameTableProps) {
  const [game, setGame] = useState<Game | null>(null)
  const [myHand, setMyHand] = useState<PlayerHandType | null>(null)
  const [players, setPlayers] = useState<RoomPlayer[]>([])
  const [currentPlay, setCurrentPlay] = useState<CurrentPlay | null>(null)
  const [landlordCards, setLandlordCards] = useState<LandlordCardsType | null>(null)
  const [bids, setBids] = useState<Bid[]>([])
  const [doublings, setDoublings] = useState<Doubling[]>([])
  const [gameResults, setGameResults] = useState<GameResult[]>([])
  const [plays, setPlays] = useState<Play[]>([])
  const [showEndGameConfirm, setShowEndGameConfirm] = useState(false)

  const processedPlayerIds = useRef<Set<string>>(new Set())
  const processedBidIds = useRef<Set<string>>(new Set())
  const processedDoublingIds = useRef<Set<string>>(new Set())
  const processedGameResultIds = useRef<Set<string>>(new Set())
  const processedPlayIds = useRef<Set<string>>(new Set())

  const { selectedCards, toggleCard, clearSelection, getSelectedCards, isSelected, setSelection } = useCardSelection()
  const { toasts, removeToast, error, success, warning, info } = useToast()
  const conn = getConnection()

  // 屏幕方向检测
  const { isMobileLandscape } = useScreenOrientation()

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
      setPlayers((prev) =>
        prev.filter((p) => `${p.roomId}-${p.playerIdentity.toHexString()}` !== playerId)
      )
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

    db.game.onUpdate((_ctx: EventContext, _oldGame: Game, newGame: Game) => {
      if (newGame.roomId.toString() === roomId.toString()) {
        setGame(newGame)
      }
    })

    db.player_hand.onInsert((_ctx: EventContext, hand: PlayerHandType) => {
      if (hand.roomId.toString() !== roomId.toString()) return

      // 更新当前用户手牌
      if (conn.identity && hand.playerIdentity.toHexString() === conn.identity.toHexString()) {
        setMyHand(hand)
      }
    })

    db.player_hand.onUpdate((_ctx: EventContext, _oldHand: PlayerHandType, newHand: PlayerHandType) => {
      if (newHand.roomId.toString() !== roomId.toString()) return

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
      ])
  }, [conn, room.id])

  // 人机模式AI自动行动
  useAiAutoAction({
    getConnection,
    roomId: room.id,
    isAiMode: room.isAiMode || false,
    gameStatus: game?.status || 'waiting',
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
    } catch (err) {
      console.error('Pass turn error:', err)
      const errorMessage = err instanceof Error ? err.message : String(err)
      error(errorMessage)
    }
  }, [conn, isMyTurn, room.id])

  const handleBid = useCallback(
    (value: number) => {
      if (!conn) return

      try {
        conn.reducers.placeBid({ roomId: room.id, bidValue: value })
      } catch (err) {
        console.error('Bid error:', err)
        const errorMessage = err instanceof Error ? err.message : String(err)
        error(errorMessage)
      }
    },
    [conn, room.id]
  )

  const handleDouble = useCallback(
    (double: boolean) => {
      if (!conn) return

      try {
        conn.reducers.doubleBet({ roomId: room.id, double })
      } catch (err) {
        console.error('Double error:', err)
        const errorMessage = err instanceof Error ? err.message : String(err)
        error(errorMessage)
      }
    },
    [conn, room.id]
  )

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

  const gameStatus = game?.status || room.status
  const isBidding = gameStatus === 'bidding'
  const isDoubling = gameStatus === 'doubling'
  const isPlaying = gameStatus === 'playing'
  const isFinished = gameStatus === 'finished'

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
    if (isPlaying) return game.currentTurn
    if (isDoubling && game.currentDoublingTurn !== null) return game.currentDoublingTurn
    // 叫分阶段按座位顺序
    if (isBidding) {
      const bidCount = bids.length
      // 第一个叫分的从座位0开始，然后按顺序
      return bidCount % 3
    }
    return null
  }, [game, isPlaying, isDoubling, isBidding, bids.length])

  const currentTurnSeat = getCurrentTurnSeat()

  // 判断每个玩家是否是当前回合
  const isLeftPlayerTurn = leftPlayer && currentTurnSeat === leftPlayer.seatIndex
  const isRightPlayerTurn = rightPlayer && currentTurnSeat === rightPlayer.seatIndex
  const isMyPlayerTurn = myPlayer && currentTurnSeat === myPlayer.seatIndex

  const canPass = isPlaying && isMyTurn() && currentPlay !== null

  // 检查是否已经加倍
  const hasDoubled = doublings.some(
    (d) =>
      conn?.identity &&
      d.playerIdentity.toHexString() === conn.identity.toHexString()
  )

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-900 to-gray-900 relative overflow-hidden">
      {/* 横屏提示 */}
      <OrientationPrompt />
      <ToastContainer toasts={toasts} onRemove={removeToast} />
      <div className="absolute inset-0 flex flex-col">
        {/* 顶部工具栏 - 横屏时更紧凑 */}
        <div className={`flex justify-between items-start ${isMobileLandscape ? 'p-2' : 'p-4'}`}>
          <div className={`flex gap-2 ${isMobileLandscape ? 'flex-nowrap' : 'flex-wrap'}`}>
            <button
              onClick={handleLeaveRoom}
              className={`${isMobileLandscape ? 'px-2 py-1 text-xs' : 'px-4 py-2 text-sm'} bg-gray-800/80 hover:bg-gray-700 text-gray-300 rounded-lg transition-colors`}
            >
              ← 离开
            </button>

            {(isBidding || isDoubling || isPlaying) && (
              <button
                onClick={() => setShowEndGameConfirm(true)}
                className={`${isMobileLandscape ? 'px-2 py-1 text-xs' : 'px-4 py-2 text-sm'} bg-red-600/80 hover:bg-red-500 text-white rounded-lg transition-colors font-medium`}
              >
                结束
              </button>
            )}

            {(isDoubling || isPlaying) && (
              <TrustControl
                isTrusted={isTrusted}
                onToggle={handleSetTrusted}
              />
            )}

            {(isDoubling || isPlaying || isFinished) && (
              <PlayHistory plays={plays} players={players} />
            )}
          </div>

          <div className={`flex items-center ${isMobileLandscape ? 'gap-2' : 'gap-4'}`}>
            {/* 横屏切换按钮 */}
            <FullscreenToggle />

            {/* 显示当前倍数 */}
            {(isDoubling || isPlaying) && game && (
              <div className={`${isMobileLandscape ? 'px-2 py-1 text-xs' : 'px-4 py-2 text-sm'} bg-yellow-600/30 rounded-lg text-yellow-300 font-medium`}>
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

        <div className="flex-1 flex items-center justify-center">
          {/* 显示对手手牌 */}
          <div className={`relative w-full ${isMobileLandscape ? 'max-w-full h-full' : 'max-w-4xl h-96'}`}>
            {leftPlayer && (
              <div className={`absolute ${isMobileLandscape ? 'left-2' : 'left-0'} top-1/2 -translate-y-1/2`}>
                <OpponentHand
                  playerName={leftPlayer.playerName}
                  cardsCount={17}
                  isLandlord={game?.landlordSeat === leftPlayer.seatIndex}
                  isTrusted={leftPlayer.isTrusted}
                  isCurrentTurn={!!isLeftPlayerTurn}
                  actionType={currentActionType ?? undefined}
                  turnStartTime={game?.turnStartTime}
                />
              </div>
            )}

            {rightPlayer && (
              <div className={`absolute ${isMobileLandscape ? 'right-2' : 'right-0'} top-1/2 -translate-y-1/2`}>
                <OpponentHand
                  playerName={rightPlayer.playerName}
                  cardsCount={17}
                  isLandlord={game?.landlordSeat === rightPlayer.seatIndex}
                  isTrusted={rightPlayer.isTrusted}
                  isCurrentTurn={!!isRightPlayerTurn}
                  actionType={currentActionType ?? undefined}
                  turnStartTime={game?.turnStartTime}
                />
              </div>
            )}

            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
              <PlayArea currentPlay={currentPlay} players={players} />

              {isPlaying && game && (
                <TurnIndicator
                  currentTurn={game.currentTurn}
                  myTurn={isMyTurn()}
                  turnStartTime={game.turnStartTime}
                />
              )}
            </div>
          </div>
        </div>

        {/* 手牌区域 - 固定在底部 */}
        <div className={`flex-shrink-0 ${isMobileLandscape ? 'p-2 pb-3' : 'p-4 pb-6'}`}>
          {/* 当前玩家操作倒计时提示 */}
          {isMyPlayerTurn && currentActionType && game?.turnStartTime && (
            <div className="flex justify-center mb-2">
              <PlayerActionTimer
                turnStartTime={game.turnStartTime}
                actionType={currentActionType}
                isMyTurn={true}
              />
            </div>
          )}

          {/* 叫分阶段 */}
          {isBidding && (
            <BiddingPanel
              onBid={handleBid}
              maxBid={Math.max(...bids.map((b) => b.bidValue), 0)}
              hasBid={bids.some(
                (b) =>
                  conn?.identity &&
                  b.playerIdentity.toHexString() === conn.identity.toHexString()
              )}
            />
          )}

          {/* 加倍阶段 */}
          {isDoubling && game && (
            <DoublingPanel
              onDouble={handleDouble}
              isMyTurn={isMyDoublingTurn()}
              hasDoubled={hasDoubled}
              currentMultiple={game.doublingMultiple}
            />
          )}

          {/* 显示手牌（叫分、加倍、出牌阶段都显示）*/}
          {(isBidding || isDoubling || isPlaying) && myHand && (
            <div className="flex flex-col items-center gap-2">
              <PlayerHand
                cards={myHand.cards}
                isLandlord={myHand.isLandlord}
                selectedCards={selectedCards}
                onToggleCard={toggleCard}
                isSelected={isSelected}
                onDragSelect={setSelection}
              />

              {isPlaying && (
                <div className={`flex ${isMobileLandscape ? 'gap-2' : 'gap-4'} mt-2`}>
                  <button
                    onClick={handlePlayCards}
                    disabled={!isMyTurn() || getSelectedCards().length === 0 || isTrusted}
                    className={`${isMobileLandscape ? 'px-4 py-2 text-sm' : 'px-8 py-3'} bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors`}
                  >
                    {isTrusted ? '托管中...' : '出牌'}
                  </button>

                  <button
                    onClick={handlePass}
                    disabled={!canPass || isTrusted}
                    className={`${isMobileLandscape ? 'px-4 py-2 text-sm' : 'px-8 py-3'} bg-gray-700 hover:bg-gray-600 disabled:bg-gray-800 disabled:cursor-not-allowed text-gray-300 font-medium rounded-lg transition-colors`}
                  >
                    不出
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {isFinished && game && (
          <GameResultModal
            winner={game.winner}
            gameResults={gameResults}
            players={players}
            isSpring={game.isSpring}
            isAntiSpring={game.isAntiSpring}
            myIdentityHex={conn?.identity?.toHexString() ?? ''}
            onRestart={handleRestart}
            onLeave={handleLeaveRoom}
          />
        )}

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
      </div>
    </div>
  )
}
