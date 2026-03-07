import { useEffect, useRef, useMemo } from 'react'
import { soundManager } from '../lib/SoundManager'

interface UseAudioReturn {
  // 初始化（需要用户交互后调用）
  initialize: () => void

  // 音效控制
  playCard: (cardValue?: number) => void
  playCombination: (combinationType: string, cards?: number[]) => void
  playBomb: () => void
  playRocket: () => void
  playWin: () => void
  playLose: () => void
  playTick: () => void
  playBid: () => void
  playPass: () => void
  playDeal: () => void

  // 背景音乐控制
  playGameMusic: () => void
  playLobbyMusic: () => void
  stopMusic: () => void
  pauseMusic: () => void
  resumeMusic: () => void

  // 设置同步
  setSoundEnabled: (enabled: boolean) => void
  setMusicEnabled: (enabled: boolean) => void
}

// 使用 ref 存储稳定的回调函数
const stableCallbacks = {
  initialize: () => soundManager.initialize(),
  playCard: (cardValue?: number) => {
    if (cardValue !== undefined) {
      soundManager.playCardSound(cardValue)
    }
  },
  playCombination: (combinationType: string, cards?: number[]) => {
    soundManager.playCombinationSound(combinationType, cards)
  },
  playBomb: () => soundManager.playBombSound(),
  playRocket: () => soundManager.playRocketSound(),
  playWin: () => soundManager.playWinSound(),
  playLose: () => soundManager.playLoseSound(),
  playTick: () => soundManager.playTickSound(),
  playBid: () => soundManager.playBidSound(),
  playPass: () => soundManager.playPassSound(),
  playDeal: () => soundManager.playDealSound(),
  playGameMusic: () => soundManager.playBackgroundMusic('game'),
  playLobbyMusic: () => soundManager.playBackgroundMusic('lobby'),
  stopMusic: () => soundManager.stopBackgroundMusic(),
  pauseMusic: () => soundManager.pauseBackgroundMusic(),
  resumeMusic: () => soundManager.resumeBackgroundMusic(),
  setSoundEnabled: (enabled: boolean) => soundManager.setSoundEnabled(enabled),
  setMusicEnabled: (enabled: boolean) => soundManager.setMusicEnabled(enabled),
}

/**
 * 统一音频管理 Hook
 * 整合音效和背景音乐控制
 */
export function useAudio(soundEnabled: boolean, musicEnabled: boolean): UseAudioReturn {
  // 使用 ref 追踪上一次的值，避免不必要的更新
  const prevSoundEnabled = useRef(soundEnabled)
  const prevMusicEnabled = useRef(musicEnabled)

  // 同步音效开关（只在值变化时同步）
  useEffect(() => {
    if (prevSoundEnabled.current !== soundEnabled) {
      prevSoundEnabled.current = soundEnabled
      soundManager.setSoundEnabled(soundEnabled)
    }
  }, [soundEnabled])

  // 同步背景音乐开关（只在值变化时同步）
  useEffect(() => {
    if (prevMusicEnabled.current !== musicEnabled) {
      prevMusicEnabled.current = musicEnabled
      soundManager.setMusicEnabled(musicEnabled)
    }
  }, [musicEnabled])

  // 返回稳定的引用
  return useMemo(() => ({
    initialize: stableCallbacks.initialize,
    playCard: stableCallbacks.playCard,
    playCombination: stableCallbacks.playCombination,
    playBomb: stableCallbacks.playBomb,
    playRocket: stableCallbacks.playRocket,
    playWin: stableCallbacks.playWin,
    playLose: stableCallbacks.playLose,
    playTick: stableCallbacks.playTick,
    playBid: stableCallbacks.playBid,
    playPass: stableCallbacks.playPass,
    playDeal: stableCallbacks.playDeal,
    playGameMusic: stableCallbacks.playGameMusic,
    playLobbyMusic: stableCallbacks.playLobbyMusic,
    stopMusic: stableCallbacks.stopMusic,
    pauseMusic: stableCallbacks.pauseMusic,
    resumeMusic: stableCallbacks.resumeMusic,
    setSoundEnabled: stableCallbacks.setSoundEnabled,
    setMusicEnabled: stableCallbacks.setMusicEnabled,
  }), [])
}
