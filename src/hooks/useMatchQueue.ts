import { useState, useEffect, useRef, useCallback } from 'react'
import type { DbConnection } from '../lib/spacetime'
import type { MatchQueue, RoomPlayer } from '../module_bindings/types'
import type { EventContext } from '../module_bindings'

interface MatchQueueState {
  isMatching: boolean
  matchTime: number
  matchedRoomId: bigint | null
  error: string | null
  joinQueue: () => Promise<void>
  leaveQueue: () => Promise<void>
}

const MATCH_TIMEOUT_SECONDS = 60

export function useMatchQueue(getConnection: () => DbConnection | null): MatchQueueState {
  const [isMatching, setIsMatching] = useState(false)
  const [matchTime, setMatchTime] = useState(0)
  const [matchedRoomId, setMatchedRoomId] = useState<bigint | null>(null)
  const [error, setError] = useState<string | null>(null)

  const matchStartTime = useRef<number | null>(null)
  const processedQueueIds = useRef<Set<string>>(new Set())

  const conn = getConnection()

  // 监听匹配队列变化
  useEffect(() => {
    if (!conn) return

    const db = conn.db

    // 监听自己是否被加入房间（匹配成功）
    db.room_player.onInsert((_ctx: EventContext, player: RoomPlayer) => {
      if (!conn.identity) return
      if (player.playerIdentity.toHexString() === conn.identity.toHexString()) {
        // 匹配成功，加入房间
        setIsMatching(false)
        setMatchTime(0)
        matchStartTime.current = null
        setMatchedRoomId(player.roomId)
      }
    })

    // 监听匹配队列
    db.match_queue.onInsert((_ctx: EventContext, queue: MatchQueue) => {
      const id = queue.identity.toHexString()
      processedQueueIds.current.add(id)
    })

    db.match_queue.onDelete((_ctx: EventContext, queue: MatchQueue) => {
      const id = queue.identity.toHexString()
      processedQueueIds.current.delete(id)

      // 如果自己被移除且没有匹配到房间，说明匹配失败
      if (conn.identity && id === conn.identity.toHexString() && isMatching) {
        setIsMatching(false)
        setMatchTime(0)
        matchStartTime.current = null
      }
    })

    conn.subscriptionBuilder()
      .onApplied(() => {
        const initialQueue = Array.from(db.match_queue.iter()) as unknown as MatchQueue[]
        initialQueue.forEach(q => processedQueueIds.current.add(q.identity.toHexString()))
      })
      .subscribe([
        'SELECT * FROM match_queue',
        'SELECT * FROM room_player',
      ])
  }, [conn, isMatching])

  // 倒计时和匹配检查
  useEffect(() => {
    if (!isMatching) {
      setMatchTime(0)
      return
    }

    matchStartTime.current = Date.now()

    const interval = setInterval(() => {
      if (!matchStartTime.current) return

      const elapsed = Math.floor((Date.now() - matchStartTime.current) / 1000)
      setMatchTime(elapsed)

      // 每1秒调用一次匹配检查
      if (conn) {
        try {
          conn.reducers.checkMatchQueue({})
        } catch (e) {
          // 忽略
        }
      }

      if (elapsed >= MATCH_TIMEOUT_SECONDS) {
        // 超时，自动离开队列
        setIsMatching(false)
        setMatchTime(0)
        matchStartTime.current = null
        setError('匹配超时，请重试')
        if (conn) {
          try {
            conn.reducers.leaveMatchQueue({})
          } catch (e) {
            // 忽略
          }
        }
      }
    }, 1000)

    return () => clearInterval(interval)
  }, [isMatching, conn])

  const joinQueue = useCallback(async () => {
    if (!conn) return

    setError(null)
    setMatchedRoomId(null)

    try {
      conn.reducers.joinMatchQueue({})
      setIsMatching(true)
      setMatchTime(0)
      matchStartTime.current = Date.now()
    } catch (err) {
      setError(err instanceof Error ? err.message : '加入匹配失败')
      setIsMatching(false)
    }
  }, [conn])

  const leaveQueue = useCallback(async () => {
    if (!conn) return

    try {
      conn.reducers.leaveMatchQueue({})
    } catch (err) {
      // 忽略
    } finally {
      setIsMatching(false)
      setMatchTime(0)
      matchStartTime.current = null
    }
  }, [conn])

  return {
    isMatching,
    matchTime,
    matchedRoomId,
    error,
    joinQueue,
    leaveQueue,
  }
}
