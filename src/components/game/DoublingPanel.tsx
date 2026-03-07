import { useState } from 'react'
import { useScreenOrientation } from '../../hooks/useScreenOrientation'

interface DoublingPanelProps {
  onDouble: (double: boolean) => void
  isMyTurn: boolean
  hasDoubled: boolean
  currentMultiple: number
}

/**
 * 加倍面板组件
 */
export function DoublingPanel({
  onDouble,
  isMyTurn,
  hasDoubled,
  currentMultiple,
}: DoublingPanelProps) {
  const [selected, setSelected] = useState<boolean | null>(null)
  const { isMobileLandscape, isCompactScreen } = useScreenOrientation()

  // 紧凑布局模式
  const isCompact = isMobileLandscape || isCompactScreen

  const handleDouble = (double: boolean) => {
    setSelected(double)
    onDouble(double)
  }

  if (hasDoubled) {
    return (
      <div className={`flex flex-col items-center ${isCompact ? 'gap-0.5 mb-1' : 'gap-1 mb-2'}`}>
        <div className={`text-yellow-400 font-medium ${isCompact ? 'text-sm' : 'text-base'}`}>
          {currentMultiple}x
        </div>
        <div className={`text-gray-400 ${isCompact ? 'text-xs' : 'text-sm'}`}>
          您已选择{selected ? '加倍' : '不加倍'}
        </div>
      </div>
    )
  }

  // 非当前玩家显示等待提示
  const showWaitingMessage = !isMyTurn

  return (
    <div className={`flex flex-col items-center ${isCompact ? 'gap-0.5 mb-1' : 'gap-2 mb-2'}`}>
      <div className={`text-white font-medium ${isCompact ? 'text-sm' : 'text-base'}`}>
        加倍阶段
      </div>
      <div className={`text-yellow-400 ${isCompact ? 'text-xs' : 'text-sm'}`}>
        当前: {currentMultiple}x
      </div>

      {showWaitingMessage ? (
        <div className={`text-gray-400 animate-pulse ${isCompact ? 'text-xs' : 'text-sm'}`}>
          等待其他玩家选择...
        </div>
      ) : (
        <div className={`flex ${isCompact ? 'gap-2' : 'gap-4'}`}>
          <button
            onClick={() => handleDouble(true)}
            className={`
              bg-gradient-to-r from-red-600 to-red-500 hover:from-red-500 hover:to-red-400
              text-white font-bold rounded-lg shadow-lg
              ${isCompact ? 'px-4 py-1.5 text-sm' : 'px-6 py-2'}
              transform hover:scale-105 transition-all
            `}
          >
            加倍
          </button>
          <button
            onClick={() => handleDouble(false)}
            className={`
              bg-gradient-to-r from-gray-600 to-gray-500 hover:from-gray-500 hover:to-gray-400
              text-white font-medium rounded-lg shadow-lg
              ${isCompact ? 'px-4 py-1.5 text-sm' : 'px-6 py-2'}
              transform hover:scale-105 transition-all
            `}
          >
            不加倍
          </button>
        </div>
      )}
    </div>
  )
}
