import { useMemo, useRef } from 'react'
import { CardDisplay } from './CardDisplay'
import { sortCards } from '../../lib/gameUtils'

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

  // 拖拽状态
  const isMouseDownRef = useRef(false)
  const dragStartIndexRef = useRef<number | null>(null)
  const hasDraggedRef = useRef(false)

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

      const radius = 280
      const x = Math.sin(radians) * radius
      const y = (1 - Math.cos(radians)) * radius * 0.3

      return {
        transform: `translate(${x}px, ${y}px) rotate(${angle}deg)`,
        zIndex: index,
      }
    })
  }, [sortedCards, startAngle, angleStep])

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

  return (
    <div className="flex flex-col items-center">
      <div className="mb-2 text-gray-400 text-sm">
        {isLandlord && <span className="text-yellow-400 mr-2">👑 地主</span>}
        剩余 {cardsArray.length} 张牌
      </div>

      {/* 扇形手牌容器 */}
      <div
        className="relative fan-container"
        style={{
          width: `${Math.min(cardCount * 35 + 100, 700)}px`,
          height: '120px',
          marginTop: '-20px',
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
                onMouseDown={() => handleMouseDown(index)}
                onMouseEnter={() => handleMouseEnter(index)}
                onMouseUp={() => handleMouseUp(card)}
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
