/**
 * 等级计算工具
 * 根据积分计算玩家等级和经验值
 */

export interface LevelInfo {
  level: number
  exp: number
  nextLevelExp: number
  title: string
  progress: number
}

// 等级称号配置
const LEVEL_TITLES: { minLevel: number; title: string }[] = [
  { minLevel: 1, title: '新手' },
  { minLevel: 5, title: '初级' },
  { minLevel: 10, title: '中级' },
  { minLevel: 20, title: '高级' },
  { minLevel: 30, title: '专家' },
  { minLevel: 40, title: '大师' },
  { minLevel: 50, title: '宗师' },
  { minLevel: 60, title: '王者' },
  { minLevel: 70, title: '传奇' },
  { minLevel: 80, title: '至尊' },
  { minLevel: 90, title: '神话' },
  { minLevel: 100, title: '永恒' },
]

// 基础配置
const BASE_LEVEL = 1
const BASE_SCORE = 1000 // 初始积分
const SCORE_PER_LEVEL = 200 // 每级需要的积分
const MAX_LEVEL = 100

/**
 * 根据积分计算等级信息
 */
export function calculateLevel(score: number | bigint): LevelInfo {
  // 转换为 number 类型
  const numScore = typeof score === 'bigint' ? Number(score) : score

  // 计算等级
  const scoreAboveBase = Math.max(0, numScore - BASE_SCORE)
  const level = Math.min(BASE_LEVEL + Math.floor(scoreAboveBase / SCORE_PER_LEVEL), MAX_LEVEL)

  // 当前等级的起始积分
  const currentLevelScore = BASE_SCORE + (level - 1) * SCORE_PER_LEVEL

  // 下一级需要的积分
  const nextLevelScore = level < MAX_LEVEL
    ? BASE_SCORE + level * SCORE_PER_LEVEL
    : currentLevelScore

  // 当前经验值
  const exp = Math.max(0, numScore - currentLevelScore)

  // 升级所需经验值
  const nextLevelExp = level < MAX_LEVEL
    ? nextLevelScore - currentLevelScore
    : 0

  // 升级进度百分比
  const progress = level < MAX_LEVEL && nextLevelExp > 0
    ? Math.min(100, (exp / nextLevelExp) * 100)
    : 100

  // 获取称号
  const title = getTitle(level)

  return {
    level,
    exp,
    nextLevelExp,
    title,
    progress,
  }
}

/**
 * 根据等级获取称号
 */
export function getTitle(level: number): string {
  let title = '新手'
  for (const config of LEVEL_TITLES) {
    if (level >= config.minLevel) {
      title = config.title
    }
  }
  return title
}

/**
 * 计算胜率
 */
export function calculateWinRate(wins: number, totalGames: number): number {
  if (totalGames === 0) return 0
  return Math.round((wins / totalGames) * 100)
}

/**
 * 格式化积分显示
 */
export function formatScore(score: number | bigint): string {
  const numScore = typeof score === 'bigint' ? Number(score) : score
  if (numScore >= 10000) {
    return (numScore / 10000).toFixed(1) + '万'
  }
  return numScore.toString()
}

/**
 * 获取等级颜色
 */
export function getLevelColor(level: number): string {
  if (level >= 90) return 'text-purple-400'
  if (level >= 70) return 'text-orange-400'
  if (level >= 50) return 'text-red-400'
  if (level >= 30) return 'text-yellow-400'
  if (level >= 10) return 'text-blue-400'
  return 'text-gray-400'
}

/**
 * 获取等级进度条颜色
 */
export function getLevelProgressColor(level: number): string {
  if (level >= 90) return 'from-purple-500 to-pink-500'
  if (level >= 70) return 'from-orange-500 to-red-500'
  if (level >= 50) return 'from-red-500 to-yellow-500'
  if (level >= 30) return 'from-yellow-500 to-green-500'
  if (level >= 10) return 'from-blue-500 to-cyan-500'
  return 'from-gray-500 to-gray-400'
}
