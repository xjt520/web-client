import { useEffect, useRef } from 'react'
import type { DbConnection } from '../lib/spacetime'

interface UseAiAutoActionProps {
  getConnection: () => DbConnection | null
  roomId: bigint | null
  isAiMode: boolean
  gameStatus: string
}

/** AI 思考延迟时间（毫秒） */
const AI_THINK_DELAY_MS = 5200

/**
 * AI自动行动Hook - 在人机模式下定时触发AI行动
 *
 * AI 会有约 5.2 秒的"思考时间"，让游戏体验更自然
 */
export function useAiAutoAction({
  getConnection,
  roomId,
  isAiMode,
  gameStatus,
}: UseAiAutoActionProps) {
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const lastActionTimeRef = useRef<number>(0)

  useEffect(() => {
    console.log('[AI Auto Action] Hook triggered:', { isAiMode, roomId: roomId?.toString(), gameStatus })

    // 清理之前的定时器
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
      timeoutRef.current = null
    }

    // 只在人机模式且游戏进行中时启动
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

    const triggerAction = () => {
      const currentConn = getConnection()
      if (!currentConn || !roomId) return

      currentConn.reducers.triggerAiAction({ roomId }).then(() => {
        console.log('[AI Auto Action] Triggered successfully')
        lastActionTimeRef.current = Date.now()
      }).catch((err) => {
        console.error('[AI Auto Action] 触发AI行动失败:', err)
      })
    }

    // 计算距离上次行动的时间，确保有足够的间隔
    const timeSinceLastAction = Date.now() - lastActionTimeRef.current
    const delay = Math.max(0, AI_THINK_DELAY_MS - timeSinceLastAction)

    // 延迟触发，让 AI 有"思考时间"
    timeoutRef.current = setTimeout(() => {
      triggerAction()
      // 之后每隔 AI_THINK_DELAY_MS 触发一次
      const intervalId = setInterval(triggerAction, AI_THINK_DELAY_MS)
      // 保存 interval ID 以便清理
      timeoutRef.current = intervalId as unknown as ReturnType<typeof setTimeout>
    }, delay)

    // 清理函数
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
        timeoutRef.current = null
      }
    }
  }, [getConnection, roomId, isAiMode, gameStatus])

  return null
}
