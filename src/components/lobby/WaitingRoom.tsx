import { useEffect, useState, useRef, useCallback, useMemo } from 'react'
import type { DbConnection } from '../../lib/spacetime'
import type { Room, RoomPlayer, GameResult, Game } from '../../module_bindings/types'
import type { EventContext } from '../../module_bindings'
import { useScreenOrientation } from '../../hooks/useScreenOrientation'

interface WaitingRoomProps {
  room: Room
  getConnection: () => DbConnection | null
}

export function WaitingRoom({ room, getConnection }: WaitingRoomProps) {
  const { isMobileLandscape, isCompactScreen } = useScreenOrientation()
  const isCompactLayout = isMobileLandscape || isCompactScreen
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
      db.game.removeOnInsert(handleGameInsert)
      db.game.removeOnDelete(handleGameDelete)
      db.game.removeOnUpdate(handleGameUpdate)
    }
  }, [conn, room.id])

  const currentPlayer = players.find(
    (p) => conn?.identity && p.playerIdentity.toHexString() === conn.identity.toHexString()
  )

  // 正常玩家（座位号 < 100）
  const normalPlayers = players.filter((p) => p.seatIndex < 100)

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
    <div className="min-h-screen bg-gradient-to-br from-green-900 to-gray-900 flex items-center justify-center p-3 sm:p-4">
      <div className="bg-gray-800 rounded-xl p-4 sm:p-6 md:p-8 w-full max-w-md">
        <div className="text-center mb-4 sm:mb-6">
          <h2 className="text-xl sm:text-2xl font-bold text-white mb-1 sm:mb-2">{room.name}</h2>
          <p className="text-sm sm:text-base text-gray-400">
            {isAfterGame ? '上一局游戏结束，等待重新开始...' : '等待玩家准备...'}
          </p>
        </div>

        {/* 上一局结算展示 */}
        {isAfterGame && sortedGameResults.length > 0 && (
          <div className="mb-4 sm:mb-6 bg-gray-700/50 rounded-lg p-3 sm:p-4">
            <h3 className="text-sm sm:text-base text-white font-medium mb-2 sm:mb-3 text-center">📊 上一局战绩</h3>

            {/* 春天/反春天标签 */}
            {game && (game.isSpring || game.isAntiSpring) && (
              <div className="mb-2 sm:mb-3 text-center">
                <span className={`
                  inline-block px-2 sm:px-3 py-1 rounded-full text-xs font-bold
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
                      rounded-lg p-2 sm:p-3 text-xs sm:text-sm
                      ${isMe ? 'bg-blue-900/30 border border-blue-500/50' : 'bg-gray-600/30'}
                    `}
                  >
                    <div className="flex items-center justify-between mb-1 sm:mb-2">
                      <div className="flex items-center gap-1 sm:gap-2 flex-1 min-w-0">
                        {/* 角色标签 */}
                        <span className={`
                          px-1.5 sm:px-2 py-0.5 rounded text-xs font-medium shrink-0
                          ${result.isLandlord ? 'bg-red-600/50 text-red-200' : 'bg-green-600/50 text-green-200'}
                        `}>
                          {result.isLandlord ? '👑' : '🌾'}
                        </span>
                        {/* 玩家名称 */}
                        <span className={`font-medium truncate ${isMe ? 'text-blue-300' : 'text-gray-300'}`}>
                          {getPlayerName(identityHex)}
                          {isMe && <span className="text-xs text-blue-400 ml-1 hidden sm:inline">(你)</span>}
                        </span>
                      </div>
                      {/* 胜负和积分 */}
                      <div className="flex items-center gap-1 sm:gap-2 shrink-0">
                        <span className={`
                          px-1.5 sm:px-2 py-0.5 rounded text-xs font-bold
                          ${playerResultIsWinner ? 'bg-yellow-600/50 text-yellow-200' : 'bg-gray-500/50 text-gray-300'}
                        `}>
                          {playerResultIsWinner ? '✓' : '✗'}
                        </span>
                        <span className={`font-bold text-sm sm:text-base ${result.finalScore > 0 ? 'text-green-400' : 'text-red-400'}`}>
                          {result.finalScore > 0 ? '+' : ''}{result.finalScore}
                        </span>
                      </div>
                    </div>

                    {/* 积分明细 - 移动端使用2列 */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-1 sm:gap-2 text-xs text-gray-400">
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

        <div className={`${isCompactLayout ? 'mb-2' : 'mb-4 sm:mb-6'}`}>
          <div className={`flex justify-between ${isCompactLayout ? 'text-xs mb-1' : 'text-xs sm:text-sm text-gray-400 mb-2'}`}>
            <span>玩家 ({normalPlayers.length}/3)</span>
            {isOwner && <span className="text-yellow-400">房主</span>}
          </div>

          <div className={`grid ${isCompactLayout ? 'grid-cols-3 gap-1.5' : 'space-y-2 sm:space-y-3'}`}>
            {normalPlayers.map((player) => {
              const isMe = conn?.identity && player.playerIdentity.toHexString() === conn.identity.toHexString()
              const isPlayerOwner = player.playerIdentity.toHexString() === room.owner.toHexString()

              return (
                <div
                  key={player.playerIdentity.toHexString()}
                  className={`flex items-center justify-between ${isCompactLayout ? 'p-1.5 rounded' : 'p-2 sm:p-3 rounded-lg'} ${
                    isMe ? 'bg-blue-900/50 border border-blue-500' : player.isAi ? 'bg-purple-900/30 border border-purple-500' : 'bg-gray-700'
                  }`}
                >
                  <div className="flex items-center gap-1 min-w-0">
                    {player.isAi && <span className="text-purple-400 text-xs">🤖</span>}
                    <span className={`text-white ${isCompactLayout ? 'text-xs' : 'text-sm sm:text-base'} truncate`}>{player.playerName}</span>
                    {isPlayerOwner && <span className="text-yellow-400 text-xs">👑</span>}
                    {isMe && <span className="text-blue-400 text-xs">(我)</span>}
                  </div>
                  <div className="flex items-center shrink-0">
                    {player.ready ? (
                      <span className="text-green-400 text-xs">✓</span>
                    ) : (
                      <span className="text-gray-500 text-xs">○</span>
                    )}
                  </div>
                </div>
              )
            })}

            {Array.from({ length: 3 - normalPlayers.length }).map((_, i) => (
              <div
                key={`empty-${i}`}
                className={`flex items-center justify-center ${isCompactLayout ? 'p-1.5' : 'p-2 sm:p-3'} rounded-lg bg-gray-700/50 border border-dashed border-gray-600`}
              >
                <span className={`text-gray-500 ${isCompactLayout ? 'text-xs' : 'text-xs sm:text-sm'}`}>等待...</span>
              </div>
            ))}
          </div>
        </div>

        <div className={`flex ${isCompactLayout ? 'flex-row gap-2' : 'flex-col gap-2 sm:gap-3'}`}>
          {/* 游戏结束后显示重新开始按钮 */}
          {isAfterGame ? (
            <>
              {isOwner && (
                <button
                  onClick={handleRestartGame}
                  className={`flex-1 ${isCompactLayout ? 'py-2 text-xs' : 'py-3 sm:py-4 text-sm sm:text-base'} bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors touch:manipulation`}
                >
                  再来一局
                </button>
              )}
              {!isOwner && (
                <p className={`text-center text-gray-400 ${isCompactLayout ? 'text-xs' : 'text-xs sm:text-sm'}`}>等待房主...</p>
              )}
            </>
          ) : (
            <>
              {currentPlayer && !currentPlayer.ready && (
                <button
                  onClick={handleReady}
                  className={`flex-1 ${isCompactLayout ? 'py-2 text-xs' : 'py-3 sm:py-4 text-sm sm:text-base'} bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg transition-colors touch:manipulation`}
                >
                  准备
                </button>
              )}

              {currentPlayer && currentPlayer.ready && (
                <button
                  onClick={handleReady}
                  className={`flex-1 ${isCompactLayout ? 'py-2 text-xs' : 'py-3 sm:py-4 text-sm sm:text-base'} bg-gray-600 hover:bg-gray-500 text-white font-medium rounded-lg transition-colors touch:manipulation`}
                >
                  取消准备
                </button>
              )}

              {isOwner && (
                <button
                  onClick={handleStartGame}
                  disabled={!canStart}
                  className={`flex-1 ${isCompactLayout ? 'py-2 text-xs' : 'py-3 sm:py-4 text-sm sm:text-base'} font-medium rounded-lg transition-colors touch:manipulation ${
                    canStart
                      ? 'bg-blue-600 hover:bg-blue-700 text-white'
                      : 'bg-gray-600 text-gray-400 cursor-not-allowed'
                  }`}
                >
                  {normalPlayers.length < 3
                    ? `${normalPlayers.length}/3`
                    : !allReady
                    ? '等待准备'
                    : '开始'}
                </button>
              )}
            </>
          )}

          <button
            onClick={handleLeaveRoom}
            className={`${isCompactLayout ? 'py-2 px-3 text-xs' : 'w-full py-3 sm:py-4 text-sm sm:text-base'} bg-red-600/50 hover:bg-red-600 text-red-200 font-medium rounded-lg transition-colors touch:manipulation`}
          >
            {isCompactLayout ? '离开' : '离开房间'}
          </button>
        </div>
      </div>
    </div>
  )
}
