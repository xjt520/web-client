import { useMemo, useRef, useState } from 'react'
import { CardDisplay } from './CardDisplay'
import { sortCards } from '../../lib/gameUtils'
import { useScreenOrientation } from '../../hooks/useScreenOrientation'
import './PhasedTimer.css'

interface PlayerHandProps {
  cards: Uint8Array
  isLandlord?: boolean
  selectedCards: Set<number>
  onToggleCard: (card: number) => void
  isSelected: (card: number) => boolean
  onDragSelect?: (cards: number[]) => void
  /** 可出牌集合（用于高亮显示） */
  playableCards?: Set<number>
  /** 紧急状态卡牌抖动 */
  shouldShake?: boolean
}

const CARD_SCALE_KEY = 'doudizhu_card_scale'

export function PlayerHand({
  cards,
  onToggleCard,
  isSelected,
  onDragSelect,
  playableCards,
  shouldShake = false,
}: PlayerHandProps) {
  const cardsArray = Array.from(cards)
  const sortedCards = sortCards(cardsArray)
  const { isMobileLandscape, isMobileLandscapeSm, isSmallScreen, isCompactScreen } = useScreenOrientation()

  // 卡牌缩放状态
  const [cardScale, setCardScale] = useState(() => {
    const saved = localStorage.getItem(CARD_SCALE_KEY)
    return saved ? parseFloat(saved) : 1
  })

  // 拖拽状态
  const isMouseDownRef = useRef(false)
  const dragStartIndexRef = useRef<number | null>(null)
  const hasDraggedRef = useRef(false)
  const touchStartPosRef = useRef<{ x: number; y: number; time: number } | null>(null)

  // 双指缩放状态
  const lastPinchDistanceRef = useRef<number | null>(null)

  // 触摸检测阈值（基于全网最佳实践）
  const TAP_DISTANCE_THRESHOLD = 10  // 10像素距离阈值
  const TAP_TIME_THRESHOLD = 300     // 300ms时间阈值

  // 响应式扇形参数
  const fanConfig = useMemo(() => {
    if (isMobileLandscapeSm) {
      return {
        radius: 180,
        maxHeight: 90,
        containerWidth: Math.min(sortedCards.length * 32 + 60, 480),
        marginTop: -20,
        textClass: 'text-xs',
      }
    }
    if (isMobileLandscape) {
      return {
        radius: 180,
        maxHeight: 90,
        containerWidth: Math.min(sortedCards.length * 32 + 60, 480),
        marginTop: -20,
        textClass: 'text-xs',
      }
    }
    if (isCompactScreen) {
      return {
        radius: 180,
        maxHeight: 90,
        containerWidth: Math.min(sortedCards.length * 32 + 60, 480),
        marginTop: -25,
        textClass: 'text-sm',
      }
    }
    if (isSmallScreen) {
      return {
        radius: 240,
        maxHeight: 120,
        containerWidth: Math.min(sortedCards.length * 40 + 75, 650),
        marginTop: -30,
        textClass: 'text-sm',
      }
    }
    return {
      radius: 240,
      maxHeight: 120,
      containerWidth: Math.min(sortedCards.length * 40 + 75, 650),
      marginTop: -40,
      textClass: 'text-sm',
    }
  }, [isMobileLandscape, isMobileLandscapeSm, isSmallScreen, isCompactScreen, sortedCards.length])

  // 计算扇形参数
  const cardCount = sortedCards.length
  const fanAngle = useMemo(() => {
    return Math.min(cardCount * 4, 120)
  }, [cardCount])

  const startAngle = -fanAngle / 2
  const angleStep = cardCount > 1 ? fanAngle / (cardCount - 1) : 0

  // 计算每张卡的位置和旋转角度
  const cardStyles = useMemo(() => {
    return sortedCards.map((_, index) => {
      const angle = startAngle + index * angleStep
      const radians = (angle * Math.PI) / 180

      const x = Math.sin(radians) * fanConfig.radius
      const y = (1 - Math.cos(radians)) * fanConfig.radius * 0.12

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
    // 双指捏合开始
    if (e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX
      const dy = e.touches[0].clientY - e.touches[1].clientY
      lastPinchDistanceRef.current = Math.hypot(dx, dy)
      return
    }

    if (e.touches.length === 1) {
      const touch = e.touches[0]
      touchStartPosRef.current = {
        x: touch.clientX,
        y: touch.clientY,
        time: Date.now()
      }
      dragStartIndexRef.current = index
      hasDraggedRef.current = false
    }
  }

  // 触摸移动
  const handleTouchMove = (e: React.TouchEvent) => {
    // 双指捏合缩放
    if (e.touches.length === 2 && lastPinchDistanceRef.current !== null) {
      const dx = e.touches[0].clientX - e.touches[1].clientX
      const dy = e.touches[0].clientY - e.touches[1].clientY
      const currentDistance = Math.hypot(dx, dy)
      const scale = currentDistance / lastPinchDistanceRef.current

      if (Math.abs(scale - 1) > 0.05) {
        setCardScale(prev => {
          const newScale = Math.max(0.6, Math.min(1.4, prev * scale))
          localStorage.setItem(CARD_SCALE_KEY, newScale.toString())
          return newScale
        })
        lastPinchDistanceRef.current = currentDistance
      }
      return
    }

    if (touchStartPosRef.current === null || dragStartIndexRef.current === null) return

    const touch = e.touches[0]

    // 先计算移动距离，只有超过阈值才认为是拖拽意图
    const distance = Math.hypot(
      touch.clientX - touchStartPosRef.current.x,
      touch.clientY - touchStartPosRef.current.y
    )

    // 如果移动距离小于阈值，不处理（避免误判为拖拽）
    if (distance < TAP_DISTANCE_THRESHOLD) {
      return
    }

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

  // 触摸结束 - 综合距离和时间判断是否为点击
  const handleTouchEnd = (card: number, e: React.TouchEvent) => {
    // 阻止后续的鼠标事件（防止 touchend + mouseup 重复触发）
    e.preventDefault()

    // 重置双指缩放状态
    if (e.touches.length < 2) {
      lastPinchDistanceRef.current = null
    }

    // 如果已经明确拖拽了多张牌，不做处理
    if (hasDraggedRef.current) {
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

      // 放宽条件：移动距离 < 阈值 或 时间 < 阈值 都算点击（更宽容的检测）
      if (distance < TAP_DISTANCE_THRESHOLD || duration < TAP_TIME_THRESHOLD) {
        onToggleCard(card)
      }
    }

    touchStartPosRef.current = null
    dragStartIndexRef.current = null
  }

  return (
    <div className="flex flex-col items-center">
      {/* 扇形手牌容器 */}
      <div
        className={`relative fan-container ${shouldShake ? 'cards-shaking' : ''}`}
        style={{
          width: `${fanConfig.containerWidth}px`,
          height: `${fanConfig.maxHeight}px`,
          marginTop: `${fanConfig.marginTop}px`,
          transform: `scale(${cardScale})`,
          transformOrigin: 'bottom center',
          transition: 'transform 0.15s ease-out',
        }}
      >
        {sortedCards.map((card, index) => {
          const style = cardStyles[index]
          const selected = isSelected(card)
          const isPlayable = playableCards ? playableCards.has(card) : false

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
                className={`fan-card ${selected ? 'fan-card-selected' : ''} ${isPlayable && !selected ? 'fan-card-playable' : ''}`}
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
