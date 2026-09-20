// Shared branding helper for all outbound emails (auth + transactional + receipts).
// Reads identity (name, logo, colors) from cms_theme and an optional campaign
// coupon block from site_settings.email_campaign (manual) with fallback to the
// most recent active discount_codes row.

export interface EmailBrandColors {
  primary: string
  primaryFg: string
  accent: string
}

export interface EmailCoupon {
  headline: string
  code?: string
  description?: string
}

export interface EmailBranding {
  storeName: string
  logoUrl: string
  siteUrl: string
  colors: EmailBrandColors
  activeCoupon: EmailCoupon | null
}

const DEFAULT_COLORS: EmailBrandColors = {
  primary: '#d10078',
  primaryFg: '#ffffff',
  accent: '#b77900',
}

const OFFICIAL_STORE_NAME = 'O Garimpo Digital'
const OFFICIAL_SITE_URL = 'https://ogarimpodigital.com.br'
const OFFICIAL_LOGO_URL = 'https://ogarimpodigital.com.br/__l5e/assets-v1/f92206c5-3e2c-438c-9a85-78016eff682a/logo-o-garimpo-digital.png'

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n))
}

function toHex(n: number) {
  const v = Math.round(clamp(n, 0, 255))
  return v.toString(16).padStart(2, '0')
}

// Accepts CSS-style HSL like "0 0% 12%" or "hsl(0 0% 12%)" and returns "#rrggbb".
export function hslStringToHex(raw: string | undefined | null, fallback: string): string {
  if (!raw) return fallback
  const cleaned = String(raw).trim().replace(/^hsla?\(/, '').replace(/\)$/, '').replace(/,/g, ' ')
  const parts = cleaned.split(/\s+/).filter(Boolean)
  if (parts.length < 3) return fallback
  const h = parseFloat(parts[0])
  const s = parseFloat(parts[1]) / 100
  const l = parseFloat(parts[2]) / 100
  if (!Number.isFinite(h) || !Number.isFinite(s) || !Number.isFinite(l)) return fallback
  const c = (1 - Math.abs(2 * l - 1)) * s
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1))
  const m = l - c / 2
  let r = 0, g = 0, b = 0
  if (h < 60) { r = c; g = x; b = 0 }
  else if (h < 120) { r = x; g = c; b = 0 }
  else if (h < 180) { r = 0; g = c; b = x }
  else if (h < 240) { r = 0; g = x; b = c }
  else if (h < 300) { r = x; g = 0; b = c }
  else { r = c; g = 0; b = x }
  return '#' + toHex((r + m) * 255) + toHex((g + m) * 255) + toHex((b + m) * 255)
}

function pickContrast(hex: string): string {
  const v = hex.replace('#', '')
  if (v.length !== 6) return '#ffffff'
  const r = parseInt(v.slice(0, 2), 16)
  const g = parseInt(v.slice(2, 4), 16)
  const b = parseInt(v.slice(4, 6), 16)
  // Luminance perceptual approximation
  const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255
  return lum > 0.6 ? '#0a0a0a' : '#ffffff'
}

function formatCouponHeadline(code: string, type: string | null, value: number | null): string {
  if (!value || value <= 0) return `Use o cupom **${code}**`
  if (type === 'fixed') {
    const fmt = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)
    return `${fmt} OFF com o cupom **${code}**`
  }
  const pct = Number.isInteger(value) ? value : value.toFixed(1)
  return `${pct}% OFF com o cupom **${code}**`
}

function formatExpires(expiresAt: string | null): string | undefined {
  if (!expiresAt) return undefined
  try {
    const d = new Date(expiresAt)
    return `Válido até ${d.toLocaleDateString('pt-BR')}`
  } catch {
    return undefined
  }
}

// deno-lint-ignore no-explicit-any
export async function getEmailBranding(supabase: any): Promise<EmailBranding> {
  // CMS theme (logo, name, colors)
  const [{ data: theme }, { data: integ }, { data: campaign }] = await Promise.all([
    supabase.from('cms_theme').select('name, logo_url, colors').maybeSingle(),
    supabase.from('site_settings').select('value').eq('key', 'integrations').maybeSingle(),
    supabase.from('site_settings').select('value').eq('key', 'email_campaign').maybeSingle(),
  ])

  const integValue = (integ?.value || {}) as Record<string, any>
  const storeName = OFFICIAL_STORE_NAME

  const logoUrl = OFFICIAL_LOGO_URL

  const themeColors = (theme?.colors || {}) as Record<string, string>
  const primary = hslStringToHex(themeColors.primary, DEFAULT_COLORS.primary)
  const accent = hslStringToHex(themeColors.accent, DEFAULT_COLORS.accent)
  const colors: EmailBrandColors = {
    primary,
    primaryFg: pickContrast(primary),
    accent,
  }

  // Derive site URL from sender domain (root) or fallback to integrations
  const siteUrl = OFFICIAL_SITE_URL

  // Manual campaign coupon (overrides automatic)
  const campaignValue = (campaign?.value || {}) as Record<string, any>
  let activeCoupon: EmailCoupon | null = null
  if (campaignValue.enabled && typeof campaignValue.headline === 'string' && campaignValue.headline.trim()) {
    activeCoupon = {
      headline: String(campaignValue.headline).trim(),
      code: campaignValue.code ? String(campaignValue.code).trim() : undefined,
      description: campaignValue.description ? String(campaignValue.description).trim() : undefined,
    }
  } else {
    // Auto fallback: latest active discount code
    const nowIso = new Date().toISOString()
    const { data: codes } = await supabase
      .from('discount_codes')
      .select('code, type, value, expires_at, starts_at')
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(5)
    const row = (codes || []).find((c: any) =>
      (!c.starts_at || c.starts_at <= nowIso) &&
      (!c.expires_at || c.expires_at > nowIso)
    )
    if (row?.code) {
      activeCoupon = {
        headline: formatCouponHeadline(row.code, row.type, Number(row.value)),
        code: row.code,
        description: formatExpires(row.expires_at),
      }
    }
  }

  return { storeName, logoUrl, siteUrl, colors, activeCoupon }
}

export function brandingFallback(_siteName = OFFICIAL_STORE_NAME): EmailBranding {
  return {
    storeName: OFFICIAL_STORE_NAME,
    logoUrl: OFFICIAL_LOGO_URL,
    siteUrl: OFFICIAL_SITE_URL,
    colors: { ...DEFAULT_COLORS },
    activeCoupon: null,
  }
}