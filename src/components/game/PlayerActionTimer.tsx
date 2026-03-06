import { useTurnTimer, TURN_TIMEOUT_SECONDS } from '../../hooks/useTurnTimer'
import type { Timestamp } from 'spacetimedb'

export type ActionType = 'bidding' | 'doubling' | 'playing'

interface PlayerActionTimerProps {
  turnStartTime?: bigint | Timestamp | null
  actionType: ActionType
  isMyTurn: boolean
}

/**
 * 获取操作类型对应的文字
 */
function getActionText(actionType: ActionType): string {
  switch (actionType) {
    case 'bidding':
      return '等待叫分'
    case 'doubling':
      return '等待加倍'
    case 'playing':
      return '等待出牌'
    default:
      return '等待操作'
  }
}

/**
 * 获取操作类型对应的图标
 */
function getActionIcon(actionType: ActionType): string {
  switch (actionType) {
    case 'bidding':
      return '📢'
    case 'doubling':
      return '⚡'
    case 'playing':
      return '🃏'
    default:
      return '⏳'
  }
}

/**
 * 玩家操作倒计时组件
 * 显示在玩家位置旁边，提示当前需要哪个玩家做什么操作
 */
export function PlayerActionTimer({
  turnStartTime,
  actionType,
  isMyTurn,
}: PlayerActionTimerProps) {
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

  // 计算边框颜色
  const getBorderColor = () => {
    if (remainingSeconds <= 5) return 'border-red-500'
    if (remainingSeconds <= 10) return 'border-yellow-500'
    return 'border-green-500'
  }

  // 计算背景颜色
  const getBgColor = () => {
    if (remainingSeconds <= 5) return 'bg-red-900/50'
    if (remainingSeconds <= 10) return 'bg-yellow-900/50'
    return 'bg-green-900/50'
  }

  // 计算文字颜色
  const getTextColor = () => {
    if (remainingSeconds <= 5) return 'text-red-300'
    if (remainingSeconds <= 10) return 'text-yellow-300'
    return 'text-green-300'
  }

  const isUrgent = remainingSeconds <= 5

  return (
    <div
      className={`
        flex items-center gap-2 px-3 py-2 rounded-lg border-2
        ${getBgColor()} ${getBorderColor()}
        ${isUrgent ? 'animate-pulse' : ''}
        shadow-lg
      `}
    >
      {/* 闹钟图标 */}
      <div className="flex items-center">
        <span className={`text-lg ${isUrgent ? 'animate-bounce' : ''}`}>
          ⏰
        </span>
      </div>

      {/* 操作图标和文字 */}
      <div className="flex items-center gap-1.5">
        <span className="text-base">{getActionIcon(actionType)}</span>
        <span className={`text-sm font-medium ${getTextColor()}`}>
          {isMyTurn ? '请' : ''}{getActionText(actionType)}
          {isMyTurn ? '' : '...'}
        </span>
      </div>

      {/* 倒计时进度条 */}
      <div className="w-16 h-1.5 bg-gray-700 rounded-full overflow-hidden">
        <div
          className={`h-full ${getProgressColor()} transition-all duration-200`}
          style={{ width: `${progress * 100}%` }}
        />
      </div>
    </div>
  )
}

export { TURN_TIMEOUT_SECONDS }
