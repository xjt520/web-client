/**
 * 音效管理类
 * 管理游戏中的所有音效播放
 */
export class SoundManager {
  private enabled: boolean = true
  private sounds: Map<string, HTMLAudioElement> = new Map()
  private initialized: boolean = false

  constructor() {
    // 延迟初始化，等待用户交互后
  }

  /**
   * 初始化音效（需要用户交互后调用）
   */
  initialize() {
    if (this.initialized) return
    this.preloadSounds()
    this.initialized = true
  }

  private preloadSounds() {
    const soundFiles: Record<string, string> = {
      card: '/sounds/card.mp3',
      bomb: '/sounds/bomb.mp3',
      rocket: '/sounds/rocket.mp3',
      win: '/sounds/win.mp3',
      lose: '/sounds/lose.mp3',
      tick: '/sounds/tick.mp3',
      bid: '/sounds/bid.mp3',
      pass: '/sounds/pass.mp3',
      deal: '/sounds/deal.mp3',
    }

    Object.entries(soundFiles).forEach(([name, src]) => {
      try {
        const audio = new Audio(src)
        audio.preload = 'auto'
        audio.volume = 0.5
        this.sounds.set(name, audio)
      } catch (e) {
        console.warn(`Failed to load sound: ${name}`, e)
      }
    })
  }

  /**
   * 播放指定音效
   */
  play(soundName: string) {
    if (!this.enabled || !this.initialized) return

    const audio = this.sounds.get(soundName)
    if (audio) {
      audio.currentTime = 0
      audio.play().catch(() => {
        // 忽略播放错误（通常是用户未交互）
      })
    }
  }

  /**
   * 播放出牌音效
   */
  playCardSound() {
    this.play('card')
  }

  /**
   * 播放炸弹音效
   */
  playBombSound() {
    this.play('bomb')
  }

  /**
   * 播放火箭音效
   */
  playRocketSound() {
    this.play('rocket')
  }

  /**
   * 播放胜利音效
   */
  playWinSound() {
    this.play('win')
  }

  /**
   * 播放失败音效
   */
  playLoseSound() {
    this.play('lose')
  }

  /**
   * 播放倒计时音效
   */
  playTickSound() {
    this.play('tick')
  }

  /**
   * 播放叫分音效
   */
  playBidSound() {
    this.play('bid')
  }

  /**
   * 播放过牌音效
   */
  playPassSound() {
    this.play('pass')
  }

  /**
   * 播放发牌音效
   */
  playDealSound() {
    this.play('deal')
  }

  /**
   * 设置音效开关
   */
  setEnabled(enabled: boolean) {
    this.enabled = enabled
  }

  /**
   * 获取音效开关状态
   */
  isEnabled(): boolean {
    return this.enabled
  }

  /**
   * 设置音量 (0-1)
   */
  setVolume(volume: number) {
    const clampedVolume = Math.max(0, Math.min(1, volume))
    this.sounds.forEach((audio) => {
      audio.volume = clampedVolume
    })
  }
}

// 单例导出
export const soundManager = new SoundManager()
