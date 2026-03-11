import { useTurnTimer, TURN_TIMEOUT_SECONDS, type TimerPhase } from '../../hooks/useTurnTimer'
import { useScreenOrientation } from '../../hooks/useScreenOrientation'
import type { Timestamp } from 'spacetimedb'
import './PhasedTimer.css'

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
 * 获取阶段对应的样式类名
 */
function getPhaseClassName(phase: TimerPhase): string {
  switch (phase) {
    case 'calm':
      return 'timer-calm'
    case 'breathing':
      return 'timer-breathing'
    case 'urgent':
      return 'timer-urgent'
    case 'timeout':
      return 'timer-timeout'
    default:
      return ''
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
  const { isMobileLandscape, isCompactScreen } = useScreenOrientation()
  const isCompact = isMobileLandscape || isCompactScreen

  const { remainingSeconds, progress, phase } = useTurnTimer({
    turnStartTime,
    enabled: true,
  })

  const phaseClassName = getPhaseClassName(phase)
  const isUrgent = phase === 'urgent'
  const isFinal = remainingSeconds <= 5 && remainingSeconds > 0

  return (
    <div
      className={`
        flex items-center gap-1.5 rounded-lg border-2
        ${isCompact ? 'px-2 py-1' : 'px-3 py-2'}
        ${phaseClassName}
        shadow-lg transition-all duration-300
      `}
    >
      {/* 闹钟图标 */}
      <div className="flex items-center timer-icon">
        <span className={isCompact ? 'text-base' : 'text-lg'}>
          ⏰
        </span>
      </div>

      {/* 操作图标和文字 */}
      <div className="flex items-center gap-1">
        <span className={isCompact ? 'text-sm' : 'text-base'}>{getActionIcon(actionType)}</span>
        <span className={`font-medium ${isCompact ? 'text-xs' : 'text-sm'} timer-text`}>
          {isMyTurn ? '请' : ''}{getActionText(actionType)}
          {isMyTurn ? '' : '...'}
        </span>
      </div>

      {/* 倒计时数字 */}
      <span
        className={`
          font-mono font-bold
          ${isCompact ? 'text-sm' : 'text-base'}
          timer-number
          ${isUrgent ? 'timer-number-urgent' : ''}
          ${isFinal ? 'timer-final-countdown' : ''}
        `}
      >
        {remainingSeconds}s
      </span>

      {/* 倒计时进度条 */}
      <div className={`${isCompact ? 'w-10 h-1.5' : 'w-16 h-2'} bg-gray-700/50 rounded-full overflow-hidden timer-progress-bar`}>
        <div
          className="h-full timer-progress transition-all duration-200"
          style={{ width: `${progress * 100}%` }}
        />
      </div>
    </div>
  )
}

export { TURN_TIMEOUT_SECONDS }
