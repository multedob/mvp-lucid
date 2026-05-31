import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

/* ─── Alpha Landing ───────────────────────────────────────────────
   Página pública /alpha — landing para convidados do alpha.
   Sem auth, sem header, sem footer. Carta deve caber em uma tela
   sem scroll (mobile e desktop).
   ────────────────────────────────────────────────────────────── */

const BLOCKS: string[][] = [
  ["oi."],
  ["o bruno e a olivia te convidaram. obrigado por abrir."],
  [
    "o rdwth é um espelho estrutural que amadurece com você.",
    "você fala. ele devolve.",
  ],
  [
    "não te diz o que fazer.",
    "não tira sua responsabilidade.",
    "só te mostra o que tá ali, imperceptível.",
  ],
  [
    "essa é a primeira leva. dez, vinte pessoas. uma por uma.",
    "você é uma delas.",
  ],
  [
    "quando algo travar ou te incomodar — abre o ?! e fala. pode mandar print.",
    "não precisa ter resposta certa. precisa ser honesto.",
  ],
  ["não é coach. não é terapia. não é horóscopo."],
  ["a porta tá aberta."],
];

function StageIn({
  children,
  delay = 0,
}: {
  children: React.ReactNode;
  delay?: number;
}) {
  const [show, setShow] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setShow(true), delay);
    return () => clearTimeout(t);
  }, [delay]);
  return (
    <div
      className={`r-stage-in ${show ? "show" : ""}`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
}

export default function Alpha() {
  const navigate = useNavigate();
  let stepIndex = 0;

  return (
    <div
      className="r-screen alpha-screen"
      style={{
        alignItems: "center",
        padding: "9vh 24px 24px",
        minHeight: "100dvh",
      }}
    >
      <style>{`
        .alpha-screen p { text-align: justify; }
        @media (max-width: 480px) {
          .alpha-screen p { text-align: left; }
        }
      `}</style>
      <div style={{ width: "100%", maxWidth: 420 }}>
        {BLOCKS.map((block, bi) => {
          const delay = stepIndex++ * 140;
          return (
            <StageIn key={bi} delay={delay}>
              <div style={{ marginBottom: bi < BLOCKS.length - 1 ? "1.6em" : 0 }}>
                {block.map((line, li) => (
                  <p
                    key={li}
                    style={{
                      fontFamily: "var(--r-font-sys)",
                      fontWeight: 300,
                      fontSize: 13,
                      lineHeight: 1.5,
                      color: "var(--r-voice-sys)",
                      letterSpacing: "0.03em",
                      margin: 0,
                    }}
                  >
                    {line}
                  </p>
                ))}
              </div>
            </StageIn>
          );
        })}

        {/* assinatura */}
        <StageIn delay={stepIndex++ * 140}>
          <p
            style={{
              fontFamily: "var(--r-font-sys)",
              fontWeight: 300,
              fontSize: 11,
              color: "var(--r-muted)",
              letterSpacing: "0.08em",
              margin: "0.6em 0 0",
              textAlign: "left",
            }}
          >
            — rdwth
          </p>
        </StageIn>

        {/* CTA */}
        <StageIn delay={stepIndex++ * 140 + 120}>
          <div style={{ marginTop: 24 }}>
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
          </div>
        </StageIn>
      </div>
    </div>
  );
}

