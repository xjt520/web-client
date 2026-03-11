/**
 * 连胜与成就系统
 * 存储和追踪玩家的连胜记录和成就进度
 */

import { useState, useEffect, useCallback } from 'react'

const STORAGE_KEY = 'doudizhu_achievements'

export interface AchievementProgress {
  // 炸弹专家: 累计打出100个炸弹
  bombCount: number
  // 火箭达人: 累计打出50个火箭
  rocketCount: number
  // 春天大师: 累计获得20次春天
  springCount: number
  // 绝地反击: 剩余1张牌翻盘次数
  comebackCount: number
  // 速战速决: 30秒内获胜次数
  quickWinCount: number
}

export interface WinStreak {
  current: number
  best: number
  lastWinTime: number
}

export interface Achievements {
  progress: AchievementProgress
  streak: WinStreak
  unlockedBadges: string[]
  totalGames: number
  totalWins: number
}

export interface Badge {
  id: string
  name: string
  description: string
  icon: string
  requirement: number
  progressKey: keyof AchievementProgress | null
  color: string
}

export const BADGES: Badge[] = [
  {
    id: 'bomb_expert',
    name: '炸弹专家',
    description: '累计打出100个炸弹',
    icon: '💣',
    requirement: 100,
    progressKey: 'bombCount',
    color: '#f97316'
  },
  {
    id: 'rocket_master',
    name: '火箭达人',
    description: '累计打出50个火箭',
    icon: '🚀',
    requirement: 50,
    progressKey: 'rocketCount',
    color: '#ef4444'
  },
  {
    id: 'spring_master',
    name: '春天大师',
    description: '累计获得20次春天',
    icon: '🌸',
    requirement: 20,
    progressKey: 'springCount',
    color: '#ec4899'
  },
  {
    id: 'comeback_king',
    name: '绝地反击',
    description: '剩余1张牌翻盘5次',
    icon: '🔥',
    requirement: 5,
    progressKey: 'comebackCount',
    color: '#eab308'
  },
  {
    id: 'speed_demon',
    name: '速战速决',
    description: '30秒内获胜10次',
    icon: '⚡',
    requirement: 10,
    progressKey: 'quickWinCount',
    color: '#3b82f6'
  }
]

export const STREAK_TITLES: Record<number, { title: string; color: string; glow: string }> = {
  3: { title: '势如破竹', color: '#cd7f32', glow: 'rgba(205, 127, 50, 0.6)' },
  5: { title: '所向披靡', color: '#c0c0c0', glow: 'rgba(192, 192, 192, 0.6)' },
  7: { title: '天下无敌', color: '#ffd700', glow: 'rgba(255, 215, 0, 0.6)' },
  10: { title: '传奇王者', color: '#ff00ff', glow: 'rgba(255, 0, 255, 0.8)' }
}

const DEFAULT_ACHIEVEMENTS: Achievements = {
  progress: {
    bombCount: 0,
    rocketCount: 0,
    springCount: 0,
    comebackCount: 0,
    quickWinCount: 0
  },
  streak: {
    current: 0,
    best: 0,
    lastWinTime: 0
  },
  unlockedBadges: [],
  totalGames: 0,
  totalWins: 0
}

export function useAchievements() {
  const [achievements, setAchievements] = useState<Achievements>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      return saved ? { ...DEFAULT_ACHIEVEMENTS, ...JSON.parse(saved) } : DEFAULT_ACHIEVEMENTS
    } catch {
      return DEFAULT_ACHIEVEMENTS
    }
  })

  // 保存到 localStorage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(achievements))
  }, [achievements])

  // 记录游戏结果
  const recordGameResult = useCallback((
    isWinner: boolean,
    options: {
      bombCount?: number
      rocketCount?: number
      isSpring?: boolean
      remainingCards?: number
      gameDuration?: number
    } = {}
  ) => {
    const { bombCount = 0, rocketCount = 0, isSpring = false, remainingCards = 0, gameDuration = 0 } = options

    setAchievements(prev => {
      const newProgress = { ...prev.progress }
      const newUnlocked = [...prev.unlockedBadges]
      const newStreak = { ...prev.streak }
      const now = Date.now()

      // 更新统计
      newProgress.bombCount += bombCount
      newProgress.rocketCount += rocketCount
      if (isSpring && isWinner) {
        newProgress.springCount += 1
      }

      // 绝地反击: 剩余1张牌获胜
      if (isWinner && remainingCards === 1) {
        newProgress.comebackCount += 1
      }

      // 速战速决: 30秒内获胜
      if (isWinner && gameDuration > 0 && gameDuration <= 30) {
        newProgress.quickWinCount += 1
      }

      // 更新连胜
      if (isWinner) {
        newStreak.current += 1
        newStreak.lastWinTime = now
        if (newStreak.current > newStreak.best) {
          newStreak.best = newStreak.current
        }
      } else {
        newStreak.current = 0
      }

      // 检查成就解锁
      BADGES.forEach(badge => {
        if (badge.progressKey && !newUnlocked.includes(badge.id)) {
          const progress = newProgress[badge.progressKey]
          if (progress >= badge.requirement) {
            newUnlocked.push(badge.id)
          }
        }
      })

      return {
        progress: newProgress,
        streak: newStreak,
        unlockedBadges: newUnlocked,
        totalGames: prev.totalGames + 1,
        totalWins: prev.totalWins + (isWinner ? 1 : 0)
      }
    })
  }, [])

  // 获取当前连胜等级
  const getStreakLevel = useCallback((streak: number): number => {
    if (streak >= 10) return 10
    if (streak >= 7) return 7
    if (streak >= 5) return 5
    if (streak >= 3) return 3
    return 0
  }, [])

  // 获取连胜标题
  const getStreakTitle = useCallback((streak: number): { title: string; color: string; glow: string } | null => {
    const level = getStreakLevel(streak)
    return STREAK_TITLES[level] || null
  }, [getStreakLevel])

  // 获取徽章进度
  const getBadgeProgress = useCallback((badge: Badge): number => {
    if (!badge.progressKey) return 100
    return Math.min(100, (achievements.progress[badge.progressKey] / badge.requirement) * 100)
  }, [achievements.progress])

  // 检查新解锁的徽章
  const checkNewUnlocks = useCallback((prevUnlocked: string[]): Badge[] => {
    return BADGES.filter(badge =>
      !prevUnlocked.includes(badge.id) &&
      achievements.unlockedBadges.includes(badge.id)
    )
  }, [achievements.unlockedBadges])

  return {
    achievements,
    recordGameResult,
    getStreakLevel,
    getStreakTitle,
    getBadgeProgress,
    checkNewUnlocks,
    badges: BADGES,
    streakTitles: STREAK_TITLES
  }
}
