export type ThemeId = 'classic' | 'chinese' | 'cyber' | 'spring'

export interface TableTheme {
  id: ThemeId
  name: string
  description: string
  background: {
    primary: string
    secondary: string
    gradient: string
  }
  card: {
    backColor: string
    borderColor: string
    glowColor?: string
  }
  table: {
    borderColor: string
    feltColor: string
  }
  accent: string
  textPrimary: string
  textSecondary: string
}

export const THEMES: Record<ThemeId, TableTheme> = {
  classic: {
    id: 'classic',
    name: '经典绿',
    description: '传统牌桌风格',
    background: {
      primary: '#14532d',
      secondary: '#1e3a1e',
      gradient: 'from-green-900 to-gray-900',
    },
    card: {
      backColor: '#1e40af',
      borderColor: '#ffffff',
    },
    table: {
      borderColor: '#854d0e',
      feltColor: '#166534',
    },
    accent: '#fbbf24',
    textPrimary: '#ffffff',
    textSecondary: '#d1d5db',
  },
  chinese: {
    id: 'chinese',
    name: '中国风',
    description: '水墨山水意境',
    background: {
      primary: '#1c1917',
      secondary: '#292524',
      gradient: 'from-stone-900 via-stone-800 to-stone-900',
    },
    card: {
      backColor: '#7c2d12',
      borderColor: '#d6d3d1',
    },
    table: {
      borderColor: '#78716c',
      feltColor: '#44403c',
    },
    accent: '#dc2626',
    textPrimary: '#fafaf9',
    textSecondary: '#a8a29e',
  },
  cyber: {
    id: 'cyber',
    name: '赛博朋克',
    description: '霓虹城市夜景',
    background: {
      primary: '#0f0a1e',
      secondary: '#1a0a2e',
      gradient: 'from-purple-950 via-slate-900 to-purple-950',
    },
    card: {
      backColor: '#581c87',
      borderColor: '#c084fc',
      glowColor: '#a855f7',
    },
    table: {
      borderColor: '#7c3aed',
      feltColor: '#1e1b4b',
    },
    accent: '#06b6d4',
    textPrimary: '#f0abfc',
    textSecondary: '#a78bfa',
  },
  spring: {
    id: 'spring',
    name: '春节限定',
    description: '红金喜庆配色',
    background: {
      primary: '#7f1d1d',
      secondary: '#450a0a',
      gradient: 'from-red-900 via-red-950 to-red-900',
    },
    card: {
      backColor: '#b91c1c',
      borderColor: '#fbbf24',
      glowColor: '#f59e0b',
    },
    table: {
      borderColor: '#fbbf24',
      feltColor: '#991b1b',
    },
    accent: '#fbbf24',
    textPrimary: '#fef3c7',
    textSecondary: '#fcd34d',
  },
}

export const DEFAULT_THEME: ThemeId = 'classic'

export function getTheme(themeId: ThemeId | string): TableTheme {
  return THEMES[themeId as ThemeId] || THEMES[DEFAULT_THEME]
}

export function getThemeList(): TableTheme[] {
  return Object.values(THEMES)
}
