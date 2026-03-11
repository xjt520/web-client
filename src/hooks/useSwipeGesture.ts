import { useRef, useCallback } from 'react'

interface UseSwipeGestureProps {
  onSwipeLeft?: () => void
  onSwipeRight?: () => void
  threshold?: number
  enabled?: boolean
}

export function useSwipeGesture({
  onSwipeLeft,
  onSwipeRight,
  threshold = 100,
  enabled = true
}: UseSwipeGestureProps) {
  const touchStartRef = useRef<{ x: number; y: number; time: number } | null>(null)
  const isSwipingRef = useRef(false)

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (!enabled || e.touches.length !== 1) return

    // 检查是否在手牌区域（不拦截手牌区域的滑动）
    const target = e.target as HTMLElement
    if (target.closest('.fan-container') || target.closest('.action-toolbar')) {
      return
    }

    touchStartRef.current = {
      x: e.touches[0].clientX,
      y: e.touches[0].clientY,
      time: Date.now()
    }
    isSwipingRef.current = false
  }, [enabled])

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!enabled || !touchStartRef.current) return

    const touch = e.touches[0]
    const deltaX = touch.clientX - touchStartRef.current.x
    const deltaY = touch.clientY - touchStartRef.current.y

    // 检测是否是水平滑动
    if (Math.abs(deltaX) > 30 && Math.abs(deltaY) < Math.abs(deltaX) * 0.5) {
      isSwipingRef.current = true
    }
  }, [enabled])

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (!enabled || !touchStartRef.current || !isSwipingRef.current) return

    const touch = e.changedTouches[0]
    const deltaX = touch.clientX - touchStartRef.current.x
    const deltaTime = Date.now() - touchStartRef.current.time

    // 快速滑动检测
    if (Math.abs(deltaX) > threshold && deltaTime < 400) {
      if (deltaX > 0) {
        onSwipeRight?.()
      } else {
        onSwipeLeft?.()
      }
    }

    touchStartRef.current = null
    isSwipingRef.current = false
  }, [enabled, threshold, onSwipeLeft, onSwipeRight])

  return {
    onTouchStart: handleTouchStart,
    onTouchMove: handleTouchMove,
    onTouchEnd: handleTouchEnd
  }
}

// 长按检测 Hook
export function useLongPress(
  callback: () => void,
  { threshold = 500, enabled = true }: { threshold?: number; enabled?: boolean } = {}
) {
  const timerRef = useRef<ReturnType<typeof setTimeout>>()
  const isLongPressRef = useRef(false)

  const start = useCallback(() => {
    if (!enabled) return
    isLongPressRef.current = false
    timerRef.current = setTimeout(() => {
      isLongPressRef.current = true
      callback()
    }, threshold)
  }, [callback, threshold, enabled])

  const stop = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current)
    }
  }, [])

  const isLongPress = useCallback(() => isLongPressRef.current, [])

  return {
    onMouseDown: start,
    onMouseUp: stop,
    onMouseLeave: stop,
    onTouchStart: start,
    onTouchEnd: stop,
    isLongPress
  }
}
