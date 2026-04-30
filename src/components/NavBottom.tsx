// src/components/NavBottom.tsx
// Shared bottom navigation for all pages
// Layout: [reed] ........ [pills · questionário · contexto · sistema] ........ [○ settings]

import { useNavigate } from 'react-router-dom'

type ActivePage = 'reed' | 'pills' | 'questionnaire' | 'context' | 'system' | 'home' | 'settings' | 'none'

interface NavBottomProps {
  active?: ActivePage
}

export default function NavBottom({ active = 'none' }: NavBottomProps) {
  const navigate = useNavigate()
  const itemGap = 'clamp(8px, 3vw, 24px)'
  const fontSize = 'clamp(9px, 2.6vw, 11px)'

  const renderItem = (label: string, slug: ActivePage, path: string) => (
    <span
      key={slug}
      onClick={() => navigate(path)}
      style={{
        fontFamily: 'var(--r-font-sys)',
        fontWeight: slug === active ? 400 : 300,
        fontSize,
        color: slug === active ? 'var(--r-accent)' : 'var(--r-muted)',
        letterSpacing: '0.06em',
        cursor: 'pointer',
        whiteSpace: 'nowrap',
        flexShrink: 0,
      }}
    >
      {label}
    </span>
  )

  const centerItems = [
    { label: 'pills',         slug: 'pills' as ActivePage,         path: '/pills' },
    { label: 'questionário',  slug: 'questionnaire' as ActivePage, path: '/questionnaire' },
    { label: 'contexto',      slug: 'context' as ActivePage,       path: '/context' },
    { label: 'sistema',       slug: 'system' as ActivePage,        path: '/como-funciona' },
  ]

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
        {/* ESQUERDA: reed */}
        <div style={{ flexShrink: 0 }}>
          {renderItem('reed', 'reed', '/reed')}
        </div>

        {/* CENTRO: pills · questionário · contexto · sistema */}
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

        {/* DIREITA: ○ ajustes — mesmo tamanho/cor do r-send-dot */}
        <div
          onClick={() => navigate('/settings')}
          aria-label="ajustes"
          role="button"
          style={{
            width: 6,
            height: 6,
            borderRadius: '50%',
            border: `1px solid ${active === 'settings' ? 'var(--r-accent)' : 'var(--r-ghost)'}`,
            background: active === 'settings' ? 'var(--r-accent)' : 'transparent',
            cursor: 'pointer',
            flexShrink: 0,
            boxSizing: 'content-box',
            padding: 10,
            margin: -10,
          }}
        />
      </div>
    </>
  )
}
