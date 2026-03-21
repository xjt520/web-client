import { useCallback, useRef, useState, useEffect, useMemo } from 'react'
import { PlayerActionTimer, ActionType } from './PlayerActionTimer'
import { useScreenOrientation } from '../../hooks/useScreenOrientation'
import { sortCards } from '../../lib/gameUtils'
import { CardDisplay } from './CardDisplay'
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
  isFinished?: boolean
  revealedCards?: number[]
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
  isFinished = false,
  revealedCards,
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

  // 排序后的明牌
  const sortedRevealedCards = useMemo(() => {
    if (!revealedCards) return []
    return sortCards([...revealedCards])
  }, [revealedCards])

  // 扇形参数（游戏结束时使用，比手牌区小一些）
  const fanConfig = useMemo(() => {
    const cardCount = sortedRevealedCards.length
    if (cardCount === 0) return { radius: 0, maxHeight: 0, containerWidth: 0 }

    if (isCompact) {
      return {
        radius: 180,
        maxHeight: 110,
        containerWidth: Math.min(cardCount * 32 + 60, 480),
      }
    }
    return {
      radius: 240,
      maxHeight: 140,
      containerWidth: Math.min(cardCount * 40 + 75, 650),
    }
  }, [sortedRevealedCards.length, isCompact])

  // 计算扇形角度
  const cardCount = sortedRevealedCards.length
  const useFlatLayout = cardCount < 5 && cardCount > 0

  const fanAngle = useMemo(() => {
    return Math.min(cardCount * 4, 120)
  }, [cardCount])

  const startAngle = -fanAngle / 2
  const angleStep = cardCount > 1 ? fanAngle / (cardCount - 1) : 0

  // 计算每张卡的位置和旋转角度
  const cardStyles = useMemo(() => {
    if (useFlatLayout) {
      // 平铺布局：无旋转，水平排列
      return sortedRevealedCards.map((_, index) => {
        return {
          transform: `translateX(${(index - (cardCount - 1) / 2) * 25}px)`,
          zIndex: index,
        }
      })
    }
    // 扇形布局
    return sortedRevealedCards.map((_, index) => {
      const angle = startAngle + index * angleStep
      const radians = (angle * Math.PI) / 180

      const x = Math.sin(radians) * fanConfig.radius
      const y = 30 + (1 - Math.cos(radians)) * fanConfig.radius * 0.2

      return {
        transform: `translate(${x}px, ${y}px) rotate(${angle}deg)`,
        zIndex: index,
      }
    })
  }, [sortedRevealedCards, startAngle, angleStep, fanConfig.radius, useFlatLayout, cardCount])

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

      {/* 手牌展示区域 */}
      <div className={`${isFinished && sortedRevealedCards.length > 0 ? (isCompact ? 'h-32' : 'h-40') : ''}`}>
        <div className="flex justify-center">
          {/* 游戏结束时显示明牌 */}
          {isFinished && sortedRevealedCards.length > 0 ? (
            useFlatLayout ? (
              // 平铺布局（小于5张牌）
              <div className="flex gap-1 justify-center mt-6">
                {sortedRevealedCards.map((card, index) => (
                  <div key={`${card}-${index}`}>
                    <div className={`${isCompact ? 'scale-[1.125]' : 'scale-[1.275]'} origin-bottom`}>
                      <CardDisplay card={card} selected={false} />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              // 扇形布局（5张及以上）
              <div
                className="relative"
                style={{
                  width: `${fanConfig.containerWidth}px`,
                  height: `${fanConfig.maxHeight}px`,
                }}
              >
                {sortedRevealedCards.map((card, index) => {
                  const style = cardStyles[index]
                  return (
                    <div
                      key={`${card}-${index}`}
                      className="absolute left-1/2 -translate-x-1/2 origin-bottom"
                      style={{
                        ...style,
                        zIndex: index,
                      }}
                    >
                      <div className={`${isCompact ? 'scale-[1.125]' : 'scale-[1.275]'} origin-bottom`}>
                        <CardDisplay card={card} selected={false} />
                      </div>
                    </div>
                  )
                })}
              </div>
            )
          ) : (
            <div className="flex gap-0.5 flex-wrap justify-center max-w-[200px]">
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
          )}
        </div>
      </div>

      <div className={`text-gray-400 ${isCompact ? 'text-xs' : 'text-sm'} ${showCardWarning ? 'text-red-400 font-bold animate-pulse' : ''}`}>
        {cardsCount} 张
        {showCardWarning && <span className="ml-1">⚠️</span>}
      </div>
    </div>
  )
}
