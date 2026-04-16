// ============================================================
// RevealText
// Effect: final text appears by revealing characters in random
// order over a given duration — as if letters are floating up
// from below the surface and breaking through one by one.
//
// Usage:
//   <RevealText text={message} />
//   <RevealText text={message} duration={1800} onComplete={...} />
//   <RevealText text={message} enabled={false} />  // renders instantly
//
// Performance: creates one <span> per character. Fine for typical
// message lengths (< 2000 chars). For longer texts consider word-level
// variant or disable.
// ============================================================

import { forwardRef, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react'

interface RevealTextProps {
  text: string
  /** Total reveal duration in ms. Default: 1500 */
  duration?: number
  /** Per-character fade-in duration in ms. Default: 280 */
  charFadeMs?: number
  /** Disable effect (renders text instantly). Default: true */
  enabled?: boolean
  /** Called after all characters are visible */
  onComplete?: () => void
  className?: string
  style?: CSSProperties
  /** HTML tag to use as wrapper. Default: 'span' */
  as?: 'span' | 'p' | 'div'
}

export const RevealText = forwardRef<HTMLElement, RevealTextProps>(({
  text,
  duration = 1500,
  charFadeMs = 280,
  enabled = true,
  onComplete,
  className,
  style,
  as = 'span',
}, fwdRef) => {
  const [visible, setVisible] = useState<boolean[]>(() =>
    enabled ? new Array(text.length).fill(false) : new Array(text.length).fill(true)
  )
  const completedRef = useRef(false)

  // Pre-compute a shuffled order of indices so the reveal is deterministic
  // for a given text (but random-looking) and does not re-shuffle on re-render.
  const shuffledOrder = useMemo(() => {
    const indices = Array.from({ length: text.length }, (_, i) => i)
    for (let i = indices.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[indices[i], indices[j]] = [indices[j], indices[i]]
    }
    return indices
  }, [text])

  useEffect(() => {
    if (!enabled || text.length === 0) {
      setVisible(new Array(text.length).fill(true))
      if (!completedRef.current) {
        completedRef.current = true
        onComplete?.()
      }
      return
    }

    // Reset state when text changes
    setVisible(new Array(text.length).fill(false))
    completedRef.current = false

    const interval = Math.max(8, duration / Math.max(1, shuffledOrder.length))
    const timers: number[] = []

    shuffledOrder.forEach((charIdx, i) => {
      const t = window.setTimeout(() => {
        setVisible(prev => {
          if (prev[charIdx]) return prev
          const next = prev.slice()
          next[charIdx] = true
          return next
        })
        if (i === shuffledOrder.length - 1 && !completedRef.current) {
          completedRef.current = true
          onComplete?.()
        }
      }, i * interval)
      timers.push(t)
    })

    return () => {
      timers.forEach(clearTimeout)
    }
  }, [text, duration, enabled, shuffledOrder, onComplete])

  return (
    {as === 'p' ? (
      <p ref={fwdRef as any} className={className} style={style}>
    ) : as === 'div' ? (
      <div ref={fwdRef as any} className={className} style={style}>
    ) : (
      <span ref={fwdRef as any} className={className} style={style}>
    )}
      {text.split('').map((char, i) => {
        // Preserve line breaks explicitly so they always occupy space,
        // even while the surrounding characters are still hidden.
        if (char === '\n') {
          return <br key={i} />
        }
        // Render spaces as plain text nodes so the browser can use them as
        // soft-wrap opportunities. Wrapping spaces in <span whiteSpace:pre>
        // eliminates wrap points and causes horizontal overflow on narrow
        // viewports (mobile). Spaces have no visible glyph, so skipping the
        // per-char fade on them is imperceptible.
        if (char === ' ') {
          return ' '
        }
        return (
          <span
            key={i}
            style={{
              opacity: visible[i] ? 1 : 0,
              transition: `opacity ${charFadeMs}ms ease-out`,
            }}
          >
            {char}
          </span>
        )
      })}
    </Wrapper>
  )
});
RevealText.displayName = "RevealText";
