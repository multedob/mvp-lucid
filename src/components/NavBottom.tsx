// src/components/NavBottom.tsx
// Shared bottom navigation for all pages
// Mobile: 6 elementos equidistantes, mesma baseline (space-between)
// Desktop: [reed] ... [pills · questionário · contexto · sistema] ... [○]

import { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useIsMobile } from '@/hooks/use-mobile'

type ActivePage = 'reed' | 'pills' | 'questionnaire' | 'context' | 'system' | 'home' | 'settings' | 'none'

interface NavBottomProps {
  active?: ActivePage
  /**
   * AFC ONB-6 §4.2 + ONB-7 §1.5 — quando true, NavBottom recebe respiração breve
   * em cor de função (#7868B8) por UM único ciclo (3.5s, 100%↔75%, ease-in-out simétrico).
   * Exceção à regra single-target. Marca cognitivamente que a barra ficou disponível.
   */
  pulseOnce?: boolean
}

const PULSE_STYLE_ID = 'rdwth-navbottom-pulse-once'
// Bruno: 6s pra dar tempo da atenção pegar.
// Cor neon (luz própria) com glow via text-shadow — desvia da ONB-7 §1.4 (3.5s, opacity-only).
// Cor base #9B82F0 (luminosidade subida do canônico #7868B8) pra dar sensação de luz.
const PULSE_DURATION_MS = 6000
const PULSE_KEYFRAMES = `
@keyframes rdwth-navbottom-pulse-once {
  0%, 100% {
    opacity: 1;
    text-shadow: 0 0 12px rgba(120, 104, 184, 0.9), 0 0 24px rgba(155, 130, 240, 0.6);
  }
  50% {
    opacity: 0.75;
    text-shadow: 0 0 6px rgba(120, 104, 184, 0.5);
  }
}
.rdwth-navbottom-pulse-once span {
  color: #9B82F0 !important;
  animation: rdwth-navbottom-pulse-once 6s cubic-bezier(0.4, 0, 0.6, 1) 1 !important;
}
@media (prefers-reduced-motion: reduce) {
  .rdwth-navbottom-pulse-once span {
    animation: none !important;
    color: #9B82F0 !important;
  }
}
`

function injectPulseStyles() {
  if (typeof document === 'undefined') return
  if (document.getElementById(PULSE_STYLE_ID)) return
  const styleEl = document.createElement('style')
  styleEl.id = PULSE_STYLE_ID
  styleEl.textContent = PULSE_KEYFRAMES
  document.head.appendChild(styleEl)
}

export default function NavBottom({ active = 'none', pulseOnce = false }: NavBottomProps) {
  const navigate = useNavigate()
  const isMobile = useIsMobile()
  const fontSize = 'clamp(9px, 2.6vw, 11px)'

  // AFC ONB-6/7 — respiração única na transição warmup → home
  const pulseRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!pulseOnce) return
    injectPulseStyles()
    const el = pulseRef.current
    if (!el) return
    el.classList.add('rdwth-navbottom-pulse-once')
    const timer = window.setTimeout(() => {
      el.classList.remove('rdwth-navbottom-pulse-once')
    }, PULSE_DURATION_MS)
    return () => {
      window.clearTimeout(timer)
      el.classList.remove('rdwth-navbottom-pulse-once')
    }
  }, [pulseOnce])

  const renderItem = (label: string, slug: ActivePage, path: string) => (
    <span
      key={slug}
      onClick={() => navigate(path)}
      style={{
        fontFamily: 'var(--r-font-sys)',
        fontWeight: slug === active ? 400 : 300,
        fontSize,
        color: slug === active ? 'var(--r-telha)' : 'var(--r-muted)',
        letterSpacing: '0.06em',
        cursor: 'pointer',
        whiteSpace: 'nowrap',
        flexShrink: 0,
        lineHeight: 1,
      }}
    >
      {label}
    </span>
  )

  const settingsDot = (
    <span
      key="settings"
      onClick={() => navigate('/settings')}
      aria-label="ajustes"
      role="button"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
        flexShrink: 0,
        // touch target sem afetar layout visual
        padding: 8,
        margin: -8,
      }}
    >
      <span
        className={`r-send-dot${active === 'settings' ? ' active' : ''}`}
        style={{ display: 'block' }}
      />
    </span>
  )

  const centerItems = [
    { label: 'pills',         slug: 'pills' as ActivePage,         path: '/pills' },
    { label: 'questionário',  slug: 'questionnaire' as ActivePage, path: '/questionnaire' },
    { label: 'contexto',      slug: 'context' as ActivePage,       path: '/context' },
    { label: 'sistema',       slug: 'system' as ActivePage,        path: '/como-funciona' },
  ]

  // ─── MOBILE: 6 elementos equidistantes, mesma baseline ───
  if (isMobile) {
    return (
      <>
        <div className="r-line" />
        <div ref={pulseRef} style={{
          height: 56,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 12px',
          flexShrink: 0,
          minWidth: 0,
        }}>
          {renderItem('reed', 'reed', '/reed')}
          {centerItems.map(({ label, slug, path }) => renderItem(label, slug, path))}
          {settingsDot}
        </div>
      </>
    )
  }

  // ─── DESKTOP: layout 3-zonas (inalterado) ───
  const itemGap = 'clamp(8px, 3vw, 24px)'
  return (
    <>
      <div className="r-line" />
      <div ref={pulseRef} style={{
        height: 56,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 16px',
        gap: itemGap,
        flexShrink: 0,
        minWidth: 0,
      }}>
        <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center' }}>
          {renderItem('reed', 'reed', '/reed')}
        </div>

        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: itemGap,
          flex: 1,
          justifyContent: 'center',
          minWidth: 0,
          overflow: 'hidden',
        }}>
          {centerItems.map(({ label, slug, path }) => renderItem(label, slug, path))}
        </div>

        <div style={{ display: 'flex', alignItems: 'center' }}>
          {settingsDot}
        </div>
      </div>
    </>
  )
}
