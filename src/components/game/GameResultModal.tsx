import type { GameResult, RoomPlayer } from '../../module_bindings/types'
import { useScreenOrientation } from '../../hooks/useScreenOrientation'

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
  const { isMobileLandscape, isCompactScreen } = useScreenOrientation()
  const isCompact = isMobileLandscape || isCompactScreen

  const myResult = gameResults.find(
    (r) => r.playerIdentity.toHexString() === myIdentityHex
  )
  const isLandlord = myResult?.isLandlord ?? false
  const isWinner =
    (winner === 'landlord' && isLandlord) ||
    (winner === 'farmer' && !isLandlord)

  const getPlayerName = (identityHex: string) => {
    const player = players.find((p) => p.playerIdentity.toHexString() === identityHex)
    return player?.playerName || '未知'
  }

  const getResultText = () => {
    if (winner === 'none') return { title: '流局', icon: '😐' }
    if (winner === 'ai') return { title: '游戏结束', icon: '👋' }
    if (isSpring) return { title: '春天', icon: '🌸' }
    if (isAntiSpring) return { title: '反春天', icon: '🌿' }
    if (isWinner) return { title: '胜利', icon: '🏆' }
    return { title: '失败', icon: '💔' }
  }

  const { title, icon } = getResultText()

  const sortedResults = [...gameResults].sort((a, b) => {
    if (a.isLandlord && !b.isLandlord) return -1
    if (!a.isLandlord && b.isLandlord) return 1
    return 0
  })

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onLeave} />

      <div className={`
        relative bg-gray-900/95 rounded-2xl shadow-2xl border border-gray-700/50
        ${isCompact ? 'w-full max-w-sm' : 'w-full max-w-xs'}
        animate-[fadeIn_0.2s_ease-out]
      `}>
        <div className="p-5 text-center">
          <div className={`
            text-4xl mb-2
            ${isWinner ? 'animate-bounce' : ''}
          `}>
            {icon}
          </div>
          <h2 className={`
            text-2xl font-bold mb-1
            ${isWinner ? 'text-yellow-400' : winner === 'none' ? 'text-gray-400' : 'text-gray-300'}
          `}>
            {title}
          </h2>
          {isSpring && <p className="text-pink-400 text-xs">完美碾压</p>}
          {isAntiSpring && <p className="text-emerald-400 text-xs">绝地反击</p>}
          {winner === 'none' && <p className="text-gray-500 text-xs">全部不叫</p>}
        </div>

        <div className="border-t border-gray-700/50 px-4 py-3 space-y-2">
          {sortedResults.map((result, index) => {
            const identityHex = result.playerIdentity.toHexString()
            const isMe = identityHex === myIdentityHex
            const playerIsWinner =
              (winner === 'landlord' && result.isLandlord) ||
              (winner === 'farmer' && !result.isLandlord)

            return (
              <div
                key={index}
                className={`
                  flex items-center justify-between py-2 px-3 rounded-lg
                  ${isMe ? 'bg-blue-900/30 border border-blue-500/30' : 'bg-gray-800/50'}
                `}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-base">
                    {result.isLandlord ? '👑' : '🌾'}
                  </span>
                  <span className={`truncate ${isMe ? 'text-blue-300 font-medium' : 'text-gray-300'}`}>
                    {getPlayerName(identityHex)}
                    {isMe && <span className="text-blue-400 text-xs ml-1">(你)</span>}
                  </span>
                  {playerIsWinner && <span className="text-yellow-400 text-xs">✓</span>}
                </div>
                <div className={`
                  font-bold text-lg shrink-0 ml-2
                  ${result.finalScore > 0 ? 'text-green-400' : result.finalScore < 0 ? 'text-red-400' : 'text-gray-400'}
                `}>
                  {result.finalScore > 0 ? '+' : ''}{result.finalScore}
                </div>
              </div>
            )
          })}
        </div>

        <div className="p-4 flex gap-3">
          <button
            onClick={onRestart}
            className="
              flex-1 py-2.5 px-4
              bg-blue-600 hover:bg-blue-500
              text-white font-medium rounded-lg
              transition-colors
            "
          >
            再来一局
          </button>
          <button
            onClick={onLeave}
            className="
              flex-1 py-2.5 px-4
              bg-gray-700 hover:bg-gray-600
              text-gray-300 font-medium rounded-lg
              transition-colors
            "
          >
            离开
          </button>
        </div>
      </div>

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </div>
  )
}
