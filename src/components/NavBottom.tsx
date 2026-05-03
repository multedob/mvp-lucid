// src/components/NavBottom.tsx
// Shared bottom navigation for all pages
// Mobile: 6 elementos equidistantes, mesma baseline (space-between)
// Desktop: [reed] ... [pills · questionário · contexto · sistema] ... [○]

import { useNavigate } from 'react-router-dom'
import { useIsMobile } from '@/hooks/use-mobile'

type ActivePage = 'reed' | 'pills' | 'questionnaire' | 'context' | 'system' | 'home' | 'settings' | 'none'

interface NavBottomProps {
  active?: ActivePage
}

export default function NavBottom({ active = 'none' }: NavBottomProps) {
  const navigate = useNavigate()
  const isMobile = useIsMobile()
  const fontSize = 'clamp(9px, 2.6vw, 11px)'

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
        <div style={{
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
      <div style={{
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
