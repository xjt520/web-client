import { useEffect, useState } from 'react'
import { useSwipeGesture } from '../../hooks/useSwipeGesture'

interface GestureHandlerProps {
  onQuickPass?: () => void
  onQuickPlay?: () => void
  onShake?: () => void
  canPass?: boolean
  canPlay?: boolean
  children: React.ReactNode
}

export function GestureHandler({
  onQuickPass,
  onQuickPlay,
  onShake,
  canPass = false,
  canPlay = false,
  children
}: GestureHandlerProps) {
  const [showGestureHint, setShowGestureHint] = useState<string | null>(null)

  const showHint = (hint: string) => {
    setShowGestureHint(hint)
    setTimeout(() => setShowGestureHint(null), 1500)
  }

  const handleSwipeLeft = () => {
    if (canPass && onQuickPass) {
      showHint('← 不出')
      onQuickPass()
    }
  }

  const handleSwipeRight = () => {
    if (canPlay && onQuickPlay) {
      showHint('出牌 →')
      onQuickPlay()
    }
  }

  const swipeHandlers = useSwipeGesture({
    onSwipeLeft: handleSwipeLeft,
    onSwipeRight: handleSwipeRight,
    threshold: 120,
    enabled: canPass || canPlay
  })

  useEffect(() => {
    if (!onShake) return

    let lastAcceleration = { x: 0, y: 0, z: 0 }
    let shakeCount = 0
    let lastShakeTime = 0

    const handleMotion = (e: DeviceMotionEvent) => {
      const acc = e.accelerationIncludingGravity
      if (!acc || acc.x === null || acc.y === null || acc.z === null) return

      const deltaX = Math.abs(acc.x - lastAcceleration.x)
      const deltaY = Math.abs(acc.y - lastAcceleration.y)
      const deltaZ = Math.abs(acc.z - lastAcceleration.z)

      if (deltaX + deltaY + deltaZ > 25) {
        const now = Date.now()
        if (now - lastShakeTime < 500) {
          shakeCount++
          if (shakeCount >= 2) {
            showHint('👋 表情')
            onShake()
            shakeCount = 0
          }
        } else {
          shakeCount = 1
        }
        lastShakeTime = now
      }

      lastAcceleration = { x: acc.x, y: acc.y, z: acc.z }
    }

    const requestPermission = async () => {
      if (typeof DeviceMotionEvent !== 'undefined' &&
          typeof (DeviceMotionEvent as any).requestPermission === 'function') {
        try {
          const permission = await (DeviceMotionEvent as any).requestPermission()
          if (permission === 'granted') {
            window.addEventListener('devicemotion', handleMotion)
          }
        } catch {
          // 权限被拒绝
        }
      } else {
        window.addEventListener('devicemotion', handleMotion)
      }
    }

    requestPermission()

    return () => {
      window.removeEventListener('devicemotion', handleMotion)
    }
  }, [onShake])

  return (
    <div
      className="gesture-handler"
      onTouchStart={swipeHandlers.onTouchStart}
      onTouchMove={swipeHandlers.onTouchMove}
      onTouchEnd={swipeHandlers.onTouchEnd}
    >
      {children}

      {showGestureHint && (
        <div className="gesture-hint-overlay">
          <div className="gesture-hint">
            {showGestureHint}
          </div>
        </div>
      )}

      {(canPass || canPlay) && (
        <div className="gesture-guide">
          {canPass && <span className="gesture-guide-item">← 左滑不出</span>}
          {canPlay && <span className="gesture-guide-item">右滑出牌 →</span>}
        </div>
      )}
    </div>
  )
}
