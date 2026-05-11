// src/components/SystemCyclingLine.tsx
// Linha de voz do sistema com typewriter forward na entrada e reverse + forward
// ao trocar texto. Animação via CSS (não JS timer) — roda na GPU e não é
// suspensa quando o JS thread está bloqueado por loads pesados.
//
// Estados:
//   typing   — text crescendo de 0 até ${length}ch via CSS animation
//   clearing — text encolhendo de ${length}ch até 0
//   null     — parado (mostrando text inteiro ou vazio)
//
// Mudança de prop text:
//   - Se está parado (null) e text mudou: dispara clearing do atual ou typing do novo
//   - Se está animando: enfileira em pendingRef, processa em onAnimationEnd
//
// onAnimationEnd dispara mesmo se JS estava bloqueado durante a animação — quando
// o thread libera, o evento é entregue.

import { useEffect, useRef, useState } from "react";

const STYLE_ID = "rdwth-cycling-line-styles";
const KEYFRAMES = `
@keyframes rdwth-cycling-fwd {
  from { width: 0; }
  to   { width: var(--rdwth-target-w, 100%); }
}
@keyframes rdwth-cycling-rev {
  from { width: var(--rdwth-target-w, 100%); }
  to   { width: 0; }
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
const CLEAR_MS_PER_CHAR = 18; // reverse mais rápido que forward

type AnimState = "typing" | "clearing" | null;

interface Props {
  text: string;
  fontSize?: number;
}

export default function SystemCyclingLine({ text: rawText, fontSize = 11 }: Props) {
  // Voz do sistema é SEMPRE minúscula.
  const text = rawText.toLowerCase();

  const [shown, setShown] = useState<string>("");
  const [anim, setAnim] = useState<AnimState>(null);
  const pendingRef = useRef<string>(text); // último text recebido via prop
  const animKeyRef = useRef(0);
  const [animKey, setAnimKey] = useState(0);

  useEffect(() => {
    injectStyles();
  }, []);

  // Quando prop text muda, atualiza pendingRef e dispara animação se possível.
  useEffect(() => {
    pendingRef.current = text;

    // Já está animando? Vai processar quando terminar (onAnimationEnd).
    if (anim !== null) return;

    // Parado — vê se precisa começar algo.
    if (text === shown) return;

    if (shown === "" && text !== "") {
      // Entrada inicial: começa typing
      setShown(text);
      setAnim("typing");
      animKeyRef.current += 1;
      setAnimKey(animKeyRef.current);
    } else if (shown !== "" && text !== shown) {
      // Texto trocou: clearing primeiro
      setAnim("clearing");
      animKeyRef.current += 1;
      setAnimKey(animKeyRef.current);
    } else if (shown !== "" && text === "") {
      // Texto virou vazio: clearing pra "" definitivo
      setAnim("clearing");
      animKeyRef.current += 1;
      setAnimKey(animKeyRef.current);
    }
  }, [text, shown, anim]);

  // Quando uma animação termina, processa a transição
  const handleAnimEnd = () => {
    if (anim === "clearing") {
      const next = pendingRef.current;
      if (next && next !== "") {
        // Tem nova frase: troca display + dispara typing
        setShown(next);
        setAnim("typing");
        animKeyRef.current += 1;
        setAnimKey(animKeyRef.current);
      } else {
        // Sem nova frase: parado vazio
        setShown("");
        setAnim(null);
      }
      return;
    }
    if (anim === "typing") {
      // Terminou typing. Confere se chegou nova prop enquanto digitava.
      const pending = pendingRef.current;
      if (pending !== shown) {
        // Texto mudou durante a animação — começa clearing pra trocar
        setAnim("clearing");
        animKeyRef.current += 1;
        setAnimKey(animKeyRef.current);
      } else {
        setAnim(null);
      }
      return;
    }
  };

  const charCount = Math.max(1, shown.length);
  const duration =
    anim === "clearing"
      ? charCount * CLEAR_MS_PER_CHAR
      : charCount * TYPE_MS_PER_CHAR;

  const animationName =
    anim === "typing" ? "rdwth-cycling-fwd" : anim === "clearing" ? "rdwth-cycling-rev" : null;

  // Estado visual do span interno:
  //   anim ativo  → CSS animation cuida da largura
  //   anim null + shown vazio → largura 0
  //   anim null + shown com texto → largura completa
  const inlineSpanStyle: React.CSSProperties = {
    display: "inline-block",
    overflow: "hidden",
    whiteSpace: "nowrap",
    verticalAlign: "bottom",
    // CSS var consumida pelos keyframes
    ["--rdwth-target-w" as keyof React.CSSProperties as string]: `${shown.length}ch`,
    animation: animationName
      ? `${animationName} ${duration}ms steps(${shown.length || 1}) forwards`
      : "none",
    width: anim === null ? (shown.length > 0 ? `${shown.length}ch` : 0) : undefined,
  } as React.CSSProperties;

  const isAnimating = anim !== null;

  return (
    <div
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
      }}
    >
      {(shown.length > 0 || isAnimating) && (
        <>
          <span aria-hidden="true">{"> "}</span>
          <span
            key={animKey}
            onAnimationEnd={handleAnimEnd}
            style={inlineSpanStyle}
          >
            {shown}
          </span>
          {isAnimating && (
            <span style={{ display: "inline-block", marginLeft: 2 }}>█</span>
          )}
        </>
      )}
    </div>
  );
}
