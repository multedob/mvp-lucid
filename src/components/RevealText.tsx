// ============================================================
// RevealText (Wave 12.b)
// Modos:
//  - "char" (default, backward-compatible): caracteres em ordem aleatória
//  - "word" (novo): palavras em ordem sequencial, fade rápido
//
// Usage:
//   <RevealText text={message} />                          // char mode (legacy)
//   <RevealText mode="word" text={message} duration={1000} />
//   <RevealText mode="word" text={message} wordStaggerMs={80} fadeMs={200} />
//   <RevealText text={message} enabled={false} />          // sem efeito
// ============================================================

import { forwardRef, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react'

interface RevealTextProps {
  text: string
  /** "char" (default) ou "word" */
  mode?: 'char' | 'word'
  /** Duração total em ms. Default: 1500 (char) / 1000 (word) */
  duration?: number
  /** Per-character fade-in (mode=char). Default: 280 */
  charFadeMs?: number
  /** Per-word fade-in (mode=word). Default: 200 */
  fadeMs?: number
  /** Stagger entre palavras (mode=word). Se omitido, calcula de duration. */
  wordStaggerMs?: number
  enabled?: boolean
  onComplete?: () => void
  className?: string
  style?: CSSProperties
  as?: 'span' | 'p' | 'div'
}

// Split preservando espaços/quebras (cada token é palavra OU separador)
function tokenizeWords(text: string): { tokens: string[]; wordIdx: number[] } {
  const re = /(\s+|\S+)/g
  const tokens = text.match(re) ?? []
  const wordIdx: number[] = []
  tokens.forEach((tok, i) => {
    if (tok.trim().length > 0) wordIdx.push(i)
  })
  return { tokens, wordIdx }
}

export const RevealText = forwardRef<HTMLElement, RevealTextProps>(({
  text,
  mode = 'char',
  duration,
  charFadeMs = 280,
  fadeMs = 200,
  wordStaggerMs,
  enabled = true,
  onComplete,
  className,
  style,
  as = 'span',
}, fwdRef) => {

  // ─── WORD MODE ───────────────────────────────────────────────
  const wordParse = useMemo(() => mode === 'word' ? tokenizeWords(text) : null, [mode, text])
  const totalWordsRef = useRef(wordParse?.wordIdx.length ?? 0)

  // ─── CHAR MODE (legacy) ──────────────────────────────────────
  const [charVisible, setCharVisible] = useState<boolean[]>(() =>
    enabled && mode === 'char' ? new Array(text.length).fill(false) : new Array(text.length).fill(true)
  )
  const [wordVisible, setWordVisible] = useState<boolean[]>(() =>
    enabled && mode === 'word' && wordParse
      ? new Array(wordParse.tokens.length).fill(false)
      : new Array(wordParse?.tokens.length ?? 0).fill(true)
  )
  const completedRef = useRef(false)

  const shuffledOrder = useMemo(() => {
    if (mode !== 'char') return []
    const indices = Array.from({ length: text.length }, (_, i) => i)
    for (let i = indices.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[indices[i], indices[j]] = [indices[j], indices[i]]
    }
    return indices
  }, [text, mode])

  useEffect(() => {
    if (!enabled) {
      if (mode === 'char') setCharVisible(new Array(text.length).fill(true))
      else if (wordParse) setWordVisible(new Array(wordParse.tokens.length).fill(true))
      if (!completedRef.current) {
        completedRef.current = true
        onComplete?.()
      }
      return
    }

    completedRef.current = false

    if (mode === 'word' && wordParse) {
      const total = wordParse.wordIdx.length
      totalWordsRef.current = total
      const dur = duration ?? 1000
      const stagger = wordStaggerMs ?? Math.max(40, Math.floor(dur / Math.max(1, total)))
      setWordVisible(prev => {
        // separadores ficam visíveis sempre; palavras começam invisíveis
        return wordParse.tokens.map(tok => tok.trim().length === 0)
      })
      const timers: number[] = []
      wordParse.wordIdx.forEach((tokIdx, i) => {
        const t = window.setTimeout(() => {
          setWordVisible(prev => {
            if (prev[tokIdx]) return prev
            const next = prev.slice()
            next[tokIdx] = true
            return next
          })
          if (i === total - 1 && !completedRef.current) {
            completedRef.current = true
            onComplete?.()
          }
        }, i * stagger)
        timers.push(t)
      })
      return () => { timers.forEach(clearTimeout) }
    }

    // CHAR MODE (legacy)
    setCharVisible(new Array(text.length).fill(false))
    const dur = duration ?? 1500
    const interval = Math.max(8, dur / Math.max(1, shuffledOrder.length))
    const timers: number[] = []

    shuffledOrder.forEach((charIdx, i) => {
      const t = window.setTimeout(() => {
        setCharVisible(prev => {
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

    return () => { timers.forEach(clearTimeout) }
  }, [text, mode, duration, enabled, shuffledOrder, wordParse, wordStaggerMs, onComplete])

  // ─── RENDER ──────────────────────────────────────────────────

  let children: React.ReactNode

  if (mode === 'word' && wordParse) {
    children = wordParse.tokens.map((tok, i) => {
      if (tok.includes('\n')) {
        // separador com newline → mantém quebras de linha
        return tok.split('\n').map((seg, j, arr) => (
          <span key={`${i}-${j}`}>
            {seg}
            {j < arr.length - 1 && <br />}
          </span>
        ))
      }
      if (tok.trim().length === 0) {
        return <span key={i}>{tok}</span>
      }
      return (
        <span
          key={i}
          style={{
            opacity: wordVisible[i] ? 1 : 0,
            transition: `opacity ${fadeMs}ms ease-out`,
            display: 'inline-block',
          }}
        >
          {tok}
        </span>
      )
    })
  } else {
    children = text.split('').map((char, i) => {
      if (char === '\n') return <br key={i} />
      if (char === ' ') return ' '
      return (
        <span
          key={i}
          style={{
            opacity: charVisible[i] ? 1 : 0,
            transition: `opacity ${charFadeMs}ms ease-out`,
          }}
        >
          {char}
        </span>
      )
    })
  }

  if (as === 'p') return <p ref={fwdRef as any} className={className} style={style}>{children}</p>
  if (as === 'div') return <div ref={fwdRef as any} className={className} style={style}>{children}</div>
  return <span ref={fwdRef as any} className={className} style={style}>{children}</span>
});
RevealText.displayName = "RevealText";
