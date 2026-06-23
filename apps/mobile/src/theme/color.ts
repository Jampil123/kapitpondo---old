// apps/mobile/src/theme/colors.ts
// Arctic Pearl palette — the single source of truth for colors in JS/TS.
// (Also mirrored in tailwind.config.js so NativeWind classes match.)

export const colors = {
  // Core Arctic Pearl palette
  base: '#F7FBFD',   // app background
  card: '#D6E6EF',   // cards, inputs, secondary surfaces
  accent: '#7FA6B8', // secondary accents, icons, muted text
  navy: '#2A3E4B',   // primary buttons, headings, key text

  white: '#FFFFFF',

  // Muted status colors (harmonized with the palette)
  status: {
    approved: '#5B8C6E', // soft green
    pending: '#C9A24B',  // soft amber
    rejected: '#B26B6B', // soft red
    neutral: '#7FA6B8',  // mid blue
  },

  // Text
  text: {
    primary: '#2A3E4B',
    secondary: '#7FA6B8',
    onNavy: '#FFFFFF',
  },
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  full: 999,
} as const;