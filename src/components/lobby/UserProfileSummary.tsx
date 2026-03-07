import { calculateLevel, getLevelColor, formatScore } from '../../lib/levelUtils'
import type { UserProfile, User } from '../../module_bindings/types'

interface UserProfileSummaryProps {
  profile: UserProfile | null
  user: User | null
  onClick?: () => void
  compact?: boolean
}

export function UserProfileSummary({ profile, user, onClick, compact = false }: UserProfileSummaryProps) {
  if (!user) return null

  const avatarEmoji = profile?.avatarEmoji || '😀'
  const levelInfo = calculateLevel(user.score)

  if (compact) {
    return (
      <button
        onClick={onClick}
        className="flex items-center gap-2 bg-gray-800/80 hover:bg-gray-700/80 px-2 py-1 rounded-lg transition-colors"
      >
        <div className="w-8 h-8 bg-gray-700 rounded-full flex items-center justify-center text-lg">
          {avatarEmoji}
        </div>
        <div className="text-left">
          <div className="flex items-center gap-1.5">
            <span className="text-white text-sm font-medium">{user.name}</span>
            <span className={`text-xs font-bold ${getLevelColor(levelInfo.level)}`}>
              Lv.{levelInfo.level}
            </span>
          </div>
          <div className="text-xs text-gray-400">
            {formatScore(user.score)}分
          </div>
        </div>
      </button>
    )
  }

  return (
    <button
      onClick={onClick}
      className="flex items-center gap-3 bg-gray-800/80 hover:bg-gray-700/80 px-4 py-2 rounded-xl transition-colors"
    >
      {/* 头像 */}
      <div className="w-12 h-12 bg-gray-700 rounded-full flex items-center justify-center text-2xl">
        {avatarEmoji}
      </div>

      {/* 用户信息 */}
      <div className="text-left">
        <div className="flex items-center gap-2">
          <span className="text-white font-medium">{user.name}</span>
          <span className={`text-xs font-bold ${getLevelColor(levelInfo.level)}`}>
            Lv.{levelInfo.level}
          </span>
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-400">
          <span>积分: {formatScore(user.score)}</span>
          <span className="text-gray-600">|</span>
          <span>胜率: {user.totalGames > 0 ? Math.round((user.wins / user.totalGames) * 100) : 0}%</span>
        </div>
      </div>

      {/* 箭头 */}
      <svg
        className="w-5 h-5 text-gray-500"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
      </svg>
    </button>
  )
}
