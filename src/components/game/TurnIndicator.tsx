import { useTurnTimer, TURN_TIMEOUT_SECONDS } from '../../hooks/useTurnTimer'
import type { Timestamp } from 'spacetimedb'

interface TurnIndicatorProps {
  currentTurn: number
  myTurn: boolean
  turnStartTime?: bigint | Timestamp | null
}

/**
 * 回合指示器组件（带倒计时）
 */
export function TurnIndicator({
  currentTurn: _currentTurn,
  myTurn,
  turnStartTime,
}: TurnIndicatorProps) {
  const { remainingSeconds, progress } = useTurnTimer({
    turnStartTime,
    enabled: true,
  })

  // 计算进度条颜色
  const getProgressColor = () => {
    if (remainingSeconds <= 5) return 'bg-red-500'
    if (remainingSeconds <= 10) return 'bg-yellow-500'
    return 'bg-green-500'
  }

  // 计算文字颜色
  const getTextColor = () => {
    if (remainingSeconds <= 5) return 'text-red-400'
    if (remainingSeconds <= 10) return 'text-yellow-400'
    return 'text-white'
  }

  if (myTurn) {
    return (
      <div className="mt-4 flex flex-col items-center gap-2">
        <div className="px-4 py-2 bg-green-600 rounded-lg text-white font-medium animate-pulse">
          轮到您出牌！
        </div>
        <div className="w-48">
          <div className="flex justify-between items-center mb-1">
            <span className={`text-sm font-medium ${getTextColor()}`}>
              剩余时间
            </span>
            <span className={`text-sm font-bold ${getTextColor()}`}>
              {remainingSeconds}s
            </span>
          </div>
          <div className="w-full h-2 bg-gray-700 rounded-full overflow-hidden">
            <div
              className={`h-full ${getProgressColor()} transition-all duration-200`}
              style={{ width: `${progress * 100}%` }}
            />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="mt-4 flex flex-col items-center gap-2">
      <div className="px-4 py-2 bg-gray-700 rounded-lg text-gray-400">
        等待对手出牌...
      </div>
      <div className="w-48">
        <div className="flex justify-between items-center mb-1">
          <span className="text-sm text-gray-500">对手剩余时间</span>
          <span className={`text-sm font-medium ${getTextColor()}`}>
            {remainingSeconds}s
          </span>
        </div>
        <div className="w-full h-2 bg-gray-700 rounded-full overflow-hidden">
          <div
            className={`h-full ${getProgressColor()} transition-all duration-200`}
            style={{ width: `${progress * 100}%` }}
          />
        </div>
      </div>
    </div>
  )
}

export { TURN_TIMEOUT_SECONDS }
