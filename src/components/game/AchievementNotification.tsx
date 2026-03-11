import { useEffect, useState } from 'react'
import { Badge, BADGES } from '../../hooks/useAchievements'
import './AchievementNotification.css'

interface AchievementNotificationProps {
  badge: Badge
  onClose: () => void
}

export function AchievementNotification({ badge, onClose }: AchievementNotificationProps) {
  const [phase, setPhase] = useState<'enter' | 'show' | 'exit'>('enter')

  useEffect(() => {
    const enterTimer = setTimeout(() => setPhase('show'), 300)
    const showTimer = setTimeout(() => setPhase('exit'), 3000)
    const exitTimer = setTimeout(() => onClose(), 3800)

    return () => {
      clearTimeout(enterTimer)
      clearTimeout(showTimer)
      clearTimeout(exitTimer)
    }
  }, [onClose])

  return (
    <div className={`achievement-notification ${phase}`}>
      <div className="achievement-glow" style={{ backgroundColor: badge.color }} />

      <div className="achievement-content">
        <div className="achievement-header">
          <span className="achievement-label">🏆 成就解锁</span>
        </div>

        <div className="achievement-badge" style={{ borderColor: badge.color }}>
          <span className="badge-icon">{badge.icon}</span>
        </div>

        <div className="achievement-info">
          <div className="badge-name" style={{ color: badge.color }}>
            {badge.name}
          </div>
          <div className="badge-description">
            {badge.description}
          </div>
        </div>
      </div>

      <div className="achievement-particles">
        {Array.from({ length: 12 }).map((_, i) => (
          <div
            key={i}
            className="achievement-particle"
            style={{
              '--delay': `${Math.random() * 0.5}s`,
              '--x': `${(Math.random() - 0.5) * 200}px`,
              '--y': `${-50 - Math.random() * 100}px`,
              backgroundColor: badge.color
            } as React.CSSProperties}
          />
        ))}
      </div>
    </div>
  )
}

interface AchievementListProps {
  unlockedBadges: string[]
  progress: Record<string, number>
  onClose: () => void
}

export function AchievementList({ unlockedBadges, progress, onClose }: AchievementListProps) {
  return (
    <div className="achievement-list-overlay" onClick={onClose}>
      <div className="achievement-list" onClick={e => e.stopPropagation()}>
        <div className="achievement-list-header">
          <h2>🏆 成就系统</h2>
          <button className="close-btn" onClick={onClose}>✕</button>
        </div>

        <div className="achievement-grid">
          {BADGES.map(badge => {
            const isUnlocked = unlockedBadges.includes(badge.id)
            const progressValue = badge.progressKey ? progress[badge.progressKey] || 0 : badge.requirement
            const progressPercent = Math.min(100, (progressValue / badge.requirement) * 100)

            return (
              <div
                key={badge.id}
                className={`achievement-card ${isUnlocked ? 'unlocked' : 'locked'}`}
                style={{ '--badge-color': badge.color } as React.CSSProperties}
              >
                <div className="card-icon">
                  <span className={isUnlocked ? '' : 'grayscale opacity-50'}>
                    {badge.icon}
                  </span>
                </div>

                <div className="card-info">
                  <div className="card-name" style={{ color: isUnlocked ? badge.color : '#666' }}>
                    {badge.name}
                  </div>
                  <div className="card-desc">{badge.description}</div>

                  {!isUnlocked && badge.progressKey && (
                    <div className="card-progress">
                      <div className="progress-bar">
                        <div
                          className="progress-fill"
                          style={{
                            width: `${progressPercent}%`,
                            backgroundColor: badge.color
                          }}
                        />
                      </div>
                      <span className="progress-text">
                        {progressValue}/{badge.requirement}
                      </span>
                    </div>
                  )}

                  {isUnlocked && (
                    <div className="unlocked-badge" style={{ color: badge.color }}>
                      ✓ 已解锁
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
