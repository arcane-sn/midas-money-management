// Transcribed 1:1 from the Modernist design-system tokens and the concrete
// hex values used throughout Midas.dc.html — do not re-derive these.
export const colors = {
  ink: '#201e1d',
  bg: '#f3f2f2',
  surface: '#eae7e7',
  surfaceAlt: '#f8f4f4',
  white: '#ffffff',
  dividerStrong: '#201e1d',
  dividerSoft12: 'rgba(32,30,29,0.12)',
  dividerSoft14: 'rgba(32,30,29,0.14)',
  dividerSoft16: 'rgba(32,30,29,0.16)',
  textFaint: '#9b9797',
  textMuted: '#7d7979',
  textSecondary: '#605d5d',
  textSecondaryDark: '#444141',
  accentLink: '#8a5f0b',
  accentGold: '#c08a1e',
  danger: '#ae1800',
} as const;

export type ColorToken = keyof typeof colors;
