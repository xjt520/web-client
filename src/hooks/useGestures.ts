import { useCallback, useEffect, useRef, useState } from 'react'

interface GestureHandlers {
  onSwipeLeft?: () => void
  onSwipeRight?: () => void
  onPinchZoom?: (scale: number) => void
  onShake?: () => void
}

interface UseGesturesOptions {
  swipeThreshold?: number
  pinchThreshold?: number
  shakeThreshold?: number
  enableShake?: boolean
}

const SWIPE_THRESHOLD = 80
const PINCH_THRESHOLD = 0.1
const SHAKE_THRESHOLD = 25

export function useGestures(
  handlers: GestureHandlers,
  options: UseGesturesOptions = {}
) {
  const {
    swipeThreshold = SWIPE_THRESHOLD,
    pinchThreshold = PINCH_THRESHOLD,
    shakeThreshold = SHAKE_THRESHOLD,
    enableShake = false
  } = options

  const touchStartRef = useRef<{ x: number; y: number; time: number } | null>(null)
  const lastPinchDistanceRef = useRef<number | null>(null)
  const lastAccelerationRef = useRef<{ x: number; y: number; z: number } | null>(null)
  const shakeCountRef = useRef(0)
  const shakeTimeoutRef = useRef<ReturnType<typeof setTimeout>>()

  // 处理滑动手势
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      touchStartRef.current = {
        x: e.touches[0].clientX,
        y: e.touches[0].clientY,
        time: Date.now()
      }
    } else if (e.touches.length === 2) {
      // 双指捏合开始
      const dx = e.touches[0].clientX - e.touches[1].clientX
      const dy = e.touches[0].clientY - e.touches[1].clientY
      lastPinchDistanceRef.current = Math.hypot(dx, dy)
    }
  }, [])

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    // 双指捏合缩放
    if (e.touches.length === 2 && lastPinchDistanceRef.current !== null) {
      const dx = e.touches[0].clientX - e.touches[1].clientX
      const dy = e.touches[0].clientY - e.touches[1].clientY
      const currentDistance = Math.hypot(dx, dy)
      const scale = currentDistance / lastPinchDistanceRef.current

      if (Math.abs(scale - 1) > pinchThreshold) {
        handlers.onPinchZoom?.(scale)
        lastPinchDistanceRef.current = currentDistance
      }
    }
  }, [handlers, pinchThreshold])

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 0 && touchStartRef.current) {
      const touch = e.changedTouches[0]
      const deltaX = touch.clientX - touchStartRef.current.x
      const deltaY = touch.clientY - touchStartRef.current.y
      const deltaTime = Date.now() - touchStartRef.current.time

      // 检测水平滑动（快速滑动）
      if (
        Math.abs(deltaX) > swipeThreshold &&
        Math.abs(deltaY) < Math.abs(deltaX) * 0.5 &&
        deltaTime < 500
      ) {
        if (deltaX > 0) {
          handlers.onSwipeRight?.()
        } else {
          handlers.onSwipeLeft?.()
        }
      }

      touchStartRef.current = null
    }

    if (e.touches.length < 2) {
      lastPinchDistanceRef.current = null
    }
  }, [handlers, swipeThreshold])

  // 摇晃检测
  useEffect(() => {
    if (!enableShake || !handlers.onShake) return

    const handleDeviceMotion = (e: DeviceMotionEvent) => {
      const acceleration = e.accelerationIncludingGravity
      if (!acceleration) return

      const { x, y, z } = acceleration
      if (x === null || y === null || z === null) return

      if (lastAccelerationRef.current) {
        const deltaX = Math.abs(x - lastAccelerationRef.current.x)
        const deltaY = Math.abs(y - lastAccelerationRef.current.y)
        const deltaZ = Math.abs(z - lastAccelerationRef.current.z)

        if (deltaX + deltaY + deltaZ > shakeThreshold) {
          shakeCountRef.current++

          // 在短时间内检测到足够的摇晃
          if (shakeCountRef.current >= 3) {
            handlers.onShake?.()
            shakeCountRef.current = 0

            // 防止连续触发
            if (shakeTimeoutRef.current) {
              clearTimeout(shakeTimeoutRef.current)
            }
            shakeTimeoutRef.current = setTimeout(() => {
              shakeCountRef.current = 0
            }, 1000)
          }
        }
      }

      lastAccelerationRef.current = { x, y, z }
    }

    // 请求传感器权限（iOS 13+）
    if (typeof DeviceMotionEvent !== 'undefined' &&
        typeof (DeviceMotionEvent as any).requestPermission === 'function') {
      (DeviceMotionEvent as any).requestPermission()
        .then((permission: string) => {
          if (permission === 'granted') {
            window.addEventListener('devicemotion', handleDeviceMotion)
          }
        })
        .catch(() => {
          // 权限被拒绝
        })
    } else {
      window.addEventListener('devicemotion', handleDeviceMotion)
    }

    return () => {
      window.removeEventListener('devicemotion', handleDeviceMotion)
      if (shakeTimeoutRef.current) {
        clearTimeout(shakeTimeoutRef.current)
      }
    }
  }, [enableShake, handlers, shakeThreshold])

  return {
    onTouchStart: handleTouchStart,
    onTouchMove: handleTouchMove,
    onTouchEnd: handleTouchEnd
  }
}

// 卡牌缩放 Hook
export function useCardScale(initialScale: number = 1) {
  const [scale, setScale] = useState(() => {
    const saved = localStorage.getItem('doudizhu_card_scale')
    return saved ? parseFloat(saved) : initialScale
  })

  const updateScale = useCallback((newScale: number) => {
    const clampedScale = Math.max(0.6, Math.min(1.5, newScale))
    setScale(clampedScale)
    localStorage.setItem('doudizhu_card_scale', clampedScale.toString())
  }, [])

  const handlePinchZoom = useCallback((zoomDelta: number) => {
    setScale(prev => {
      const newScale = Math.max(0.6, Math.min(1.5, prev * zoomDelta))
      localStorage.setItem('doudizhu_card_scale', newScale.toString())
      return newScale
    })
  }, [])

  return { scale, updateScale, handlePinchZoom }
}
