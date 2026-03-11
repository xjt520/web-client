import { useState, useEffect, useRef, useMemo } from 'react'
import type { Timestamp } from 'spacetimedb'

const TURN_TIMEOUT_SECONDS = 60

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

/**
 * 倒计时阶段
 */
export type TimerPhase = 'calm' | 'breathing' | 'urgent' | 'timeout'

interface UseTurnTimerOptions {
  turnStartTime: bigint | Timestamp | null | undefined
  enabled?: boolean
  onTimeout?: () => void
  onPhaseChange?: (phase: TimerPhase) => void
}

interface UseTurnTimerReturn {
  remainingSeconds: number
  isTimeout: boolean
  progress: number
  phase: TimerPhase
  /** 是否需要播放心跳音 */
  shouldPlayHeartbeat: boolean
  /** 心跳频率 (ms) */
  heartbeatInterval: number
  /** 是否需要卡牌抖动 */
  shouldShakeCards: boolean
}

/**
 * 根据剩余时间计算阶段
 */
function calculatePhase(remainingSeconds: number): TimerPhase {
  if (remainingSeconds <= 0) return 'timeout'
  if (remainingSeconds <= 15) return 'urgent'
  if (remainingSeconds <= 30) return 'breathing'
  return 'calm'
}

/**
 * 回合倒计时 Hook
 */
export function useTurnTimer({
  turnStartTime,
  enabled = true,
  onTimeout,
  onPhaseChange,
}: UseTurnTimerOptions): UseTurnTimerReturn {
  const [remainingSeconds, setRemainingSeconds] = useState(TURN_TIMEOUT_SECONDS)
  const [isTimeout, setIsTimeout] = useState(false)
  const onTimeoutRef = useRef(onTimeout)
  const onPhaseChangeRef = useRef(onPhaseChange)
  const lastPhaseRef = useRef<TimerPhase | null>(null)

  // 保持 callbacks 最新
  useEffect(() => {
    onTimeoutRef.current = onTimeout
  }, [onTimeout])

  useEffect(() => {
    onPhaseChangeRef.current = onPhaseChange
  }, [onPhaseChange])

  useEffect(() => {
    if (!enabled || !turnStartTime) {
      setRemainingSeconds(TURN_TIMEOUT_SECONDS)
      setIsTimeout(false)
      lastPhaseRef.current = null
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

  // 计算当前阶段
  const phase = useMemo(() => calculatePhase(remainingSeconds), [remainingSeconds])

  // 阶段变化回调
  useEffect(() => {
    if (phase !== lastPhaseRef.current) {
      lastPhaseRef.current = phase
      onPhaseChangeRef.current?.(phase)
    }
  }, [phase])

  const progress = remainingSeconds / TURN_TIMEOUT_SECONDS

  // 心跳音配置
  const shouldPlayHeartbeat = phase === 'breathing' || phase === 'urgent'
  const heartbeatInterval = useMemo(() => {
    if (phase === 'urgent') {
      // 紧急状态：根据剩余时间动态调整，越快越急
      return Math.max(150, remainingSeconds * 30)
    }
    if (phase === 'breathing') {
      return 600 // 呼吸态：较慢的心跳
    }
    return 0
  }, [phase, remainingSeconds])

  // 卡牌抖动
  const shouldShakeCards = phase === 'urgent'

  return {
    remainingSeconds,
    isTimeout,
    progress,
    phase,
    shouldPlayHeartbeat,
    heartbeatInterval,
    shouldShakeCards,
  }
}

export { TURN_TIMEOUT_SECONDS }
