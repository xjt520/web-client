import type { GameResult, RoomPlayer } from '../../module_bindings/types'

interface GameResultModalProps {
  winner: string | undefined
  gameResults: GameResult[]
  players: RoomPlayer[]
  isSpring?: boolean
  isAntiSpring?: boolean
  myIdentityHex: string
  onRestart: () => void
  onLeave: () => void
}

/**
 * 游戏结果弹窗组件 - 展示所有玩家的游戏报表
 */
export function GameResultModal({
  winner,
  gameResults,
  players,
  isSpring = false,
  isAntiSpring = false,
  myIdentityHex,
  onRestart,
  onLeave,
}: GameResultModalProps) {
  // 获取当前玩家的结果
  const myResult = gameResults.find(
    (r) => r.playerIdentity.toHexString() === myIdentityHex
  )
  const isLandlord = myResult?.isLandlord ?? false
  const isWinner =
    (winner === 'landlord' && isLandlord) ||
    (winner === 'farmer' && !isLandlord)

  const getResultText = () => {
    if (winner === 'none') {
      return { title: '流局', subtitle: '所有人都放弃叫分', emoji: '😐' }
    }
    if (winner === 'ai') {
      return { title: '游戏结束', subtitle: '所有玩家已离开', emoji: '👋' }
    }
    if (isWinner) {
      let subtitle = isLandlord ? '地主获胜' : '农民获胜'
      if (isSpring) subtitle += ' - 春天！'
      if (isAntiSpring) subtitle += ' - 反春天！'
      return { title: '🎉 胜利！', subtitle, emoji: '🏆' }
    }
    return { title: '😢 失败', subtitle: isLandlord ? '地主失败' : '农民失败', emoji: '💔' }
  }

  const result = getResultText()

  // 获取玩家名称
  const getPlayerName = (identityHex: string) => {
    const player = players.find((p) => p.playerIdentity.toHexString() === identityHex)
    return player?.playerName || '未知玩家'
  }

  // 按角色排序：地主在前，农民在后
  const sortedResults = [...gameResults].sort((a, b) => {
    if (a.isLandlord && !b.isLandlord) return -1
    if (!a.isLandlord && b.isLandlord) return 1
    return 0
  })

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-xl p-6 w-full max-w-lg mx-4 text-center">
        <div className="text-5xl mb-3">{result.emoji}</div>

        <h2 className="text-2xl font-bold text-white mb-1">{result.title}</h2>
        <p className="text-gray-400 mb-3">{result.subtitle}</p>

        {/* 春天/反春天标签 */}
        {(isSpring || isAntiSpring) && (
          <div className="mb-3">
            <span className={`
              inline-block px-3 py-1 rounded-full text-xs font-bold
              ${isSpring ? 'bg-red-500/30 text-red-300' : 'bg-green-500/30 text-green-300'}
            `}>
              {isSpring ? '🌸 春天！' : '🌿 反春天！'}
            </span>
          </div>
        )}

        {/* 所有玩家游戏报表 */}
        {gameResults.length > 0 && (
          <div className="bg-gray-700/50 rounded-lg p-4 mb-4">
            <h3 className="text-white font-medium mb-3 text-center">📊 游戏报表</h3>
            <div className="space-y-2">
              {sortedResults.map((gameResult, index) => {
                const identityHex = gameResult.playerIdentity.toHexString()
                const isMe = identityHex === myIdentityHex
                const playerResultIsWinner =
                  (winner === 'landlord' && gameResult.isLandlord) ||
                  (winner === 'farmer' && !gameResult.isLandlord)

                return (
                  <div
                    key={index}
                    className={`
                      rounded-lg p-3 text-sm
                      ${isMe ? 'bg-blue-900/30 border border-blue-500/50' : 'bg-gray-600/30'}
                    `}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        {/* 角色标签 */}
                        <span className={`
                          px-2 py-0.5 rounded text-xs font-medium
                          ${gameResult.isLandlord ? 'bg-red-600/50 text-red-200' : 'bg-green-600/50 text-green-200'}
                        `}>
                          {gameResult.isLandlord ? '👑 地主' : '🌾 农民'}
                        </span>
                        {/* 玩家名称 */}
                        <span className={`font-medium ${isMe ? 'text-blue-300' : 'text-gray-300'}`}>
                          {getPlayerName(identityHex)}
                          {isMe && <span className="text-xs text-blue-400 ml-1">(你)</span>}
                        </span>
                      </div>
                      {/* 胜负标签 */}
                      <span className={`
                        px-2 py-0.5 rounded text-xs font-bold
                        ${playerResultIsWinner ? 'bg-yellow-600/50 text-yellow-200' : 'bg-gray-500/50 text-gray-300'}
                      `}>
                        {playerResultIsWinner ? '✓ 胜' : '✗ 负'}
                      </span>
                    </div>

                    {/* 积分明细 */}
                    <div className="grid grid-cols-4 gap-2 text-xs text-gray-400 mb-2">
                      <div className="text-center">
                        <div className="text-gray-500">基础</div>
                        <div className="text-white">{gameResult.baseScore}</div>
                      </div>
                      <div className="text-center">
                        <div className="text-gray-500">叫分</div>
                        <div className="text-white">x{gameResult.bidMultiple}</div>
                      </div>
                      <div className="text-center">
                        <div className="text-gray-500">加倍</div>
                        <div className="text-white">x{gameResult.doublingMultiple}</div>
                      </div>
                      <div className="text-center">
                        <div className="text-gray-500">炸弹</div>
                        <div className="text-orange-400">x{gameResult.bombMultiple}</div>
                      </div>
                    </div>

                    {/* 最终得分 */}
                    <div className="flex justify-between items-center pt-2 border-t border-gray-600/50">
                      <span className="text-gray-400 text-xs">最终得分</span>
                      <span className={`font-bold text-lg ${
                        gameResult.finalScore > 0 ? 'text-green-400' : 'text-red-400'
                      }`}>
                        {gameResult.finalScore > 0 ? '+' : ''}{gameResult.finalScore}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        <div className="flex flex-col gap-2">
          <button
            onClick={onRestart}
            className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
          >
            再来一局
          </button>
          <button
            onClick={onLeave}
            className="w-full py-3 bg-gray-700 hover:bg-gray-600 text-gray-300 font-medium rounded-lg transition-colors"
          >
            返回大厅
          </button>
        </div>
      </div>
    </div>
  )
}
