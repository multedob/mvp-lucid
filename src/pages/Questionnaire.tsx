// src/pages/Questionnaire.tsx
// Fluxo: /plan → /next-block loop → lucid-engine
// Design system: _rdwth — mesmo padrão visual das Pills (header-label + date, Footer component)

import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/integrations/supabase/client'
import { callEdgeFunction, getCurrentUserVersion, getToday } from '@/lib/api'
import { QUESTIONS, getQuestionText, type BlockId } from '@/data/questions'

// ─────────────────────────────────────────
// Types
// ─────────────────────────────────────────
interface NextBlockResponse {
  done: boolean
  next_block: string | null
  variante_a_servir: string | null
  aguardando_variante: boolean
  dimension_transition: string | null
  questionnaire_state_id: string
}

type Phase =
  | 'loading'
  | 'question'
  | 'variant'
  | 'fallback'
  | 'subfallback'
  | 'transition'
  | 'done'

// ─────────────────────────────────────────
// Subcomponents — mesmo padrão do PillFlow
// ─────────────────────────────────────────

function Header() {
  const navigate = useNavigate()
  return (
    <>
      <div className="r-header">
        <span className="r-header-label"><span onClick={() => navigate("/home")} style={{ cursor: "pointer" }}>_rdwth</span> · questionário</span>
        <span className="r-header-date">{getToday()}</span>
      </div>
      <div className="r-line" />
    </>
  )
}

function Footer({
  onContinue,
  continueLabel = "send",
  onFallback,
  fallbackLabel,
  onEthics,
  disabled = false,
}: {
  onContinue?: () => void
  continueLabel?: string
  onFallback?: () => void
  fallbackLabel?: string
  onEthics?: () => void
  disabled?: boolean
}) {
  return (
    <>
      <div className="r-line" />
      <div className="r-footer">
        {onFallback && fallbackLabel && (
          <span className="r-footer-action" onClick={onFallback}>
            {fallbackLabel}
          </span>
        )}
        {onContinue && (
          <span
            className="r-footer-action"
            onClick={disabled ? undefined : onContinue}
            style={{
              opacity: disabled ? 0.3 : 1,
              cursor: disabled ? 'default' : 'pointer',
              marginLeft: onFallback ? 0 : undefined,
            }}
          >
            {continueLabel}
          </span>
        )}
        {onEthics && (
          <span className="r-footer-ethics" onClick={onEthics}>
            i'd rather not
          </span>
        )}
      </div>
    </>
  )
}

function InvisibleTextarea({
  value,
  onChange,
  disabled = false,
  onCmdEnter,
}: {
  value: string
  onChange: (v: string) => void
  disabled?: boolean
  onCmdEnter?: () => void
}) {
  const ref = useRef<HTMLTextAreaElement>(null)
  const valueRef = useRef(value)
  const recogRef = useRef<any>(null)
  const [listening, setListening] = useState(false)
  const [interimText, setInterimText] = useState('')

  useEffect(() => { valueRef.current = value }, [value])

  useEffect(() => {
    if (ref.current) {
      ref.current.style.height = 'auto'
      ref.current.style.height = ref.current.scrollHeight + 'px'
    }
  }, [value])

  useEffect(() => {
    setTimeout(() => ref.current?.focus(), 100)
  }, [])

  function toggleMic() {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (!SR) return
    if (listening) {
      recogRef.current?.stop()
      setListening(false)
      setInterimText('')
      return
    }
    const r = new SR()
    r.lang = 'pt-BR'
    r.continuous = true
    r.interimResults = true
    r.onresult = (e: any) => {
      let finalStr = ''
      let interimStr = ''
      for (let i = e.resultIndex; i < e.results.length; i++) {
        if (e.results[i].isFinal) {
          finalStr += e.results[i][0].transcript
        } else {
          interimStr += e.results[i][0].transcript
        }
      }
      if (finalStr) {
        const prev = valueRef.current
        onChange((prev ? prev + ' ' : '') + finalStr)
      }
      setInterimText(interimStr)
    }
    r.onend = () => { setListening(false); setInterimText('') }
    r.onerror = () => { setListening(false); setInterimText('') }
    r.start()
    recogRef.current = r
    setListening(true)
  }

  const hasSpeech = typeof window !== 'undefined' && (
    !!(window as any).SpeechRecognition || !!(window as any).webkitSpeechRecognition
  )

  return (
    <div className="r-input-wrap">
      <textarea
        ref={ref}
        className="r-textarea"
        value={value}
        onChange={e => onChange(e.target.value)}
        onKeyDown={e => {
          if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
            onCmdEnter?.()
          }
        }}
        placeholder=""
        rows={1}
        disabled={disabled}
      />
      {listening && interimText && (
        <div style={{
          fontFamily: 'var(--r-font-sys)',
          fontSize: 11,
          fontWeight: 300,
          color: 'var(--r-ghost)',
          letterSpacing: '0.02em',
          lineHeight: 1.6,
          padding: '6px 0 2px',
        }}>
          {interimText}
        </div>
      )}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6 }}>
        {hasSpeech && (
          <div
            onClick={disabled ? undefined : toggleMic}
            title={listening ? 'parar gravação' : 'falar resposta'}
            style={{
              width: 6,
              height: 6,
              borderRadius: '50%',
              border: listening ? 'none' : '0.5px solid var(--r-dim)',
              background: listening ? 'var(--r-accent)' : 'transparent',
              cursor: disabled ? 'default' : 'pointer',
              flexShrink: 0,
              transition: 'all 0.2s',
              outline: listening ? '2px solid var(--r-accent)' : 'none',
              outlineOffset: '3px',
            }}
          />
        )}
        <div className={`r-send-dot${value.trim().length >= 2 ? ' active' : ''}`} />
      </div>
    </div>
  )
}

// ─────────────────────────────────────────
// Component
// ─────────────────────────────────────────
export default function Questionnaire() {
  const navigate = useNavigate()

  const [phase, setPhase] = useState<Phase>('loading')
  const [cycleId, setCycleId] = useState<string | null>(null)
  const [stateId, setStateId] = useState<string | null>(null)

  const [currentBlock, setCurrentBlock] = useState<string | null>(null)
  const [currentVariant, setCurrentVariant] = useState<string | null>(null)
  const [dimensionTransition, setDimensionTransition] = useState<string | null>(null)

  const [answer, setAnswer] = useState('')
  const [startTime, setStartTime] = useState<number>(Date.now())
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  // Rotation variants: loaded once after /plan, used for principal question text
  const [rotationVariants, setRotationVariants] = useState<
    Record<string, { variation_key: string; content: { principal: string; hint?: string | null } }>
  >({})

  // ─────────────────────────────────────
  // Init
  // ─────────────────────────────────────
  useEffect(() => { init() }, [])

  async function init() {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { navigate('/auth'); return }

      const { data: cycle } = await supabase
        .from('ipe_cycles')
        .select('id, status')
        .eq('user_id', session.user.id)
        .in('status', ['questionnaire', 'pills'])
        .order('cycle_number', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (!cycle) { navigate('/home'); return }
      setCycleId(cycle.id)

      const planRes = await callEdgeFunction('ipe-questionnaire-engine/plan', {
        ipe_cycle_id: cycle.id,
      })
      setStateId((planRes as any).questionnaire_state_id)

      // Load rotation variants for all blocks (weighted random per-block)
      try {
        const allBlockIds = [
          'L1.1','L1.2','L1.3','L1.4','L2.1','L2.2','L2.3','L2.4',
          'L3.1','L3.2','L3.3','L3.4','L3.4_CP','L4.1','L4.2','L4.3','L4.4',
        ]
        const vrRes = await callEdgeFunction<{
          variations: Record<string, { variation_key: string; content: { principal: string; hint?: string | null } }>
        }>('ipe-variation-selector', {
          action: 'select_questionnaire_variations',
          user_id: session.user.id,
          ipe_cycle_id: cycle.id,
          block_ids: allBlockIds,
          ipe_level: 1.0,
        })
        setRotationVariants(vrRes.variations ?? {})
      } catch (err) {
        console.warn('[Questionnaire] Rotation variant selector failed, using default questions:', err)
        // Fallback: rotationVariants stays empty → questions.ts used as-is
      }

      await fetchNextBlock(cycle.id, null)
    } catch (e) {
      setError('algo deu errado ao iniciar. tenta de novo.')
    }
  }

  // ─────────────────────────────────────
  // Next block
  // ─────────────────────────────────────
  async function fetchNextBlock(cid: string, blockResponse: object | null) {
    try {
      const body: Record<string, unknown> = { ipe_cycle_id: cid }
      if (blockResponse) body.block_response = blockResponse

      const res: NextBlockResponse = await callEdgeFunction(
        'ipe-questionnaire-engine/next-block',
        body
      )

      if (res.done) {
        setPhase('done')
        await callLucidEngine(cid)
        return
      }

      setCurrentBlock(res.next_block)
      setCurrentVariant(res.aguardando_variante ? res.variante_a_servir : null)
      setAnswer('')
      setStartTime(Date.now())

      if (res.dimension_transition) {
        setDimensionTransition(res.dimension_transition)
        setPhase('transition')
        setTimeout(() => {
          setDimensionTransition(null)
          setPhase(res.aguardando_variante ? 'variant' : 'question')
        }, 1200)
      } else {
        setPhase(res.aguardando_variante ? 'variant' : 'question')
      }
    } catch (e) {
      setError('erro ao carregar próxima pergunta.')
    }
  }

  // ─────────────────────────────────────
  // Submit
  // ─────────────────────────────────────
  async function handleSubmit(protecao = false) {
    if (!cycleId || !currentBlock || submitting) return
    if (!protecao && answer.trim().length < 2) return

    setSubmitting(true)
    setError(null)

    const tempo = Math.round((Date.now() - startTime) / 1000)

    // Include rotation_variation_key so backend can track which version was shown
    const rotationKey = rotationVariants[currentBlock]?.variation_key ?? null

    const blockResponse = currentVariant
      ? {
          block_id: currentBlock,
          principal_resposta: null,
          variante_resposta: protecao ? null : answer.trim(),
          protecao_etica: protecao,
          tempo_resposta_segundos: tempo,
          rotation_variation_key: rotationKey,
        }
      : {
          block_id: currentBlock,
          principal_resposta: protecao ? null : answer.trim(),
          variante_resposta: null,
          protecao_etica: protecao,
          tempo_resposta_segundos: tempo,
          rotation_variation_key: rotationKey,
        }

    await fetchNextBlock(cycleId, blockResponse)
    setSubmitting(false)
  }

  // ─────────────────────────────────────
  // Fallback
  // ─────────────────────────────────────
  function handleFallback() {
    if (phase === 'question') {
      setPhase('fallback')
      setAnswer('')
    } else if (phase === 'fallback') {
      const block = QUESTIONS[currentBlock as BlockId]
      if (block?.subfallback) {
        setPhase('subfallback')
        setAnswer('')
      }
    }
  }

  // ─────────────────────────────────────
  // Lucid engine
  // ─────────────────────────────────────
  async function callLucidEngine(cid: string) {
    try {
      const { data: qState } = await supabase
        .from('questionnaire_state')
        .select('resultados_por_bloco')
        .eq('ipe_cycle_id', cid)
        .single()

      const resultados = (qState?.resultados_por_bloco ?? {}) as Record<string, { il_canonico: number | null }>
      const d1 = extractDimensionILs(resultados, ['L1.1', 'L1.2', 'L1.3', 'L1.4'])
      const d2 = extractDimensionILs(resultados, ['L2.4', 'L2.1', 'L2.2', 'L2.3'])
      const d3 = extractDimensionILs(resultados, ['L3.3', 'L3.1', 'L3.2', 'L3.4'])
      const d4 = extractDimensionILs(resultados, ['L4.1', 'L4.2', 'L4.3', 'L4.4'])

      let baseVersion = await getCurrentUserVersion()

      try {
        await callEdgeFunction('lucid-engine', {
          ipe_cycle_id: cid,
          base_version: baseVersion,
          raw_input: { d1, d2, d3, d4, user_text: 'questionário concluído' },
        })
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err)
        if (!message.includes('VERSION_CONFLICT')) throw err
        baseVersion = await getCurrentUserVersion()
        await callEdgeFunction('lucid-engine', {
          ipe_cycle_id: cid,
          base_version: baseVersion,
          raw_input: { d1, d2, d3, d4, user_text: 'questionário concluído' },
        })
      }

      navigate('/reed')
    } catch (e) {
      navigate('/reed')
    }
  }

  function extractDimensionILs(
    resultados: Record<string, { il_canonico: number | null }>,
    lineIds: string[]
  ): number[] {
    return lineIds.map(id => resultados[id]?.il_canonico ?? 4.0)
  }

  // ─────────────────────────────────────
  // Display text
  // ─────────────────────────────────────
  function getDisplayText(): string {
    if (!currentBlock) return ''
    const block = QUESTIONS[currentBlock as BlockId]
    if (!block) return ''
    // Calibration variants (from scoring) — always use questions.ts
    if (phase === 'variant' && currentVariant) return block.variantes[currentVariant] ?? block.principal
    // Fallbacks — always use questions.ts (Portuguese, as designed)
    if (phase === 'fallback')    return block.fallback    ?? block.principal
    if (phase === 'subfallback') return block.subfallback ?? block.fallback ?? block.principal
    // Principal question — use rotation variant if available
    const rotation = rotationVariants[currentBlock]
    if (rotation?.content?.principal) return rotation.content.principal
    return block.principal
  }

  function getHintText(): string | undefined {
    if (!currentBlock || phase !== 'question') return undefined
    // Rotation variant may include a hint
    const rotation = rotationVariants[currentBlock]
    if (rotation?.content?.hint) return rotation.content.hint
    return QUESTIONS[currentBlock as BlockId]?.hint
  }

  const canFallback =
    (phase === 'question'  && !!QUESTIONS[currentBlock as BlockId]?.fallback) ||
    (phase === 'fallback'  && !!QUESTIONS[currentBlock as BlockId]?.subfallback)

  const fallbackLabel =
    phase === 'question'  ? 'outro exemplo' :
    phase === 'fallback'  ? 'outro exemplo' : undefined

  // ─────────────────────────────────────
  // Render
  // ─────────────────────────────────────

  if (phase === 'loading') return (
    <div className="r-screen" style={{ justifyContent: 'center', alignItems: 'center' }}>
      <span className="r-header-label">carregando</span>
    </div>
  )

  if (phase === 'transition') return (
    <div className="r-screen" style={{ justifyContent: 'center', alignItems: 'center' }}>
      <div style={{ width: 32, height: 0.5, background: 'var(--r-line)' }} />
    </div>
  )

  if (phase === 'done') return (
    <div className="r-screen" style={{ justifyContent: 'center', alignItems: 'center' }}>
      <span className="r-header-label">pronto</span>
    </div>
  )

  return (
    <div className="r-screen">

      <Header />

      {/* Pergunta */}
      <div className="r-scroll" style={{ padding: '24px 24px 0' }}>
        <p className="r-question" style={{ whiteSpace: 'pre-line' }}>
          {getDisplayText()}
        </p>
        {getHintText() && (
          <p className="r-sub" style={{ marginTop: 12 }}>
            {getHintText()}
          </p>
        )}
        {error && (
          <p className="r-sub" style={{ color: 'var(--r-accent)', marginTop: 12 }}>
            {error}
          </p>
        )}
        <div style={{ height: 24 }} />
      </div>

      {/* Input — mesmo padrão das pills */}
      <div className="r-line" />
      <div style={{ padding: '12px 24px 10px', flexShrink: 0 }}>
        <InvisibleTextarea
          value={answer}
          onChange={setAnswer}
          disabled={submitting}
          onCmdEnter={() => handleSubmit()}
        />
      </div>

      {/* Footer — mesmo padrão das pills */}
      <Footer
        onContinue={() => handleSubmit()}
        continueLabel={submitting ? '...' : 'send'}
        disabled={submitting || answer.trim().length < 2}
        onFallback={canFallback ? handleFallback : undefined}
        fallbackLabel={fallbackLabel}
        onEthics={() => handleSubmit(true)}
      />

    </div>
  )
}
