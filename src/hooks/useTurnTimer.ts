import { useState, useEffect, useRef } from 'react'
import type { Timestamp } from 'spacetimedb'

const TURN_TIMEOUT_SECONDS = 25

/**
 * 将 SpacetimeDB Timestamp 转换为毫秒时间戳
 */
function timestampToMs(timestamp: Timestamp | bigint): number {
  const micros = typeof timestamp === 'bigint'
    ? Number(timestamp)
    : Number(timestamp.microsSinceUnixEpoch ?? timestamp)
  return micros / 1000
}

/**
 * 获取当前时间的毫秒时间戳
 */
function getCurrentTimeMs(): number {
  return Date.now()
}

interface UseTurnTimerOptions {
  turnStartTime: bigint | Timestamp | null | undefined
  enabled?: boolean
  onTimeout?: () => void
}

interface UseTurnTimerReturn {
  remainingSeconds: number
  isTimeout: boolean
  progress: number
}

/**
 * 回合倒计时 Hook
 */
export function useTurnTimer({
  turnStartTime,
  enabled = true,
  onTimeout,
}: UseTurnTimerOptions): UseTurnTimerReturn {
  const [remainingSeconds, setRemainingSeconds] = useState(TURN_TIMEOUT_SECONDS)
  const [isTimeout, setIsTimeout] = useState(false)
  const onTimeoutRef = useRef(onTimeout)

  // 保持 onTimeout 最新
  useEffect(() => {
    onTimeoutRef.current = onTimeout
  }, [onTimeout])

  useEffect(() => {
    if (!enabled || !turnStartTime) {
      setRemainingSeconds(TURN_TIMEOUT_SECONDS)
      setIsTimeout(false)
      return
    }

    const startTimeMs = timestampToMs(turnStartTime)

    const updateTimer = () => {
      const now = getCurrentTimeMs()
      const elapsed = (now - startTimeMs) / 1000
      const remaining = Math.max(0, TURN_TIMEOUT_SECONDS - elapsed)

      setRemainingSeconds(Math.ceil(remaining))

      if (remaining <= 0 && !isTimeout) {
        setIsTimeout(true)
        onTimeoutRef.current?.()
      }
    }

    // 立即更新一次
    updateTimer()

    // 每 100ms 更新一次
    const interval = setInterval(updateTimer, 100)

    return () => clearInterval(interval)
  }, [turnStartTime, enabled, isTimeout])

  const progress = remainingSeconds / TURN_TIMEOUT_SECONDS

  return { remainingSeconds, isTimeout, progress }
}

export { TURN_TIMEOUT_SECONDS }
