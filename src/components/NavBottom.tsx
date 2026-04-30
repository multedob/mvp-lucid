// src/components/NavBottom.tsx
// Shared bottom navigation for all pages
// Layout: reed · pills · questionnaire ........... context  [settings dot]

import { useNavigate } from 'react-router-dom'

type ActivePage = 'reed' | 'pills' | 'questionnaire' | 'context' | 'system' | 'home' | 'settings' | 'none'

interface NavBottomProps {
  active?: ActivePage
}

export default function NavBottom({ active = 'none' }: NavBottomProps) {
  const navigate = useNavigate()
  const itemGap = 'clamp(16px, 5vw, 28px)'

  // labels visíveis em PT-BR; "slug" = identificador interno (mesmo do prop "active") pra preservar API.
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
        padding: '0 24px',
        flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: itemGap, minWidth: 0 }}>
          {navItems.map(({ label, slug, path }) => (
            <span
              key={slug}
              onClick={() => navigate(path)}
              style={{
                fontFamily: 'var(--r-font-sys)',
                fontWeight: slug === active ? 400 : 300,
                fontSize: 11,
                color: slug === active ? 'var(--r-accent)' : 'var(--r-muted)',
                letterSpacing: '0.08em',
                cursor: 'pointer',
              }}
            >
              {label}
            </span>
          ))}
        </div>

        <div style={{ marginLeft: 'auto' }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: itemGap }}>
          <div
            onClick={() => navigate('/settings')}
            style={{
              width: 6,
              height: 6,
              borderRadius: '50%',
              border: `1px solid ${active === 'settings' ? 'var(--r-accent)' : 'var(--r-ghost)'}`,
              background: active === 'settings' ? 'var(--r-accent)' : 'transparent',
              cursor: 'pointer',
              flexShrink: 0,
            }}
          />
        </div>
      </div>
    </>
  )
}
