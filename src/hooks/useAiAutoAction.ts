import { useEffect, useRef } from 'react'
import type { DbConnection } from '../lib/spacetime'

interface UseAiAutoActionProps {
  getConnection: () => DbConnection | null
  roomId: bigint | null
  isAiMode: boolean
  gameStatus: string
}

/**
 * AI自动行动Hook - 在人机模式下定时触发AI行动
 *
 * 每200ms检查一次，如果当前房间是人机模式且游戏正在进行中，
 * 则调用 trigger_ai_action reducer 来让AI自动行动
 */
export function useAiAutoAction({
  getConnection,
  roomId,
  isAiMode,
  gameStatus,
}: UseAiAutoActionProps) {
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    console.log('[AI Auto Action] Hook triggered:', { isAiMode, roomId: roomId?.toString(), gameStatus })

    // 清理之前的定时器
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }

    // 只在人机模式且游戏进行中时启动定时器
    if (!isAiMode || !roomId || gameStatus === 'waiting' || gameStatus === 'finished') {
      console.log('[AI Auto Action] Skipping - not AI mode or waiting/finished status')
      return
    }

    const conn = getConnection()
    if (!conn) {
      console.log('[AI Auto Action] No connection')
      return
    }

    console.log('[AI Auto Action] Starting AI action trigger for status:', gameStatus)

    // 立即触发一次
    conn.reducers.triggerAiAction({ roomId }).then(() => {
      console.log('[AI Auto Action] Triggered successfully')
    }).catch((err) => {
      console.error('[AI Auto Action] 触发AI行动失败:', err)
    })

    // 设置定时器，每200ms触发一次
    intervalRef.current = setInterval(() => {
      const currentConn = getConnection()
      if (!currentConn || !roomId) return

      currentConn.reducers.triggerAiAction({ roomId }).catch((err) => {
        console.error('[AI Auto Action] 触发AI行动失败:', err)
      })
    }, 200)

    // 清理函数
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }
  }, [getConnection, roomId, isAiMode, gameStatus])

  return null
}
