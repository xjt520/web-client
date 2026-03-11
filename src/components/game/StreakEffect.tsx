import { useEffect, useState } from 'react'
import { STREAK_TITLES } from '../../hooks/useAchievements'
import './StreakEffect.css'

interface StreakEffectProps {
  streak: number
  onComplete: () => void
}

export function StreakEffect({ streak, onComplete }: StreakEffectProps) {
  const [phase, setPhase] = useState<'enter' | 'show' | 'exit'>('enter')
  const [showParticles, setShowParticles] = useState(false)

  const streakInfo = streak >= 10 ? STREAK_TITLES[10] :
                     streak >= 7 ? STREAK_TITLES[7] :
                     streak >= 5 ? STREAK_TITLES[5] :
                     streak >= 3 ? STREAK_TITLES[3] : null

  useEffect(() => {
    if (!streakInfo) {
      onComplete()
      return
    }

    // 进场动画
    const enterTimer = setTimeout(() => {
      setPhase('show')
      setShowParticles(true)
    }, 300)

    // 显示阶段
    const showTimer = setTimeout(() => {
      setPhase('exit')
    }, 2500)

    // 退出动画
    const exitTimer = setTimeout(() => {
      onComplete()
    }, 3200)

    return () => {
      clearTimeout(enterTimer)
      clearTimeout(showTimer)
      clearTimeout(exitTimer)
    }
  }, [streakInfo, onComplete])

  if (!streakInfo) return null

  const isRainbow = streak >= 10

  return (
    <div className={`streak-effect-overlay ${phase} ${isRainbow ? 'rainbow' : ''}`}>
      {/* 光环效果 */}
      <div
        className="streak-halo"
        style={{
          boxShadow: `0 0 60px ${streakInfo.glow}, 0 0 120px ${streakInfo.glow}`
        }}
      />

      {/* 连胜数字 */}
      <div className="streak-number" style={{ color: streakInfo.color }}>
        <span className="streak-number-bg">{streak}</span>
        <span className="streak-number-text">连胜</span>
      </div>

      {/* 称号 */}
      <div className="streak-title" style={{ color: streakInfo.color }}>
        {streakInfo.title}
      </div>

      {/* 粒子效果 */}
      {showParticles && (
        <div className="streak-particles">
          {Array.from({ length: 30 }).map((_, i) => (
            <div
              key={i}
              className="streak-particle"
              style={{
                '--delay': `${Math.random() * 0.5}s`,
                '--x': `${(Math.random() - 0.5) * 300}px`,
                '--y': `${(Math.random() - 0.5) * 300}px`,
                '--size': `${4 + Math.random() * 8}px`,
                backgroundColor: isRainbow
                  ? `hsl(${Math.random() * 360}, 80%, 60%)`
                  : streakInfo.color
              } as React.CSSProperties}
            />
          ))}
        </div>
      )}

      {/* 闪电效果（高连胜） */}
      {streak >= 7 && (
        <div className="streak-lightning">
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="lightning-bolt"
              style={{
                '--delay': `${i * 0.1}s`,
                '--rotation': `${-60 + i * 30}deg`
              } as React.CSSProperties}
            />
          ))}
        </div>
      )}

      {/* 10连胜全服公告 */}
      {streak >= 10 && (
        <div className="streak-announcement">
          <span className="announcement-icon">📢</span>
          <span className="announcement-text">全服公告</span>
        </div>
      )}
    </div>
  )
}
