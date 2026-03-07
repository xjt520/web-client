import { useEffect, useState, useRef, useCallback } from 'react'
import type { DbConnection } from '../../lib/spacetime'
import type { Room, RoomPlayer } from '../../module_bindings/types'
import type { EventContext } from '../../module_bindings'

interface RoomListProps {
  getConnection: () => DbConnection | null
  onError: (error: string) => void
  compact?: boolean
}

export function RoomList({ getConnection, onError, compact = false }: RoomListProps) {
  const [rooms, setRooms] = useState<Room[]>([])
  const [players, setPlayers] = useState<RoomPlayer[]>([])
  const [joiningRoom, setJoiningRoom] = useState<bigint | null>(null)

  const processedRoomIds = useRef<Set<string>>(new Set())
  const processedPlayerIds = useRef<Set<string>>(new Set())

  const conn = getConnection()

  useEffect(() => {
    if (!conn) return

    const db = conn.db

    db.room.onInsert((_ctx: EventContext, room: Room) => {
      const roomId = room.id.toString()
      if (processedRoomIds.current.has(roomId)) return
      processedRoomIds.current.add(roomId)
      setRooms((prev) => [...prev, room])
    })

    db.room.onDelete((_ctx: EventContext, room: Room) => {
      const roomId = room.id.toString()
      processedRoomIds.current.delete(roomId)
      setRooms((prev) => prev.filter((r) => r.id.toString() !== roomId))
    })

    db.room.onUpdate((_ctx: EventContext, oldRoom: Room, newRoom: Room) => {
      setRooms((prev) =>
        prev.map((r) => (r.id.toString() === newRoom.id.toString() ? newRoom : r))
      )

      // 当房间状态变为 finished 时，延迟5秒后从列表中移除
      if (oldRoom.status !== 'finished' && newRoom.status === 'finished') {
        const roomId = newRoom.id.toString()
        setTimeout(() => {
          setRooms((prev) => prev.filter((r) => r.id.toString() !== roomId))
          processedRoomIds.current.delete(roomId)
        }, 5000)
      }
    })

    db.room_player.onInsert((_ctx: EventContext, player: RoomPlayer) => {
      const playerId = `${player.roomId}-${player.playerIdentity.toHexString()}`
      if (processedPlayerIds.current.has(playerId)) return
      processedPlayerIds.current.add(playerId)
      setPlayers((prev) => [...prev, player])
    })

    db.room_player.onDelete((_ctx: EventContext, player: RoomPlayer) => {
      const playerId = `${player.roomId}-${player.playerIdentity.toHexString()}`
      processedPlayerIds.current.delete(playerId)
      setPlayers((prev) =>
        prev.filter(
          (p) => `${p.roomId}-${p.playerIdentity.toHexString()}` !== playerId
        )
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

    conn.subscriptionBuilder()
      .onApplied(() => {
        const initialRooms = Array.from(db.room.iter()) as unknown as Room[]
        const initialPlayers = Array.from(db.room_player.iter()) as unknown as RoomPlayer[]

        initialRooms.forEach((r) => processedRoomIds.current.add(r.id.toString()))
        initialPlayers.forEach((p) =>
          processedPlayerIds.current.add(`${p.roomId}-${p.playerIdentity.toHexString()}`)
        )

        setRooms(initialRooms)
        setPlayers(initialPlayers)
      })
      .subscribe(['SELECT * FROM room', 'SELECT * FROM room_player'])
  }, [conn])

  const getRoomPlayers = useCallback(
    (roomId: bigint) => {
      return players.filter((p) => p.roomId.toString() === roomId.toString())
    },
    [players]
  )

  const handleJoinRoom = useCallback(
    async (roomId: bigint) => {
      if (!conn) return

      setJoiningRoom(roomId)
      try {
        conn.reducers.joinRoom({ roomId })
      } catch (err) {
        onError(err instanceof Error ? err.message : '加入房间失败')
      } finally {
        setJoiningRoom(null)
      }
    },
    [conn, onError]
  )

  const waitingRooms = rooms.filter((r) => r.status === 'waiting')
  const ongoingRooms = rooms.filter((r) => r.status !== 'waiting' && r.status !== 'finished')

  if (waitingRooms.length === 0 && ongoingRooms.length === 0) {
    return (
      <div className={`text-center ${compact ? 'py-6' : 'py-12'}`}>
        <div className={`text-gray-400 ${compact ? 'text-base' : 'text-lg'} mb-2`}>暂无可用房间</div>
        <p className="text-gray-500 text-sm">点击"创建房间"开始新游戏</p>
      </div>
    )
  }

  return (
    <div className={`space-y-${compact ? '3' : '6'}`}>
      {/* 正在进行的游戏 */}
      {ongoingRooms.length > 0 && (
        <div>
          <h3 className={`text-gray-400 ${compact ? 'text-xs mb-2' : 'text-sm mb-3'} flex items-center gap-2`}>
            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
            正在进行的游戏
          </h3>
          <div className={`grid ${compact ? 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2' : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'}`}>
            {ongoingRooms.map((room) => {
              const roomPlayers = getRoomPlayers(room.id)
              const isAiRoom = room.isAiMode

              return (
                <div
                  key={room.id.toString()}
                  className={`bg-gray-800 ${compact ? 'rounded p-2' : 'rounded-lg p-4'} border ${
                    isAiRoom ? 'border-purple-600/50' : 'border-gray-700'
                  } opacity-90`}
                >
                  <div className={`flex justify-between items-start ${compact ? 'mb-2' : 'mb-3'}`}>
                    <div className="flex items-center gap-2">
                      <h3 className={`${compact ? 'text-sm' : 'text-lg'} font-medium text-white`}>{room.name}</h3>
                      {isAiRoom && (
                        <span className={`px-1.5 py-0.5 bg-purple-600/30 text-purple-300 ${compact ? 'text-xs' : 'text-xs'} rounded-full`}>
                          🤖
                        </span>
                      )}
                    </div>
                    <span className={`px-1.5 py-0.5 rounded text-xs bg-yellow-900/50 text-yellow-300`}>
                      {room.status === 'bidding' ? '叫分' : room.status === 'doubling' ? '加倍' : '游戏中'}
                    </span>
                  </div>

                  <div className={`${compact ? 'mb-2' : 'mb-4'}`}>
                    <p className={`text-gray-400 ${compact ? 'text-xs mb-1' : 'text-sm mb-2'}`}>玩家:</p>
                    <div className="flex flex-wrap gap-1">
                      {roomPlayers.map((p) => (
                        <span
                          key={`${p.roomId}-${p.playerIdentity.toHexString()}`}
                          className={`px-1.5 py-0.5 rounded ${compact ? 'text-xs' : 'text-sm'} ${
                            p.isAi
                              ? 'bg-purple-900/30 text-purple-300'
                              : 'bg-gray-700 text-gray-300'
                          }`}
                        >
                          {p.isAi && '🤖 '}
                          {p.playerName}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* 等待中的房间 */}
      {waitingRooms.length > 0 && (
        <div>
          <h3 className={`text-gray-400 ${compact ? 'text-xs mb-2' : 'text-sm mb-3'}`}>等待中的房间</h3>
          <div className={`grid ${compact ? 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2' : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'}`}>
            {waitingRooms.map((room) => {
              const roomPlayers = getRoomPlayers(room.id)
              const isFull = roomPlayers.length >= 3
              const isAiRoom = room.isAiMode

              return (
                <div
                  key={room.id.toString()}
                  className={`bg-gray-800 ${compact ? 'rounded p-2' : 'rounded-lg p-4'} border ${
                    isAiRoom ? 'border-purple-600/50' : 'border-gray-700'
                  }`}
                >
                  <div className={`flex justify-between items-start ${compact ? 'mb-2' : 'mb-3'}`}>
                    <div className="flex items-center gap-2">
                      <h3 className={`${compact ? 'text-sm' : 'text-lg'} font-medium text-white`}>{room.name}</h3>
                      {isAiRoom && (
                        <span className={`px-1.5 py-0.5 bg-purple-600/30 text-purple-300 ${compact ? 'text-xs' : 'text-xs'} rounded-full`}>
                          🤖
                        </span>
                      )}
                    </div>
                    <span
                      className={`px-1.5 py-0.5 rounded text-xs ${
                        isFull
                          ? 'bg-red-900/50 text-red-300'
                          : 'bg-green-900/50 text-green-300'
                      }`}
                    >
                      {roomPlayers.length}/3
                    </span>
                  </div>

                  <div className={`${compact ? 'mb-2' : 'mb-4'}`}>
                    <p className={`text-gray-400 ${compact ? 'text-xs mb-1' : 'text-sm mb-2'}`}>玩家:</p>
                    <div className="flex flex-wrap gap-1">
                      {roomPlayers.map((p) => (
                        <span
                          key={`${p.roomId}-${p.playerIdentity.toHexString()}`}
                          className={`px-1.5 py-0.5 rounded ${compact ? 'text-xs' : 'text-sm'} ${
                            p.isAi
                              ? 'bg-purple-900/30 text-purple-300'
                              : 'bg-gray-700 text-gray-300'
                          }`}
                        >
                          {p.isAi && '🤖 '}
                          {p.playerName}
                          {p.ready && (
                            <span className="ml-1 text-green-400">✓</span>
                          )}
                        </span>
                      ))}
                    </div>
                  </div>

                  <button
                    onClick={() => handleJoinRoom(room.id)}
                    disabled={isFull || joiningRoom !== null || (isAiRoom && roomPlayers.some(p => !p.isAi))}
                    className={`w-full ${compact ? 'py-1.5 text-xs' : 'py-2'} rounded-lg font-medium transition-colors ${
                      isFull || (isAiRoom && roomPlayers.some(p => !p.isAi))
                        ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                        : isAiRoom
                          ? 'bg-purple-600 hover:bg-purple-700 text-white'
                          : 'bg-blue-600 hover:bg-blue-700 text-white'
                    }`}
                  >
                    {joiningRoom === room.id
                      ? '加入中...'
                      : isAiRoom && roomPlayers.some(p => !p.isAi)
                        ? '游戏中'
                        : isFull
                          ? '已满'
                          : '加入'}
                  </button>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
