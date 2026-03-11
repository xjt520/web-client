import { useEffect, useState } from 'react'
import './PhasedTimer.css'

interface AutoTrustNotificationProps {
  isVisible: boolean
  onComplete?: () => void
  autoCloseDelay?: number
}

/**
 * 自动托管提示组件
 * 当玩家超时时显示，提示已自动进入托管模式
 */
export function AutoTrustNotification({
  isVisible,
  onComplete,
  autoCloseDelay = 3000,
}: AutoTrustNotificationProps) {
  const [isHiding, setIsHiding] = useState(false)

  useEffect(() => {
    if (!isVisible) {
      setIsHiding(false)
      return
    }

    const timer = setTimeout(() => {
      setIsHiding(true)
      setTimeout(() => {
        onComplete?.()
      }, 500) // 等待淡出动画完成
    }, autoCloseDelay)

    return () => clearTimeout(timer)
  }, [isVisible, autoCloseDelay, onComplete])

  if (!isVisible) return null

  return (
    <div
      className={`
        fixed inset-0 z-50 flex items-center justify-center
        bg-black/50 backdrop-blur-sm
        ${isHiding ? 'animate-fade-out' : 'animate-fade-in'}
      `}
    >
      <div
        className={`
          auto-trust-notification
          bg-gradient-to-br from-gray-800 to-gray-900
          border border-gray-600
          rounded-2xl p-6
          shadow-2xl
          max-w-sm mx-4
          text-center
          ${isHiding ? 'animate-scale-out' : 'animate-scale-in'}
        `}
      >
        {/* 托管图标 */}
        <div className="trust-icon text-6xl mb-4">
          🤖
        </div>

        {/* 标题 */}
        <h3 className="text-xl font-bold text-white mb-2">
          操作超时
        </h3>

        {/* 说明 */}
        <p className="text-gray-300 text-sm mb-4">
          已自动为您开启托管模式
          <br />
          <span className="text-gray-400 text-xs">
            AI 将自动帮您进行操作
          </span>
        </p>

        {/* 提示 */}
        <div className="flex items-center justify-center gap-2 text-yellow-400 text-sm">
          <span>💡</span>
          <span>点击「取消托管」可恢复手动操作</span>
        </div>

        {/* 进度条 */}
        <div className="mt-4 h-1 bg-gray-700 rounded-full overflow-hidden">
          <div
            className="h-full bg-blue-500 animate-shrink"
            style={{
              animationDuration: `${autoCloseDelay}ms`,
            }}
          />
        </div>
      </div>
    </div>
  )
}
