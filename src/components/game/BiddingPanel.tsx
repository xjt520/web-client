import { useScreenOrientation } from '../../hooks/useScreenOrientation'

interface BiddingPanelProps {
  onBid: (value: number) => void
  maxBid: number
  hasBid: boolean
}

export function BiddingPanel({ onBid, maxBid, hasBid }: BiddingPanelProps) {
  const { isMobileLandscape, isCompactScreen } = useScreenOrientation()

  // 紧凑布局模式
  const isCompact = isMobileLandscape || isCompactScreen

  // 已叫分，显示等待提示
  if (hasBid) {
    return (
      <div className={`text-center text-gray-400 ${isCompact ? 'py-1 text-xs' : 'py-2 text-sm'}`}>
        等待其他玩家叫分...
      </div>
    )
  }

  const availableBids = [0, 1, 2, 3].filter((v) => v === 0 || v > maxBid)

  return (
    <div className={`flex flex-col items-center ${isCompact ? 'gap-1 py-1' : 'gap-2 py-2'}`}>
      <h3 className={`text-white font-medium ${isCompact ? 'text-sm' : 'text-base'}`}>
        请选择叫分
      </h3>

      <div className={`flex ${isCompact ? 'gap-2' : 'gap-3'}`}>
        {availableBids.map((value) => (
          <button
            key={value}
            onClick={() => onBid(value)}
            className={`
              rounded-lg font-medium transition-colors
              ${isCompact ? 'px-3 py-1.5 text-sm' : 'px-4 py-2 text-base'}
              ${value === 0
                ? 'bg-gray-700 hover:bg-gray-600 text-gray-300'
                : 'bg-blue-600 hover:bg-blue-700 text-white'
              }
            `}
          >
            {value === 0 ? '不叫' : `${value}分`}
          </button>
        ))}
      </div>

      {maxBid > 0 && (
        <p className={`text-gray-400 ${isCompact ? 'text-xs' : 'text-sm'}`}>
          当前最高: {maxBid}分
        </p>
      )}
    </div>
  )
}
