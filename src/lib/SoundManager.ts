/**
 * 音效和背景音乐管理类
 * 管理游戏中的所有音效和背景音乐播放
 *
 * 音效文件命名规则：
 * - 单张: 101-115.mp3 (1xx)
 * - 对子: 201-213.mp3 (2xx)
 * - 三张: 301-313.mp3 (3xx)
 *
 * 牌值映射: 0-12 对应 3,4,5,6,7,8,9,10,J,Q,K,A,2
 * 音效编号: 01=A, 02=2, 03=3, 04=4, ..., 13=K
 * 单张还有: 14=小王, 15=大王
 */

// 牌值到音效编号的映射
// 牌值: 0=3, 1=4, 2=5, ..., 10=K, 11=A, 12=2
// 音效: 03=3, 04=4, 05=5, ..., 13=K, 01=A, 02=2
function getSoundIndex(cardValue: number): string {
  // 小王和大王只在单张时有专用音效
  if (cardValue === 13) return '14' // 小王
  if (cardValue === 14) return '15' // 大王
  // 普通牌映射
  // 牌值 0-10 (3-K) 对应音效 03-13
  // 牌值 11-12 (A-2) 对应音效 01-02
  if (cardValue <= 10) {
    // 3-K: 牌值0→03, 牌值10→13
    return String(cardValue + 3).padStart(2, '0')
  } else {
    // A(11)→01, 2(12)→02
    return String(cardValue - 10).padStart(2, '0')
  }
}

// 牌型到语音文件的映射
const COMBINATION_TO_SOUND: Record<string, string> = {
  'Bomb': '/sounds/zhadan.mp3',
  'Rocket': '/sounds/wangzha.mp3',
  'Straight': '/sounds/shunzi.mp3',
  'DoubleStraight': '/sounds/liandui.mp3',
  'TripleStraight': '/sounds/feiji.mp3',
  'Airplane': '/sounds/feiji.mp3',
  'AirplaneWithSingle': '/sounds/feiji.mp3',
  'AirplaneWithPair': '/sounds/feiji.mp3',
  'TripleWithSingle': '/sounds/sandaiyi.mp3',
  'TripleWithPair': '/sounds/sandaiyidui.mp3',
  'FourWithTwo': '/sounds/sidaier.mp3',
}

export class SoundManager {
  private soundEnabled: boolean = true
  private musicEnabled: boolean = true
  private sounds: Map<string, HTMLAudioElement> = new Map()
  private backgroundMusic: HTMLAudioElement | null = null
  private currentMusicName: string | null = null
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
    this.preloadBackgroundMusic()
    this.initialized = true
  }

  private preloadSounds() {
    const soundFiles: Record<string, string> = {
      // 基础音效
      win: '/sounds/win.mp3',
      lose: '/sounds/lose.mp3',
      tick: '/sounds/tick.mp3',
      bid: '/sounds/order.mp3',
      noorder: '/sounds/noorder.mp3',
      jiabei1: '/sounds/jiabei1.mp3',
      jiabei0: '/sounds/jiabei0.mp3',
      pass: '/sounds/buyao1.mp3',
      deal: '/sounds/deal.mp3',
      start: '/sounds/start.mp3',
      // 牌型语音
      bomb: '/sounds/zhadan.mp3',
      rocket: '/sounds/wangzha.mp3',
      shunzi: '/sounds/shunzi.mp3',
      liandui: '/sounds/liandui.mp3',
      feiji: '/sounds/feiji.mp3',
      sandaiyi: '/sounds/sandaiyi.mp3',
      sandaiyidui: '/sounds/sandaiyidui.mp3',
      sidaier: '/sounds/sidaier.mp3',
    }

    Object.entries(soundFiles).forEach(([name, src]) => {
      try {
        const audio = new Audio(src)
        audio.preload = 'auto'
        audio.volume = 0.6
        this.sounds.set(name, audio)
      } catch (e) {
        console.warn(`Failed to load sound: ${name}`, e)
      }
    })
  }

  private preloadBackgroundMusic() {
    try {
      this.backgroundMusic = new Audio('/music/game.mp3')
      this.backgroundMusic.preload = 'auto'
      this.backgroundMusic.loop = true
      this.backgroundMusic.volume = 0.3
    } catch (e) {
      console.warn('Failed to load background music', e)
    }
  }

  /**
   * 播放指定音效
   */
  play(soundName: string) {
    if (!this.soundEnabled || !this.initialized) return

    // 动态加载音效（如果还没加载）
    let audio = this.sounds.get(soundName)
    if (!audio) {
      audio = new Audio(soundName)
      audio.volume = 0.6
      this.sounds.set(soundName, audio)
    }

    audio.currentTime = 0
    audio.play().catch(() => {
      // 忽略播放错误（通常是用户未交互）
    })
  }

  /**
   * 播放单张牌语音
   * @param cardValue 牌值 (0-14: 3,4,5,6,7,8,9,10,J,Q,K,A,2,小王,大王)
   */
  playCardSound(cardValue: number) {
    const soundIndex = getSoundIndex(cardValue)
    this.play(`/sounds/1${soundIndex}.mp3`)
  }

  /**
   * 播放对子牌语音
   * @param cardValue 牌值 (0-12: 3,4,5,6,7,8,9,10,J,Q,K,A,2)
   */
  playPairSound(cardValue: number) {
    // 对子只有普通牌的音效 (201-213)
    if (cardValue > 12) {
      // 王牌对子不存在，使用单张音效
      this.playCardSound(cardValue)
      return
    }
    const soundIndex = getSoundIndex(cardValue)
    this.play(`/sounds/2${soundIndex}.mp3`)
  }

  /**
   * 播放三张牌语音
   * @param cardValue 牌值 (0-12: 3,4,5,6,7,8,9,10,J,Q,K,A,2)
   */
  playTripleSound(cardValue: number) {
    // 三张只有普通牌的音效 (301-313)
    if (cardValue > 12) {
      // 王牌三张不存在，使用单张音效
      this.playCardSound(cardValue)
      return
    }
    const soundIndex = getSoundIndex(cardValue)
    this.play(`/sounds/3${soundIndex}.mp3`)
  }

  /**
   * 根据牌型播放语音
   * @param combinationType 牌型 (服务端返回的 Rust 枚举 Debug 格式)
   * @param cards 出的牌（用于单张/对子/三张时播放对应牌值）
   */
  playCombinationSound(combinationType: string, cards?: number[]) {
    // 炸弹和王炸播放特殊语音
    if (combinationType === 'Bomb') {
      this.play('/sounds/zhadan.mp3')
      return
    }
    if (combinationType === 'Rocket') {
      this.play('/sounds/wangzha.mp3')
      return
    }

    // 其他特殊牌型播放对应语音
    const soundPath = COMBINATION_TO_SOUND[combinationType]
    if (soundPath) {
      this.play(soundPath)
      return
    }

    // 单张、对子、三张播放对应牌值的语音
    if (cards && cards.length > 0) {
      // 获取最大牌值
      // 卡牌编码: 0-51 普通牌, 52 小王, 53 大王
      // 牌值: 0-12 对应 3,4,5,6,7,8,9,10,J,Q,K,A,2; 13 小王; 14 大王
      const getCardValue = (c: number): number => {
        if (c === 52) return 13 // 小王
        if (c === 53) return 14 // 大王
        return c % 13 // 普通牌 0-12
      }
      const maxValue = Math.max(...cards.map(getCardValue))

      // 根据牌型选择音效
      switch (combinationType) {
        case 'Single':
          this.playCardSound(maxValue)
          break
        case 'Pair':
          this.playPairSound(maxValue)
          break
        case 'Triple':
          this.playTripleSound(maxValue)
          break
        default:
          // 未知牌型，使用单张音效
          this.playCardSound(maxValue)
      }
    }
  }

  /**
   * 播放炸弹音效
   */
  playBombSound() {
    this.play('/sounds/zhadan.mp3')
  }

  /**
   * 播放火箭音效
   */
  playRocketSound() {
    this.play('/sounds/wangzha.mp3')
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
   * 播放叫分音效（根据分数）
   */
  playBidScoreSound(score: number) {
    // 1分、2分、3分都播放叫地主音效
    if (score >= 1 && score <= 3) {
      this.play('bid')
    }
  }

  /**
   * 播放叫分音效
   */
  playBidSound() {
    this.play('bid')
  }

  /**
   * 播放不叫音效
   */
  playNoBidSound() {
    this.play('noorder')
  }

  /**
   * 播放加倍音效
   */
  playDoubleSound() {
    this.play('jiabei1')
  }

  /**
   * 播放不加倍音效
   */
  playNoDoubleSound() {
    this.play('jiabei0')
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
   * 播放游戏开始音效
   */
  playStartSound() {
    this.play('start')
  }

  /**
   * 播放快捷语语音
   * @param soundFile 音频文件路径
   */
  playQuickChatSound(soundFile: string) {
    this.play(soundFile)
  }

  /**
   * 播放背景音乐
   */
  playBackgroundMusic(musicName: 'game' | 'lobby' = 'game') {
    if (!this.musicEnabled || !this.initialized) return

    // 如果已经在播放相同的音乐，不做任何操作
    if (this.currentMusicName === musicName && this.backgroundMusic && !this.backgroundMusic.paused) {
      return
    }

    // 停止当前音乐
    this.stopBackgroundMusic()

    // 更新音乐源
    if (this.backgroundMusic) {
      this.backgroundMusic.src = `/music/${musicName}.mp3`
      this.currentMusicName = musicName
      this.backgroundMusic.play().catch(() => {
        // 忽略播放错误（通常是用户未交互）
      })
    }
  }

  /**
   * 停止背景音乐
   */
  stopBackgroundMusic() {
    if (this.backgroundMusic) {
      this.backgroundMusic.pause()
      this.backgroundMusic.currentTime = 0
      this.currentMusicName = null
    }
  }

  /**
   * 暂停背景音乐
   */
  pauseBackgroundMusic() {
    if (this.backgroundMusic) {
      this.backgroundMusic.pause()
    }
  }

  /**
   * 恢复背景音乐
   */
  resumeBackgroundMusic() {
    if (this.musicEnabled && this.backgroundMusic && this.currentMusicName) {
      this.backgroundMusic.play().catch(() => {
        // 忽略播放错误
      })
    }
  }

  /**
   * 设置音效开关
   */
  setSoundEnabled(enabled: boolean) {
    this.soundEnabled = enabled
  }

  /**
   * 设置背景音乐开关
   */
  setMusicEnabled(enabled: boolean) {
    this.musicEnabled = enabled
    if (!enabled) {
      this.stopBackgroundMusic()
    }
  }

  /**
   * 获取音效开关状态
   */
  isSoundEnabled(): boolean {
    return this.soundEnabled
  }

  /**
   * 获取背景音乐开关状态
   */
  isMusicEnabled(): boolean {
    return this.musicEnabled
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
