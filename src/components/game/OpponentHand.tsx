import { useCallback, useRef, useState, useEffect } from 'react'
import { PlayerActionTimer, ActionType } from './PlayerActionTimer'
import { useScreenOrientation } from '../../hooks/useScreenOrientation'
import type { Timestamp } from 'spacetimedb'
import './OpponentHand.css'

interface OpponentHandProps {
  playerName: string
  cardsCount: number
  isLandlord: boolean
  isTrusted?: boolean
  isCurrentTurn?: boolean
  actionType?: ActionType
  turnStartTime?: bigint | Timestamp | null
  onLongPress?: () => void
  chatMessage?: { id: string; type: 'emoji' | 'text'; content: string } | null
}

export function OpponentHand({
  playerName,
  cardsCount,
  isLandlord,
  isTrusted = false,
  isCurrentTurn = false,
  actionType,
  turnStartTime,
  onLongPress,
  chatMessage,
}: OpponentHandProps) {
  const { isMobileLandscape, isCompactScreen } = useScreenOrientation()
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [isPressing, setIsPressing] = useState(false)

  const isCompact = isMobileLandscape || isCompactScreen
  const showTimer = isCurrentTurn && actionType && turnStartTime !== null && turnStartTime !== undefined
  const maxVisibleCards = isCompact ? 6 : 10
  const visibleCards = Math.min(cardsCount, maxVisibleCards)
  
  // 牌数预警（1-2张时显示）
  const showCardWarning = cardsCount <= 2 && cardsCount > 0

  const handlePressStart = useCallback(() => {
    if (!onLongPress) return
    setIsPressing(true)
    longPressTimerRef.current = setTimeout(() => {
      onLongPress()
      setIsPressing(false)
    }, 500)
  }, [onLongPress])

  const handlePressEnd = useCallback(() => {
    setIsPressing(false)
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current)
      longPressTimerRef.current = null
    }
  }, [])

  useEffect(() => {
    return () => {
      if (longPressTimerRef.current) {
        clearTimeout(longPressTimerRef.current)
      }
    }
  }, [])

  return (
    <div className={`flex flex-col items-center ${isCompact ? 'gap-1' : 'gap-2'}`}>
      {showTimer && (
        <PlayerActionTimer
          turnStartTime={turnStartTime}
          actionType={actionType}
          isMyTurn={false}
        />
      )}

      {chatMessage && (
        <div className="chat-bubble-floating" key={chatMessage.id}>
          {chatMessage.type === 'emoji' ? (
            <span className="text-2xl animate-bounce">{chatMessage.content}</span>
          ) : (
            <span className="text-xs text-white bg-black/70 px-2 py-1 rounded-lg max-w-32 text-center break-words">
              {chatMessage.content}
            </span>
          )}
        </div>
      )}

      <div
        className={`
          flex items-center gap-1.5 rounded-lg select-none
          ${isCompact ? 'px-2 py-1' : 'px-3 py-1.5'}
          ${isCurrentTurn ? 'bg-yellow-900/30 border border-yellow-600/50' : 'bg-gray-800/50'}
          ${isPressing ? 'scale-105 bg-gray-700/60' : ''}
          ${onLongPress ? 'cursor-pointer active:scale-95' : ''}
          transition-all duration-150
        `}
        onMouseDown={handlePressStart}
        onMouseUp={handlePressEnd}
        onMouseLeave={handlePressEnd}
        onTouchStart={handlePressStart}
        onTouchEnd={handlePressEnd}
        onTouchCancel={handlePressEnd}
      >
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

      <div className={`text-gray-400 ${isCompact ? 'text-xs' : 'text-sm'} ${showCardWarning ? 'text-red-400 font-bold animate-pulse' : ''}`}>
        {cardsCount} 张
        {showCardWarning && <span className="ml-1">⚠️</span>}
      </div>
    </div>
  )
}
