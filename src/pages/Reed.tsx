// src/pages/Reed.tsx
// Reed v4.0 — A24 streaming SSE
// - Welcome com typewriter L→R inline (substitui RevealText)
// - Mensagens streamadas: append incremental de tokens
// - AbortController pra cancel mid-stream

import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/integrations/supabase/client'
import { callEdgeFunction, getCurrentUserVersion, getToday } from '@/lib/api'
import NavBottom from '@/components/NavBottom'
import { AudioRecorder } from '@/components/AudioRecorder'
import { AutoResizeTextarea } from '@/components/AutoResizeTextarea'
import { track } from '@/lib/analytics'

interface Message { role: 'user' | 'reed'; text: string; isWelcome?: boolean }
interface CanonicalILs { d1: number[]; d2: number[]; d3: number[]; d4: number[] }
interface PillContext { pill_id: string; m2_text: string; m4_percepcao: string; eco_text: string }

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;

function extractILs(resultados: Record<string, { il_canonico: number | null }>): CanonicalILs {
  const get = (id: string) => resultados[id]?.il_canonico ?? 4.0
  return {
    d1: [get('L1.1'), get('L1.2'), get('L1.3'), get('L1.4')],
    d2: [get('L2.4'), get('L2.1'), get('L2.2'), get('L2.3')],
    d3: [get('L3.3'), get('L3.1'), get('L3.2'), get('L3.4')],
    d4: [get('L4.1'), get('L4.2'), get('L4.3'), get('L4.4')],
  }
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

// Typewriter inline — texto aparece L→R, char por char
function Typewriter({ text, charDelayMs = 18, onDone }: { text: string; charDelayMs?: number; onDone?: () => void }) {
  const [shown, setShown] = useState('')
  const doneRef = useRef(false)

  useEffect(() => {
    setShown('')
    doneRef.current = false
    let i = 0
    const interval = window.setInterval(() => {
      i++
      setShown(text.slice(0, i))
      if (i >= text.length) {
        window.clearInterval(interval)
        if (!doneRef.current) {
          doneRef.current = true
          onDone?.()
        }
      }
    }, charDelayMs)
    return () => window.clearInterval(interval)
  }, [text, charDelayMs, onDone])

  return <>{shown}<span style={{ opacity: shown.length < text.length ? 0.5 : 0 }}>▌</span></>
}

export default function Reed() {
  const navigate = useNavigate()
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const abortRef = useRef<AbortController | null>(null)

  const [messages, setMessages] = useState<Message[]>([])
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

  // Cleanup abort ao desmontar
  useEffect(() => () => { abortRef.current?.abort() }, [])

  // Scroll: inicial fica top, novas mensagens scroll bottom
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
        .order('cycle_number', { ascending: false })
        .limit(1)
      if (session?.user?.id) cycleQuery = cycleQuery.eq('user_id', session.user.id)
      const { data: cycle } = await cycleQuery.maybeSingle()
      let activeCycle = cycle
      if (!activeCycle && session?.user?.id) {
        const { data: lastCycle } = await (supabase.from('ipe_cycles') as any)
          .select('cycle_number')
          .eq('user_id', session.user.id)
          .order('cycle_number', { ascending: false })
          .limit(1)
          .maybeSingle()
        const nextNum = (lastCycle?.cycle_number ?? 0) + 1
        const { data: newCycle } = await (supabase.from('ipe_cycles') as any)
          .insert({ user_id: session.user.id, status: 'pills', cycle_number: nextNum, pills_completed: [] })
          .select('id, cycle_number, status')
          .single()
        activeCycle = newCycle
      }
      if (!activeCycle) { navigate('/home'); return }
      setCycleId(activeCycle.id)
      setBaseVersion(await getCurrentUserVersion())

      const { data: qState } = await (supabase.from('questionnaire_state') as any)
        .select('resultados_por_bloco')
        .eq('ipe_cycle_id', activeCycle.id)
        .maybeSingle()
      const resultados = (qState?.resultados_por_bloco ?? {}) as Record<string, { il_canonico: number | null }>
      setCanonicalILs(extractILs(resultados))

      const { data: pillRows } = await (supabase.from('pill_responses') as any)
        .select('pill_id, m2_resposta, m4_resposta, eco_text')
        .eq('ipe_cycle_id', activeCycle.id)
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

      const { data: cycleHistory } = await (supabase as any)
        .from('cycles')
        .select('user_text, llm_response, created_at')
        .eq('ipe_cycle_id', activeCycle.id)
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
        setMessages([{ role: 'reed', text: WELCOME_MESSAGE, isWelcome: true }])
      }
      setLoading(false)
      setTimeout(() => inputRef.current?.focus(), 200)
    } catch {
      setError('algo deu errado ao carregar.')
      setLoading(false)
    }
  }

  // A24 — streaming SSE. Substitui sendToReed antiga.
  async function sendToReedStream(cid: string, baseVer: number, ils: CanonicalILs, userText: string): Promise<void> {
    abortRef.current?.abort()
    const ac = new AbortController()
    abortRef.current = ac

    const startTime = Date.now()
    let firstTokenAt: number | null = null

    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.access_token) { setError('sessão expirou'); return }

    // Adiciona placeholder vazio pra mensagem reed (vai sendo preenchida)
    setMessages(prev => [...prev, { role: 'reed', text: '' }])

    const payload: Record<string, unknown> = {
      ipe_cycle_id: cid,
      base_version: baseVer,
      raw_input: { d1: ils.d1, d2: ils.d2, d3: ils.d3, d4: ils.d4, user_text: userText },
      stream: true,
    }
    const storedName = localStorage.getItem('rdwth_user_name')
    if (storedName) payload.user_name = storedName
    if (pillContext) payload.pill_context = pillContext

    let fullText = ''
    try {
      const response = await fetch(`${SUPABASE_URL}/functions/v1/lucid-engine`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'apikey': SUPABASE_ANON_KEY,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
        signal: ac.signal,
      })

      if (!response.ok) {
        const errText = await response.text().catch(() => '')
        // Trata version conflict — refresh + retry uma vez
        if (response.status === 409 && errText.includes('VERSION_CONFLICT')) {
          const freshVersion = await getCurrentUserVersion()
          setBaseVersion(freshVersion)
          // Remove placeholder atual e tenta de novo
          setMessages(prev => prev.slice(0, -1))
          return sendToReedStream(cid, freshVersion, ils, userText)
        }
        throw new Error(`HTTP ${response.status}: ${errText.slice(0, 200)}`)
      }

      if (!response.body) throw new Error('no response body')

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })

        // Split events por \n\n
        const events = buffer.split('\n\n')
        buffer = events.pop() ?? ''

        for (const event of events) {
          const line = event.trim()
          if (!line.startsWith('data: ')) continue
          let parsed: any
          try {
            parsed = JSON.parse(line.slice(6))
          } catch { continue }

          if (parsed.type === 'metadata') {
            if (typeof parsed.current_version === 'number') setBaseVersion(parsed.current_version)
          } else if (parsed.type === 'token' && typeof parsed.text === 'string') {
            if (firstTokenAt === null) {
              firstTokenAt = Date.now()
              track('reed_response_first_token', { latency_ms: firstTokenAt - startTime })
            }
            fullText += parsed.text
            setMessages(prev => {
              const next = prev.slice()
              const last = next[next.length - 1]
              if (last?.role === 'reed') {
                next[next.length - 1] = { ...last, text: fullText }
              }
              return next
            })
          } else if (parsed.type === 'done') {
            track('reed_response_received', {
              text_length: fullText.length,
              streamed: true,
              total_ms: Date.now() - startTime,
              first_token_ms: firstTokenAt ? firstTokenAt - startTime : null,
            })
          } else if (parsed.type === 'error') {
            track('reed_send_failed', { reason: parsed.message ?? 'stream error' })
            throw new Error(parsed.message ?? 'stream error')
          }
        }
      }

      // Filtro pós-stream: se nada veio, mostra fallback
      if (!fullText.trim()) {
        setMessages(prev => {
          const next = prev.slice()
          const last = next[next.length - 1]
          if (last?.role === 'reed' && !last.text) {
            next[next.length - 1] = { ...last, text: 'algo não funcionou do meu lado. tenta de novo — às vezes eu preciso de uma segunda chance pra pensar direito.' }
          }
          return next
        })
      }
    } catch (err) {
      if ((err as any).name === 'AbortError') return
      const message = err instanceof Error ? err.message : String(err)
      track('reed_send_failed', { reason: message })
      setError('reed não conseguiu responder. verifica tua conexão e tenta de novo.')
      // Remove placeholder vazio se nada veio
      if (!fullText) {
        setMessages(prev => prev.slice(0, -1))
      }
    }
  }

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
    const csv = '\uFEFF' + [header, ...rows].join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `reed_${ts}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

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
        setMessages(prev => [...prev, { role: 'reed', text: `[sys] conversa exportada (${messages.filter(m => !m.text.startsWith('[sys]')).length} mensagens).` }])
        return true
      }
      case '/reset': {
        if (!cycleId) { setMessages(prev => [...prev, { role: 'reed', text: '[sys] nenhum ciclo ativo.' }]); return true }
        if (messages.filter(m => !m.text.startsWith('[sys]')).length > 0) exportConversation(messages)
        try {
          const { data: { session } } = await supabase.auth.getSession()
          if (!session?.user?.id) { setMessages(prev => [...prev, { role: 'reed', text: '[sys] sem sessão autenticada.' }]); return true }
          const log: string[] = ['[sys] reset (conversa exportada automaticamente)']
          const { data: hagoCycles, error: selErr } = await (supabase as any).from('cycles').select('id').eq('ipe_cycle_id', cycleId)
          if (selErr) log.push(`cycles select error: ${selErr.message}`)
          else if (hagoCycles?.length) {
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
          } else log.push('nenhum ciclo HAGO encontrado')
          log.push('histórico limpo. reed recomeça do zero.')
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
          console.log('[DEV_FEEDBACK]', { cycleId, text: args, timestamp: new Date().toISOString() })
          setMessages(prev => [...prev, { role: 'reed', text: '[sys] feedback salvo no console.' }])
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

    if (userText.startsWith('/')) {
      setInput('')
      setMessages(prev => [...prev, { role: 'user', text: userText }])
      const handled = await handleDevCommand(userText)
      if (handled) return
    }

    if (!cycleId || !canonicalILs || baseVersion === null) return
    setInput('')
    setSending(true)
    setError(null)
    setMessages(prev => prev[prev.length - 1]?.text === userText ? prev : [...prev, { role: 'user', text: userText }])
    track('reed_message_sent', { length: userText.length, has_pill_context: !!pillContext })
    await sendToReedStream(cycleId, baseVersion, canonicalILs, userText)
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

      <div className="r-header">
        <span className="r-header-label" onClick={() => navigate('/home')} style={{ cursor: 'pointer' }}>rdwth</span>
        <span className="r-header-section">reed</span>
        <span className="r-header-date">{getToday()}</span>
      </div>
      <div className="r-line" />

      <div className="r-scroll" style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '1.5rem', padding: '20px 24px 16px' }}>
        {messages.map((msg, i) => {
          const isSys = msg.role === 'reed' && msg.text.startsWith('[sys]')

          if (isSys) {
            return (
              <div key={i} style={{ paddingLeft: 0 }}>
                <p style={{
                  fontFamily: "'IBM Plex Mono', var(--r-font-sys), monospace",
                  fontWeight: 400, fontSize: 11, lineHeight: 1.7,
                  color: 'var(--r-muted)', letterSpacing: '0.04em',
                  whiteSpace: 'pre-wrap', margin: 0, opacity: 0.75,
                }}>
                  {msg.text}
                </p>
              </div>
            )
          }

          if (msg.role === 'reed') {
            const reedStyle: React.CSSProperties = {
              fontFamily: 'var(--r-font-ed)', fontWeight: 800, fontSize: 16,
              lineHeight: 1.7, color: 'var(--r-text)', letterSpacing: '0.01em',
              whiteSpace: 'pre-wrap', margin: 0,
            }

            // Welcome: typewriter inline. Demais mensagens: render direto.
            if (msg.isWelcome) {
              return (
                <div key={i} style={{ paddingLeft: 0 }}>
                  <p style={reedStyle}>
                    <Typewriter text={msg.text} charDelayMs={18} />
                  </p>
                </div>
              )
            }

            return (
              <div key={i} style={{ paddingLeft: 0 }}>
                <p style={reedStyle}>{msg.text}{sending && i === messages.length - 1 && <span className="r-typing-cursor">▌</span>}</p>
              </div>
            )
          }

          // role === 'user'
          return (
            <div key={i} style={{ paddingLeft: 28 }}>
              <p style={{
                fontFamily: 'var(--r-font-ed)', fontWeight: 300, fontSize: 14,
                lineHeight: 1.65, color: 'var(--r-sub)', letterSpacing: '0.01em',
                whiteSpace: 'pre-wrap', margin: 0,
              }}>
                {msg.text}
              </p>
            </div>
          )
        })}

        {sending && messages[messages.length - 1]?.role !== 'reed' && (
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
          <p style={{ fontFamily: 'var(--r-font-sys)', fontWeight: 300, fontSize: 11, color: 'var(--r-telha)', opacity: 0.8, margin: 0 }}>
            {error}
          </p>
        )}
        <div ref={bottomRef} />
      </div>

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
              flex: 1, background: 'transparent', border: 'none', outline: 'none',
              overflow: 'hidden', fontFamily: 'var(--r-font-ed)', fontWeight: 300,
              fontSize: 14, color: 'var(--r-text)', letterSpacing: '0.01em',
              lineHeight: 1.6, padding: 0,
            }}
          />
          {userId && cycleId && (
            <AudioRecorder
              userId={userId} cycleId={cycleId} pillId="reed" moment="reed" language="pt-BR"
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
        @keyframes rdwth-cursor-blink {
          0%, 50% { opacity: 1; }
          51%, 100% { opacity: 0; }
        }
        .r-typing-cursor {
          display: inline-block;
          animation: rdwth-cursor-blink 1s step-end infinite;
          color: var(--r-telha);
          margin-left: 2px;
        }
        @keyframes rdwth-pulse {
          0%, 80%, 100% { opacity: 0.25; transform: scale(0.8); }
          40% { opacity: 0.8; transform: scale(1.1); }
        }
      `}</style>
    </div>
  )
}
