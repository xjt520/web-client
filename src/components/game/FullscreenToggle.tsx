import { useState, useCallback, useEffect } from 'react'
import { useScreenOrientation } from '../../hooks/useScreenOrientation'

// 扩展 ScreenOrientation 类型定义
declare global {
  interface ScreenOrientation {
    lock(orientation: OrientationLockType): Promise<void>
    unlock(): void
  }
}

type OrientationLockType = 'any' | 'natural' | 'landscape' | 'portrait' | 'portrait-primary' | 'portrait-secondary' | 'landscape-primary' | 'landscape-secondary'

/**
 * 全屏横屏切换按钮
 * 使用 Fullscreen API 和 Screen Orientation API
 */
export function FullscreenToggle() {
  const { isTouch, isLandscape } = useScreenOrientation()
  const [isFullscreen, setIsFullscreen] = useState(false)

  // 监听全屏状态变化
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement)
    }

    document.addEventListener('fullscreenchange', handleFullscreenChange)
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange)

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange)
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange)
    }
  }, [])

  // 切换全屏和横屏
  const toggleFullscreen = useCallback(async () => {
    try {
      if (!document.fullscreenElement) {
        // 进入全屏
        const elem = document.documentElement

        if (elem.requestFullscreen) {
          await elem.requestFullscreen()
        } else if ((elem as any).webkitRequestFullscreen) {
          // Safari
          await (elem as any).webkitRequestFullscreen()
        }

        // 锁定横屏方向
        if (screen.orientation && screen.orientation.lock) {
          try {
            await screen.orientation.lock('landscape')
          } catch (e) {
            console.log('Orientation lock not supported or failed:', e)
          }
        }
      } else {
        // 退出全屏
        if (document.exitFullscreen) {
          await document.exitFullscreen()
        } else if ((document as any).webkitExitFullscreen) {
          await (document as any).webkitExitFullscreen()
        }

        // 解锁屏幕方向
        if (screen.orientation && screen.orientation.unlock) {
          try {
            screen.orientation.unlock()
          } catch (e) {
            console.log('Orientation unlock failed:', e)
          }
        }
      }
    } catch (err) {
      console.error('Fullscreen toggle error:', err)
    }
  }, [])

  // 只在触摸设备上显示
  if (!isTouch) return null

  return (
    <button
      onClick={toggleFullscreen}
      className={`${isFullscreen && isLandscape ? 'px-2 py-1 text-xs' : 'px-3 py-1.5 text-sm'} bg-purple-600/80 hover:bg-purple-500 text-white rounded-lg transition-colors flex items-center gap-1`}
      title={isFullscreen ? '退出全屏' : '横屏模式'}
    >
      {isFullscreen && isLandscape ? (
        <>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
          <span>退出</span>
        </>
      ) : (
        <>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
          </svg>
          <span>横屏</span>
        </>
      )}
    </button>
  )
}
