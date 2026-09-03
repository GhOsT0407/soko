import { Platform } from 'react-native'

export const T = {
  // Base
  bg: '#FFFFFF',
  surface: '#F9FAFB',
  surfaceHigh: '#F3F4F6',
  border: '#E5E7EB',
  borderStrong: '#D1D5DB',

  // Text
  text: '#111827',
  textSub: '#374151',
  muted: '#6B7280',
  faint: '#9CA3AF',

  // Accent — blue
  accent: '#1F62E0',
  accentLight: '#E7EFFE',
  accentMid: '#5587EC',
  accentDark: '#1A4FC0',

  // Green — positive / paid
  green: '#059669',
  greenLight: '#D1FAE5',
  greenDark: '#047857',

  // Amber — warning / partial
  warning: '#D97706',
  warningLight: '#FEF3C7',

  // Red — error / overdue
  error: '#DC2626',
  errorLight: '#FEE2E2',

  // Dark — headers / hero cards
  dark: '#0B1F3F',
  white: '#FFFFFF',
}

export const FONT = {
  mono: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
}
