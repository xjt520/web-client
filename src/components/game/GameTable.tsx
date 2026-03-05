import { useEffect, useState, useRef, useCallback } from 'react'
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
import { SpectatorHands } from './SpectatorHands'
import { useCardSelection } from '../../hooks/useCardSelection'
import { useToast } from '../../hooks/useToast'
import { useAiAutoAction } from '../../hooks/useAiAutoAction'
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
  const [allHands, setAllHands] = useState<PlayerHandType[]>([])
  const [players, setPlayers] = useState<RoomPlayer[]>([])
  const [currentPlay, setCurrentPlay] = useState<CurrentPlay | null>(null)
  const [landlordCards, setLandlordCards] = useState<LandlordCardsType | null>(null)
  const [bids, setBids] = useState<Bid[]>([])
  const [doublings, setDoublings] = useState<Doubling[]>([])
  const [gameResults, setGameResults] = useState<GameResult[]>([])
  const [plays, setPlays] = useState<Play[]>([])

  const processedPlayerIds = useRef<Set<string>>(new Set())
  const processedBidIds = useRef<Set<string>>(new Set())
  const processedDoublingIds = useRef<Set<string>>(new Set())
  const processedGameResultIds = useRef<Set<string>>(new Set())
  const processedPlayIds = useRef<Set<string>>(new Set())

  const { selectedCards, toggleCard, clearSelection, getSelectedCards, isSelected, setSelection } = useCardSelection()
  const { toasts, removeToast, error, success, warning, info } = useToast()
  const conn = getConnection()

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

      // 更新所有手牌列表（观战者用）
      setAllHands((prev: PlayerHandType[]) => {
        if (prev.some((h: PlayerHandType) => h.playerIdentity.toHexString() === hand.playerIdentity.toHexString())) {
          return prev
        }
        return [...prev, hand]
      })

      // 更新当前用户手牌
      if (conn.identity && hand.playerIdentity.toHexString() === conn.identity.toHexString()) {
        setMyHand(hand)
      }
    })

    db.player_hand.onUpdate((_ctx: EventContext, _oldHand: PlayerHandType, newHand: PlayerHandType) => {
      if (newHand.roomId.toString() !== roomId.toString()) return

      // 更新所有手牌列表（观战者用）
      setAllHands((prev: PlayerHandType[]) =>
        prev.map((h: PlayerHandType) =>
          h.playerIdentity.toHexString() === newHand.playerIdentity.toHexString() ? newHand : h
        )
      )

      // 更新当前用户手牌
      if (conn.identity && newHand.playerIdentity.toHexString() === conn.identity.toHexString()) {
        setMyHand(newHand)
      }
    })

    db.player_hand.onDelete((_ctx: EventContext, hand: PlayerHandType) => {
      if (hand.roomId.toString() !== roomId.toString()) return

      // 从所有手牌列表中删除
      setAllHands((prev: PlayerHandType[]) =>
        prev.filter((h: PlayerHandType) => h.playerIdentity.toHexString() !== hand.playerIdentity.toHexString())
      )
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

  // 定时调用超时检查（用于托管自动出牌）
  useEffect(() => {
    if (!conn || !game || game.status !== 'playing') return

    // 每秒检查一次超时
    const interval = setInterval(() => {
      try {
        conn.reducers.checkTurnTimeout({ roomId: room.id })
      } catch (err) {
        // 忽略错误，可能是还没到超时时间
      }
    }, 1000)

    return () => clearInterval(interval)
  }, [conn, room.id, game?.status])

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

    // 判断当前用户是否是观战者
    const currentMyPlayer = players.find(
      (p) => conn?.identity && p.playerIdentity.toHexString() === conn.identity.toHexString()
    )
    const currentIsSpectator = currentMyPlayer && (currentMyPlayer.isSpectating || currentMyPlayer.seatIndex >= 100)

    const status = game?.status || room.status
    // 观战者可以随时离开房间
    if (!currentIsSpectator && (status === 'bidding' || status === 'doubling' || status === 'playing')) {
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
  }, [conn, room.id, game?.status, room.status, players])

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

  // 判断当前用户是否是观战者
  const isSpectator = myPlayer && (myPlayer.isSpectating || myPlayer.seatIndex >= 100)

  const mySeatIndex = myPlayer?.seatIndex ?? 0

  const leftPlayer = players.find((p) => p.seatIndex === (mySeatIndex + 1) % 3)
  const rightPlayer = players.find((p) => p.seatIndex === (mySeatIndex + 2) % 3)

  const gameStatus = game?.status || room.status
  const isBidding = gameStatus === 'bidding'
  const isDoubling = gameStatus === 'doubling'
  const isPlaying = gameStatus === 'playing'
  const isFinished = gameStatus === 'finished'

  const canPass = isPlaying && isMyTurn() && currentPlay !== null

  // 检查是否已经加倍
  const hasDoubled = doublings.some(
    (d) =>
      conn?.identity &&
      d.playerIdentity.toHexString() === conn.identity.toHexString()
  )

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-900 to-gray-900 relative overflow-hidden">
      <ToastContainer toasts={toasts} onRemove={removeToast} />
      <div className="absolute inset-0 flex flex-col">
        <div className="flex justify-between items-start p-4">
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={handleLeaveRoom}
              className="px-4 py-2 bg-gray-800/80 hover:bg-gray-700 text-gray-300 rounded-lg transition-colors"
            >
              ← 离开房间
            </button>

            {(isBidding || isDoubling || isPlaying) && !isSpectator && (
              <button
                onClick={() => {
                  if (confirm('确定要结束游戏吗？这将强制结束当前游戏，所有玩家将返回等待状态。')) {
                    handleEndGame()
                  }
                }}
                className="px-4 py-2 bg-red-600/80 hover:bg-red-500 text-white rounded-lg transition-colors font-medium"
              >
                结束游戏
              </button>
            )}

            {(isDoubling || isPlaying) && !isSpectator && (
              <TrustControl
                isTrusted={isTrusted}
                onToggle={handleSetTrusted}
              />
            )}

            {(isDoubling || isPlaying || isFinished) && (
              <PlayHistory plays={plays} players={players} />
            )}
          </div>

          <div className="flex items-center gap-4">
            {/* 显示当前倍数 */}
            {(isDoubling || isPlaying) && game && (
              <div className="px-4 py-2 bg-yellow-600/30 rounded-lg text-yellow-300 font-medium">
                倍数: {game.multiple * game.doublingMultiple}x
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
          {/* 观战者模式：显示所有玩家手牌 */}
          {isSpectator && (isBidding || isDoubling || isPlaying) && (
            <div className="w-full max-w-6xl px-4">
              <SpectatorHands
                players={players}
                allHands={allHands}
                game={game}
                bids={bids}
                doublings={doublings}
              />
            </div>
          )}

          {/* 普通玩家模式：显示对手手牌 */}
          {!isSpectator && (
            <div className="relative w-full max-w-4xl h-96">
              {leftPlayer && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2">
                  <OpponentHand
                    playerName={leftPlayer.playerName}
                    cardsCount={17}
                    isLandlord={game?.landlordSeat === leftPlayer.seatIndex}
                    isTrusted={leftPlayer.isTrusted}
                  />
                </div>
              )}

              {rightPlayer && (
                <div className="absolute right-0 top-1/2 -translate-y-1/2">
                  <OpponentHand
                    playerName={rightPlayer.playerName}
                    cardsCount={17}
                    isLandlord={game?.landlordSeat === rightPlayer.seatIndex}
                    isTrusted={rightPlayer.isTrusted}
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
          )}
        </div>

        {/* 手牌区域 - 固定在底部 */}
        <div className="flex-shrink-0 p-4 pb-6">
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
              isSpectator={isSpectator}
            />
          )}

          {/* 加倍阶段 */}
          {isDoubling && game && (
            <DoublingPanel
              onDouble={handleDouble}
              isMyTurn={isMyDoublingTurn()}
              hasDoubled={hasDoubled}
              currentMultiple={game.doublingMultiple}
              isSpectator={isSpectator}
            />
          )}

          {/* 显示手牌（叫分、加倍、出牌阶段都显示）- 观战者不显示手牌 */}
          {(isBidding || isDoubling || isPlaying) && myHand && !isSpectator && (
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
                <div className="flex gap-4 mt-2">
                  <button
                    onClick={handlePlayCards}
                    disabled={!isMyTurn() || getSelectedCards().length === 0 || isTrusted}
                    className="px-8 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors"
                  >
                    {isTrusted ? '托管中...' : '出牌'}
                  </button>

                  <button
                    onClick={handlePass}
                    disabled={!canPass || isTrusted}
                    className="px-8 py-3 bg-gray-700 hover:bg-gray-600 disabled:bg-gray-800 disabled:cursor-not-allowed text-gray-300 font-medium rounded-lg transition-colors"
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
      </div>
    </div>
  )
}
