export const SITE_NAME = 'Phonara'
export const BRAND = {
  primary: '#ff6b1f',
  primaryFg: '#0a0d1a',
  gold: '#f5b840',
  text: '#0a0d1a',
  muted: '#6b7280',
  bg: '#ffffff',
  card: '#fff7ec',
  radius: '14px',
}
export const main = { backgroundColor: '#ffffff', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', margin: 0, padding: 0 }
export const container = { padding: '32px 28px', maxWidth: '560px', margin: '0 auto' }
export const h1 = { fontSize: '22px', fontWeight: 800, color: BRAND.text, margin: '0 0 16px' }
export const text = { fontSize: '14px', color: '#374151', lineHeight: 1.6, margin: '0 0 16px' }
export const muted = { fontSize: '12px', color: BRAND.muted, margin: '24px 0 0' }
export const card = { backgroundColor: BRAND.card, borderRadius: BRAND.radius, padding: '20px', margin: '16px 0', border: '1px solid #ffe2c4' }
export const amountStyle = { fontSize: '28px', fontWeight: 900, color: BRAND.primary, margin: '4px 0' }
export const labelStyle = { fontSize: '11px', color: BRAND.muted, textTransform: 'uppercase' as const, letterSpacing: '0.5px' }
