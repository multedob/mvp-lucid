// src/components/NavBottom.tsx
// Shared bottom navigation for all pages
// Layout: reed · pills · questionário · contexto · sistema ........... [settings dot]

import { useNavigate } from 'react-router-dom'

type ActivePage = 'reed' | 'pills' | 'questionnaire' | 'context' | 'system' | 'home' | 'settings' | 'none'

interface NavBottomProps {
  active?: ActivePage
}

export default function NavBottom({ active = 'none' }: NavBottomProps) {
  const navigate = useNavigate()
  // Em mobile estreito, gap pequeno e fonte reduzida pra caber 5 itens + dot sem sobrepor
  const itemGap = 'clamp(8px, 3vw, 28px)'
  const fontSize = 'clamp(9px, 2.6vw, 11px)'

  const navItems = [
    { label: 'reed',          slug: 'reed',          path: '/reed' },
    { label: 'pills',         slug: 'pills',         path: '/pills' },
    { label: 'questionário',  slug: 'questionnaire', path: '/questionnaire' },
    { label: 'contexto',      slug: 'context',       path: '/context' },
    { label: 'sistema',       slug: 'system',        path: '/como-funciona' },
  ]

  return (
    <>
      <div className="r-line" />
      <div style={{
        height: 56,
        display: 'flex',
        alignItems: 'center',
        padding: '0 16px',
        gap: itemGap,
        flexShrink: 0,
        minWidth: 0,
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: itemGap,
          minWidth: 0,
          flex: 1,
          flexWrap: 'nowrap',
          overflow: 'hidden',
        }}>
          {navItems.map(({ label, slug, path }) => (
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
          ))}
        </div>

        <div
          onClick={() => navigate('/settings')}
          aria-label="ajustes"
          role="button"
          style={{
            width: 8,
            height: 8,
            borderRadius: '50%',
            border: `1px solid ${active === 'settings' ? 'var(--r-accent)' : 'var(--r-ghost)'}`,
            background: active === 'settings' ? 'var(--r-accent)' : 'transparent',
            cursor: 'pointer',
            flexShrink: 0,
            boxSizing: 'content-box',
            padding: 8,
            marginRight: -8,
          }}
        />
      </div>
    </>
  )
}
