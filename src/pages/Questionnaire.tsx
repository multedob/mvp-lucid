// src/pages/Questionnaire.tsx
// Fluxo: /plan → /next-block loop → lucid-engine
// Design system: _rdwth (prefixo --r-)

import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/integrations/supabase/client'
import { callEdgeFunction } from '@/lib/api'
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
  | 'loading'       // carregando plano
  | 'question'      // respondendo pergunta principal
  | 'variant'       // respondendo variante
  | 'fallback'      // sem episódio — exibindo fallback
  | 'subfallback'   // segundo nível de fallback
  | 'transition'    // pausa entre dimensões
  | 'done'          // questionário encerrado

// ─────────────────────────────────────────
// Component
// ─────────────────────────────────────────
export default function Questionnaire() {
  const navigate = useNavigate()
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const [phase, setPhase] = useState<Phase>('loading')
  const [cycleId, setCycleId] = useState<string | null>(null)
  const [stateId, setStateId] = useState<string | null>(null)

  // bloco atual
  const [currentBlock, setCurrentBlock] = useState<string | null>(null)
  const [currentVariant, setCurrentVariant] = useState<string | null>(null)
  const [dimensionTransition, setDimensionTransition] = useState<string | null>(null)

  // resposta
  const [answer, setAnswer] = useState('')
  const [startTime, setStartTime] = useState<number>(Date.now())

  // erro
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  // ─────────────────────────────────────
  // Inicialização: obter ciclo ativo e chamar /plan
  // ─────────────────────────────────────
  useEffect(() => {
    init()
  }, [])

  async function init() {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { navigate('/auth'); return }

      // Buscar ciclo ativo (status = 'questionnaire' ou 'pills')
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

      // Chamar /plan
      const planRes = await callEdgeFunction('ipe-questionnaire-engine/plan', {
        ipe_cycle_id: cycle.id,
      })

      setStateId((planRes as any).questionnaire_state_id)

      // Obter primeiro bloco
      await fetchNextBlock(cycle.id, null)
    } catch (e) {
      setError('algo deu errado ao iniciar. tenta de novo.')
    }
  }

  // ─────────────────────────────────────
  // Obter próximo bloco do engine
  // ─────────────────────────────────────
  async function fetchNextBlock(
    cid: string,
    blockResponse: object | null
  ) {
    try {
      const body: Record<string, unknown> = { ipe_cycle_id: cid }
      if (blockResponse) body.block_response = blockResponse

      const res: NextBlockResponse = await callEdgeFunction(
        'ipe-questionnaire-engine/next-block',
        body
      )

      if (res.done) {
        setPhase('done')
        // Chamar lucid-engine com canonical ILs
        await callLucidEngine(cid)
        return
      }

      setCurrentBlock(res.next_block)
      setCurrentVariant(res.aguardando_variante ? res.variante_a_servir : null)
      setAnswer('')
      setStartTime(Date.now())
      focusTextarea()

      if (res.dimension_transition) {
        setDimensionTransition(res.dimension_transition)
        setPhase('transition')
        // Pausa de 1.2s e avança
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
  // Submeter resposta
  // ─────────────────────────────────────
  async function handleSubmit(protecao = false) {
    if (!cycleId || !currentBlock || submitting) return
    if (!protecao && answer.trim().length < 2) return

    setSubmitting(true)
    setError(null)

    const tempo = Math.round((Date.now() - startTime) / 1000)

    const blockResponse = currentVariant
      ? {
          block_id: currentBlock,
          principal_resposta: null,
          variante_resposta: protecao ? null : answer.trim(),
          protecao_etica: protecao,
          tempo_resposta_segundos: tempo,
        }
      : {
          block_id: currentBlock,
          principal_resposta: protecao ? null : answer.trim(),
          variante_resposta: null,
          protecao_etica: protecao,
          tempo_resposta_segundos: tempo,
        }

    await fetchNextBlock(cycleId, blockResponse)
    setSubmitting(false)
  }

  // ─────────────────────────────────────
  // Fallback: trocar texto da pergunta
  // ─────────────────────────────────────
  function handleFallback() {
    if (phase === 'question') {
      setPhase('fallback')
      setAnswer('')
      focusTextarea()
    } else if (phase === 'fallback') {
      const block = QUESTIONS[currentBlock as BlockId]
      if (block?.subfallback) {
        setPhase('subfallback')
        setAnswer('')
        focusTextarea()
      }
    }
  }

  // ─────────────────────────────────────
  // Chamar lucid-engine após conclusão
  // ─────────────────────────────────────
  async function callLucidEngine(cid: string) {
    try {
      // Buscar canonical ILs do ciclo
      const { data: qState } = await supabase
        .from('questionnaire_state')
        .select('resultados_por_bloco')
        .eq('ipe_cycle_id', cid)
        .single()

      const { data: cycle } = await supabase
        .from('ipe_cycles')
        .select('cycle_number')
        .eq('id', cid)
        .single()

      // Montar raw_input a partir dos ILs canônicos
      const resultados = (qState?.resultados_por_bloco ?? {}) as Record<string, { il_canonico: number | null }>
      const d1 = extractDimensionILs(resultados, ['L1.1', 'L1.2', 'L1.3', 'L1.4'])
      const d2 = extractDimensionILs(resultados, ['L2.4', 'L2.1', 'L2.2', 'L2.3'])
      const d3 = extractDimensionILs(resultados, ['L3.3', 'L3.1', 'L3.2', 'L3.4'])
      const d4 = extractDimensionILs(resultados, ['L4.1', 'L4.2', 'L4.3', 'L4.4'])

      await callEdgeFunction('lucid-engine', {
        ipe_cycle_id: cid,
        base_version: (cycle?.cycle_number ?? 1) - 1,
        raw_input: {
          d1, d2, d3, d4,
          user_text: 'questionário concluído',
        },
      })

      navigate('/reed')
    } catch (e) {
      // Mesmo com erro no lucid-engine, redireciona para o Reed
      navigate('/reed')
    }
  }

  function extractDimensionILs(
    resultados: Record<string, { il_canonico: number | null }>,
    lineIds: string[]
  ): number[] {
    return lineIds.map(id => resultados[id]?.il_canonico ?? 4.0)
  }

  function focusTextarea() {
    setTimeout(() => textareaRef.current?.focus(), 100)
  }

  // ─────────────────────────────────────
  // Texto exibido para a pergunta atual
  // ─────────────────────────────────────
  function getDisplayText(): string {
    if (!currentBlock) return ''
    const block = QUESTIONS[currentBlock as BlockId]
    if (!block) return ''

    if (phase === 'variant' && currentVariant) {
      return block.variantes[currentVariant] ?? block.principal
    }
    if (phase === 'fallback') return block.fallback ?? block.principal
    if (phase === 'subfallback') return block.subfallback ?? block.fallback ?? block.principal
    return block.principal
  }

  function getHintText(): string | undefined {
    if (!currentBlock || phase !== 'question') return undefined
    return QUESTIONS[currentBlock as BlockId]?.hint
  }

  const canFallback =
    (phase === 'question' && !!QUESTIONS[currentBlock as BlockId]?.fallback) ||
    (phase === 'fallback' && !!QUESTIONS[currentBlock as BlockId]?.subfallback)

  // ─────────────────────────────────────
  // Render
  // ─────────────────────────────────────

  // Loading
  if (phase === 'loading') {
    return (
      <div className="r-screen" style={{ justifyContent: 'center', alignItems: 'center' }}>
        <span className="r-muted" style={{ fontSize: '0.75rem', letterSpacing: '0.08em' }}>
          carregando
        </span>
      </div>
    )
  }

  // Transição entre dimensões — pausa visual
  if (phase === 'transition') {
    return (
      <div className="r-screen" style={{ justifyContent: 'center', alignItems: 'center' }}>
        <div style={{ width: 32, height: 1, background: 'var(--r-line)' }} />
      </div>
    )
  }

  // Concluído — aguardando redirecionamento
  if (phase === 'done') {
    return (
      <div className="r-screen" style={{ justifyContent: 'center', alignItems: 'center' }}>
        <span className="r-muted" style={{ fontSize: '0.75rem', letterSpacing: '0.08em' }}>
          pronto
        </span>
      </div>
    )
  }

  // Pergunta (principal, variante, fallback, subfallback)
  return (
    <div className="r-screen">
      {/* header */}
      <header className="r-header">
        <span className="r-wordmark">_rdwth</span>
      </header>

      {/* linha divisória */}
      <div className="r-line" />

      {/* conteúdo */}
      <main className="r-scroll" style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '2rem' }}>

        {/* bloco da pergunta */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <p className="r-question" style={{ whiteSpace: 'pre-line' }}>
            {getDisplayText()}
          </p>
          {getHintText() && (
            <p className="r-sub" style={{ opacity: 0.6 }}>
              {getHintText()}
            </p>
          )}
        </div>

        {/* textarea */}
        <div className="r-input-wrap">
          <textarea
            ref={textareaRef}
            className="r-textarea"
            value={answer}
            onChange={e => setAnswer(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                handleSubmit()
              }
            }}
            placeholder=""
            rows={4}
            disabled={submitting}
          />
        </div>

        {/* erro */}
        {error && (
          <p className="r-sub" style={{ color: 'var(--r-accent)' }}>
            {error}
          </p>
        )}

        {/* ações */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>

          {/* enviar */}
          <button
            className="r-send-dot"
            onClick={() => handleSubmit()}
            disabled={submitting || answer.trim().length < 2}
            aria-label="enviar"
          />

          {/* linha de ações secundárias */}
          <div style={{ display: 'flex', gap: '1.5rem', marginTop: '0.25rem' }}>
            {canFallback && (
              <button
                onClick={handleFallback}
                disabled={submitting}
                style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  color: 'var(--r-dim)', fontSize: '0.7rem',
                  letterSpacing: '0.06em', padding: 0,
                }}
              >
                outro exemplo
              </button>
            )}
            <button
              onClick={() => handleSubmit(true)}
              disabled={submitting}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                color: 'var(--r-dim)', fontSize: '0.7rem',
                letterSpacing: '0.06em', padding: 0,
                marginLeft: canFallback ? 0 : 'auto',
              }}
            >
              i'd rather not
            </button>
          </div>
        </div>

      </main>

      {/* footer */}
      <div className="r-line" />
      <footer className="r-footer">
        <span className="r-sub" style={{ opacity: 0.4, fontSize: '0.65rem' }}>
          {currentBlock?.toLowerCase()}
        </span>
      </footer>
    </div>
  )
}
