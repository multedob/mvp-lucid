// src/pages/Reed.tsx
// Reed — conversational companion inside rdwth
// v3.7 — welcome message, pill context, questionnaire nav, rdwth link
// Header: "rdwth · reed" | data
// Nav bottom: pills | questionnaire | context | reed (ativo) | settings dot

import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/integrations/supabase/client'
import { callEdgeFunction, getCurrentUserVersion, getToday } from '@/lib/api'
import NavBottom from '@/components/NavBottom'
import { RevealText } from '@/components/RevealText'
import { AudioRecorder } from '@/components/AudioRecorder'
import { AutoResizeTextarea } from '@/components/AutoResizeTextarea'

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

const WELCOME_MESSAGE = `oi. eu sou reed.

faço parte do rdwth — um sistema de autoconhecimento. não sou humano, e não tento ser. mas presto atenção no que você diz.

o sistema tem quatro partes que se alimentam: as Pills (leituras curtas às quais você reage), o questionário (perguntas sobre como você vive e pensa), o questionário de terceiros (onde algumas pessoas próximas respondem sobre você) e esta conversa comigo.

leio o que essas partes revelam sobre você. quanto mais você se envolve com as Pills, com os questionários e com esta conversa, mais eu te entendo, e mais esta conversa vai a algum lugar.

pode parecer simples no começo. mas conforme você completa ciclos, as coisas ganham camadas.

você pode começar me contando o que te trouxe aqui, ou me perguntar qualquer coisa.

(escreva no idioma que sentir mais natural — eu acompanho.)`

export default function Reed() {
  const navigate = useNavigate()
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const [messages, setMessages] = useState<Message[]>([])
  // Index below this count = historical messages (no reveal animation).
  // Messages at or above this index are "new" (animate with RevealText).
  const historicalCountRef = useRef(0)
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [cycleId, setCycleId] = useState<string | null>(null)
  const [baseVersion, setBaseVersion] = useState<number | null>(null)
  const [canonicalILs, setCanonicalILs] = useState<CanonicalILs | null>(null)
  const [pillContext, setPillContext] = useState<string>('')
  const [error, setError] = useState<string | null>(null)
  const [userId, setUserId] = useState<string | null>(null)

  useEffect(() => { init() }, [])
  // Scroll behavior:
  //   - Initial load: stay at top so user reads from the beginning of the
  //     conversation (welcome message or oldest history).
  //   - New messages added during session: auto-scroll to bottom.
  const didInitialRenderRef = useRef(false)
  useEffect(() => {
    if (messages.length === 0) return
    if (!didInitialRenderRef.current) {
      didInitialRenderRef.current = true
      return
    }
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function init() {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      setUserId(session?.user?.id ?? null)
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
        historicalCountRef.current = history.length
        setMessages(history)
      } else {
        // First visit — welcome message is "new" (index 0 >= historicalCount 0), so it animates
        historicalCountRef.current = 0
        setMessages([{ role: 'reed', text: WELCOME_MESSAGE }])
      }
      setLoading(false)
      setTimeout(() => inputRef.current?.focus(), 200)
    } catch {
      setError('algo deu errado ao carregar.')
      setLoading(false)
    }
  }

  async function sendToReed(cid: string, baseVer: number, ils: CanonicalILs, userText: string, attempt = 0): Promise<void> {
    const MAX_RETRIES = 2
    const BACKOFF_MS = [0, 1500, 3000]

    try {
      if (attempt > 0) {
        await new Promise(r => setTimeout(r, BACKOFF_MS[attempt] ?? 3000))
      }

      const payload: Record<string, unknown> = {
        ipe_cycle_id: cid,
        base_version: baseVer,
        raw_input: { d1: ils.d1, d2: ils.d2, d3: ils.d3, d4: ils.d4, user_text: userText },
      }
      // Pass user name from onboarding so Reed addresses the person correctly
      const storedName = localStorage.getItem('rdwth_user_name')
      if (storedName) {
        payload.user_name = storedName
      }
      // Pass pill text context if available
      if (pillContext) {
        payload.pill_context = pillContext
      }
      const data = await callEdgeFunction<Record<string, unknown>>('lucid-engine', payload)
      const nextVersion = data.current_version
      if (typeof nextVersion === 'number') setBaseVersion(nextVersion)
      const text = extractResponseText(data)
      // AI content moderation: detect and handle failed/empty/placeholder responses
      if (text && text !== '[linguistic layer unavailable]') {
        setMessages(prev => [...prev, { role: 'reed', text }])
      } else {
        setMessages(prev => [...prev, { role: 'reed', text: 'algo não funcionou do meu lado. tenta de novo — às vezes eu preciso de uma segunda chance pra pensar direito.' }])
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)

      // Version conflict — refresh version and retry once
      if (message.includes('VERSION_CONFLICT') && attempt === 0) {
        const freshVersion = await getCurrentUserVersion()
        setBaseVersion(freshVersion)
        return sendToReed(cid, freshVersion, ils, userText, 1)
      }

      // Network/timeout errors — retry with backoff
      if (attempt < MAX_RETRIES && (message.includes('fetch') || message.includes('network') || message.includes('timeout') || message.includes('Failed'))) {
        return sendToReed(cid, baseVer, ils, userText, attempt + 1)
      }

      // All retries exhausted
      setError('reed não conseguiu responder. verifica tua conexão e tenta de novo.')
    }
  }

  // ─── Export conversation as CSV download ───
  function exportConversation(msgs: Message[]): void {
    const now = new Date()
    const ts = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}_${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}`
    const header = 'ordem,role,texto,notas'
    const rows = msgs
      .filter(m => !m.text.startsWith('[sys]'))
      .map((m, i) => {
        const escaped = m.text.replace(/"/g, '""').replace(/\n/g, ' | ')
        return `${i + 1},${m.role},"${escaped}",""`
      })
    const csv = '\uFEFF' + [header, ...rows].join('\n') // BOM for Excel UTF-8
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `reed_${ts}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  // ─── Dev commands (/command) — invisible to regular users ───
  async function handleDevCommand(cmd: string): Promise<boolean> {
    const parts = cmd.trim().split(/\s+/)
    const command = parts[0]?.toLowerCase()
    const args = parts.slice(1).join(' ')

    switch (command) {
      case '/name': {
        if (!args) {
          setMessages(prev => [...prev, { role: 'reed', text: `[sys] nome atual: ${localStorage.getItem('rdwth_user_name') || '(nenhum)'}` }])
          return true
        }
        localStorage.setItem('rdwth_user_name', args)
        try { await supabase.auth.updateUser({ data: { display_name: args } }) } catch {}
        setMessages(prev => [...prev, { role: 'reed', text: `[sys] nome atualizado para "${args}". reed vai usar a partir da próxima mensagem.` }])
        return true
      }

      case '/export': {
        if (messages.length === 0) { setMessages(prev => [...prev, { role: 'reed', text: '[sys] nenhuma mensagem para exportar.' }]); return true }
        exportConversation(messages)
        setMessages(prev => [...prev, { role: 'reed', text: `[sys] conversa exportada (${messages.filter(m => !m.text.startsWith('[sys]')).length} mensagens). coluna "notas" livre pra anotações.` }])
        return true
      }

      case '/reset': {
        if (!cycleId) { setMessages(prev => [...prev, { role: 'reed', text: '[sys] nenhum ciclo ativo.' }]); return true }
        // Auto-export before clearing
        if (messages.filter(m => !m.text.startsWith('[sys]')).length > 0) {
          exportConversation(messages)
        }
        try {
          const { data: { session } } = await supabase.auth.getSession()
          if (!session?.user?.id) { setMessages(prev => [...prev, { role: 'reed', text: '[sys] sem sessão autenticada.' }]); return true }

          const log: string[] = ['[sys] reset (conversa exportada automaticamente)']

          // 1. Delete HAGO conversation cycles for current IPE cycle
          const { data: hagoCycles, error: selErr } = await (supabase as any).from('cycles').select('id').eq('ipe_cycle_id', cycleId)
          if (selErr) {
            log.push(`cycles select error: ${selErr.message}`)
          } else if (hagoCycles?.length) {
            const ids = hagoCycles.map((c: any) => c.id)
            const { error: e1 } = await (supabase as any).from('structural_snapshots').delete().in('cycle_id', ids)
            if (e1) log.push(`snapshots: ${e1.message}`)
            const { error: e2 } = await (supabase as any).from('node_history').delete().in('cycle_id', ids)
            if (e2) log.push(`node_history: ${e2.message}`)
            const { error: e3 } = await (supabase as any).from('audit_log').delete().in('cycle_id', ids)
            if (e3) log.push(`audit_log: ${e3.message}`)
            const { error: e4 } = await (supabase as any).from('cycles').delete().eq('ipe_cycle_id', cycleId)
            if (e4) log.push(`cycles delete: ${e4.message}`)
            else log.push(`${ids.length} ciclo(s) HAGO deletados`)
          } else {
            log.push('nenhum ciclo HAGO encontrado (tabela cycles vazia ou RLS bloqueando)')
          }

          // 2. Clear local conversation regardless of DB result
          const hadErrors = log.some(l => l.includes('error') || l.includes('Error'))
          if (hadErrors) {
            log.push('conversa local limpa, mas houve erros no banco.')
          } else {
            log.push('histórico limpo. reed recomeça do zero.')
          }

          setMessages([{ role: 'reed', text: log.join('\n') }])
          setBaseVersion(await getCurrentUserVersion())
        } catch (err) {
          setMessages(prev => [...prev, { role: 'reed', text: `[sys] erro ao limpar: ${err instanceof Error ? err.message : String(err)}` }])
        }
        return true
      }

      case '/debug': {
        const name = localStorage.getItem('rdwth_user_name') || '(nenhum)'
        const info = [
          `[sys] debug`,
          `nome: ${name}`,
          `cycleId: ${cycleId || '(nenhum)'}`,
          `baseVersion: ${baseVersion ?? '(null)'}`,
          `ILs D1: ${canonicalILs?.d1?.join(', ') || '–'}`,
          `ILs D2: ${canonicalILs?.d2?.join(', ') || '–'}`,
          `ILs D3: ${canonicalILs?.d3?.join(', ') || '–'}`,
          `ILs D4: ${canonicalILs?.d4?.join(', ') || '–'}`,
          `pillContext: ${pillContext ? pillContext.slice(0, 200) + '...' : '(vazio)'}`,
          `mensagens na sessão: ${messages.length}`,
        ].join('\n')
        setMessages(prev => [...prev, { role: 'reed', text: info }])
        return true
      }

      case '/status': {
        try {
          const { data: { session } } = await supabase.auth.getSession()
          if (!session?.user?.id) { setMessages(prev => [...prev, { role: 'reed', text: '[sys] sem sessão.' }]); return true }
          const { data: cycles } = await (supabase.from('ipe_cycles') as any).select('id, cycle_number, status').eq('user_id', session.user.id).order('cycle_number', { ascending: true })
          const { data: pills } = await (supabase.from('pill_responses') as any).select('pill_id, completed_at, eco_text').eq('ipe_cycle_id', cycleId)
          const completedPills = pills?.filter((p: any) => p.completed_at).map((p: any) => p.pill_id) || []
          const withEco = pills?.filter((p: any) => p.eco_text).map((p: any) => p.pill_id) || []
          const info = [
            `[sys] status`,
            `ciclos: ${cycles?.map((c: any) => `${c.cycle_number}(${c.status})`).join(', ') || 'nenhum'}`,
            `pills completas: ${completedPills.join(', ') || 'nenhuma'}`,
            `pills com eco: ${withEco.join(', ') || 'nenhuma'}`,
            `user: ${session.user.email}`,
            `metadata: ${JSON.stringify(session.user.user_metadata || {}).slice(0, 200)}`,
          ].join('\n')
          setMessages(prev => [...prev, { role: 'reed', text: info }])
        } catch (err) {
          setMessages(prev => [...prev, { role: 'reed', text: `[sys] erro: ${err instanceof Error ? err.message : String(err)}` }])
        }
        return true
      }

      case '/feedback': {
        if (!args) { setMessages(prev => [...prev, { role: 'reed', text: '[sys] uso: /feedback <texto>' }]); return true }
        try {
          const { data: { session } } = await supabase.auth.getSession()
          await (supabase as any).from('dev_feedback').insert({
            user_id: session?.user?.id || null,
            ipe_cycle_id: cycleId,
            feedback_text: args,
            context: { baseVersion, messagesCount: messages.length, pillContext: pillContext?.slice(0, 500) },
          })
          setMessages(prev => [...prev, { role: 'reed', text: '[sys] feedback registrado.' }])
        } catch {
          // Table might not exist yet — log locally
          console.log('[DEV_FEEDBACK]', { cycleId, text: args, timestamp: new Date().toISOString() })
          setMessages(prev => [...prev, { role: 'reed', text: '[sys] feedback salvo no console (tabela dev_feedback não existe ainda).' }])
        }
        return true
      }

      case '/help': {
        setMessages(prev => [...prev, { role: 'reed', text: [
          '[sys] comandos disponíveis:',
          '/name — mostra nome atual',
          '/name <nome> — altera nome',
          '/export — baixa conversa como CSV',
          '/reset — exporta + limpa histórico',
          '/debug — mostra estado interno',
          '/status — mostra ciclo, pills, user',
          '/feedback <texto> — registra feedback',
          '/help — este menu',
        ].join('\n') }])
        return true
      }

      default:
        return false
    }
  }

  async function handleSend() {
    if (!input.trim() || sending) return
    const userText = input.trim()

    // Check for dev commands before regular flow
    if (userText.startsWith('/')) {
      setInput('')
      setMessages(prev => [...prev, { role: 'user', text: userText }])
      const handled = await handleDevCommand(userText)
      if (handled) return
      // If not a known command, fall through to regular send
    }

    if (!cycleId || !canonicalILs || baseVersion === null) return
    setInput('')
    setSending(true)
    setError(null)
    setMessages(prev => prev[prev.length - 1]?.text === userText ? prev : [...prev, { role: 'user', text: userText }])
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
        <span className="r-header-label" onClick={() => navigate('/home')} style={{ cursor: 'pointer' }}>rdwth</span>
        <span className="r-header-section">reed</span>
        <span className="r-header-date">{getToday()}</span>
      </div>
      <div className="r-line" />

      {/* Mensagens */}
      <div className="r-scroll" style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        {messages.map((msg, i) => {
          const isSys = msg.role === 'reed' && msg.text.startsWith('[sys]')

          if (isSys) {
            return (
              <div key={i} style={{ paddingLeft: 0 }}>
                <p style={{
                  fontFamily: "'IBM Plex Mono', var(--r-font-sys), monospace",
                  fontWeight: 400,
                  fontSize: 11,
                  lineHeight: 1.7,
                  color: 'var(--r-muted)',
                  letterSpacing: '0.04em',
                  whiteSpace: 'pre-wrap',
                  margin: 0,
                  opacity: 0.75,
                }}>
                  {msg.text}
                </p>
              </div>
            )
          }

          return msg.role === 'reed' ? (
            <div key={i} style={{ paddingLeft: 0 }}>
              <RevealText
                as="p"
                text={msg.text}
                enabled={i >= historicalCountRef.current}
                duration={1800}
                charFadeMs={320}
                style={{
                  fontFamily: 'var(--r-font-ed)',
                  fontWeight: 800,
                  fontSize: 16,
                  lineHeight: 1.7,
                  color: 'var(--r-text)',
                  letterSpacing: '0.01em',
                  whiteSpace: 'pre-wrap',
                  margin: 0,
                }}
              />
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
        })}

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
          <AutoResizeTextarea
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() }
            }}
            placeholder="qualquer coisa..."
            rows={1}
            maxRows={5}
            disabled={sending || loading}
            style={{
              flex: 1,
              background: 'transparent',
              border: 'none',
              outline: 'none',
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
          {userId && cycleId && (
            <AudioRecorder
              userId={userId}
              cycleId={cycleId}
              pillId="reed"
              moment="reed"
              language="pt-BR"
              onLiveTranscript={text => setInput(text)}
              onFinalTranscript={text => setInput(text)}
              disabled={sending || loading}
            />
          )}
          <button
            type="button"
            className={`r-send-dot${input.trim() ? ' active' : ''}`}
            onClick={input.trim() ? handleSend : undefined}
            disabled={!input.trim() || sending || loading}
            aria-label="enviar"
            style={{ cursor: input.trim() ? 'pointer' : 'default' }}
          />
        </div>
      </div>

      <NavBottom active="reed" />

      <style>{`
        @keyframes rdwth-pulse {
          0%, 80%, 100% { opacity: 0.25; transform: scale(0.8); }
          40% { opacity: 0.8; transform: scale(1.1); }
        }
      `}</style>
    </div>
  )
}
