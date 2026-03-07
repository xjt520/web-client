import { PlayerActionTimer, ActionType } from './PlayerActionTimer'
import { useScreenOrientation } from '../../hooks/useScreenOrientation'
import type { Timestamp } from 'spacetimedb'

interface OpponentHandProps {
  playerName: string
  cardsCount: number
  isLandlord: boolean
  isTrusted?: boolean
  isCurrentTurn?: boolean
  actionType?: ActionType
  turnStartTime?: bigint | Timestamp | null
}

export function OpponentHand({
  playerName,
  cardsCount,
  isLandlord,
  isTrusted = false,
  isCurrentTurn = false,
  actionType,
  turnStartTime,
}: OpponentHandProps) {
  const { isMobileLandscape, isCompactScreen } = useScreenOrientation()

  // 紧凑布局模式
  const isCompact = isMobileLandscape || isCompactScreen

  // 只有当有有效的 turnStartTime 时才显示倒计时
  const showTimer = isCurrentTurn && actionType && turnStartTime !== null && turnStartTime !== undefined

  // 紧凑布局时显示的牌数更少
  const maxVisibleCards = isCompact ? 6 : 10
  const visibleCards = Math.min(cardsCount, maxVisibleCards)

  return (
    <div className={`flex flex-col items-center ${isCompact ? 'gap-1' : 'gap-2'}`}>
      {/* 操作倒计时提示 */}
      {showTimer && (
        <PlayerActionTimer
          turnStartTime={turnStartTime}
          actionType={actionType}
          isMyTurn={false}
        />
      )}

      {/* 玩家信息 */}
      <div className={`
        flex items-center gap-1.5 rounded-lg
        ${isCompact ? 'px-2 py-1' : 'px-3 py-1.5'}
        ${isCurrentTurn ? 'bg-yellow-900/30 border border-yellow-600/50' : 'bg-gray-800/50'}
        transition-all duration-300
      `}>
        <span className={`text-white font-medium ${isCompact ? 'text-xs' : 'text-sm'}`}>
          {playerName}
        </span>
        {isLandlord && <span className="text-yellow-400">👑</span>}
        {isTrusted && (
          <span className={`text-orange-400 bg-orange-900/50 rounded ${isCompact ? 'text-[10px] px-1 py-0.5' : 'text-xs px-1.5 py-0.5'}`}>
            托管
          </span>
        )}
        {isCurrentTurn && (
          <span className="text-green-400 animate-pulse">●</span>
        )}
      </div>

      {/* 手牌显示 */}
      <div className="flex gap-0.5">
        {Array.from({ length: visibleCards }).map((_, i) => (
          <div
            key={i}
            className={`
              rounded-sm border
              ${isCompact ? 'w-2.5 h-4' : 'w-4 h-6'}
              ${isCurrentTurn
                ? 'bg-gradient-to-br from-yellow-800 to-yellow-950 border-yellow-600'
                : 'bg-gradient-to-br from-blue-900 to-blue-950 border-blue-700'
              }
            `}
            style={{
              marginLeft: i > 0 ? (isCompact ? '-5px' : '-8px') : '0',
            }}
          />
        ))}
        {cardsCount > maxVisibleCards && (
          <span className={`text-gray-400 ml-1 self-end ${isCompact ? 'text-[10px]' : 'text-xs'}`}>
            +{cardsCount - maxVisibleCards}
          </span>
        )}
      </div>

      <div className={`text-gray-400 ${isCompact ? 'text-xs' : 'text-sm'}`}>
        {cardsCount} 张
      </div>
    </div>
  )
}
