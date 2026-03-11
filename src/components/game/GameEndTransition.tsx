/**
 * 游戏结束过渡动画组件
 * 在游戏结束时显示过渡效果，让玩家感知胜负
 */

import { useEffect, useState, useCallback } from 'react'
import './GameEndTransition.css'

export type GameEndReason =
  | 'normal'      // 正常出完牌
  | 'spring'      // 春天
  | 'anti_spring' // 反春天
  | 'flow'        // 流局（全部不叫）
  | 'quit'        // 玩家退出
  | 'force'       // 强制结束
  | 'timeout'     // 超时
  | 'none'        // 无

export interface GameEndTransitionProps {
  isVisible: boolean
  reason: GameEndReason
  winner: 'landlord' | 'farmer' | 'none' | null
  isWinner: boolean
  isLandlord: boolean
  winnerName?: string
  quitterName?: string
  onComplete: () => void
}

interface PhaseConfig {
  transitionDuration: number
  resultDuration: number
  showParticles: boolean
  showShake: boolean
}

const PHASE_CONFIGS: Record<GameEndReason, PhaseConfig> = {
  normal: {
    transitionDuration: 3000,
    resultDuration: 1500,
    showParticles: true,
    showShake: false,
  },
  spring: {
    transitionDuration: 3000,
    resultDuration: 2000,
    showParticles: true,
    showShake: true,
  },
  anti_spring: {
    transitionDuration: 3000,
    resultDuration: 2000,
    showParticles: true,
    showShake: true,
  },
  flow: {
    transitionDuration: 3000,
    resultDuration: 1500,
    showParticles: true,
    showShake: false,
  },
  quit: {
    transitionDuration: 3000,
    resultDuration: 1500,
    showParticles: true,
    showShake: false,
  },
  force: {
    transitionDuration: 0,
    resultDuration: 1000,
    showParticles: false,
    showShake: false,
  },
  timeout: {
    transitionDuration: 0,
    resultDuration: 1500,
    showParticles: false,
    showShake: false,
  },
  none: {
    transitionDuration: 0,
    resultDuration: 0,
    showParticles: false,
    showShake: false,
  },
}

type TransitionPhase = 'hidden' | 'transition' | 'result' | 'complete'

export function GameEndTransition({
  isVisible,
  reason,
  winner: _winner,
  isWinner,
  isLandlord,
  winnerName,
  quitterName,
  onComplete,
}: GameEndTransitionProps) {
  const [phase, setPhase] = useState<TransitionPhase>('hidden')
  const config = PHASE_CONFIGS[reason]

  useEffect(() => {
    if (!isVisible || reason === 'none') {
      setPhase('hidden')
      return
    }

    // 第一阶段：过渡动画
    if (config.transitionDuration > 0) {
      setPhase('transition')
      
      const transitionTimer = setTimeout(() => {
        // 第二阶段：显示胜负结果
        setPhase('result')
        
        const resultTimer = setTimeout(() => {
          setPhase('complete')
          onComplete()
        }, config.resultDuration)
        
        return () => clearTimeout(resultTimer)
      }, config.transitionDuration)
      
      return () => clearTimeout(transitionTimer)
    } else {
      // 无过渡动画，直接显示结果
      setPhase('result')
      
      const resultTimer = setTimeout(() => {
        setPhase('complete')
        onComplete()
      }, config.resultDuration)
      
      return () => clearTimeout(resultTimer)
    }
  }, [isVisible, reason, config.transitionDuration, config.resultDuration, onComplete])

  // 点击跳过
  const handleSkip = useCallback(() => {
    if (phase === 'transition' || phase === 'result') {
      setPhase('complete')
      onComplete()
    }
  }, [phase, onComplete])

  if (phase === 'hidden' || phase === 'complete') {
    return null
  }

  const getResultConfig = () => {
    // 流局
    if (reason === 'flow') {
      return {
        icon: '😐',
        title: '流 局',
        subtitle: '所有人都放弃叫分',
        bgClass: 'game-end-flow',
        iconClass: 'icon-flow',
      }
    }

    // 玩家退出
    if (reason === 'quit') {
      return {
        icon: '⚠️',
        title: isWinner ? '对 方 弃 权' : '队 友 退 出',
        subtitle: isWinner ? '您获得胜利！' : `${quitterName || '队友'}离开了游戏`,
        bgClass: 'game-end-quit',
        iconClass: 'icon-quit',
      }
    }

    // 强制结束
    if (reason === 'force') {
      return {
        icon: '⏹️',
        title: '游 戏 结 束',
        subtitle: '游戏已被强制终止',
        bgClass: 'game-end-force',
        iconClass: 'icon-force',
      }
    }

    // 超时
    if (reason === 'timeout') {
      return {
        icon: '⏰',
        title: '游 戏 超 时',
        subtitle: '长时间未操作，游戏已终止',
        bgClass: 'game-end-timeout',
        iconClass: 'icon-timeout',
      }
    }

    // 春天
    if (reason === 'spring') {
      return {
        icon: '🌸',
        title: '春 天！',
        subtitle: '完美碾压！积分翻倍',
        bgClass: 'game-end-spring',
        iconClass: 'icon-spring',
      }
    }

    // 反春天
    if (reason === 'anti_spring') {
      return {
        icon: '🌿',
        title: '反 春 天！',
        subtitle: '绝地反击！积分翻倍',
        bgClass: 'game-end-spring',
        iconClass: 'icon-spring',
      }
    }

    // 正常胜负
    if (isWinner) {
      return {
        icon: '🏆',
        title: '胜 利',
        subtitle: winnerName ? `${winnerName} 获胜！` : (isLandlord ? '地主大获全胜！' : '农民团结胜利！'),
        bgClass: 'game-end-win',
        iconClass: 'icon-win',
      }
    } else {
      return {
        icon: '💔',
        title: '失 败',
        subtitle: isLandlord ? '地主黯然离场' : '农民惜败收场',
        bgClass: 'game-end-lose',
        iconClass: 'icon-lose',
      }
    }
  }

  const resultConfig = getResultConfig()

  return (
    <div 
      className={`game-end-transition ${phase === 'result' ? 'show-result' : ''} ${config.showShake ? 'screen-shake' : ''}`}
      onClick={handleSkip}
    >
      {/* 背景遮罩 */}
      <div className="game-end-backdrop" />
      
      {/* 过渡阶段：卡牌飞散效果 */}
      {phase === 'transition' && config.showParticles && (
        <div className="game-end-particles">
          {Array.from({ length: 24 }).map((_, i) => (
            <div 
              key={i} 
              className="card-particle"
              style={{ 
                '--delay': `${i * 0.1}s`,
                '--angle': `${i * 15}deg`,
                '--distance': `${120 + Math.random() * 150}px`,
              } as React.CSSProperties}
            >
              🃏
            </div>
          ))}
        </div>
      )}

      {/* 结果阶段：胜负大字 */}
      {phase === 'result' && (
        <div className={`game-end-result ${resultConfig.bgClass}`}>
          {/* 胜利粒子效果 */}
          {isWinner && reason !== 'flow' && reason !== 'quit' && reason !== 'force' && reason !== 'timeout' && (
            <div className="win-particles">
              {Array.from({ length: 20 }).map((_, i) => (
                <div 
                  key={i} 
                  className="confetti"
                  style={{ 
                    '--delay': `${i * 0.05}s`,
                    '--x': `${Math.random() * 100}%`,
                    '--color': ['#FFD700', '#FFA500', '#FF6347', '#FFD700', '#FFEC8B'][i % 5],
                  } as React.CSSProperties}
                />
              ))}
            </div>
          )}

          {/* 主内容 */}
          <div className="result-content">
            <div className={`result-icon ${resultConfig.iconClass}`}>
              {resultConfig.icon}
            </div>
            <h1 className="result-title">{resultConfig.title}</h1>
            <p className="result-subtitle">{resultConfig.subtitle}</p>
            
            {/* 春天/反春天额外提示 */}
            {(reason === 'spring' || reason === 'anti_spring') && (
              <div className="spring-badge">
                <span className="spring-multiplier">×2</span>
                <span className="spring-label">积分加成</span>
              </div>
            )}
          </div>

          {/* 点击跳过提示 */}
          <div className="skip-hint">点击任意处继续</div>
        </div>
      )}
    </div>
  )
}
