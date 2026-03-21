/**
 * DouZero AI 建议面板组件
 * 显示 AI 叫分、加倍、出牌建议
 */

import { useState } from 'react'
import { useDouzeroStatus } from '../../hooks/useDouzero'

interface AISuggestionBadgeProps {
  /** 建议类型 */
  type: 'bid' | 'double' | 'play'
  /** 建议内容 */
  suggestion?: string
  /** 胜率（0-1） */
  winRate?: number
  /** 是否加载中 */
  isLoading?: boolean
  /** 点击回调 */
  onClick?: () => void
  /** 是否紧凑模式 */
  isCompact?: boolean
}

/**
 * AI 建议徽章组件
 */
export function AISuggestionBadge({
  type,
  suggestion,
  winRate,
  isLoading,
  onClick,
  isCompact = false,
}: AISuggestionBadgeProps) {
  const { isAvailable } = useDouzeroStatus()

  if (!isAvailable) {
    return null
  }

  const getTypeStyles = () => {
    switch (type) {
      case 'bid':
        return 'bg-blue-600/80 border-blue-400'
      case 'double':
        return 'bg-orange-600/80 border-orange-400'
      case 'play':
        return 'bg-green-600/80 border-green-400'
      default:
        return 'bg-gray-600/80 border-gray-400'
    }
  }

  const getTypeIcon = () => {
    switch (type) {
      case 'bid':
        return '📢'
      case 'double':
        return '⚡'
      case 'play':
        return '🤖'
      default:
        return '💡'
    }
  }

  const formatWinRate = (rate: number) => {
    return `${Math.round(rate * 100)}%`
  }

  return (
    <button
      onClick={onClick}
      disabled={isLoading}
      className={`
        flex items-center gap-1.5 px-2 py-1 rounded-lg border
        ${getTypeStyles()}
        text-white text-xs font-medium
        transition-all hover:scale-105 active:scale-95
        disabled:opacity-50 disabled:cursor-not-allowed
        ${isCompact ? 'text-[10px] px-1.5 py-0.5' : ''}
      `}
      title="点击应用 AI 建议"
    >
      <span>{getTypeIcon()}</span>
      {isLoading ? (
        <span className="animate-pulse">AI 思考中...</span>
      ) : (
        <>
          <span>{suggestion}</span>
          {winRate !== undefined && (
            <span className="opacity-75">({formatWinRate(winRate)})</span>
          )}
        </>
      )}
    </button>
  )
}

/**
 * AI 状态指示器
 */
export function AIStatusIndicator() {
  const { isAvailable, isLoading } = useDouzeroStatus()
  const [showTooltip, setShowTooltip] = useState(false)

  if (isLoading) {
    return (
      <div className="flex items-center gap-1 text-xs text-gray-400">
        <div className="w-2 h-2 rounded-full bg-gray-400 animate-pulse" />
        <span>AI</span>
      </div>
    )
  }

  return (
    <div
      className="relative"
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      <div
        className={`
          flex items-center gap-1 text-xs
          ${isAvailable ? 'text-green-400' : 'text-gray-500'}
        `}
      >
        <div
          className={`
            w-2 h-2 rounded-full
            ${isAvailable ? 'bg-green-400' : 'bg-gray-500'}
          `}
        />
        <span>AI</span>
      </div>

      {showTooltip && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-gray-800 text-white text-xs rounded whitespace-nowrap z-50">
          {isAvailable ? 'DouZero AI 已连接' : 'DouZero AI 未连接'}
          <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-800" />
        </div>
      )}
    </div>
  )
}

/**
 * AI 建议面板属性
 */
interface AISuggestionPanelProps {
  /** 叫分建议 */
  bidSuggestion?: {
    suggestedBid: number
    winRate: number
    confidence: number
  }
  /** 加倍建议 */
  doubleSuggestion?: {
    suggestedDouble: boolean
    winRate: number
  }
  /** 出牌建议 */
  playSuggestion?: {
    suggestedCards: number[]
    actionType: string
    isPass: boolean
    winRate: number
  }
  /** 应用叫分建议 */
  onApplyBid?: (value: number) => void
  /** 应用加倍建议 */
  onApplyDouble?: (double: boolean) => void
  /** 应用出牌建议 */
  onApplyPlay?: (cards: number[]) => void
  /** 当前游戏阶段 */
  gamePhase?: 'bidding' | 'doubling' | 'playing'
  /** 是否是当前玩家的回合 */
  isMyTurn?: boolean
  /** 是否紧凑模式 */
  isCompact?: boolean
}

/**
 * AI 建议面板
 * 显示当前阶段的 AI 建议
 */
export function AISuggestionPanel({
  bidSuggestion,
  doubleSuggestion,
  playSuggestion,
  onApplyBid,
  onApplyDouble,
  onApplyPlay,
  gamePhase,
  isMyTurn = false,
  isCompact = false,
}: AISuggestionPanelProps) {
  const { isAvailable } = useDouzeroStatus()

  if (!isAvailable) {
    return null
  }

  // 根据游戏阶段显示对应的建议
  if (gamePhase === 'bidding' && bidSuggestion) {
    const bidText = bidSuggestion.suggestedBid === 0 ? '不叫' : `${bidSuggestion.suggestedBid}分`
    return (
      <AISuggestionBadge
        type="bid"
        suggestion={bidText}
        winRate={bidSuggestion.winRate}
        onClick={() => onApplyBid?.(bidSuggestion.suggestedBid)}
        isCompact={isCompact}
      />
    )
  }

  if (gamePhase === 'doubling' && doubleSuggestion && isMyTurn) {
    const doubleText = doubleSuggestion.suggestedDouble ? '加倍' : '不加倍'
    return (
      <AISuggestionBadge
        type="double"
        suggestion={doubleText}
        winRate={doubleSuggestion.winRate}
        onClick={() => onApplyDouble?.(doubleSuggestion.suggestedDouble)}
        isCompact={isCompact}
      />
    )
  }

  if (gamePhase === 'playing' && playSuggestion && isMyTurn) {
    const playText = playSuggestion.isPass ? '不出' : '推荐出牌'
    return (
      <AISuggestionBadge
        type="play"
        suggestion={playText}
        winRate={playSuggestion.winRate}
        onClick={() => {
          if (!playSuggestion.isPass && playSuggestion.suggestedCards.length > 0) {
            onApplyPlay?.(playSuggestion.suggestedCards)
          }
        }}
        isCompact={isCompact}
      />
    )
  }

  return null
}

/**
 * AI 胜率显示组件
 */
interface WinRateDisplayProps {
  winRate: number
  isCompact?: boolean
}

export function WinRateDisplay({ winRate, isCompact = false }: WinRateDisplayProps) {
  const getWinRateColor = (rate: number) => {
    if (rate >= 0.7) return 'text-green-400'
    if (rate >= 0.5) return 'text-yellow-400'
    if (rate >= 0.3) return 'text-orange-400'
    return 'text-red-400'
  }

  const getWinRateBarColor = (rate: number) => {
    if (rate >= 0.7) return 'bg-green-400'
    if (rate >= 0.5) return 'bg-yellow-400'
    if (rate >= 0.3) return 'bg-orange-400'
    return 'bg-red-400'
  }

  return (
    <div className={`flex items-center gap-2 ${isCompact ? 'text-xs' : 'text-sm'}`}>
      <span className="text-gray-400">胜率:</span>
      <div className="flex-1 h-1.5 bg-gray-700 rounded-full overflow-hidden max-w-16">
        <div
          className={`h-full ${getWinRateBarColor(winRate)} transition-all`}
          style={{ width: `${winRate * 100}%` }}
        />
      </div>
      <span className={`font-mono font-medium ${getWinRateColor(winRate)}`}>
        {Math.round(winRate * 100)}%
      </span>
    </div>
  )
}
