import { useScreenOrientation } from '../../hooks/useScreenOrientation'
import { FullscreenToggle } from './FullscreenToggle'

/**
 * 检测是否在微信内置浏览器中
 */
function isWechat(): boolean {
  const ua = navigator.userAgent.toLowerCase()
  return ua.includes('micromessenger')
}

/**
 * 检测是否在 QQ 内置浏览器中
 */
function isQQ(): boolean {
  const ua = navigator.userAgent.toLowerCase()
  return ua.includes(' qq/') || ua.includes('mqqbrowser')
}

/**
 * 横屏提示组件
 * 当触摸设备处于竖屏时，提示用户旋转设备
 */
export function OrientationPrompt() {
  const { isMobilePortrait, isTouch, canFullscreen } = useScreenOrientation()

  // 非触摸设备或横屏时不显示
  if (!isTouch || !isMobilePortrait) {
    return null
  }

  const isWechatBrowser = isWechat()
  const isQQBrowser = isQQ()
  const isInApp = isWechatBrowser || isQQBrowser

  return (
    <div className="fixed inset-0 bg-black/95 z-[100] flex flex-col items-center justify-center text-white">
      {/* 旋转动画图标 */}
      <div className="relative w-24 h-16 mb-6">
        <div className="absolute inset-0 border-4 border-gray-500 rounded-xl flex items-center justify-center animate-pulse">
          <div className="w-12 h-8 border-2 border-gray-400 rounded" />
        </div>
        <svg className="absolute -right-4 top-1/2 -translate-y-1/2 w-8 h-8 text-yellow-400 animate-bounce" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
        </svg>
      </div>

      <p className="text-xl mb-2 font-medium">请旋转设备至横屏</p>
      <p className="text-gray-400 text-sm mb-6">以获得最佳游戏体验</p>

      {canFullscreen ? (
        <div className="z-[101]">
          <FullscreenToggle />
        </div>
      ) : isInApp ? (
        <div className="text-center px-6">
          <div className="bg-orange-500/20 border border-orange-500/40 rounded-lg p-4 max-w-xs mb-4">
            <p className="text-orange-400 text-sm font-medium mb-2">
              {isWechatBrowser ? '微信' : 'QQ'}不支持横屏模式
            </p>
            <p className="text-gray-300 text-xs">
              请点击右上角 <span className="text-white font-medium">•••</span> → 选择
              <span className="text-white font-medium">「在浏览器中打开」</span>
            </p>
          </div>
          <div className="flex flex-col items-center gap-2">
            <div className="flex items-center gap-2 text-gray-400 text-xs">
              <span className="w-6 h-6 rounded-full bg-gray-700 flex items-center justify-center text-white text-sm">1</span>
              <span>点击右上角菜单</span>
            </div>
            <div className="w-px h-3 bg-gray-600" />
            <div className="flex items-center gap-2 text-gray-400 text-xs">
              <span className="w-6 h-6 rounded-full bg-gray-700 flex items-center justify-center text-white text-sm">2</span>
              <span>选择「在浏览器中打开」</span>
            </div>
            <div className="w-px h-3 bg-gray-600" />
            <div className="flex items-center gap-2 text-gray-400 text-xs">
              <span className="w-6 h-6 rounded-full bg-gray-700 flex items-center justify-center text-white text-sm">3</span>
              <span>点击横屏按钮即可</span>
            </div>
          </div>
        </div>
      ) : (
        <div className="text-center px-6">
          <p className="text-yellow-400/80 text-sm mb-3">
            当前浏览器不支持自动横屏
          </p>
          <div className="bg-gray-800/60 rounded-lg p-4 text-left max-w-xs">
            <p className="text-gray-300 text-xs mb-2">请先关闭屏幕旋转锁定：</p>
            <p className="text-gray-400 text-xs mb-1">
              <span className="text-white">iOS：</span>控制中心 → 点击旋转锁图标
            </p>
            <p className="text-gray-400 text-xs">
              <span className="text-white">Android：</span>下拉通知栏 → 点击自动旋转
            </p>
          </div>
          <p className="text-gray-500 text-xs mt-3">
            然后将手机横过来即可
          </p>
        </div>
      )}
    </div>
  )
}
