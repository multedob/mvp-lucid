// src/pages/Reed.tsx
// Reed — conversational companion inside rdwth
// v3.7 — welcome message, pill context, questionnaire nav, _rdwth link
// Header: "_rdwth · reed" | data
// Nav bottom: pills | questionnaire | context | reed (ativo) | settings dot

import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/integrations/supabase/client'
import { callEdgeFunction, getCurrentUserVersion, getToday } from '@/lib/api'

interface Message { role: 'user' | 'reed'; text: string }
interface CanonicalILs { d1: number[]; d2: number[]; d3: number[]; d4: number[] }
interface PillContext { pill_id: string; m2_text: string; m4_percepcao: string; eco_text: string }

function extractILs(resultados: Record<string, { il_canonico: number | null }>): CanonicalILs {
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

function buildPillContextString(pills: PillContext[]): string {
  if (!pills.length) return ''
  return pills
    .filter(p => p.m4_percepcao || p.m2_text)
    .map(p => {
      const parts: string[] = [`[${p.pill_id}]`]
      if (p.m2_text) parts.push(`O que a pessoa trouxe: "${p.m2_text}"`)
      if (p.m4_percepcao) parts.push(`O que ficou: "${p.m4_percepcao}"`)
      return parts.join(' ')
    })
    .join('\n')
}

const WELCOME_MESSAGE = `oi. eu sou o reed.

eu faço parte do rdwth — um sistema de autoconhecimento. não sou humano, e não finjo ser. mas presto atenção no que você diz.

o sistema tem três partes que se alimentam: as pills (leituras curtas que você reage), o questionário (perguntas sobre como você vive e pensa), e essa conversa aqui comigo.

eu leio o que essas partes revelam sobre você. quanto mais você interage com as pills e responde o questionário, mais eu entendo sobre você, e mais a conversa aqui rende.

no começo pode parecer simples. mas conforme você vai completando ciclos, as coisas ganham camada.

pode começar me dizendo o que te trouxe aqui, ou perguntando qualquer coisa.`

export default function Reed() {
  const navigate = useNavigate()
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [cycleId, setCycleId] = useState<string | null>(null)
  const [baseVersion, setBaseVersion] = useState<number | null>(null)
  const [canonicalILs, setCanonicalILs] = useState<CanonicalILs | null>(null)
  const [pillContext, setPillContext] = useState<string>('')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => { init() }, [])
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  async function init() {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      let cycleQuery = (supabase.from('ipe_cycles') as any)
        .select('id, cycle_number, status')
        .in('status', ['complete', 'questionnaire', 'pills'])
        .order('cycle_number', { ascending: false })
        .limit(1)
      if (session?.user?.id) cycleQuery = cycleQuery.eq('user_id', session.user.id)
      const { data: cycle } = await cycleQuery.maybeSingle()
      if (!cycle) { navigate('/home'); return }
      setCycleId(cycle.id)
      setBaseVersion(await getCurrentUserVersion())

      // Fetch questionnaire ILs
      const { data: qState } = await (supabase.from('questionnaire_state') as any)
        .select('resultados_por_bloco')
        .eq('ipe_cycle_id', cycle.id)
        .maybeSingle()
      const resultados = (qState?.resultados_por_bloco ?? {}) as Record<string, { il_canonico: number | null }>
      setCanonicalILs(extractILs(resultados))

      // Fetch pill responses — text data for Reed context
      const { data: pillRows } = await (supabase.from('pill_responses') as any)
        .select('pill_id, m2_resposta, m4_resposta, eco_text')
        .eq('ipe_cycle_id', cycle.id)
        .not('completed_at', 'is', null)
        .order('pill_id', { ascending: true })
      if (pillRows && pillRows.length > 0) {
        const pillData: PillContext[] = pillRows.map((r: any) => ({
          pill_id: r.pill_id ?? '',
          m2_text: typeof r.m2_resposta === 'string' ? r.m2_resposta : '',
          m4_percepcao: (r.m4_resposta as any)?.percepcao ? String((r.m4_resposta as any).percepcao) : '',
          eco_text: r.eco_text ?? '',
        }))
        setPillContext(buildPillContextString(pillData))
      }

      // Fetch conversation history
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
      } else {
        // First visit — show welcome message
        setMessages([{ role: 'reed', text: WELCOME_MESSAGE }])
      }
      setLoading(false)
      setTimeout(() => inputRef.current?.focus(), 200)
    } catch {
      setError('algo deu errado ao carregar.')
      setLoading(false)
    }
  }

  async function sendToReed(cid: string, baseVer: number, ils: CanonicalILs, userText: string, retryOnConflict = true) {
    try {
      const payload: Record<string, unknown> = {
        ipe_cycle_id: cid,
        base_version: baseVer,
        raw_input: { d1: ils.d1, d2: ils.d2, d3: ils.d3, d4: ils.d4, user_text: userText },
      }
      // Pass pill text context if available
      if (pillContext) {
        payload.pill_context = pillContext
      }
      const data = await callEdgeFunction<Record<string, unknown>>('lucid-engine', payload)
      const nextVersion = data.current_version
      if (typeof nextVersion === 'number') setBaseVersion(nextVersion)
      const text = extractResponseText(data)
      if (text) setMessages(prev => [...prev, { role: 'reed', text }])
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      if (retryOnConflict && message.includes('VERSION_CONFLICT')) {
        const freshVersion = await getCurrentUserVersion()
        setBaseVersion(freshVersion)
        await sendToReed(cid, freshVersion, ils, userText, false)
        return
      }
      setError('reed não respondeu. tenta de novo.')
    }
  }

  async function handleSend() {
    if (!input.trim() || !cycleId || !canonicalILs || baseVersion === null || sending) return
    const userText = input.trim()
    setInput('')
    setSending(true)
    setError(null)
    setMessages(prev => [...prev, { role: 'user', text: userText }])
    await sendToReed(cycleId, baseVersion, canonicalILs, userText)
    setSending(false)
    setTimeout(() => inputRef.current?.focus(), 100)
  }

  if (loading) return (
    <div className="r-screen" style={{ justifyContent: 'center', alignItems: 'center' }}>
      <span style={{ fontFamily: 'var(--r-font-sys)', fontWeight: 300, fontSize: '0.75rem', letterSpacing: '0.08em', color: 'var(--r-muted)' }}>
        carregando
      </span>
    </div>
  )

  return (
    <div className="r-screen">

      {/* Header */}
      <div className="r-header">
        <span className="r-header-label" onClick={() => navigate('/home')} style={{ cursor: 'pointer' }}>_rdwth</span>
        <span className="r-header-label" style={{ cursor: 'default' }}>{' '}· reed</span>
        <span className="r-header-date">{getToday()}</span>
      </div>
      <div className="r-line" />

      {/* Mensagens */}
      <div className="r-scroll" style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        {messages.map((msg, i) =>
          msg.role === 'reed' ? (
            <div key={i} style={{ paddingLeft: 0 }}>
              <p style={{
                fontFamily: 'var(--r-font-ed)',
                fontWeight: 800,
                fontSize: 16,
                lineHeight: 1.7,
                color: 'var(--r-text)',
                letterSpacing: '0.01em',
                whiteSpace: 'pre-wrap',
                margin: 0,
              }}>
                {msg.text}
              </p>
            </div>
          ) : (
            <div key={i} style={{ paddingLeft: 28 }}>
              <p style={{
                fontFamily: 'var(--r-font-ed)',
                fontWeight: 300,
                fontSize: 14,
                lineHeight: 1.65,
                color: 'var(--r-sub)',
                letterSpacing: '0.01em',
                whiteSpace: 'pre-wrap',
                margin: 0,
              }}>
                {msg.text}
              </p>
            </div>
          )
        )}

        {/* Typing indicator */}
        {sending && (
          <div style={{ display: 'flex', gap: '0.3rem', alignItems: 'center' }}>
            {[0, 1, 2].map(i => (
              <span key={i} style={{
                width: 4, height: 4, borderRadius: '50%',
                background: 'var(--r-muted)',
                animation: `rdwth-pulse 1.2s ease-in-out ${i * 0.2}s infinite`,
              }} />
            ))}
          </div>
        )}

        {error && (
          <p style={{ fontFamily: 'var(--r-font-sys)', fontWeight: 300, fontSize: 11, color: 'var(--r-accent)', opacity: 0.8, margin: 0 }}>
            {error}
          </p>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="r-line" />
      <div style={{ padding: '14px 24px 12px', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, borderBottom: '0.5px solid var(--r-ghost)', paddingBottom: 8 }}>
          <textarea
            ref={inputRef}
            value={input}
            onChange={e => {
              setInput(e.target.value)
              e.target.style.height = 'auto'
              e.target.style.height = e.target.scrollHeight + 'px'
            }}
            onKeyDown={e => {
              if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() }
            }}
            placeholder="anything"
            rows={1}
            disabled={sending || loading}
            style={{
              flex: 1,
              background: 'transparent',
              border: 'none',
              outline: 'none',
              resize: 'none',
              overflow: 'hidden',
              fontFamily: 'var(--r-font-ed)',
              fontWeight: 300,
              fontSize: 14,
              color: 'var(--r-text)',
              letterSpacing: '0.01em',
              lineHeight: 1.6,
              padding: 0,
            }}
          />
          <div
            onClick={handleSend}
            style={{
              width: 6, height: 6, borderRadius: '50%', flexShrink: 0, cursor: 'pointer',
              background: input.trim() ? 'var(--r-accent)' : 'transparent',
              border: `1px solid ${input.trim() ? 'var(--r-accent)' : 'var(--r-ghost)'}`,
              transition: 'all 0.2s',
            }}
          />
        </div>
      </div>

      {/* Nav bottom */}
      <div className="r-line" />
      <div style={{ height: 56, display: 'flex', alignItems: 'center', padding: '0 24px', gap: 28, flexShrink: 0 }}>
        {[
          { label: 'pills',         path: '/pills',         active: false },
          { label: 'questionnaire',  path: '/questionnaire', active: false },
          { label: 'context',        path: '/context',       active: false },
          { label: 'reed',           path: '/reed',          active: true  },
        ].map(({ label, path, active }) => (
          <span
            key={label}
            onClick={() => navigate(path)}
            style={{
              fontFamily: 'var(--r-font-sys)',
              fontWeight: active ? 400 : 300,
              fontSize: 11,
              color: active ? 'var(--r-accent)' : 'var(--r-muted)',
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
            marginLeft: 'auto', width: 6, height: 6, borderRadius: '50%',
            border: '1px solid var(--r-ghost)', background: 'transparent',
            cursor: 'pointer', flexShrink: 0,
          }}
        />
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
