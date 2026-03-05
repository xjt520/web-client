import { useEffect, useState } from 'react'

interface GamePauseOverlayProps {
  isPaused: boolean
  pauseRemaining: number
  pausedBy: string | null
  isOwner: boolean
  onResume: () => Promise<void>
}

export function GamePauseOverlay({
  isPaused,
  pauseRemaining,
  isOwner,
  onResume,
}: GamePauseOverlayProps) {
  const [countdown, setCountdown] = useState(pauseRemaining)

  useEffect(() => {
    setCountdown(pauseRemaining)
  }, [pauseRemaining])

  if (!isPaused) return null

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-40">
      <div className="bg-gray-800 rounded-2xl p-8 max-w-md w-full mx-4 shadow-2xl text-center">
        {/* 暂停图标 */}
        <div className="w-20 h-20 mx-auto mb-6 bg-yellow-500/20 rounded-full flex items-center justify-center">
          <svg className="w-10 h-10 text-yellow-500" fill="currentColor" viewBox="0 0 24 24">
            <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
          </svg>
        </div>

        <h2 className="text-2xl font-bold text-white mb-2">游戏暂停</h2>
        <p className="text-gray-400 mb-6">
          {isOwner ? '您已暂停游戏' : '房主已暂停游戏'}
        </p>

        {/* 倒计时 */}
        <div className="mb-6">
          <div className="text-4xl font-bold text-yellow-500 mb-2">
            {countdown}秒
          </div>
          <p className="text-sm text-gray-500">后自动继续</p>

          {/* 进度条 */}
          <div className="w-full h-2 bg-gray-700 rounded-full mt-4 overflow-hidden">
            <div
              className="h-full bg-yellow-500 transition-all duration-1000"
              style={{ width: `${(countdown / 60) * 100}%` }}
            ></div>
          </div>
        </div>

        {/* 继续按钮（仅房主可见） */}
        {isOwner && (
          <button
            onClick={onResume}
            className="px-8 py-3 bg-green-600 hover:bg-green-700 text-white font-medium rounded-xl transition-colors"
          >
            继续游戏
          </button>
        )}
      </div>
    </div>
  )
}
