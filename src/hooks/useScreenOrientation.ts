import { useState, useEffect } from 'react'

interface ScreenOrientation {
  isLandscape: boolean
  isPortrait: boolean
  isMobileLandscape: boolean  // max-height <= 500px 且横屏
  isMobilePortrait: boolean   // max-width <= 640px 且竖屏
  isMobileLandscapeSm: boolean // max-height <= 400px 且横屏
  isSmallScreen: boolean      // 高度 <= 768px（小屏幕电脑）
  isCompactScreen: boolean    // 高度 <= 600px（紧凑屏幕）
  isTouch: boolean            // 触摸设备
  screenWidth: number
  screenHeight: number
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
        screenWidth: 1024,
        screenHeight: 768,
      }
    }

    const width = window.innerWidth
    const height = window.innerHeight
    const isTouch = window.matchMedia('(hover: none) and (pointer: coarse)').matches

    return {
      isLandscape: width > height,
      isPortrait: width <= height,
      isMobileLandscape: width > height && height <= 500,
      isMobilePortrait: width <= 640 && width <= height,
      isMobileLandscapeSm: width > height && height <= 400,
      isSmallScreen: height <= 768,
      isCompactScreen: height <= 600,
      isTouch,
      screenWidth: width,
      screenHeight: height,
    }
  })

  useEffect(() => {
    const updateState = () => {
      const width = window.innerWidth
      const height = window.innerHeight
      const isTouch = window.matchMedia('(hover: none) and (pointer: coarse)').matches

      setState({
        isLandscape: width > height,
        isPortrait: width <= height,
        isMobileLandscape: width > height && height <= 500,
        isMobilePortrait: width <= 640 && width <= height,
        isMobileLandscapeSm: width > height && height <= 400,
        isSmallScreen: height <= 768,
        isCompactScreen: height <= 600,
        isTouch,
        screenWidth: width,
        screenHeight: height,
      })
    }

    // 监听 resize 和 orientationchange
    window.addEventListener('resize', updateState)
    window.addEventListener('orientationchange', updateState)

    // 媒体查询监听
    const touchMedia = window.matchMedia('(hover: none) and (pointer: coarse)')
    touchMedia.addEventListener('change', updateState)

    // 初始化时执行一次
    updateState()

    return () => {
      window.removeEventListener('resize', updateState)
      window.removeEventListener('orientationchange', updateState)
      touchMedia.removeEventListener('change', updateState)
    }
  }, [])

  return state
}
