import { useScreenOrientation } from '../../hooks/useScreenOrientation'
import { FullscreenToggle } from './FullscreenToggle'

/**
 * 横屏提示组件
 * 当触摸设备处于竖屏时，提示用户旋转设备
 */
export function OrientationPrompt() {
  const { isMobilePortrait, isTouch } = useScreenOrientation()

  // 非触摸设备或横屏时不显示
  if (!isTouch || !isMobilePortrait) {
    return null
  }

  return (
    <div className="fixed inset-0 bg-black/95 z-[100] flex flex-col items-center justify-center text-white">
      <div className="orientation-icon text-6xl mb-4">
        📱
      </div>
      <p className="text-xl mb-2 font-medium">请旋转设备至横屏</p>
      <p className="text-gray-400 text-sm mb-6">以获得最佳游戏体验</p>
      <div className="z-[101]">
        <FullscreenToggle />
      </div>
    </div>
  )
}
