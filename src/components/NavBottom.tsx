// src/components/NavBottom.tsx
// Shared bottom navigation for all pages
// Layout: 6 elementos equidistantes, mesma baseline (space-between) — em qualquer largura
// (mobile e desktop usam mesmo layout pra MVP, decisão da Olivia em 2026-05-05).
//
// Pulse simplificado:
// - pulseOnce (TA-S5.4 do Bruno) — respiração breve quando vem do warmup
//   2026-05-05: cor mudou de roxo para telha (var(--r-telha)) por desvio da ONB-7 §1.1
// - SystemPulse (single-target em looping) — usado por outros casos via componente
//   externo, modo guiado canônico.

import { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useOptionalFlow } from '@/hooks/useFlow'
import { PATH_TO_DEST } from '@/lib/flowPools'

export type ActivePage = 'reed' | 'pills' | 'questionnaire' | 'context' | 'thirdparty' | 'system' | 'home' | 'settings' | 'none'

interface NavBottomProps {
  active?: ActivePage
  /**
   * AFC ONB-6 §4.2 + ONB-7 §1.4/§1.5 — quando true, NavBottom recebe respiração
   * breve em cor de identidade telha por UM único ciclo (3.5s, opacidade 100%↔75%,
   * ease-in-out simétrico). Marca cognitivamente que a barra ficou disponível.
   */
  pulseOnce?: boolean
}

const PULSE_STYLE_ID = 'rdwth-navbottom-pulse-once'
const PULSE_DURATION_MS = 3500
const PULSE_COLOR = 'var(--r-telha)'

const PULSE_KEYFRAMES = `
@keyframes rdwth-navbottom-pulse-once {
  0%   { opacity: 1; }
  50%  { opacity: 0.75; }
  100% { opacity: 1; }
}
.rdwth-navbottom-pulse-once span {
  color: ${PULSE_COLOR} !important;
  font-weight: 500 !important;
  animation: rdwth-navbottom-pulse-once 3.5s ease-in-out 1 !important;
}
@media (prefers-reduced-motion: reduce) {
  .rdwth-navbottom-pulse-once span {
    animation: none !important;
    color: ${PULSE_COLOR} !important;
    font-weight: 500 !important;
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
  const flowCtx = useOptionalFlow()
  const fontSize = 'clamp(9px, 2.6vw, 11px)'

  // Centraliza decisão "navega via flow ou direto?" — se path tem destino registrado
  // E estamos dentro de um FlowProvider, dispara flowTo (transição com voz sistema).
  // Caso contrário, navigate puro (back-compat pra NavBottom usado fora do AppShell).
  const handleNav = (path: string) => {
    if (flowCtx && PATH_TO_DEST[path]) {
      flowCtx.flowTo(path)
    } else {
      navigate(path)
    }
  }

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
      id={`nav-${slug}`}
      onClick={() => handleNav(path)}
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
    { label: '↔ tensão',     slug: 'pills' as ActivePage,         path: '/pills' },
    { label: '↻ ciclo',      slug: 'questionnaire' as ActivePage, path: '/questionnaire' },
    { label: '&& amigos',    slug: 'thirdparty' as ActivePage,    path: '/terceiros' },
    { label: '☰ leituras',   slug: 'context' as ActivePage,       path: '/context' },
  ]

  // Layout único — 6 elementos equidistantes (space-between), mesma baseline
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
        {renderItem('>_ reed', 'reed', '/reed')}
        {centerItems.map(({ label, slug, path }) => renderItem(label, slug, path))}
        {settingsDot}
      </div>
    </>
  )
}
