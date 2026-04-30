// src/pages/Questionnaire.tsx
// Fluxo: /plan → /next-block loop → lucid-engine
// Design system: rdwth — mesmo padrão visual das Pills (header-label + date, Footer component)

import { useState, useEffect, useRef, forwardRef, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/integrations/supabase/client'
import { callEdgeFunction, getCurrentUserVersion, getToday } from '@/lib/api'
import { triggerDeepReadingRefresh } from '@/lib/deepReading'
import { QUESTIONS, getQuestionText, type BlockId } from '@/data/questions'
import { AudioRecorder } from '@/components/AudioRecorder'

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

const Header = forwardRef<HTMLDivElement>((_, ref) => {
  const navigate = useNavigate()
  return (
    <>
      <div ref={ref} className="r-header">
        <span className="r-header-label"><span onClick={() => navigate("/home")} style={{ cursor: "pointer" }}>rdwth</span> · questionário</span>
        <span className="r-header-date">{getToday()}</span>
      </div>
      <div className="r-line" />
    </>
  )
});
Header.displayName = "Header";

interface QFooterProps {
  onContinue?: () => void
  continueLabel?: string
  onFallback?: () => void
  fallbackLabel?: string
  recorder?: ReactNode
  disabled?: boolean
}
const Footer = forwardRef<HTMLDivElement, QFooterProps>(({
  onContinue,
  continueLabel = "send",
  onFallback,
  fallbackLabel,
  recorder,
  disabled = false,
}, ref) => {
  const navigate = useNavigate()
  return (
    <>
      <div className="r-line" />
      <div ref={ref} className="r-footer">
        <span onClick={() => navigate(-1)} style={{ fontFamily: "var(--r-font-sys)", fontWeight: 300, fontSize: 13, color: "var(--r-muted)", cursor: "pointer" }}>‹</span>
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 14 }}>
          {onFallback && fallbackLabel && (
            <span className="r-footer-action" onClick={onFallback}>
              {fallbackLabel}
            </span>
          )}
          {recorder}
          {onContinue && (
            <span
              className="r-footer-action"
              onClick={disabled ? undefined : onContinue}
              style={{ opacity: disabled ? 0.3 : 1, cursor: disabled ? 'default' : 'pointer' }}
            >
              {continueLabel}
            </span>
          )}
        </div>
      </div>
    </>
  )
});
Footer.displayName = "Footer";

interface QTextareaProps {
  value: string
  onChange: (v: string) => void
  disabled?: boolean
  onCmdEnter?: () => void
}
const InvisibleTextarea = forwardRef<HTMLDivElement, QTextareaProps>(({
  value,
  onChange,
  disabled = false,
  onCmdEnter,
}, fwdRef) => {
  const ref = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (ref.current) {
      ref.current.style.height = 'auto'
      ref.current.style.height = ref.current.scrollHeight + 'px'
    }
  }, [value])

  useEffect(() => {
    setTimeout(() => ref.current?.focus(), 100)
  }, [])

  return (
    <div ref={fwdRef} className="r-input-wrap">
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
    </div>
  )
});
InvisibleTextarea.displayName = "InvisibleTextarea";

// ─────────────────────────────────────────
// Component
// ─────────────────────────────────────────
export default function Questionnaire() {
  const navigate = useNavigate()

  const [phase, setPhase] = useState<Phase>('loading')
  const [cycleId, setCycleId] = useState<string | null>(null)
  const [stateId, setStateId] = useState<string | null>(null)
  const [userId, setUserId] = useState<string | null>(null)

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
      setUserId(session.user.id)

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

      // Wave 14 — fire-and-forget: regen do deep reading após bloco completado.
      // Só dispara se houve blockResponse (i.e. um bloco foi efetivamente submitido).
      if (blockResponse) {
        triggerDeepReadingRefresh(cid)
      }

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
  async function handleSubmit() {
    if (!cycleId || !currentBlock || submitting) return
    if (answer.trim().length < 2) return

    setSubmitting(true)
    setError(null)

    const tempo = Math.round((Date.now() - startTime) / 1000)

    // Include rotation_variation_key so backend can track which version was shown
    const rotationKey = rotationVariants[currentBlock]?.variation_key ?? null

    const blockResponse = currentVariant
      ? {
          block_id: currentBlock,
          principal_resposta: null,
          variante_resposta: answer.trim(),
          protecao_etica: false,
          tempo_resposta_segundos: tempo,
          rotation_variation_key: rotationKey,
        }
      : {
          block_id: currentBlock,
          principal_resposta: answer.trim(),
          variante_resposta: null,
          protecao_etica: false,
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
        recorder={userId && cycleId ? (
          <AudioRecorder
            userId={userId}
            cycleId={cycleId}
            pillId={currentBlock ?? 'questionnaire'}
            moment="questionnaire"
            language="pt-BR"
            onLiveTranscript={setAnswer}
            onFinalTranscript={setAnswer}
            disabled={submitting}
          />
        ) : undefined}
      />

    </div>
  )
}
