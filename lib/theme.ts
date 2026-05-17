export const theme = {
  bg: '#fdf6f0',
  bgDeep: '#f9eee2',
  card: '#ffffff',
  cardSoft: '#fff8f2',
  border: '#f0e4d8',
  borderSoft: '#f7ebde',
  text: '#3d3530',
  textDim: '#9a8e85',
  accent: '#ff9a8b',
  accentSoft: '#ffd4cc',
  accentDeep: '#f47b6b',
  accentInk: '#7a2a20',
  good: '#a8d8b9',
  goodSoft: '#dcf0e3',
  goodDeep: '#6ab884',
  goodInk: '#2c5a3b',
  warn: '#f4c89a',
  warnSoft: '#fcecd8',
  warnInk: '#8a5a2e',
  bad: '#f0a5a9',
  badInk: '#c45a5f',
  primary: '#b8d4ed',
  primarySoft: '#dde9f4',
  lavender: '#d4c5e8',
  lavenderSoft: '#ebe3f4',
} as const;

export const gradient = {
  accent: ['#ffb8aa', '#f47b6b'] as const,
  accentSoft: ['#fff0eb', '#ffd9d0'] as const,
  lavender: ['#e0d2f0', '#bca3d8'] as const,
  good: ['#c8e9d2', '#6ab884'] as const,
  warm: ['#fff8f2', '#fde2d4'] as const,
  hero: ['#ffe9e0', '#ffd0c2', '#ffc0aa'] as const,
} as const;

export const shadow = {
  xs: {
    shadowColor: '#a0826e',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  sm: {
    shadowColor: '#a0826e',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  md: {
    shadowColor: '#a0826e',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 5,
  },
  lg: {
    shadowColor: '#a0826e',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 8,
  },
  glow: {
    shadowColor: '#f47b6b',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  float: {
    shadowColor: '#3d3530',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 20,
    elevation: 10,
  },
} as const;

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  pill: 999,
} as const;

export const typography = {
  display: { fontSize: 32, fontWeight: '800' as const, letterSpacing: -0.5 },
  h1: { fontSize: 26, fontWeight: '700' as const, letterSpacing: -0.3 },
  h2: { fontSize: 20, fontWeight: '700' as const, letterSpacing: -0.2 },
  h3: { fontSize: 16, fontWeight: '700' as const },
  section: { fontSize: 12, fontWeight: '700' as const, letterSpacing: 1.2, textTransform: 'uppercase' as const },
  body: { fontSize: 14, fontWeight: '400' as const, lineHeight: 21 },
  caption: { fontSize: 12, fontWeight: '500' as const, lineHeight: 17 },
  micro: { fontSize: 10, fontWeight: '600' as const, letterSpacing: 0.3 },
} as const;
