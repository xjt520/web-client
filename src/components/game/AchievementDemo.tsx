import { useState } from 'react'
import { StreakEffect } from './StreakEffect'
import { AchievementNotification } from './AchievementNotification'
import { BADGES, type Badge, STREAK_TITLES } from '../../hooks/useAchievements'

interface DemoPanelProps {
  onTriggerStreak: (streak: number) => void
  onTriggerAchievement: (badge: Badge) => void
}

export function DemoPanel({ onTriggerStreak, onTriggerAchievement }: DemoPanelProps) {
  const [isOpen, setIsOpen] = useState(false)

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-4 left-4 z-50 px-4 py-2 bg-purple-600 text-white rounded-lg shadow-lg hover:bg-purple-700 transition-colors"
      >
        🎮 演示面板
      </button>
    )
  }

  return (
    <div className="fixed bottom-4 left-4 z-50 bg-gray-900/95 border border-gray-700 rounded-xl p-4 shadow-2xl max-w-xs">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-white font-bold text-lg">🎮 演示面板</h3>
        <button
          onClick={() => setIsOpen(false)}
          className="text-gray-400 hover:text-white"
        >
          ✕
        </button>
      </div>

      {/* 连胜演示 */}
      <div className="mb-4">
        <h4 className="text-gray-300 text-sm font-medium mb-2">连胜特效</h4>
        <div className="grid grid-cols-2 gap-2">
          {Object.entries(STREAK_TITLES).map(([streak, info]) => (
            <button
              key={streak}
              onClick={() => onTriggerStreak(Number(streak))}
              className="px-3 py-2 rounded-lg text-sm font-medium transition-all hover:scale-105"
              style={{
                backgroundColor: `${info.color}20`,
                color: info.color,
                border: `1px solid ${info.color}50`
              }}
            >
              {streak}连胜: {info.title}
            </button>
          ))}
        </div>
      </div>

      {/* 成就演示 */}
      <div>
        <h4 className="text-gray-300 text-sm font-medium mb-2">成就徽章</h4>
        <div className="space-y-2">
          {BADGES.map(badge => (
            <button
              key={badge.id}
              onClick={() => onTriggerAchievement(badge)}
              className="w-full px-3 py-2 rounded-lg text-sm font-medium transition-all hover:scale-102 flex items-center gap-2"
              style={{
                backgroundColor: `${badge.color}20`,
                color: badge.color,
                border: `1px solid ${badge.color}50`
              }}
            >
              <span className="text-lg">{badge.icon}</span>
              <span>{badge.name}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

// 独立的演示页面组件
export function AchievementDemo() {
  const [showStreak, setShowStreak] = useState(false)
  const [currentStreak, setCurrentStreak] = useState(0)
  const [showAchievement, setShowAchievement] = useState(false)
  const [currentBadge, setCurrentBadge] = useState<Badge | null>(null)

  const handleTriggerStreak = (streak: number) => {
    setCurrentStreak(streak)
    setShowStreak(true)
  }

  const handleTriggerAchievement = (badge: Badge) => {
    setCurrentBadge(badge)
    setShowAchievement(true)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900">
      <div className="flex items-center justify-center min-h-screen">
        <h1 className="text-4xl text-white font-bold">🏆 连胜与成就演示</h1>
      </div>

      <DemoPanel
        onTriggerStreak={handleTriggerStreak}
        onTriggerAchievement={handleTriggerAchievement}
      />

      {showStreak && (
        <StreakEffect
          streak={currentStreak}
          onComplete={() => setShowStreak(false)}
        />
      )}

      {showAchievement && currentBadge && (
        <AchievementNotification
          badge={currentBadge}
          onClose={() => setShowAchievement(false)}
        />
      )}
    </div>
  )
}
