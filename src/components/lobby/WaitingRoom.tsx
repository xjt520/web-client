import { useEffect, useState, useRef, useCallback, useMemo } from 'react'
import type { DbConnection } from '../../lib/spacetime'
import type { Room, RoomPlayer } from '../../module_bindings/types'
import type { EventContext } from '../../module_bindings'
import { useScreenOrientation } from '../../hooks/useScreenOrientation'
import { getTheme, type ThemeId } from '../../config/themes'

interface WaitingRoomProps {
  room: Room
  getConnection: () => DbConnection | null
  tableTheme?: ThemeId
}

export function WaitingRoom({ room, getConnection, tableTheme = 'classic' }: WaitingRoomProps) {
  const { isMobileLandscape, isCompactScreen } = useScreenOrientation()
  const isCompactLayout = isMobileLandscape || isCompactScreen
  const theme = getTheme(tableTheme)
  const [players, setPlayers] = useState<RoomPlayer[]>([])
  const processedPlayerIds = useRef<Set<string>>(new Set())

  const conn = getConnection()

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

    let subscribed = false
    conn.subscriptionBuilder()
      .onApplied(() => {
        if (subscribed) return
        subscribed = true

        const initialPlayers = Array.from(db.room_player.iter()) as unknown as RoomPlayer[]
        const roomPlayers = initialPlayers.filter(
          (p) => p.roomId.toString() === roomId.toString()
        )
        roomPlayers.forEach((p) => {
          const playerId = `${p.roomId}-${p.playerIdentity.toHexString()}`
          processedPlayerIds.current.add(playerId)
        })
        setPlayers(roomPlayers)
      })
      .subscribeToAllTables()

    return () => {
      db.room_player.removeOnInsert(handlePlayerInsert)
      db.room_player.removeOnDelete(handlePlayerDelete)
      db.room_player.removeOnUpdate(handlePlayerUpdate)
    }
  }, [conn, room.id])

  const currentPlayer = useMemo(() => {
    if (!conn?.identity) return null
    return players.find((p) => p.playerIdentity.toHexString() === conn.identity!.toHexString())
  }, [players, conn?.identity])

  const isOwner = useMemo(() => {
    if (!conn?.identity) return false
    return room.owner.toHexString() === conn.identity.toHexString()
  }, [room.owner, conn?.identity])

  const isAfterGame = room.status === 'finished'

  const normalPlayers = useMemo(() => players.filter((p) => p.seatIndex < 100), [players])

  const allReady = useMemo(
    () => normalPlayers.length === 3 && normalPlayers.every((p) => p.ready),
    [normalPlayers]
  )

  const canStart = isOwner && normalPlayers.length === 3 && allReady

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
    <div className={`min-h-screen bg-gradient-to-br ${theme.background.gradient} flex items-center justify-center p-3 sm:p-4`}>
        <div className="bg-gray-800 rounded-xl p-4 sm:p-6 md:p-8 w-full max-w-md">
          <div className="text-center mb-4 sm:mb-6">
            <h2 className="text-xl sm:text-2xl font-bold text-white mb-1 sm:mb-2">{room.name}</h2>
            <p className="text-sm sm:text-base text-gray-400">
              {isAfterGame ? '上一局游戏结束，等待重新开始...' : '等待玩家准备...'}
            </p>
          </div>

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
