// src/pages/Reed.tsx
// Reed = Luce (user-facing name = Reed, internal = lucid-engine)
// Chama lucid-engine edge function — NÃO chama Anthropic diretamente

import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/integrations/supabase/client'
import { callEdgeFunction, getCurrentUserVersion } from '@/lib/api'

// ─────────────────────────────────────────
// Types
// ─────────────────────────────────────────
interface Message {
  role: 'user' | 'reed'
  text: string
}

interface CanonicalILs {
  d1: number[]
  d2: number[]
  d3: number[]
  d4: number[]
}

// ─────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────
function extractILs(
  resultados: Record<string, { il_canonico: number | null }>
): CanonicalILs {
  const get = (id: string) => resultados[id]?.il_canonico ?? 4.0
  return {
    d1: [get('L1.1'), get('L1.2'), get('L1.3'), get('L1.4')],
    d2: [get('L2.4'), get('L2.1'), get('L2.2'), get('L2.3')],
    d3: [get('L3.3'), get('L3.1'), get('L3.2'), get('L3.4')],
    d4: [get('L4.1'), get('L4.2'), get('L4.3'), get('L4.4')],
  }
}

function extractResponseText(data: unknown): string {
  if (!data || typeof data !== 'object') return ''
  const d = data as Record<string, unknown>
  if (typeof d.llm_response === 'string') return d.llm_response
  if (typeof d.response_text === 'string') return d.response_text
  return ''
}

// ─────────────────────────────────────────
// Component
// ─────────────────────────────────────────
export default function Reed() {
  const navigate = useNavigate()
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [cycleId, setCycleId] = useState<string | null>(null)
  const [cycleNumber, setCycleNumber] = useState(1)
  const [canonicalILs, setCanonicalILs] = useState<CanonicalILs | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => { init() }, [])
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // ─────────────────────────────────────
  // Init: carregar ciclo, ILs e histórico
  // ─────────────────────────────────────
  async function init() {
    try {
      // Tenta sessão autenticada primeiro; se não houver, usa query aberta (dev)
      const { data: { session } } = await supabase.auth.getSession()

      let cycleQuery = (supabase
        .from('ipe_cycles') as any)
        .select('id, cycle_number, status')
        .in('status', ['complete', 'questionnaire', 'pills'])
        .order('cycle_number', { ascending: false })
        .limit(1)

      if (session?.user?.id) {
        cycleQuery = cycleQuery.eq('user_id', session.user.id) as typeof cycleQuery
      }

      const { data: cycle } = await cycleQuery.maybeSingle()

      if (!cycle) { navigate('/home'); return }

      setCycleId(cycle.id)
      setCycleNumber(cycle.cycle_number ?? 1)

      // ILs canônicos do questionário
      const { data: qState } = await (supabase
        .from('questionnaire_state') as any)
        .select('resultados_por_bloco')
        .eq('ipe_cycle_id', cycle.id)
        .maybeSingle()

      const resultados = (qState?.resultados_por_bloco ?? {}) as Record<
        string,
        { il_canonico: number | null }
      >
      const ils = extractILs(resultados)
      setCanonicalILs(ils)

      // Histórico de interações do ciclo (from cycles table)
      const { data: cycleHistory } = await (supabase as any)
        .from('cycles')
        .select('user_text, llm_response, created_at')
        .eq('ipe_cycle_id', cycle.id)
        .order('created_at', { ascending: true })

      if (cycleHistory && cycleHistory.length > 0) {
        const history: Message[] = cycleHistory
          .flatMap((i: any) => [
            { role: 'user' as const, text: i.user_text ?? '' },
            { role: 'reed' as const, text: i.llm_response ?? '' },
          ])
          .filter((m: Message) => m.text)
        setMessages(history)
        setLoading(false)
      } else {
        setLoading(false)
      }

      setTimeout(() => inputRef.current?.focus(), 200)
    } catch {
      setError('algo deu errado ao carregar.')
      setLoading(false)
    }
  }

  // ─────────────────────────────────────
  // Chamar lucid-engine
  // ─────────────────────────────────────
  async function sendToReed(
    cid: string,
    cycleNum: number,
    ils: CanonicalILs,
    userText: string
  ) {
    try {
      const data = await callEdgeFunction('lucid-engine', {
        ipe_cycle_id: cid,
        base_version: cycleNum - 1,
        raw_input: {
          d1: ils.d1,
          d2: ils.d2,
          d3: ils.d3,
          d4: ils.d4,
          user_text: userText,
        },
      })

      const text = extractResponseText(data)
      if (text) setMessages(prev => [...prev, { role: 'reed', text }])
    } catch {
      setError('reed não respondeu. tenta de novo.')
    }
  }

  // ─────────────────────────────────────
  // Enviar mensagem do usuário
  // ─────────────────────────────────────
  async function handleSend() {
    if (!input.trim() || !cycleId || !canonicalILs || sending) return

    const userText = input.trim()
    setInput('')
    setSending(true)
    setError(null)

    setMessages(prev => [...prev, { role: 'user', text: userText }])
    await sendToReed(cycleId, cycleNumber, canonicalILs, userText)

    setSending(false)
    setTimeout(() => inputRef.current?.focus(), 100)
  }

  const cycleDisplay = `C${cycleNumber}`

  // ─────────────────────────────────────
  // Render: loading
  // ─────────────────────────────────────
  if (loading) {
    return (
      <div className="r-screen" style={{ justifyContent: 'center', alignItems: 'center' }}>
        <span className="r-muted" style={{ fontSize: '0.75rem', letterSpacing: '0.08em' }}>
          carregando
        </span>
      </div>
    )
  }

  // ─────────────────────────────────────
  // Render: chat
  // ─────────────────────────────────────
  return (
    <div className="r-screen">

      {/* header */}
      <header className="r-header">
        <span className="r-wordmark">_rdwth</span>
        <nav className="r-nav">
          <button onClick={() => navigate('/home')} className="r-nav">home</button>
          <button onClick={() => navigate('/context')} className="r-nav">context</button>
        </nav>
      </header>

      <div className="r-line" />

      {/* mensagens */}
      <main
        className="r-scroll"
        style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '2rem' }}
      >
        {messages.map((msg, i) =>
          msg.role === 'reed' ? (
            <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
              <span
                className="r-reed-sig"
                style={{ fontSize: '0.65rem', opacity: 0.4, marginBottom: '0.25rem' }}
              >
                REED · {cycleDisplay}
              </span>
              <p className="r-narrative" style={{ whiteSpace: 'pre-wrap' }}>
                {msg.text}
              </p>
            </div>
          ) : (
            <p
              key={i}
              className="r-sub"
              style={{
                alignSelf: 'flex-end',
                maxWidth: '80%',
                textAlign: 'right',
                opacity: 0.65,
                whiteSpace: 'pre-wrap',
              }}
            >
              {msg.text}
            </p>
          )
        )}

        {/* typing indicator */}
        {sending && (
          <div style={{ display: 'flex', gap: '0.3rem', alignItems: 'center' }}>
            {[0, 1, 2].map(i => (
              <span
                key={i}
                style={{
                  width: 4, height: 4, borderRadius: '50%',
                  background: 'var(--r-muted)',
                  animation: `rdwth-pulse 1.2s ease-in-out ${i * 0.2}s infinite`,
                }}
              />
            ))}
          </div>
        )}

        {error && (
          <p className="r-sub" style={{ color: 'var(--r-accent)', opacity: 0.8 }}>
            {error}
          </p>
        )}

        <div ref={bottomRef} />
      </main>

      {/* input */}
      <div className="r-line" />
      <div style={{ padding: '1rem 1.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        <div className="r-input-wrap">
          <textarea
            ref={inputRef}
            className="r-textarea"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                e.preventDefault()
                handleSend()
              }
            }}
            rows={2}
            disabled={sending || loading}
            style={{ resize: 'none' }}
          />
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button
            className={`r-send-dot${input.trim() ? ' active' : ''}`}
            onClick={handleSend}
            disabled={sending || !input.trim()}
            aria-label="enviar"
          />
        </div>
      </div>

      <style>{`
        @keyframes rdwth-pulse {
          0%, 80%, 100% { opacity: 0.25; transform: scale(0.8); }
          40% { opacity: 0.8; transform: scale(1.1); }
        }
      `}</style>
    </div>
  )
}
