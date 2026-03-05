import { useState } from 'react'
import type { RoomPlayer } from '../../module_bindings/types'
import type { Identity } from 'spacetimedb'

interface ReportModalProps {
  players: RoomPlayer[]
  currentRoomId: bigint
  onSubmit: (reported: Identity, roomId: bigint, reason: string) => Promise<void>
  onClose: () => void
}

const REPORT_REASONS = [
  '作弊/外挂',
  '恶意拖延',
  '言语辱骂',
  '合伙作弊',
  '其他',
]

export function ReportModal({ players, currentRoomId, onSubmit, onClose }: ReportModalProps) {
  const [selectedPlayer, setSelectedPlayer] = useState<Identity | null>(null)
  const [selectedReason, setSelectedReason] = useState<string>('')
  const [customReason, setCustomReason] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const handleSubmit = async () => {
    if (!selectedPlayer) {
      setError('请选择要举报的玩家')
      return
    }

    const reason = selectedReason === '其他' ? customReason.trim() : selectedReason
    if (!reason) {
      setError('请选择或填写举报原因')
      return
    }

    if (reason.length > 200) {
      setError('举报原因不能超过200字')
      return
    }

    setError(null)
    setIsSubmitting(true)

    try {
      await onSubmit(selectedPlayer, currentRoomId, reason)
      setSuccess(true)
      setTimeout(onClose, 1500)
    } catch (err) {
      setError(err instanceof Error ? err.message : '提交失败')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (success) {
    return (
      <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
        <div className="bg-gray-800 rounded-2xl p-8 max-w-sm w-full mx-4 text-center">
          <div className="text-6xl mb-4">✅</div>
          <h3 className="text-xl font-bold text-white mb-2">举报已提交</h3>
          <p className="text-gray-400">我们会尽快处理您的举报</p>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-2xl w-full max-w-md shadow-2xl">
        {/* 头部 */}
        <div className="flex items-center justify-between p-4 border-b border-gray-700">
          <h2 className="text-xl font-bold text-white">举报玩家</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* 内容 */}
        <div className="p-6 space-y-6">
          {/* 选择玩家 */}
          <div>
            <h3 className="text-white font-medium mb-3">选择玩家</h3>
            <div className="space-y-2">
              {players.map((player) => (
                <button
                  key={player.playerIdentity.toHexString()}
                  onClick={() => setSelectedPlayer(player.playerIdentity)}
                  className={`w-full flex items-center gap-3 p-3 rounded-lg transition-colors ${
                    selectedPlayer && selectedPlayer.toHexString() === player.playerIdentity.toHexString()
                      ? 'bg-red-900/50 border border-red-500'
                      : 'bg-gray-700/50 hover:bg-gray-700/70 border border-transparent'
                  }`}
                >
                  <div className="w-10 h-10 bg-gray-600 rounded-full flex items-center justify-center text-xl">
                    😊
                  </div>
                  <span className="text-white">{player.playerName}</span>
                </button>
              ))}
            </div>
          </div>

          {/* 选择原因 */}
          <div>
            <h3 className="text-white font-medium mb-3">举报原因</h3>
            <div className="grid grid-cols-2 gap-2">
              {REPORT_REASONS.map((reason) => (
                <button
                  key={reason}
                  onClick={() => setSelectedReason(reason)}
                  className={`p-2 rounded-lg text-sm transition-colors ${
                    selectedReason === reason
                      ? 'bg-red-900/50 text-red-400 border border-red-500'
                      : 'bg-gray-700/50 text-gray-300 hover:bg-gray-700/70'
                  }`}
                >
                  {reason}
                </button>
              ))}
            </div>

            {selectedReason === '其他' && (
              <textarea
                value={customReason}
                onChange={(e) => setCustomReason(e.target.value)}
                placeholder="请详细描述举报原因..."
                className="w-full mt-3 bg-gray-700 border border-gray-600 rounded-lg p-3 text-white placeholder-gray-500 resize-none"
                rows={3}
                maxLength={200}
              />
            )}
          </div>

          {error && (
            <div className="bg-red-900/30 border border-red-500/50 rounded-lg p-3">
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}

          {/* 提示 */}
          <p className="text-gray-500 text-xs">
            举报提交后，我们会在24-72小时内进行核实处理。恶意举报可能会导致您的账号受到处罚。
          </p>
        </div>

        {/* 底部 */}
        <div className="p-4 border-t border-gray-700 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
          >
            取消
          </button>
          <button
            onClick={handleSubmit}
            disabled={isSubmitting || !selectedPlayer || !selectedReason}
            className="flex-1 py-2 bg-red-600 hover:bg-red-700 disabled:bg-red-800 text-white rounded-lg transition-colors"
          >
            {isSubmitting ? '提交中...' : '提交举报'}
          </button>
        </div>
      </div>
    </div>
  )
}
