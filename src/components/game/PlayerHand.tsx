import { useMemo, useRef } from 'react'
import { CardDisplay } from './CardDisplay'
import { sortCards } from '../../lib/gameUtils'
import { useScreenOrientation } from '../../hooks/useScreenOrientation'

interface PlayerHandProps {
  cards: Uint8Array
  isLandlord?: boolean
  selectedCards: Set<number>
  onToggleCard: (card: number) => void
  isSelected: (card: number) => boolean
  onDragSelect?: (cards: number[]) => void
}

export function PlayerHand({
  cards,
  onToggleCard,
  isSelected,
  onDragSelect,
}: PlayerHandProps) {
  const cardsArray = Array.from(cards)
  const sortedCards = sortCards(cardsArray)
  const { isMobileLandscape, isMobileLandscapeSm, isSmallScreen, isCompactScreen } = useScreenOrientation()

  // 拖拽状态
  const isMouseDownRef = useRef(false)
  const dragStartIndexRef = useRef<number | null>(null)
  const hasDraggedRef = useRef(false)
  const touchStartPosRef = useRef<{ x: number; y: number; time: number } | null>(null)

  // 触摸检测阈值（基于全网最佳实践）
  const TAP_DISTANCE_THRESHOLD = 10  // 10像素距离阈值
  const TAP_TIME_THRESHOLD = 300     // 300ms时间阈值

  // 响应式扇形参数
  const fanConfig = useMemo(() => {
    if (isMobileLandscapeSm) {
      return {
        radius: 160,
        maxHeight: 65,
        containerWidth: Math.min(sortedCards.length * 24 + 70, 420),
        marginTop: -10,
        textClass: 'text-xs',
      }
    }
    if (isMobileLandscape) {
      return {
        radius: 180,
        maxHeight: 75,
        containerWidth: Math.min(sortedCards.length * 28 + 90, 520),
        marginTop: -10,
        textClass: 'text-xs',
      }
    }
    if (isCompactScreen) {
      return {
        radius: 220,
        maxHeight: 95,
        containerWidth: Math.min(sortedCards.length * 32 + 100, 600),
        marginTop: -12,
        textClass: 'text-sm',
      }
    }
    if (isSmallScreen) {
      return {
        radius: 260,
        maxHeight: 110,
        containerWidth: Math.min(sortedCards.length * 36 + 110, 680),
        marginTop: -15,
        textClass: 'text-sm',
      }
    }
    return {
      radius: 400,
      maxHeight: 170,
      containerWidth: Math.min(sortedCards.length * 50 + 130, 850),
      marginTop: -25,
      textClass: 'text-sm',
    }
  }, [isMobileLandscape, isMobileLandscapeSm, isSmallScreen, isCompactScreen, sortedCards.length])

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
    console.log('[TouchStart] cardIndex:', index, 'card:', sortedCards[index])
    touchStartPosRef.current = {
      x: touch.clientX,
      y: touch.clientY,
      time: Date.now()
    }
    dragStartIndexRef.current = index
    hasDraggedRef.current = false
  }

  // 触摸移动
  const handleTouchMove = (e: React.TouchEvent) => {
    if (touchStartPosRef.current === null || dragStartIndexRef.current === null) return

    const touch = e.touches[0]

    // 先计算移动距离，只有超过阈值才认为是拖拽意图
    const distance = Math.hypot(
      touch.clientX - touchStartPosRef.current.x,
      touch.clientY - touchStartPosRef.current.y
    )

    // 如果移动距离小于阈值，不处理（避免误判为拖拽）
    if (distance < TAP_DISTANCE_THRESHOLD) {
      console.log('[TouchMove] distance too small:', distance.toFixed(1), '<', TAP_DISTANCE_THRESHOLD)
      return
    }

    console.log('[TouchMove] distance OK:', distance.toFixed(1), 'checking drag...')
    const element = document.elementFromPoint(touch.clientX, touch.clientY)

    if (element) {
      const cardElement = element.closest('[data-card-index]')
      if (cardElement) {
        const currentIndex = parseInt(cardElement.getAttribute('data-card-index') || '0')
        const startIndex = dragStartIndexRef.current

        console.log('[TouchMove] currentIndex:', currentIndex, 'startIndex:', startIndex)

        if (currentIndex !== startIndex) {
          console.log('[TouchMove] DRAG DETECTED!')
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
      } else {
        console.log('[TouchMove] no card element found')
      }
    } else {
      console.log('[TouchMove] no element at point')
    }
  }

  // 触摸结束 - 综合距离和时间判断是否为点击
  const handleTouchEnd = (card: number, e: React.TouchEvent) => {
    console.log('[TouchEnd] card:', card, 'hasDragged:', hasDraggedRef.current)

    // 阻止后续的鼠标事件（防止 touchend + mouseup 重复触发）
    e.preventDefault()

    // 如果已经明确拖拽了多张牌，不做处理
    if (hasDraggedRef.current) {
      console.log('[TouchEnd] skipped - was drag')
      touchStartPosRef.current = null
      dragStartIndexRef.current = null
      return
    }

    // 没有触发拖拽，执行点击
    if (touchStartPosRef.current) {
      const touch = e.changedTouches[0]
      const distance = Math.hypot(
        touch.clientX - touchStartPosRef.current.x,
        touch.clientY - touchStartPosRef.current.y
      )
      const duration = Date.now() - touchStartPosRef.current.time

      console.log('[TouchEnd] distance:', distance.toFixed(1), 'duration:', duration)
      console.log('[TouchEnd] thresholds - distance <', TAP_DISTANCE_THRESHOLD, '|| duration <', TAP_TIME_THRESHOLD)

      // 放宽条件：移动距离 < 阈值 或 时间 < 阈值 都算点击（更宽容的检测）
      if (distance < TAP_DISTANCE_THRESHOLD || duration < TAP_TIME_THRESHOLD) {
        console.log('[TouchEnd] ✅ TAP! calling onToggleCard')
        onToggleCard(card)
      } else {
        console.log('[TouchEnd] ❌ NOT a tap')
      }
    } else {
      console.log('[TouchEnd] no touchStartPos!')
    }

    touchStartPosRef.current = null
    dragStartIndexRef.current = null
  }

  return (
    <div className="flex flex-col items-center">
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
                onTouchEnd={(e) => handleTouchEnd(card, e)}
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
