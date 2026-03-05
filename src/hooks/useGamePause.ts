import { useState, useEffect, useRef } from 'react'
import type { DbConnection } from '../lib/spacetime'
import type { RoomPause } from '../module_bindings/types'
import type { EventContext } from '../module_bindings'

interface GamePauseState {
  isPaused: boolean
  pausedBy: string | null
  pausedAt: number | null
  pauseRemaining: number
}

const MAX_PAUSE_DURATION = 60 // 秒

export function useGamePause(
  roomId: bigint | null,
  getConnection: () => DbConnection | null
): GamePauseState {
  const [isPaused, setIsPaused] = useState(false)
  const [pausedBy, setPausedBy] = useState<string | null>(null)
  const [pausedAt, setPausedAt] = useState<number | null>(null)
  const [pauseRemaining, setPauseRemaining] = useState(0)

  const processedPauseIds = useRef<Set<string>>(new Set())

  const conn = getConnection()

  // 监听暂停状态
  useEffect(() => {
    if (!conn || !roomId) {
      setIsPaused(false)
      setPausedBy(null)
      setPausedAt(null)
      setPauseRemaining(0)
      return
    }

    const db = conn.db
    const roomIdStr = roomId.toString()

    db.room_pause.onInsert((_ctx: EventContext, pause: RoomPause) => {
      if (pause.roomId.toString() === roomIdStr) {
        processedPauseIds.current.add(roomIdStr)
        setIsPaused(true)
        setPausedBy(pause.pausedBy.toHexString())
        setPausedAt(Number(pause.pausedAt.microsSinceUnixEpoch) / 1000)
      }
    })

    db.room_pause.onDelete((_ctx: EventContext, pause: RoomPause) => {
      if (pause.roomId.toString() === roomIdStr) {
        processedPauseIds.current.delete(roomIdStr)
        setIsPaused(false)
        setPausedBy(null)
        setPausedAt(null)
        setPauseRemaining(0)
      }
    })

    conn.subscriptionBuilder()
      .onApplied(() => {
        const pauses = Array.from(db.room_pause.iter()) as unknown as RoomPause[]
        const roomPause = pauses.find(p => p.roomId.toString() === roomIdStr)
        if (roomPause) {
          processedPauseIds.current.add(roomIdStr)
          setIsPaused(true)
          setPausedBy(roomPause.pausedBy.toHexString())
          setPausedAt(Number(roomPause.pausedAt.microsSinceUnixEpoch) / 1000)
        } else {
          setIsPaused(false)
          setPausedBy(null)
          setPausedAt(null)
        }
      })
      .subscribe([
        'SELECT * FROM room_pause',
      ])
  }, [conn, roomId])

  // 计算剩余时间
  useEffect(() => {
    if (!isPaused || !pausedAt) {
      setPauseRemaining(0)
      return
    }

    const updateRemaining = () => {
      const now = Date.now()
      const elapsed = Math.floor((now - pausedAt) / 1000)
      const remaining = Math.max(0, MAX_PAUSE_DURATION - elapsed)
      setPauseRemaining(remaining)

      // 如果时间到了，游戏应该自动恢复
      if (remaining <= 0) {
        setIsPaused(false)
        setPausedBy(null)
        setPausedAt(null)
      }
    }

    updateRemaining()
    const interval = setInterval(updateRemaining, 1000)

    return () => clearInterval(interval)
  }, [isPaused, pausedAt])

  return {
    isPaused,
    pausedBy,
    pausedAt,
    pauseRemaining,
  }
}
