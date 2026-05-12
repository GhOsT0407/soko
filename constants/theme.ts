import { Platform } from 'react-native'

export const T = {
  // Backgrounds
  bg: '#F4F3FF',
  surface: '#FFFFFF',
  card: '#EEEAFF',
  border: '#D9D4F5',

  // Primary accent — vivid violet
  accent: '#7C3AED',
  accentLight: '#EDE9FE',
  accentDark: '#5B21B6',
  accentMid: '#8B5CF6',

  // Revenue / money — warm amber-gold
  revenue: '#F59E0B',
  revenueLight: '#FFFBEB',
  revenueDark: '#D97706',

  // Positive / profit — vibrant emerald
  green: '#10B981',
  greenLight: '#D1FAE5',
  greenDark: '#059669',

  // Text
  text: '#0C0920',
  muted: '#5C5680',
  faint: '#9B97BF',

  // Header / dark surfaces
  dark: '#1A1048',

  // States
  warning: '#F59E0B',
  warningLight: '#FEF3C7',
  error: '#EF4444',
  errorLight: '#FEE2E2',

  // Glassmorphism — used on dark (T.dark) backgrounds
  glass: 'rgba(255,255,255,0.08)',
  glassBorder: 'rgba(255,255,255,0.1)',
  glassTopBorder: 'rgba(255,255,255,0.22)',

  // Elevated card on light bg (high-contrast green tint)
  cardHigh: '#DCFCE7',

  // Text-shadow glow variants (used with textShadowColor)
  accentGlow: 'rgba(124,58,237,0.45)',
  greenGlow: 'rgba(16,185,129,0.45)',
  revenueGlow: 'rgba(245,158,11,0.45)',
  warningGlow: 'rgba(245,158,11,0.35)',
} as const

export const FONT = {
  serif: Platform.select({ ios: 'Georgia', android: 'serif', default: 'Georgia' }),
  mono: Platform.select({ ios: 'Courier New', android: 'monospace', default: 'monospace' }),
}
