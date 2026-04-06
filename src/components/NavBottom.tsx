// src/components/NavBottom.tsx
// Shared bottom navigation for all pages
// Layout: reed · pills · questionnaire ........... context  [settings dot]

import { useNavigate } from 'react-router-dom'

type ActivePage = 'reed' | 'pills' | 'questionnaire' | 'context' | 'home' | 'settings' | 'none'

interface NavBottomProps {
  active?: ActivePage
}

export default function NavBottom({ active = 'none' }: NavBottomProps) {
  const navigate = useNavigate()

  const leftItems = [
    { label: 'reed',          path: '/reed' },
    { label: 'pills',         path: '/pills' },
    { label: 'questionnaire', path: '/questionnaire' },
  ]

  const rightItems = [
    { label: 'context', path: '/context' },
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
        {/* Left group: reed · pills · questionnaire */}
        <div style={{ display: 'flex', gap: 28 }}>
          {leftItems.map(({ label, path }) => (
            <span
              key={label}
              onClick={() => navigate(path)}
              style={{
                fontFamily: 'var(--r-font-sys)',
                fontWeight: label === active ? 400 : 300,
                fontSize: 11,
                color: label === active ? 'var(--r-accent)' : 'var(--r-muted)',
                letterSpacing: '0.08em',
                cursor: 'pointer',
              }}
            >
              {label}
            </span>
          ))}
        </div>

        {/* Right group: context + settings dot */}
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 28 }}>
          {rightItems.map(({ label, path }) => (
            <span
              key={label}
              onClick={() => navigate(path)}
              style={{
                fontFamily: 'var(--r-font-sys)',
                fontWeight: label === active ? 400 : 300,
                fontSize: 11,
                color: label === active ? 'var(--r-accent)' : 'var(--r-muted)',
                letterSpacing: '0.08em',
                cursor: 'pointer',
              }}
            >
              {label}
            </span>
          ))}
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
