import { useMemo, useRef } from 'react'
import { CardDisplay } from './CardDisplay'
import { sortCards } from '../../lib/gameUtils'
import { useScreenOrientation } from '../../hooks/useScreenOrientation'

interface PlayerHandProps {
  cards: Uint8Array
  isLandlord: boolean
  selectedCards: Set<number>
  onToggleCard: (card: number) => void
  isSelected: (card: number) => boolean
  onDragSelect?: (cards: number[]) => void
}

export function PlayerHand({
  cards,
  isLandlord,
  onToggleCard,
  isSelected,
  onDragSelect,
}: PlayerHandProps) {
  const cardsArray = Array.from(cards)
  const sortedCards = sortCards(cardsArray)
  const { isMobileLandscape, isMobileLandscapeSm } = useScreenOrientation()

  // 拖拽状态
  const isMouseDownRef = useRef(false)
  const dragStartIndexRef = useRef<number | null>(null)
  const hasDraggedRef = useRef(false)
  const touchStartPosRef = useRef<{ x: number; y: number } | null>(null)

  // 响应式扇形参数
  const fanConfig = useMemo(() => {
    if (isMobileLandscapeSm) {
      return {
        radius: 140,
        maxHeight: 50,
        containerWidth: Math.min(sortedCards.length * 20 + 60, 400),
        marginTop: -10,
      }
    }
    if (isMobileLandscape) {
      return {
        radius: 160,
        maxHeight: 60,
        containerWidth: Math.min(sortedCards.length * 25 + 80, 500),
        marginTop: -10,
      }
    }
    return {
      radius: 280,
      maxHeight: 120,
      containerWidth: Math.min(sortedCards.length * 35 + 100, 700),
      marginTop: -20,
    }
  }, [isMobileLandscape, isMobileLandscapeSm, sortedCards.length])

  // 计算扇形参数
  const cardCount = sortedCards.length
  const fanAngle = useMemo(() => {
    return Math.min(cardCount * 3.5, 120)
  }, [cardCount])

  const startAngle = -fanAngle / 2
  const angleStep = cardCount > 1 ? fanAngle / (cardCount - 1) : 0

  // 计算每张卡的位置和旋转角度
  const cardStyles = useMemo(() => {
    return sortedCards.map((_, index) => {
      const angle = startAngle + index * angleStep
      const radians = (angle * Math.PI) / 180

      const x = Math.sin(radians) * fanConfig.radius
      const y = (1 - Math.cos(radians)) * fanConfig.radius * 0.3

      return {
        transform: `translate(${x}px, ${y}px) rotate(${angle}deg)`,
        zIndex: index,
      }
    })
  }, [sortedCards, startAngle, angleStep, fanConfig.radius])

  // 鼠标按下
  const handleMouseDown = (index: number) => {
    isMouseDownRef.current = true
    dragStartIndexRef.current = index
    hasDraggedRef.current = false
  }

  // 鼠标进入（拖拽过程中）
  const handleMouseEnter = (index: number) => {
    if (!isMouseDownRef.current || dragStartIndexRef.current === null) return

    const startIndex = dragStartIndexRef.current
    if (index !== startIndex) {
      hasDraggedRef.current = true
      const minIndex = Math.min(startIndex, index)
      const maxIndex = Math.max(startIndex, index)

      // 选中新范围的牌
      const newSelection: number[] = []
      for (let i = minIndex; i <= maxIndex; i++) {
        newSelection.push(sortedCards[i])
      }

      if (onDragSelect) {
        onDragSelect(newSelection)
      }
    }
  }

  // 鼠标松开
  const handleMouseUp = (card: number) => {
    if (!hasDraggedRef.current) {
      // 没有拖拽，执行单击切换
      onToggleCard(card)
    }
    isMouseDownRef.current = false
    dragStartIndexRef.current = null
  }

  // 触摸开始
  const handleTouchStart = (index: number, e: React.TouchEvent) => {
    const touch = e.touches[0]
    touchStartPosRef.current = { x: touch.clientX, y: touch.clientY }
    dragStartIndexRef.current = index
    hasDraggedRef.current = false
  }

  // 触摸移动
  const handleTouchMove = (e: React.TouchEvent) => {
    if (touchStartPosRef.current === null || dragStartIndexRef.current === null) return

    const touch = e.touches[0]
    const element = document.elementFromPoint(touch.clientX, touch.clientY)

    if (element) {
      const cardElement = element.closest('[data-card-index]')
      if (cardElement) {
        const currentIndex = parseInt(cardElement.getAttribute('data-card-index') || '0')
        const startIndex = dragStartIndexRef.current

        if (currentIndex !== startIndex) {
          hasDraggedRef.current = true
          const minIndex = Math.min(startIndex, currentIndex)
          const maxIndex = Math.max(startIndex, currentIndex)

          const newSelection: number[] = []
          for (let i = minIndex; i <= maxIndex; i++) {
            newSelection.push(sortedCards[i])
          }

          if (onDragSelect) {
            onDragSelect(newSelection)
          }
        }
      }
    }
  }

  // 触摸结束
  const handleTouchEnd = (card: number) => {
    if (!hasDraggedRef.current) {
      onToggleCard(card)
    }
    touchStartPosRef.current = null
    dragStartIndexRef.current = null
  }

  return (
    <div className="flex flex-col items-center">
      <div className={`mb-2 text-gray-400 ${isMobileLandscape ? 'text-xs' : 'text-sm'}`}>
        {isLandlord && <span className="text-yellow-400 mr-2">👑 地主</span>}
        剩余 {cardsArray.length} 张牌
      </div>

      {/* 扇形手牌容器 */}
      <div
        className="relative fan-container"
        style={{
          width: `${fanConfig.containerWidth}px`,
          height: `${fanConfig.maxHeight}px`,
          marginTop: `${fanConfig.marginTop}px`,
        }}
      >
        {sortedCards.map((card, index) => {
          const style = cardStyles[index]
          const selected = isSelected(card)

          return (
            <div
              key={`${card}-${index}`}
              className={`fan-card-wrapper ${selected ? 'fan-card-wrapper-selected' : ''}`}
              style={{
                ...style,
                zIndex: index,
              }}
            >
              <div
                className={`fan-card ${selected ? 'fan-card-selected' : ''}`}
                data-card-index={index}
                onMouseDown={() => handleMouseDown(index)}
                onMouseEnter={() => handleMouseEnter(index)}
                onMouseUp={() => handleMouseUp(card)}
                onTouchStart={(e) => handleTouchStart(index, e)}
                onTouchMove={handleTouchMove}
                onTouchEnd={() => handleTouchEnd(card)}
              >
                <CardDisplay
                  card={card}
                  selected={selected}
                />
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
