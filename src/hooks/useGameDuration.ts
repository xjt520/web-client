import { useState, useEffect } from 'react'
import type { Timestamp } from 'spacetimedb'

/**
 * 将 SpacetimeDB Timestamp 转换为毫秒时间戳
 */
function timestampToMs(timestamp: Timestamp | bigint): number {
  const micros = typeof timestamp === 'bigint'
    ? Number(timestamp)
    : Number((timestamp as Timestamp).microsSinceUnixEpoch ?? timestamp)
  return micros / 1000
}

/**
 * 计算游戏时长的 Hook
 * @param startTime 游戏开始时间（Timestamp）
 * @param enabled 是否启用计时
 */
export function useGameDuration(startTime: Timestamp | bigint | null, enabled: boolean = true): number {
  const [duration, setDuration] = useState(0)

  useEffect(() => {
    if (!enabled || !startTime) {
      setDuration(0)
      return
    }

    const startMs = timestampToMs(startTime)

    const updateDuration = () => {
      const now = Date.now()
      const elapsed = Math.floor((now - startMs) / 1000)
      setDuration(Math.max(0, elapsed))
    }

    updateDuration()
    const interval = setInterval(updateDuration, 1000)

    return () => clearInterval(interval)
  }, [startTime, enabled])

  return duration
}

/**
 * 格式化游戏时长为 mm:ss 格式
 */
export function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins.toString().padStart(2, '00')}:${secs.toString().padStart(2, '00')}`
}

/**
 * 获取游戏状态的中文描述
 */
export function getGameStatusText(status: string): string {
  switch (status) {
    case 'waiting':
      return '等待中'
    case 'bidding':
      return '叫分阶段'
    case 'doubling':
      return '加倍阶段'
    case 'playing':
      return '出牌阶段'
    case 'finished':
      return '已结束'
    default:
      return status
  }
}
