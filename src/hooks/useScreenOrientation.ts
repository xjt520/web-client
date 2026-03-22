import { useState, useEffect, useCallback } from 'react'

interface ScreenOrientation {
  isLandscape: boolean
  isPortrait: boolean
  isMobileLandscape: boolean  // max-height <= 500px 且横屏
  isMobilePortrait: boolean   // max-width <= 640px 且竖屏
  isMobileLandscapeSm: boolean // max-height <= 400px 且横屏
  isSmallScreen: boolean      // 高度 <= 768px（小屏幕电脑）
  isCompactScreen: boolean    // 高度 <= 600px（紧凑屏幕）
  isTouch: boolean            // 触摸设备
  canFullscreen: boolean      // 是否支持全屏 API（微信等 WebView 不支持）
  screenWidth: number
  screenHeight: number
}

function getOrientationState(): ScreenOrientation {
  const width = window.innerWidth
  const height = window.innerHeight
  const isLandscape = width > height
  const isTouch = window.matchMedia('(hover: none) and (pointer: coarse)').matches
  // 检测是否支持全屏 API（微信、QQ 等 WebView 不支持）
  const canFullscreen = !!(
    document.documentElement.requestFullscreen ||
    (document.documentElement as any).webkitRequestFullscreen
  )

  return {
    isLandscape,
    isPortrait: !isLandscape,
    isMobileLandscape: isLandscape && height <= 500,
    isMobilePortrait: !isLandscape && width <= 640,
    isMobileLandscapeSm: isLandscape && height <= 400,
    isSmallScreen: height <= 768,
    isCompactScreen: height <= 600,
    isTouch,
    canFullscreen,
    screenWidth: width,
    screenHeight: height,
  }
}

/**
 * 检测屏幕方向和设备类型的 Hook
 * 用于移动端横屏适配和小屏幕电脑适配
 */
export function useScreenOrientation(): ScreenOrientation {
  const [state, setState] = useState<ScreenOrientation>(() => {
    if (typeof window === 'undefined') {
      return {
        isLandscape: false,
        isPortrait: true,
        isMobileLandscape: false,
        isMobilePortrait: false,
        isMobileLandscapeSm: false,
        isSmallScreen: false,
        isCompactScreen: false,
        isTouch: false,
        canFullscreen: true,
        screenWidth: 1024,
        screenHeight: 768,
      }
    }
    return getOrientationState()
  })

  const updateState = useCallback(() => {
    setState(getOrientationState())
  }, [])

  useEffect(() => {
    updateState()

    window.addEventListener('resize', updateState)
    window.addEventListener('orientationchange', updateState)

    // 现代浏览器使用 screen.orientation API
    const screenOrientation = screen?.orientation
    screenOrientation?.addEventListener('change', updateState)

    const touchMedia = window.matchMedia('(hover: none) and (pointer: coarse)')
    touchMedia.addEventListener('change', updateState)

    return () => {
      window.removeEventListener('resize', updateState)
      window.removeEventListener('orientationchange', updateState)
      screenOrientation?.removeEventListener('change', updateState)
      touchMedia.removeEventListener('change', updateState)
    }
  }, [updateState])

  return state
}
