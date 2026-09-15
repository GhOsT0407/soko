// Soko design tokens — "Warm Market" ground + "Ledger Green" primary.
//
// Cream paper surfaces (the notebook Soko replaces) with a teal primary that
// stays legible in direct sunlight. Every screen imports `T` from here; there
// are no hardcoded colours in screen files.

export const T = {
  // Base — warm cream paper
  bg: '#FDF7E8',
  surface: '#FFFCF5',
  surfaceHigh: '#F3ECDB', // chips, segmented track, note cards
  border: '#EADFCB',
  borderStrong: '#D9CDB5',

  // Text — warm ink
  text: '#2E2620',
  textSub: '#5C4D3F',
  muted: '#7D6B56',
  faint: '#A99A8A',

  // Accent — teal
  accent: '#227472',
  accentLight: '#DDEEE8',
  accentMid: '#3E8F8C',
  accentDark: '#1A5E5C',

  // Green — paid / positive
  green: '#2F6B4F',
  greenLight: '#DCEEDD',
  greenDark: '#245640',

  // Amber — partial / low stock
  warning: '#A2691C',
  warningLight: '#F5E6C6',

  // Red — overdue / error
  error: '#B8402B',
  errorLight: '#F6DED6',

  // Dark — deep teal for modal headers
  dark: '#173B3A',
  white: '#FFFFFF',

  // Brand colour of the one third-party surface we deep-link into
  whatsapp: '#25D366',
}

// Font faces are loaded in app/_layout.tsx via expo-font. The weight is baked
// into the face name, so never pair these with `fontWeight` — on iOS that can
// silently drop the custom face.
export const FONT = {
  sans: 'InstrumentSans_400Regular',
  sansMedium: 'InstrumentSans_500Medium',
  sansSemi: 'InstrumentSans_600SemiBold',
  sansBold: 'InstrumentSans_700Bold',
  serif: 'Lora_500Medium',
  serifSemi: 'Lora_600SemiBold',
  serifItalic: 'Lora_500Medium_Italic',
  mono: 'JetBrainsMono_500Medium',
  monoBold: 'JetBrainsMono_700Bold',
}

export const SP = { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 28 }

export const R = { sm: 8, md: 12, lg: 14, xl: 20, pill: 999 }

// Warm paper shadow (theme's 2/3px offset) on iOS; a single elevation step on
// Android, where the shadow props are ignored.
export const SHADOW = {
  card: {
    shadowColor: '#4A3F35',
    shadowOffset: { width: 2, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 5,
    elevation: 1,
  },
  raised: {
    shadowColor: '#4A3F35',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.16,
    shadowRadius: 12,
    elevation: 4,
  },
}
