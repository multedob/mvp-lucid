// src/pages/Reed.tsx
// Reed v2 — abre com apresentação, classifica mensagens, chips contextuais
//
// Tipos de mensagem:
//   casual      → resposta local curta, sem chamar o backend
//   meta        → resposta local explicando o Reed, sem chamar o backend
//   structural  → backend com hint (conceitos LUCID específicos)
//   exploratory → backend completo (exploração real)
//
// Chips contextuais mudam conforme o estado da conversa:
//   intro      → após apresentação (sem histórico)
//   active     → durante conversa
//   post_long  → após resposta longa do Reed

import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/integrations/supabase/client'
import { callEdgeFunction, getCurrentUserVersion, getToday } from '@/lib/api'

// ─── Types ────────────────────────────────────────────────────────
interface Message {
  role: 'user' | 'reed'
  text: string
  local?: boolean // gerada localmente, não persistida no backend
}

interface CanonicalILs { d1: number[]; d2: number[]; d3: number[]; d4: number[] }

type MessageType = 'casual' | 'meta' | 'structural' | 'exploratory'
type ChipSet    = 'intro' | 'active' | 'post_long'

interface Chip { label: string; text: string; type: MessageType }

// ─── Classificação de mensagem ─────────────────────────────────────
// Mensagens casuais e meta são respondidas localmente.
// Structural e exploratory vão para o backend.
function classifyMessage(raw: string): MessageType {
  const t = raw.trim().toLowerCase()

  // Casual: saudações, frases curtas sem interrogação real
  const casualRx = /^(oi|olá|ola|oi reed|bom dia|boa tarde|boa noite|tudo bem|tudo bom|tudo|e aí|eai|hello|hi|hey|obrigad|valeu|legal|entendi|certo|sim|não|nao|show|blz|beleza|👋|😊|👍|até|tchau|flw|falou)[\s!?.]*$/
  if (casualRx.test(t) || (t.length <= 20 && !t.includes('?') && !t.includes('como') && !t.includes('por que') && !t.includes('o que'))) return 'casual'

  // Meta: perguntas sobre o próprio Reed / sistema
  const metaRx = /(como (você|vc|voce) funciona|o que (é|e|são|sao) (você|vc|o reed|o lucid|isso|as pills|um pill|uma pill|o ipe|o questionário|o questio|a luce)|como isso funciona|me explica|o que é (o )?reed|reed (é|funciona|faz)|como (eu )?uso|pra que serve|você (decide|prescreve|aconselha)|você me (diz|fala|define))/
  if (metaRx.test(t)) return 'meta'

  // Structural: conceitos LUCID específicos
  const structuralRx = /(l[1-4]\.[1-4]|dimensão [1-4]|pill [ivxIVX]{1,3}\b|ciclo \d|il \d|scoring|ipe[12]?|questionário completo|o que significa|quer dizer|estrutura (do|de)|resultado (do|de)|lucid engine|radar|hago)/
  if (structuralRx.test(t)) return 'structural'

  return 'exploratory'
}

// ─── Respostas locais ─────────────────────────────────────────────
const CASUAL_REPLIES = ['oi.', 'aqui.', 'presente.', 'com você.', 'pode falar.']

const META_REPLY =
  `o reed é um espaço para explorar o que surgiu — das pills, do questionário, ou do que você trouxer.

não diagnostico, não prescrevo, não decido nada por você. organizo e ilumino. a conversa pode ir onde você quiser.

tem algo específico que quer entender?`

// ─── Intro (apresentação animada) ─────────────────────────────────
const INTRO_MESSAGES: Message[] = [
  { role: 'reed', text: 'eu sou o reed.', local: true },
  { role: 'reed', text: 'estou aqui para explorar o que surgiu — das pills, do questionário, ou do que você trouxer.', local: true },
  { role: 'reed', text: 'pode começar com qualquer coisa. ou escolher por onde ir:', local: true },
]

// ─── Chips ────────────────────────────────────────────────────────
const CHIPS: Record<ChipSet, Chip[]> = {
  intro: [
    { label: 'como você funciona',     text: 'como você funciona?',                          type: 'meta'        },
    { label: 'tem algo do resultado',  text: 'quero explorar o que surgiu no meu resultado', type: 'exploratory' },
    { label: 'quero falar',            text: 'tenho algo que quero explorar',                type: 'exploratory' },
  ],
  active: [
    { label: 'não entendi',   text: 'não entendi, pode reformular?',   type: 'meta'        },
    { label: 'vai fundo',     text: 'quero ir mais fundo nisso',       type: 'exploratory' },
    { label: 'e na prática',  text: 'e como isso aparece na prática?', type: 'exploratory' },
  ],
  post_long: [
    { label: 'resumo em uma frase',  text: 'pode resumir em uma frase?',  type: 'exploratory' },
    { label: 'seguinte',             text: 'próximo ponto',               type: 'exploratory' },
    { label: 'ok',                   text: 'ok.',                         type: 'casual'      },
  ],
}

// ─── Utils ────────────────────────────────────────────────────────
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
  if (typeof d.llm_response === 'string')   return d.llm_response
  if (typeof d.response_text === 'string')  return d.response_text
  return ''
}

// ─── Component ───────────────────────────────────────────────────
export default function Reed() {
  const navigate = useNavigate()

  const bottomRef    = useRef<HTMLDivElement>(null)
  const inputRef     = useRef<HTMLTextAreaElement>(null)
  const introRef     = useRef(false) // impede dupla animação (StrictMode)
  const timeoutsRef  = useRef<ReturnType<typeof setTimeout>[]>([])

  const [messages,     setMessages]     = useState<Message[]>([])
  const [input,        setInput]        = useState('')
  const [loading,      setLoading]      = useState(true)
  const [sending,      setSending]      = useState(false)
  const [hasHistory,   setHasHistory]   = useState(false)
  const [chipSet,      setChipSet]      = useState<ChipSet>('intro')
  const [chipsVisible, setChipsVisible] = useState(false)

  const [cycleId,       setCycleId]       = useState<string | null>(null)
  const [baseVersion,   setBaseVersion]   = useState<number | null>(null)
  const [canonicalILs,  setCanonicalILs]  = useState<CanonicalILs | null>(null)
  const [error,         setError]         = useState<string | null>(null)

  // ── Scroll to bottom whenever messages change ──────────────────
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, sending])

  // ── Animar intro após carregar (sem histórico) ─────────────────
  useEffect(() => {
    if (!loading && !hasHistory && !introRef.current) {
      introRef.current = true
      let i = 0

      const addNext = () => {
        setMessages(prev => [...prev, INTRO_MESSAGES[i]])
        i++
        if (i < INTRO_MESSAGES.length) {
          const t = setTimeout(addNext, 480)
          timeoutsRef.current.push(t)
        } else {
          // Última mensagem: mostrar chips
          const t = setTimeout(() => {
            setChipSet('intro')
            setChipsVisible(true)
            setTimeout(() => inputRef.current?.focus(), 100)
          }, 200)
          timeoutsRef.current.push(t)
        }
      }

      const t = setTimeout(addNext, 350)
      timeoutsRef.current.push(t)
    }

    return () => {
      timeoutsRef.current.forEach(clearTimeout)
      timeoutsRef.current = []
    }
  }, [loading, hasHistory])

  // ── Init ───────────────────────────────────────────────────────
  useEffect(() => { init() }, [])

  async function init() {
    try {
      const { data: { session } } = await supabase.auth.getSession()

      // Buscar ciclo mais recente
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

      // ILs do questionário
      const { data: qState } = await (supabase.from('questionnaire_state') as any)
        .select('resultados_por_bloco')
        .eq('ipe_cycle_id', cycle.id)
        .maybeSingle()
      const resultados = (qState?.resultados_por_bloco ?? {}) as Record<string, { il_canonico: number | null }>
      setCanonicalILs(extractILs(resultados))

      // Histórico de conversas
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
        setHasHistory(true)

        // Determinar chipSet baseado no estado da conversa
        const lastReed = [...history].reverse().find(m => m.role === 'reed')
        setChipSet(lastReed && lastReed.text.length > 200 ? 'post_long' : 'active')
        setChipsVisible(true)
        setTimeout(() => inputRef.current?.focus(), 200)
      }

      setLoading(false)
    } catch {
      setError('algo deu errado ao carregar.')
      setLoading(false)
    }
  }

  // ── Chamar backend ─────────────────────────────────────────────
  async function sendToBackend(
    cid: string,
    baseVer: number,
    ils: CanonicalILs,
    userText: string,
    msgType: MessageType,
    retryOnConflict = true
  ) {
    try {
      const data = await callEdgeFunction<Record<string, unknown>>('lucid-engine', {
        ipe_cycle_id: cid,
        base_version: baseVer,
        raw_input: {
          d1: ils.d1, d2: ils.d2, d3: ils.d3, d4: ils.d4,
          user_text: userText,
          message_type: msgType, // hint para o backend calibrar tom/profundidade
        },
      })
      const nextVersion = data.current_version
      if (typeof nextVersion === 'number') setBaseVersion(nextVersion)
      const text = extractResponseText(data)
      if (text) {
        setMessages(prev => [...prev, { role: 'reed', text }])
        setChipSet(text.length > 200 ? 'post_long' : 'active')
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      if (retryOnConflict && msg.includes('VERSION_CONFLICT')) {
        const freshVersion = await getCurrentUserVersion()
        setBaseVersion(freshVersion)
        await sendToBackend(cid, freshVersion, ils, userText, msgType, false)
        return
      }
      setError('reed não respondeu. tenta de novo.')
    }
  }

  // ── Enviar mensagem ────────────────────────────────────────────
  const handleSend = useCallback(async (overrideText?: string, overrideType?: MessageType) => {
    const rawText = overrideText ?? input.trim()
    if (!rawText || sending) return

    const msgType = overrideType ?? classifyMessage(rawText)

    setInput('')
    setError(null)
    setChipsVisible(false)
    setMessages(prev => [...prev, { role: 'user', text: rawText }])

    // ── Casual: resposta local imediata ───────────────────────────
    if (msgType === 'casual') {
      const reply = CASUAL_REPLIES[Math.floor(Math.random() * CASUAL_REPLIES.length)]
      setTimeout(() => {
        setMessages(prev => [...prev, { role: 'reed', text: reply, local: true }])
        setChipSet('active')
        setChipsVisible(true)
      }, 350)
      return
    }

    // ── Meta: resposta local explicando o Reed ────────────────────
    if (msgType === 'meta') {
      setTimeout(() => {
        setMessages(prev => [...prev, { role: 'reed', text: META_REPLY, local: true }])
        setChipSet('active')
        setChipsVisible(true)
      }, 400)
      return
    }

    // ── Structural / Exploratory: chama o backend ─────────────────
    if (!cycleId || !canonicalILs || baseVersion === null) {
      setError('contexto não carregado ainda. tenta de novo.')
      return
    }

    setSending(true)
    await sendToBackend(cycleId, baseVersion, canonicalILs, rawText, msgType)
    setSending(false)
    setChipsVisible(true)
    setTimeout(() => inputRef.current?.focus(), 100)
  }, [input, sending, cycleId, canonicalILs, baseVersion])

  // ── Chip click — silencioso: sem bolha do usuário, sem entrada visível no banco ──
  // A instrução expandida vai para o backend como contexto, não como fala do usuário.
  // chips com type 'casual' (ex: "ok") apenas fecham os chips — sem chamada ao backend.
  const handleChip = useCallback(async (chip: Chip) => {
    setChipsVisible(false)
    setError(null)

    // Chip neutro/casual ("ok") → só fecha, sem resposta
    if (chip.type === 'casual') return

    // Meta → resposta local, sem backend, sem bolha
    if (chip.type === 'meta') {
      setTimeout(() => {
        setMessages(prev => [...prev, { role: 'reed', text: META_REPLY, local: true }])
        setChipSet('active')
        setChipsVisible(true)
      }, 320)
      return
    }

    // Exploratory / structural → backend, mas sem adicionar bolha do usuário na UI
    if (!cycleId || !canonicalILs || baseVersion === null || sending) return
    setSending(true)
    await sendToBackend(cycleId, baseVersion, canonicalILs, chip.text, chip.type)
    setSending(false)
    setChipsVisible(true)
    setTimeout(() => inputRef.current?.focus(), 100)
  }, [sending, cycleId, canonicalILs, baseVersion])

  // ─── Render ──────────────────────────────────────────────────────
  if (loading) return (
    <div className="r-screen" style={{ justifyContent: 'center', alignItems: 'center' }}>
      <span style={{
        fontFamily: 'var(--r-font-sys)', fontWeight: 300,
        fontSize: '0.75rem', letterSpacing: '0.08em', color: 'var(--r-muted)',
      }}>
        carregando
      </span>
    </div>
  )

  return (
    <div className="r-screen">

      {/* Header */}
      <div className="r-header">
        <span className="r-header-label"><span onClick={() => navigate("/home")} style={{ cursor: "pointer" }}>_rdwth</span> · reed</span>
        <span className="r-header-date">{getToday()}</span>
      </div>
      <div className="r-line" />

      {/* Mensagens */}
      <div className="r-scroll" style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        {messages.map((msg, i) =>
          msg.role === 'reed' ? (
            <div key={i}>
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
          <div style={{ display: 'flex', gap: '0.3rem', alignItems: 'center', paddingTop: 4 }}>
            {[0, 1, 2].map(i => (
              <span key={i} style={{
                width: 4, height: 4, borderRadius: '50%',
                background: 'var(--r-muted)',
                animation: `reed-pulse 1.2s ease-in-out ${i * 0.2}s infinite`,
              }} />
            ))}
          </div>
        )}

        {error && (
          <p style={{
            fontFamily: 'var(--r-font-sys)', fontWeight: 300,
            fontSize: 11, color: 'var(--r-accent)', opacity: 0.8, margin: 0,
          }}>
            {error}
          </p>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input + chips */}
      <div className="r-line" />
      <div style={{ padding: '10px 24px 12px', flexShrink: 0 }}>

        {/* Chips — aparecem contextualmente */}
        {chipsVisible && !sending && (
          <div style={{
            display: 'flex',
            gap: 0,
            flexWrap: 'wrap',
            marginBottom: 10,
          }}>
            {CHIPS[chipSet].map((chip, i) => (
              <span key={chip.label}>
                <span
                  onClick={() => handleChip(chip)}
                  style={{
                    fontFamily: 'var(--r-font-sys)',
                    fontWeight: 300,
                    fontSize: 10,
                    letterSpacing: '0.06em',
                    color: 'var(--r-dim)',
                    cursor: 'pointer',
                    transition: 'color 0.15s',
                    userSelect: 'none',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.color = 'var(--r-text)')}
                  onMouseLeave={e => (e.currentTarget.style.color = 'var(--r-dim)')}
                >
                  {chip.label}
                </span>
                {i < CHIPS[chipSet].length - 1 && (
                  <span style={{
                    fontFamily: 'var(--r-font-sys)',
                    fontSize: 10,
                    color: 'var(--r-ghost)',
                    margin: '0 8px',
                    userSelect: 'none',
                  }}>·</span>
                )}
              </span>
            ))}
          </div>
        )}

        {/* Textarea + send dot */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          borderBottom: '0.5px solid var(--r-ghost)',
          paddingBottom: 8,
        }}>
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
          {/* Send dot */}
          <div
            onClick={() => handleSend()}
            style={{
              width: 6, height: 6, borderRadius: '50%', flexShrink: 0,
              cursor: input.trim() ? 'pointer' : 'default',
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
          { label: 'pills',   path: '/pills',   active: false },
          { label: 'context', path: '/context', active: false },
          { label: 'reed',    path: '/reed',    active: true  },
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
        @keyframes reed-pulse {
          0%, 80%, 100% { opacity: 0.2; transform: scale(0.75); }
          40%            { opacity: 0.7; transform: scale(1.1);  }
        }
      `}</style>
    </div>
  )
}
