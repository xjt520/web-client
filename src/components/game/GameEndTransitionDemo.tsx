/**
 * 游戏结束过渡动画演示页面
 * 访问 /demo-transition 查看各种动画效果
 */

import { useState } from 'react'
import { GameEndTransition, type GameEndReason } from './GameEndTransition'

interface DemoProps {
  onBack?: () => void
}

export function GameEndTransitionDemo({ onBack }: DemoProps) {
  const [showTransition, setShowTransition] = useState(false)
  const [currentReason, setCurrentReason] = useState<GameEndReason>('normal')
  const [isWinner, setIsWinner] = useState(true)

  const reasons: { reason: GameEndReason; label: string; isWinnerDefault: boolean }[] = [
    { reason: 'normal', label: '正常胜利', isWinnerDefault: true },
    { reason: 'normal', label: '正常失败', isWinnerDefault: false },
    { reason: 'spring', label: '春天', isWinnerDefault: true },
    { reason: 'anti_spring', label: '反春天', isWinnerDefault: true },
    { reason: 'flow', label: '流局', isWinnerDefault: false },
    { reason: 'quit', label: '对手弃权', isWinnerDefault: true },
  ]

  const triggerDemo = (reason: GameEndReason, winner: boolean) => {
    setCurrentReason(reason)
    setIsWinner(winner)
    setShowTransition(true)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-900 to-gray-900 p-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold text-white mb-2 text-center">
          游戏结束过渡动画演示
        </h1>
        <p className="text-gray-400 text-center mb-8">
          点击按钮预览不同场景的过渡效果（3秒过渡 + 结果展示）
        </p>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {reasons.map(({ reason, label, isWinnerDefault }, index) => (
            <button
              key={index}
              onClick={() => triggerDemo(reason, isWinnerDefault)}
              className="
                px-6 py-4 rounded-xl font-medium text-white
                bg-gradient-to-br from-gray-700 to-gray-800
                hover:from-gray-600 hover:to-gray-700
                border border-gray-600
                transition-all hover:scale-105
                shadow-lg
              "
            >
              {label}
            </button>
          ))}
        </div>

        <div className="mt-8 p-4 bg-gray-800/50 rounded-xl border border-gray-700">
          <h3 className="text-white font-medium mb-2">时间配置</h3>
          <div className="text-gray-400 text-sm space-y-1">
            <p>• 过渡阶段：<span className="text-yellow-400">3秒</span>（卡牌飞散动画）</p>
            <p>• 结果阶段：<span className="text-yellow-400">1.5-2秒</span>（胜负大字展示）</p>
            <p>• 点击任意处可跳过</p>
          </div>
        </div>

        {onBack && (
          <button
            onClick={onBack}
            className="mt-8 w-full py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-xl"
          >
            返回
          </button>
        )}
      </div>

      {/* 过渡动画 */}
      <GameEndTransition
        isVisible={showTransition}
        reason={currentReason}
        winner={isWinner ? 'landlord' : 'farmer'}
        isWinner={isWinner}
        isLandlord={true}
        winnerName={isWinner ? '你' : '对手'}
        onComplete={() => {
          setShowTransition(false)
          alert('过渡完成，显示结算弹窗')
        }}
      />
    </div>
  )
}
