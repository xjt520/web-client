import { calculateLevel, getLevelColor, getLevelProgressColor } from '../../lib/levelUtils'

interface LevelDisplayProps {
  score: number | bigint
  showTitle?: boolean
  showProgress?: boolean
}

export function LevelDisplay({ score, showTitle = true, showProgress = false }: LevelDisplayProps) {
  const levelInfo = calculateLevel(score)

  return (
    <div className="w-full">
      <div className="flex items-center gap-2 mb-1">
        <span className={`text-lg font-bold ${getLevelColor(levelInfo.level)}`}>
          Lv.{levelInfo.level}
        </span>
        {showTitle && (
          <span className="text-gray-400 text-sm">{levelInfo.title}</span>
        )}
      </div>
      {showProgress && (
        <div className="w-full h-2 bg-gray-700 rounded-full overflow-hidden">
          <div
            className={`h-full bg-gradient-to-r ${getLevelProgressColor(levelInfo.level)} rounded-full transition-all duration-300`}
            style={{ width: `${levelInfo.progress}%` }}
          />
        </div>
      )}
    </div>
  )
}
