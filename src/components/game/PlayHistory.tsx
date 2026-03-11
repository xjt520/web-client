import { useState } from 'react'
import type { Play, RoomPlayer } from '../../module_bindings/types'
import { CardDisplay } from './CardDisplay'
import { useScreenOrientation } from '../../hooks/useScreenOrientation'

interface PlayHistoryProps {
  plays: Play[]
  players: RoomPlayer[]
}

/**
 * 出牌历史记录组件
 */
export function PlayHistory({ plays, players }: PlayHistoryProps) {
  const [isOpen, setIsOpen] = useState(false)
  const { isMobileLandscape, isCompactScreen } = useScreenOrientation()
  const isCompact = isMobileLandscape || isCompactScreen

  // 获取玩家名称
  const getPlayerName = (identity: { toHexString: () => string }) => {
    const player = players.find(
      (p) => p.playerIdentity.toHexString() === identity.toHexString()
    )
    return player?.playerName || '未知玩家'
  }

  // 格式化时间
  const formatTime = (timestamp: bigint | { microsSinceUnixEpoch: bigint }) => {
    const micros = typeof timestamp === 'bigint' ? timestamp : timestamp.microsSinceUnixEpoch
    const date = new Date(Number(micros) / 1000)
    return date.toLocaleTimeString('zh-CN', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    })
  }

  // 翻译牌型名称
  const translateCombinationType = (type: string): string => {
    const translations: Record<string, string> = {
      'Single': '单张',
      'Pair': '对子',
      'Triple': '三张',
      'TripleWithSingle': '三带一',
      'TripleWithPair': '三带二',
      'Straight': '顺子',
      'DoubleStraight': '连对',
      'TripleStraight': '飞机',
      'Airplane': '飞机',
      'AirplaneWithSingle': '飞机带单',
      'AirplaneWithPair': '飞机带对',
      'Bomb': '炸弹',
      'Rocket': '王炸',
      'FourWithTwo': '四带二',
    }
    return translations[type] || type
  }

  // 按时间倒序排列
  const sortedPlays = [...plays].sort((a, b) =>
    Number(b.timestamp) - Number(a.timestamp)
  )

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className={`${isCompact ? 'px-2.5 py-1 text-xs gap-1' : 'px-3 py-1.5 text-sm gap-1.5'} bg-gray-800/80 hover:bg-gray-700 text-gray-300 rounded-md transition-colors flex items-center`}
        title="查看出牌历史"
      >
        <svg className={`${isCompact ? 'w-3.5 h-3.5' : 'w-4 h-4'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
        历史 ({plays.length})
      </button>
    )
  }

  return (
    <>
      {/* 遮罩 */}
      <div
        className="fixed inset-0 bg-black/50 z-40"
        onClick={() => setIsOpen(false)}
      />

      {/* 历史面板 */}
      <div className="fixed right-0 top-0 h-full w-96 bg-gray-900 shadow-2xl z-50 flex flex-col">
        {/* 头部 */}
        <div className="flex items-center justify-between p-4 border-b border-gray-700">
          <h2 className="text-white text-lg font-medium">出牌历史</h2>
          <button
            onClick={() => setIsOpen(false)}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* 历史列表 */}
        <div className="flex-1 overflow-y-auto p-4">
          {sortedPlays.length === 0 ? (
            <div className="text-gray-500 text-center py-8">
              暂无出牌记录
            </div>
          ) : (
            <div className="space-y-4">
              {sortedPlays.map((play, index) => (
                <div
                  key={play.id.toString()}
                  className="bg-gray-800 rounded-lg p-3"
                >
                  {/* 玩家信息和时间 */}
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-white font-medium">
                      {getPlayerName(play.playerIdentity)}
                    </span>
                    <span className="text-gray-500 text-xs">
                      {formatTime(play.timestamp)}
                    </span>
                  </div>

                  {/* 牌型 */}
                  <div className="text-xs text-blue-400 mb-2">
                    {translateCombinationType(play.combinationType)}
                  </div>

                  {/* 卡牌显示 */}
                  <div className="flex flex-wrap gap-1">
                    {Array.from(play.cards).map((cardValue, cardIndex) => (
                      <div key={cardIndex} className="transform scale-75 origin-top-left">
                        <CardDisplay card={cardValue} />
                      </div>
                    ))}
                  </div>

                  {/* 显示序号 */}
                  <div className="text-right text-gray-600 text-xs mt-1">
                    #{sortedPlays.length - index}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 底部统计 */}
        <div className="p-4 border-t border-gray-700 bg-gray-800/50">
          <div className="text-gray-400 text-sm">
            共 {plays.length} 次出牌
          </div>
        </div>
      </div>
    </>
  )
}
