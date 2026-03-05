import { useEffect, useState, useRef, useCallback, useMemo } from 'react'
import type { DbConnection } from '../../lib/spacetime'
import type { Room, RoomPlayer, GameResult, Game } from '../../module_bindings/types'
import type { EventContext } from '../../module_bindings'

interface WaitingRoomProps {
  room: Room
  getConnection: () => DbConnection | null
}

export function WaitingRoom({ room, getConnection }: WaitingRoomProps) {
  const [players, setPlayers] = useState<RoomPlayer[]>([])
  const [gameResults, setGameResults] = useState<GameResult[]>([])
  const [game, setGame] = useState<Game | null>(null)
  const processedPlayerIds = useRef<Set<string>>(new Set())
  const processedGameResultIds = useRef<Set<string>>(new Set())

  const conn = getConnection()

  // 当房间状态变化时清除结算数据
  useEffect(() => {
    if (room.status !== 'finished') {
      setGameResults([])
      processedGameResultIds.current.clear()
      setGame(null)
    }
  }, [room.status])

  useEffect(() => {
    if (!conn) return

    const db = conn.db
    const roomId = room.id

    const handlePlayerInsert = (_ctx: EventContext, player: RoomPlayer) => {
      if (player.roomId.toString() !== roomId.toString()) return
      const playerId = `${player.roomId}-${player.playerIdentity.toHexString()}`
      if (processedPlayerIds.current.has(playerId)) return
      processedPlayerIds.current.add(playerId)
      setPlayers((prev) => [...prev, player])
    }
    db.room_player.onInsert(handlePlayerInsert)

    const handlePlayerDelete = (_ctx: EventContext, player: RoomPlayer) => {
      const playerId = `${player.roomId}-${player.playerIdentity.toHexString()}`
      processedPlayerIds.current.delete(playerId)
      setPlayers((prev) =>
        prev.filter((p) => `${p.roomId}-${p.playerIdentity.toHexString()}` !== playerId)
      )
    }
    db.room_player.onDelete(handlePlayerDelete)

    const handlePlayerUpdate = (_ctx: EventContext, _oldPlayer: RoomPlayer, newPlayer: RoomPlayer) => {
      setPlayers((prev) =>
        prev.map((p) =>
          `${p.roomId}-${p.playerIdentity.toHexString()}` ===
          `${newPlayer.roomId}-${newPlayer.playerIdentity.toHexString()}`
            ? newPlayer
            : p
        )
      )
    }
    db.room_player.onUpdate(handlePlayerUpdate)

    // GameResult 表监听
    const handleGameResultInsert = (_ctx: EventContext, result: GameResult) => {
      if (result.roomId.toString() !== roomId.toString()) return
      const resultId = result.id.toString()
      if (processedGameResultIds.current.has(resultId)) return
      processedGameResultIds.current.add(resultId)
      setGameResults((prev) => [...prev, result])
    }
    db.game_result.onInsert(handleGameResultInsert)

    const handleGameResultDelete = (_ctx: EventContext, result: GameResult) => {
      const resultId = result.id.toString()
      processedGameResultIds.current.delete(resultId)
      setGameResults((prev) => prev.filter((r) => r.id.toString() !== resultId))
    }
    db.game_result.onDelete(handleGameResultDelete)

    // Game 表监听
    const handleGameInsert = (_ctx: EventContext, g: Game) => {
      if (g.roomId.toString() === roomId.toString()) {
        setGame(g)
      }
    }
    db.game.onInsert(handleGameInsert)

    const handleGameDelete = (_ctx: EventContext, g: Game) => {
      if (g.roomId.toString() === roomId.toString()) {
        setGame(null)
      }
    }
    db.game.onDelete(handleGameDelete)

    const handleGameUpdate = (_ctx: EventContext, _oldGame: Game, newGame: Game) => {
      if (newGame.roomId.toString() === roomId.toString()) {
        setGame(newGame)
      }
    }
    db.game.onUpdate(handleGameUpdate)

    let subscribed = false
    conn.subscriptionBuilder()
      .onApplied(() => {
        if (subscribed) return
        subscribed = true

        const initialPlayers = Array.from(db.room_player.iter()) as unknown as RoomPlayer[]
        const roomPlayers = initialPlayers.filter(
          (p) => p.roomId.toString() === roomId.toString()
        )
        roomPlayers.forEach((p) =>
          processedPlayerIds.current.add(`${p.roomId}-${p.playerIdentity.toHexString()}`)
        )
        setPlayers(roomPlayers)

        // 初始化 GameResult
        const initialGameResults = Array.from(db.game_result.iter()) as unknown as GameResult[]
        const roomGameResults = initialGameResults.filter(
          (r) => r.roomId.toString() === roomId.toString()
        )
        roomGameResults.forEach((r) => processedGameResultIds.current.add(r.id.toString()))
        setGameResults(roomGameResults)

        // 初始化 Game
        const initialGames = Array.from(db.game.iter()) as unknown as Game[]
        const roomGame = initialGames.find((g) => g.roomId.toString() === roomId.toString())
        if (roomGame) {
          setGame(roomGame)
        }
      })
      .subscribe(['SELECT * FROM room_player', 'SELECT * FROM game_result', 'SELECT * FROM game'])

    // 清理函数
    return () => {
      db.room_player.removeOnInsert(handlePlayerInsert)
      db.room_player.removeOnDelete(handlePlayerDelete)
      db.room_player.removeOnUpdate(handlePlayerUpdate)
      db.game_result.removeOnInsert(handleGameResultInsert)
      db.game_result.removeOnDelete(handleGameResultDelete)
      db.game.onInsert(handleGameInsert)
      db.game.onDelete(handleGameDelete)
      db.game.onUpdate(handleGameUpdate)
    }
  }, [conn, room.id])

  const currentPlayer = players.find(
    (p) => conn?.identity && p.playerIdentity.toHexString() === conn.identity.toHexString()
  )

  // 区分正常玩家和观战者
  const normalPlayers = players.filter((p) => !p.isSpectating && p.seatIndex < 100)
  const spectators = players.filter((p) => p.isSpectating || p.seatIndex >= 100)
  const isSpectator = currentPlayer && (currentPlayer.isSpectating || currentPlayer.seatIndex >= 100)

  const isOwner = conn?.identity && room.owner.toHexString() === conn.identity.toHexString()
  const allReady = normalPlayers.length === 3 && normalPlayers.every((p) => p.ready)
  const canStart = isOwner && allReady

  // 判断是否是游戏结束后的等待状态
  const isAfterGame = room.status === 'finished'

  // 获取玩家名称
  const getPlayerName = useCallback((identityHex: string) => {
    const player = players.find((p) => p.playerIdentity.toHexString() === identityHex)
    return player?.playerName || '未知玩家'
  }, [players])

  // 按角色排序结算结果：地主在前，农民在后
  const sortedGameResults = useMemo(() => {
    if (!gameResults || !Array.isArray(gameResults)) return []
    return [...gameResults].sort((a, b) => {
      if (a.isLandlord && !b.isLandlord) return -1
      if (!a.isLandlord && b.isLandlord) return 1
      return 0
    })
  }, [gameResults])

  const handleReady = useCallback(() => {
    if (!conn || !currentPlayer) return
    conn.reducers.setReady({ roomId: room.id, ready: !currentPlayer.ready })
  }, [conn, room.id, currentPlayer])

  const handleStartGame = useCallback(() => {
    if (!conn || !canStart) return
    conn.reducers.startGame({ roomId: room.id })
  }, [conn, room.id, canStart])

  const handleRestartGame = useCallback(() => {
    if (!conn || !isOwner) return
    conn.reducers.restartGame({ roomId: room.id })
  }, [conn, room.id, isOwner])

  const handleLeaveRoom = useCallback(() => {
    if (!conn) return
    conn.reducers.leaveRoom({ roomId: room.id })
  }, [conn, room.id])

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-900 to-gray-900 flex items-center justify-center">
      <div className="bg-gray-800 rounded-xl p-8 w-full max-w-md">
        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold text-white mb-2">{room.name}</h2>
          <p className="text-gray-400">
            {isAfterGame ? '上一局游戏结束，等待重新开始...' : isSpectator ? '观战模式' : '等待玩家准备...'}
          </p>
        </div>

        {/* 上一局结算展示 */}
        {isAfterGame && sortedGameResults.length > 0 && (
          <div className="mb-6 bg-gray-700/50 rounded-lg p-4">
            <h3 className="text-white font-medium mb-3 text-center">📊 上一局战绩</h3>

            {/* 春天/反春天标签 */}
            {game && (game.isSpring || game.isAntiSpring) && (
              <div className="mb-3 text-center">
                <span className={`
                  inline-block px-3 py-1 rounded-full text-xs font-bold
                  ${game.isSpring ? 'bg-red-500/30 text-red-300' : 'bg-green-500/30 text-green-300'}
                `}>
                  {game.isSpring ? '🌸 春天！' : '🌿 反春天！'}
                </span>
              </div>
            )}

            <div className="space-y-2">
              {sortedGameResults.map((result) => {
                const identityHex = result.playerIdentity.toHexString()
                const isMe = conn?.identity && identityHex === conn.identity.toHexString()
                const winnerValue = game?.winner
                const playerResultIsWinner =
                  winnerValue != null &&
                  ((winnerValue === 'landlord' && result.isLandlord) ||
                   (winnerValue === 'farmer' && !result.isLandlord))

                return (
                  <div
                    key={result.id.toString()}
                    className={`
                      rounded-lg p-3 text-sm
                      ${isMe ? 'bg-blue-900/30 border border-blue-500/50' : 'bg-gray-600/30'}
                    `}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        {/* 角色标签 */}
                        <span className={`
                          px-2 py-0.5 rounded text-xs font-medium
                          ${result.isLandlord ? 'bg-red-600/50 text-red-200' : 'bg-green-600/50 text-green-200'}
                        `}>
                          {result.isLandlord ? '👑 地主' : '🌾 农民'}
                        </span>
                        {/* 玩家名称 */}
                        <span className={`font-medium ${isMe ? 'text-blue-300' : 'text-gray-300'}`}>
                          {getPlayerName(identityHex)}
                          {isMe && <span className="text-xs text-blue-400 ml-1">(你)</span>}
                        </span>
                      </div>
                      {/* 胜负和积分 */}
                      <div className="flex items-center gap-2">
                        <span className={`
                          px-2 py-0.5 rounded text-xs font-bold
                          ${playerResultIsWinner ? 'bg-yellow-600/50 text-yellow-200' : 'bg-gray-500/50 text-gray-300'}
                        `}>
                          {playerResultIsWinner ? '✓ 胜' : '✗ 负'}
                        </span>
                        <span className={`font-bold ${result.finalScore > 0 ? 'text-green-400' : 'text-red-400'}`}>
                          {result.finalScore > 0 ? '+' : ''}{result.finalScore}
                        </span>
                      </div>
                    </div>

                    {/* 积分明细 */}
                    <div className="grid grid-cols-4 gap-2 text-xs text-gray-400">
                      <div className="text-center">
                        <div className="text-gray-500">基础</div>
                        <div className="text-white">{result.baseScore}</div>
                      </div>
                      <div className="text-center">
                        <div className="text-gray-500">叫分</div>
                        <div className="text-white">x{result.bidMultiple}</div>
                      </div>
                      <div className="text-center">
                        <div className="text-gray-500">加倍</div>
                        <div className="text-white">x{result.doublingMultiple}</div>
                      </div>
                      <div className="text-center">
                        <div className="text-gray-500">炸弹</div>
                        <div className="text-orange-400">x{result.bombMultiple}</div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        <div className="mb-6">
          <div className="flex justify-between text-sm text-gray-400 mb-2">
            <span>玩家 ({normalPlayers.length}/3)</span>
            {isOwner && !isSpectator && <span className="text-yellow-400">房主</span>}
            {isSpectator && <span className="text-blue-400">👁️ 观战者</span>}
          </div>

          <div className="space-y-3">
            {normalPlayers.map((player) => {
              const isMe = conn?.identity && player.playerIdentity.toHexString() === conn.identity.toHexString()
              const isPlayerOwner = player.playerIdentity.toHexString() === room.owner.toHexString()

              return (
                <div
                  key={player.playerIdentity.toHexString()}
                  className={`flex items-center justify-between p-3 rounded-lg ${
                    isMe ? 'bg-blue-900/50 border border-blue-500' : player.isAi ? 'bg-purple-900/30 border border-purple-500' : 'bg-gray-700'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    {player.isAi && <span className="text-purple-400">🤖</span>}
                    <span className="text-white">{player.playerName}</span>
                    {isPlayerOwner && <span className="text-yellow-400 text-sm">👑</span>}
                    {isMe && <span className="text-blue-400 text-sm">(我)</span>}
                  </div>
                  <div className="flex items-center gap-2">
                    {player.ready ? (
                      <span className="text-green-400 text-sm">✓ 已准备</span>
                    ) : (
                      <span className="text-gray-500 text-sm">未准备</span>
                    )}
                  </div>
                </div>
              )
            })}

            {Array.from({ length: 3 - normalPlayers.length }).map((_, i) => (
              <div
                key={`empty-${i}`}
                className="flex items-center justify-center p-3 rounded-lg bg-gray-700/50 border border-dashed border-gray-600"
              >
                <span className="text-gray-500">等待玩家加入...</span>
              </div>
            ))}

            {/* 显示观战者 */}
            {spectators.length > 0 && (
              <div className="mt-4 pt-4 border-t border-gray-600">
                <p className="text-gray-400 text-sm mb-2">观战者 ({spectators.length})</p>
                <div className="flex flex-wrap gap-2">
                  {spectators.map((s) => (
                    <span
                      key={s.playerIdentity.toHexString()}
                      className="px-2 py-1 bg-blue-900/30 text-blue-300 rounded text-sm"
                    >
                      👁️ {s.playerName.replace('👁️ ', '')}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-3">
          {/* 观战者只显示离开按钮 */}
          {isSpectator ? (
            <>
              <p className="text-center text-gray-400 text-sm">您正在观战中，游戏结束后可继续观战下一局</p>
              <button
                onClick={handleLeaveRoom}
                className="w-full py-3 bg-red-600/50 hover:bg-red-600 text-red-200 font-medium rounded-lg transition-colors"
              >
                离开房间
              </button>
            </>
          ) : (
            <>
              {/* 游戏结束后显示重新开始按钮 */}
              {isAfterGame ? (
                <>
                  {isOwner && (
                    <button
                      onClick={handleRestartGame}
                      className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
                    >
                      再来一局
                    </button>
                  )}
                  {!isOwner && (
                    <p className="text-center text-gray-400 text-sm">等待房主开始新一局...</p>
                  )}
                </>
              ) : (
                <>
                  {currentPlayer && !currentPlayer.ready && (
                    <button
                      onClick={handleReady}
                      className="w-full py-3 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg transition-colors"
                    >
                      准备
                    </button>
                  )}

                  {currentPlayer && currentPlayer.ready && (
                    <button
                      onClick={handleReady}
                      className="w-full py-3 bg-gray-600 hover:bg-gray-500 text-white font-medium rounded-lg transition-colors"
                    >
                      取消准备
                    </button>
                  )}

                  {isOwner && (
                    <button
                      onClick={handleStartGame}
                      disabled={!canStart}
                      className={`w-full py-3 font-medium rounded-lg transition-colors ${
                        canStart
                          ? 'bg-blue-600 hover:bg-blue-700 text-white'
                          : 'bg-gray-600 text-gray-400 cursor-not-allowed'
                      }`}
                    >
                      {normalPlayers.length < 3
                        ? `等待玩家 (${normalPlayers.length}/3)`
                        : !allReady
                        ? '等待所有玩家准备'
                        : '开始游戏'}
                    </button>
                  )}
                </>
              )}

              <button
                onClick={handleLeaveRoom}
                className="w-full py-3 bg-red-600/50 hover:bg-red-600 text-red-200 font-medium rounded-lg transition-colors"
              >
                离开房间
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
