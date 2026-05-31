import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

/* ─── Alpha Landing ───────────────────────────────────────────────
   Página pública /alpha — landing para convidados do alpha.
   Sem auth, sem header, sem footer. Mesma identidade visual do
   produto: terminal-like, voz do sistema, container central.
   ────────────────────────────────────────────────────────────── */

const BLOCKS = [
  [
    "oi.",
    "",
    "você está aqui porque o bruno e a olivia te chamaram. obrigado por abrir.",
  ],
  [
    "o rdwth é um espelho estrutural.",
    "",
    "você fala. ele devolve.",
  ],
  [
    "não te diz o que fazer.",
    "não te ensina nada.",
    "não tem método.",
    "",
    "só te mostra o que tá ali.",
  ],
  [
    "essa é a primeira leva. dez, vinte pessoas. uma por uma.",
    "",
    "você é uma delas.",
  ],
  [
    "quando algo travar, te incomodar, parecer estranho — abre o ?! no canto e fala. pode mandar print junto.",
    "",
    "não precisa ter resposta certa. precisa ser honesto.",
  ],
  [
    "não é coach. não é terapia. não é horóscopo.",
  ],
];

function StageIn({
  children,
  delay = 0,
}: {
  children: React.ReactNode;
  delay?: number;
}) {
  const [show, setShow] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const t = setTimeout(() => setShow(true), delay);
    return () => clearTimeout(t);
  }, [delay]);

  return (
    <div
      ref={ref}
      className={`r-stage-in ${show ? "show" : ""}`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
}

export default function Alpha() {
  const navigate = useNavigate();
  let lineIndex = 0;

  return (
    <div
      className="r-screen"
      style={{
        justifyContent: "flex-start",
        overflowY: "auto",
        padding: "48px 28px 64px",
      }}
    >
      {BLOCKS.map((block, bi) => (
        <div key={bi}>
          {block.map((line, li) => {
            const idx = lineIndex++;
            if (line === "") {
              return <div key={li} style={{ height: 12 }} />;
            }
            return (
              <StageIn key={li} delay={idx * 180 + bi * 120}>
                <p
                  style={{
                    fontFamily: "var(--r-font-sys)",
                    fontWeight: 300,
                    fontSize: 13,
                    lineHeight: 1.75,
                    color: "var(--r-voice-sys)",
                    letterSpacing: "0.03em",
                    margin: 0,
                    maxWidth: 360,
                  }}
                >
                  {line}
                </p>
              </StageIn>
            );
          })}

          {/* separador discreto entre blocos */}
          {bi < BLOCKS.length - 1 && (
            <StageIn delay={lineIndex * 180 + bi * 120}>
              <div
                style={{
                  height: 0.5,
                  background: "var(--r-ghost)",
                  opacity: 0.35,
                  margin: "28px 0",
                  maxWidth: 120,
                }}
              />
            </StageIn>
          )}
        </div>
      ))}

      {/* fechamento */}
      <StageIn delay={lineIndex * 180 + 200}>
        <div style={{ height: 40 }} />
        <p
          style={{
            fontFamily: "var(--r-font-sys)",
            fontWeight: 400,
            fontSize: 13,
            color: "var(--r-text)",
            letterSpacing: "0.06em",
            margin: 0,
          }}
        >
          começa por onde piscar.
        </p>
      </StageIn>

      <StageIn delay={lineIndex * 180 + 400}>
        <div style={{ height: 32 }} />
        <p
          style={{
            fontFamily: "var(--r-font-sys)",
            fontWeight: 300,
            fontSize: 11,
            color: "var(--r-muted)",
            letterSpacing: "0.08em",
            margin: 0,
          }}
        >
          — rdwth
        </p>
      </StageIn>

      {/* CTA */}
      <StageIn delay={lineIndex * 180 + 600}>
        <div style={{ height: 48 }} />
        <button
          type="button"
          onClick={() => navigate("/entrada")}
          style={{
            fontFamily: "var(--r-font-sys)",
            fontWeight: 300,
            fontSize: 12,
            letterSpacing: "0.08em",
            textTransform: "lowercase",
            color: "var(--r-voice-sys)",
            background: "transparent",
            border: "1px solid var(--r-ghost)",
            borderRadius: 0,
            padding: "10px 28px",
            cursor: "pointer",
            transition: "border-color 0.2s, color 0.2s",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = "var(--r-telha)";
            e.currentTarget.style.color = "var(--r-telha)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = "var(--r-ghost)";
            e.currentTarget.style.color = "var(--r-voice-sys)";
          }}
        >
          entrar
        </button>
      </StageIn>
    </div>
  );
}
