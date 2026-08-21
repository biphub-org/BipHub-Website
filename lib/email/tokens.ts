/**
 * Shared design tokens for React Email templates.
 *
 * React Email runs outside Tailwind — inline styles must use hex literals.
 * These tokens mirror the EU palette tokens defined in app/globals.css.
 *
 * Source: 03-UI-SPEC.md Email Template Visual Contract.
 */
export const EMAIL_TOKENS = {
  euBlue: '#003399',
  euBlueDark: '#002270',
  euGold: '#FFCC00',
  euGoldSoft: '#fff4cc',
  ink: '#0a1735',
  ink2: '#2c3658',
  muted: '#6b7390',
  border: '#e5e8f0',
  bgSoft: '#f7f8fc',
  white: '#ffffff',

  pad: '24px',
  gap: '16px',
  smallGap: '8px',

  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
  bodySize: '16px',
  bodyLineHeight: '1.6',
  smallSize: '14px',
  smallLineHeight: '1.5',
  headingSize: '22px',
  headingWeight: 700,
  bodyWeight: 400,
  semiboldWeight: 600,

  borderRadius: '6px',
  pillRadius: '999px',
} as const
