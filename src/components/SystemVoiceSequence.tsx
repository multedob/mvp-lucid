// src/components/SystemVoiceSequence.tsx
// Sequência de voz do sistema 100% CSS-driven. Suporta substituição com reverse
// no meio (linha 1 e 2 entram, fazem reverse, novas frases entram, depois hint).
//
// API:
//   slots[] — 3 slots: [linha 1, linha 2, hint]. Cada slot pode ter:
//     - first: string (frase inicial)
//     - second?: string (substitui first após reverse — só pros 2 primeiros slots)
//   fadeOut — quando true, faz fade-out 400ms
//   onHintReady — disparado quando hint terminar typewriter (último onAnimationEnd)
//   onFinish — após fade-out completar
//
// Timing automático (calculado pelo comprimento das frases):
//   t=0       slot[0].first typewriter
//   t=typeF0  slot[1].first typewriter
//   t=...+HOLD reverse simultâneo de slot[0].first e slot[1].first
//   t=revEnd  slot[0].second typewriter
//   t=...+s0t slot[1].second typewriter
//   t=...+HOLD hint (slot[2].first) typewriter
//   t=hintEnd onHintReady
//
// Total ~10-12s antes da hint estabilizar (preenche bem o tempo de load).

import { useEffect, useMemo, useState } from "react";

const STYLE_ID = "rdwth-voice-seq-styles";
const KEYFRAMES = `
@keyframes rdwth-voice-fwd {
  from { width: 0; }
  to   { width: var(--rdwth-w, 100%); }
}
@keyframes rdwth-voice-rev {
  from { width: var(--rdwth-w, 100%); }
  to   { width: 0; }
}
@keyframes rdwth-voice-appear {
  from { opacity: 0; }
  to   { opacity: 1; }
}
`;

function injectStyles() {
  if (typeof document === "undefined") return;
  if (document.getElementById(STYLE_ID)) return;
  const el = document.createElement("style");
  el.id = STYLE_ID;
  el.textContent = KEYFRAMES;
  document.head.appendChild(el);
}

const TYPE_MS_PER_CHAR = 30;
const REV_MS_PER_CHAR = 18;
const HOLD_MS = 1500;
const FADE_OUT_MS = 400;

export interface Slot {
  first: string;
  second?: string;
}

interface ComputedSlot {
  promptStartMs: number;
  first: {
    text: string;
    startMs: number;
    typeMs: number;
    reverseStartMs?: number;
    reverseMs?: number;
  };
  second?: {
    text: string;
    startMs: number;
    typeMs: number;
  };
}

interface Props {
  slots: Slot[];
  fadeOut: boolean;
  onHintReady?: () => void;
  onFinish?: () => void;
  fontSize?: number;
}

export default function SystemVoiceSequence({
  slots,
  fadeOut,
  onHintReady,
  onFinish,
  fontSize = 11,
}: Props) {
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    injectStyles();
  }, []);

  const computed = useMemo<ComputedSlot[]>(() => {
    if (slots.length < 3) return [];

    const typeMs = (t: string) => Math.max(150, t.length * TYPE_MS_PER_CHAR);
    const revMs = (t: string) => Math.max(150, t.length * REV_MS_PER_CHAR);

    const lower = (t: string | undefined) => (t ?? "").toLowerCase();

    const s0First = lower(slots[0].first);
    const s0Second = slots[0].second ? lower(slots[0].second) : undefined;
    const s1First = lower(slots[1].first);
    const s1Second = slots[1].second ? lower(slots[1].second) : undefined;
    const hint = lower(slots[2].first);

    // slot[0].first: t=0 → typeMs(s0First)
    const s0FirstStart = 0;
    const s0FirstType = typeMs(s0First);

    // slot[1].first: entra após slot[0].first terminar
    const s1FirstStart = s0FirstStart + s0FirstType;
    const s1FirstType = typeMs(s1First);

    // Reverse simultâneo: após slot[1].first terminar + HOLD
    const hasReverse = !!(s0Second && s1Second);
    const reverseStart = s1FirstStart + s1FirstType + HOLD_MS;
    const s0Rev = hasReverse ? revMs(s0First) : 0;
    const s1Rev = hasReverse ? revMs(s1First) : 0;
    const reverseEnd = hasReverse ? reverseStart + Math.max(s0Rev, s1Rev) : reverseStart;

    // slot[0].second (substituição na linha 1)
    const s0SecondStart = hasReverse ? reverseEnd : 0;
    const s0SecondType = s0Second ? typeMs(s0Second) : 0;

    // slot[1].second (substituição na linha 2 — entra após slot[0].second terminar)
    const s1SecondStart = hasReverse ? s0SecondStart + s0SecondType : 0;
    const s1SecondType = s1Second ? typeMs(s1Second) : 0;

    // Hint: após slot[1].second terminar + HOLD (ou após reverse se não há second)
    const lastEnd = hasReverse ? s1SecondStart + s1SecondType : s1FirstStart + s1FirstType;
    const hintStart = lastEnd + HOLD_MS;
    const hintType = typeMs(hint);

    return [
      {
        promptStartMs: s0FirstStart,
        first: {
          text: s0First,
          startMs: s0FirstStart,
          typeMs: s0FirstType,
          reverseStartMs: hasReverse ? reverseStart : undefined,
          reverseMs: hasReverse ? s0Rev : undefined,
        },
        second: s0Second
          ? { text: s0Second, startMs: s0SecondStart, typeMs: s0SecondType }
          : undefined,
      },
      {
        promptStartMs: s1FirstStart,
        first: {
          text: s1First,
          startMs: s1FirstStart,
          typeMs: s1FirstType,
          reverseStartMs: hasReverse ? reverseStart : undefined,
          reverseMs: hasReverse ? s1Rev : undefined,
        },
        second: s1Second
          ? { text: s1Second, startMs: s1SecondStart, typeMs: s1SecondType }
          : undefined,
      },
      {
        promptStartMs: hintStart,
        first: {
          text: hint,
          startMs: hintStart,
          typeMs: hintType,
        },
      },
    ];
  }, [slots]);

  // Fade-out + esconde + onFinish
  useEffect(() => {
    if (!fadeOut) return;
    const tHide = window.setTimeout(() => setHidden(true), FADE_OUT_MS);
    const tFinish = window.setTimeout(() => onFinish?.(), FADE_OUT_MS + 50);
    return () => {
      window.clearTimeout(tHide);
      window.clearTimeout(tFinish);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fadeOut]);

  if (hidden) return null;

  const hintIdx = computed.length - 1;

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 0,
        opacity: fadeOut ? 0 : 1,
        transition: `opacity ${FADE_OUT_MS}ms ease`,
        pointerEvents: "none",
      }}
    >
      {computed.map((slot, idx) => {
        const isHint = idx === hintIdx;
        // Width final do span first (compensa letter-spacing 0.04em com +2ch)
        const firstWidth = `calc(${slot.first.text.length}ch + 2ch)`;
        const secondWidth = slot.second
          ? `calc(${slot.second.text.length}ch + 2ch)`
          : undefined;

        // Animation do span first: forward sempre, + opcional reverse
        const firstAnim =
          slot.first.reverseStartMs !== undefined && slot.first.reverseMs !== undefined
            ? `rdwth-voice-fwd ${slot.first.typeMs}ms steps(${slot.first.text.length || 1}) ${slot.first.startMs}ms forwards, rdwth-voice-rev ${slot.first.reverseMs}ms steps(${slot.first.text.length || 1}) ${slot.first.reverseStartMs}ms forwards`
            : `rdwth-voice-fwd ${slot.first.typeMs}ms steps(${slot.first.text.length || 1}) ${slot.first.startMs}ms forwards`;

        return (
          <div
            key={idx}
            style={{
              fontFamily: "var(--r-font-sys)",
              fontWeight: 300,
              fontSize,
              lineHeight: 1.7,
              color: "var(--r-voice-sys)",
              letterSpacing: "0.04em",
              whiteSpace: "pre-wrap",
              margin: 0,
              minHeight: `${Math.round(fontSize * 1.7)}px`,
              position: "relative",
            }}
          >
            {/* Prompt > — aparece junto com a primeira frase do slot */}
            <span
              aria-hidden="true"
              style={{
                display: "inline-block",
                opacity: 0,
                animation: `rdwth-voice-appear 1ms ${slot.promptStartMs}ms forwards`,
              }}
            >
              {"> "}
            </span>

            {/* First phrase — forward + opcional reverse */}
            <span
              style={{
                display: "inline-block",
                overflow: "hidden",
                whiteSpace: "nowrap",
                verticalAlign: "bottom",
                width: 0,
                animation: firstAnim,
                ["--rdwth-w" as keyof React.CSSProperties as string]: firstWidth,
              } as React.CSSProperties}
              onAnimationEnd={
                isHint
                  ? () => {
                      onHintReady?.();
                    }
                  : undefined
              }
            >
              {slot.first.text}
            </span>

            {/* Second phrase (substituição) — absolute sobre o slot, à direita do prompt */}
            {slot.second && secondWidth && (
              <>
                {/* Prompt > pra second (aparece no momento de second entrar) */}
                <span
                  aria-hidden="true"
                  style={{
                    position: "absolute",
                    left: 0,
                    top: 0,
                    display: "inline-block",
                    opacity: 0,
                    animation: `rdwth-voice-appear 1ms ${slot.second.startMs}ms forwards`,
                  }}
                >
                  {"> "}
                </span>
                <span
                  style={{
                    position: "absolute",
                    left: "2ch",
                    top: 0,
                    display: "inline-block",
                    overflow: "hidden",
                    whiteSpace: "nowrap",
                    verticalAlign: "bottom",
                    width: 0,
                    animation: `rdwth-voice-fwd ${slot.second.typeMs}ms steps(${slot.second.text.length || 1}) ${slot.second.startMs}ms forwards`,
                    ["--rdwth-w" as keyof React.CSSProperties as string]: secondWidth,
                  } as React.CSSProperties}
                >
                  {slot.second.text}
                </span>
              </>
            )}
          </div>
        );
      })}
    </div>
  );
}
