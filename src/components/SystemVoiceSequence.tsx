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
@keyframes rdwth-voice-disappear {
  from { opacity: 1; }
  to   { opacity: 0; }
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
  third?: string;
}

interface ComputedPhrase {
  text: string;
  startMs: number;
  typeMs: number;
  /** Se a frase é apagada antes da próxima entrar */
  reverseStartMs?: number;
  reverseMs?: number;
}

interface ComputedSlot {
  promptStartMs: number;
  first: ComputedPhrase;
  second?: ComputedPhrase;
  third?: ComputedPhrase;
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
    const s0Third = slots[0].third ? lower(slots[0].third) : undefined;
    const s1First = lower(slots[1].first);
    const s1Second = slots[1].second ? lower(slots[1].second) : undefined;
    const s1Third = slots[1].third ? lower(slots[1].third) : undefined;
    const hint = lower(slots[2].first);

    // Ciclo 1: first
    const s0FirstStart = 0;
    const s0FirstType = typeMs(s0First);
    const s1FirstStart = s0FirstStart + s0FirstType;
    const s1FirstType = typeMs(s1First);

    // Reverse 1 simultâneo (se há second em ambos) — após s1First + HOLD
    const hasSecond = !!(s0Second && s1Second);
    const reverse1Start = s1FirstStart + s1FirstType + HOLD_MS;
    const s0Rev1 = hasSecond ? revMs(s0First) : 0;
    const s1Rev1 = hasSecond ? revMs(s1First) : 0;
    const reverse1End = hasSecond ? reverse1Start + Math.max(s0Rev1, s1Rev1) : reverse1Start;

    // Ciclo 2: second
    const s0SecondStart = hasSecond ? reverse1End : 0;
    const s0SecondType = s0Second ? typeMs(s0Second) : 0;
    const s1SecondStart = hasSecond ? s0SecondStart + s0SecondType : 0;
    const s1SecondType = s1Second ? typeMs(s1Second) : 0;

    // Reverse 2 simultâneo (se há third em ambos) — após s1Second + HOLD
    const hasThird = !!(s0Third && s1Third);
    const reverse2Start = hasSecond
      ? s1SecondStart + s1SecondType + HOLD_MS
      : reverse1Start;
    const s0Rev2 = hasThird ? revMs(s0Second!) : 0;
    const s1Rev2 = hasThird ? revMs(s1Second!) : 0;
    const reverse2End = hasThird ? reverse2Start + Math.max(s0Rev2, s1Rev2) : reverse2Start;

    // Ciclo 3: third
    const s0ThirdStart = hasThird ? reverse2End : 0;
    const s0ThirdType = s0Third ? typeMs(s0Third) : 0;
    const s1ThirdStart = hasThird ? s0ThirdStart + s0ThirdType : 0;
    const s1ThirdType = s1Third ? typeMs(s1Third) : 0;

    // Hint: após último ciclo + HOLD
    let lastEnd: number;
    if (hasThird) lastEnd = s1ThirdStart + s1ThirdType;
    else if (hasSecond) lastEnd = s1SecondStart + s1SecondType;
    else lastEnd = s1FirstStart + s1FirstType;
    const hintStart = lastEnd + HOLD_MS;
    const hintType = typeMs(hint);

    return [
      {
        promptStartMs: s0FirstStart,
        first: {
          text: s0First,
          startMs: s0FirstStart,
          typeMs: s0FirstType,
          reverseStartMs: hasSecond ? reverse1Start : undefined,
          reverseMs: hasSecond ? s0Rev1 : undefined,
        },
        second: s0Second
          ? {
              text: s0Second,
              startMs: s0SecondStart,
              typeMs: s0SecondType,
              reverseStartMs: hasThird ? reverse2Start : undefined,
              reverseMs: hasThird ? s0Rev2 : undefined,
            }
          : undefined,
        third: s0Third
          ? { text: s0Third, startMs: s0ThirdStart, typeMs: s0ThirdType }
          : undefined,
      },
      {
        promptStartMs: s1FirstStart,
        first: {
          text: s1First,
          startMs: s1FirstStart,
          typeMs: s1FirstType,
          reverseStartMs: hasSecond ? reverse1Start : undefined,
          reverseMs: hasSecond ? s1Rev1 : undefined,
        },
        second: s1Second
          ? {
              text: s1Second,
              startMs: s1SecondStart,
              typeMs: s1SecondType,
              reverseStartMs: hasThird ? reverse2Start : undefined,
              reverseMs: hasThird ? s1Rev2 : undefined,
            }
          : undefined,
        third: s1Third
          ? { text: s1Third, startMs: s1ThirdStart, typeMs: s1ThirdType }
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
        const firstWidth = `calc(${slot.first.text.length}ch + 3ch)`;
        const secondWidth = slot.second
          ? `calc(${slot.second.text.length}ch + 3ch)`
          : undefined;

        // Animation do span first: forward sempre, + opcional reverse + disappear final.
        // disappear opacity garante que sobras de pixel após reverse fiquem invisíveis.
        const firstAnim =
          slot.first.reverseStartMs !== undefined && slot.first.reverseMs !== undefined
            ? `rdwth-voice-fwd ${slot.first.typeMs}ms steps(${slot.first.text.length || 1}) ${slot.first.startMs}ms forwards, rdwth-voice-rev ${slot.first.reverseMs}ms steps(${slot.first.text.length || 1}) ${slot.first.reverseStartMs}ms forwards, rdwth-voice-disappear 1ms ${slot.first.reverseStartMs + slot.first.reverseMs}ms forwards`
            : `rdwth-voice-fwd ${slot.first.typeMs}ms steps(${slot.first.text.length || 1}) ${slot.first.startMs}ms forwards`;

        // Animation do prompt > do slot — também precisa desaparecer com o first quando há reverse,
        // pra evitar o ">" persistente quando a frase apaga.
        const promptAnim =
          slot.first.reverseStartMs !== undefined && slot.first.reverseMs !== undefined
            ? `rdwth-voice-appear 1ms ${slot.promptStartMs}ms forwards, rdwth-voice-disappear 1ms ${slot.first.reverseStartMs + slot.first.reverseMs}ms forwards`
            : `rdwth-voice-appear 1ms ${slot.promptStartMs}ms forwards`;

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
            {/* Prompt > — aparece com a primeira frase e some com o reverse dela */}
            <span
              aria-hidden="true"
              style={{
                display: "inline-block",
                opacity: 0,
                animation: promptAnim,
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

            {/* Second phrase (1ª substituição) — absolute, à direita do prompt */}
            {slot.second && secondWidth && (
              <>
                <span
                  aria-hidden="true"
                  style={{
                    position: "absolute",
                    left: 0,
                    top: 0,
                    display: "inline-block",
                    opacity: 0,
                    animation:
                      slot.second.reverseStartMs !== undefined && slot.second.reverseMs !== undefined
                        ? `rdwth-voice-appear 1ms ${slot.second.startMs}ms forwards, rdwth-voice-disappear 1ms ${slot.second.reverseStartMs + slot.second.reverseMs}ms forwards`
                        : `rdwth-voice-appear 1ms ${slot.second.startMs}ms forwards`,
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
                    animation:
                      slot.second.reverseStartMs !== undefined && slot.second.reverseMs !== undefined
                        ? `rdwth-voice-fwd ${slot.second.typeMs}ms steps(${slot.second.text.length || 1}) ${slot.second.startMs}ms forwards, rdwth-voice-rev ${slot.second.reverseMs}ms steps(${slot.second.text.length || 1}) ${slot.second.reverseStartMs}ms forwards, rdwth-voice-disappear 1ms ${slot.second.reverseStartMs + slot.second.reverseMs}ms forwards`
                        : `rdwth-voice-fwd ${slot.second.typeMs}ms steps(${slot.second.text.length || 1}) ${slot.second.startMs}ms forwards`,
                    ["--rdwth-w" as keyof React.CSSProperties as string]: secondWidth,
                  } as React.CSSProperties}
                >
                  {slot.second.text}
                </span>
              </>
            )}

            {/* Third phrase (2ª substituição) — absolute, igual estrutura */}
            {slot.third && (
              <>
                <span
                  aria-hidden="true"
                  style={{
                    position: "absolute",
                    left: 0,
                    top: 0,
                    display: "inline-block",
                    opacity: 0,
                    animation: `rdwth-voice-appear 1ms ${slot.third.startMs}ms forwards`,
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
                    animation: `rdwth-voice-fwd ${slot.third.typeMs}ms steps(${slot.third.text.length || 1}) ${slot.third.startMs}ms forwards`,
                    ["--rdwth-w" as keyof React.CSSProperties as string]: `calc(${slot.third.text.length}ch + 3ch)`,
                  } as React.CSSProperties}
                >
                  {slot.third.text}
                </span>
              </>
            )}
          </div>
        );
      })}
    </div>
  );
}
