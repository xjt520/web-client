import type { Timestamp } from 'spacetimedb'

interface TurnIndicatorProps {
  currentTurn: number
  myTurn: boolean
  turnStartTime?: bigint | Timestamp | null
}

/**
 * 回合指示器组件
 */
export function TurnIndicator({
  currentTurn: _currentTurn,
  myTurn,
  turnStartTime: _turnStartTime,
}: TurnIndicatorProps) {
  if (myTurn) {
    return (
      <div className="mt-4 flex flex-col items-center gap-2">
        <div className="px-4 py-2 bg-green-600 rounded-lg text-white font-medium animate-pulse">
          轮到您出牌！
        </div>
      </div>
    )
  }

  return (
    <div className="mt-4 flex flex-col items-center gap-2">
      <div className="px-4 py-2 bg-gray-700 rounded-lg text-gray-400">
        等待对手出牌...
      </div>
    </div>
  )
}
