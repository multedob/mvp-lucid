// src/components/TeamMessage.tsx
// AFC ONB-2 tipo 3 — mensagem do time (curadoria editorial)
//
// Busca mensagem ativa pro context_key via edge function get-team-message (A #21).
// Backend retorna a próxima mensagem que user nunca viu (priority DESC,
// created_at ASC), e marca como vista (fire-and-forget).
//
// Lifetime de exibição:
// - Mostra 1 vez por user, na primeira renderização. Após primeira aparição,
//   marca em localStorage e nunca mais aparece (mesmo dentro da mesma sessão
//   navegando entre telas e voltando).
// - Trocou de sessionStorage→localStorage pra Bruno não ver mensagem persistir
//   ao retornar à Home dentro da mesma sessão.
//
// Tipografia: voz fundadores (Plex Mono cor de identidade, sem prefixo `> `,
// sem typewriter — mensagem do time é editorial, não voz sistema falando).
//
// Uso típico (banner topo da Home):
//   <TeamMessage contextKey="home_first_visit" />

import { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";

interface TeamMessageData {
  id: string;
  text: string;
  tone: string | null;
}

interface TeamMessageProps {
  contextKey: string;
  /** Disparado quando o componente terminou de carregar (com ou sem mensagem).
   *  hasMessage=true significa que vai renderizar; false significa que retorna null. */
  onLoaded?: (hasMessage: boolean) => void;
}

const STYLE_ID = "rdwth-teammessage-styles";
// localStorage por contextKey — uma vez mostrado, nunca mais.
const LOCAL_KEY_PREFIX = "rdwth_team_message_seen_";

const styles = `
@keyframes rdwth-teammessage-fade-in {
  from { opacity: 0; transform: translateY(-2px); }
  to { opacity: 1; transform: translateY(0); }
}
@media (prefers-reduced-motion: reduce) {
  @keyframes rdwth-teammessage-fade-in {
    from { opacity: 0; transform: none; }
    to { opacity: 1; transform: none; }
  }
}
`;

function injectStyles() {
  if (typeof document === "undefined") return;
  if (document.getElementById(STYLE_ID)) return;
  const styleEl = document.createElement("style");
  styleEl.id = STYLE_ID;
  styleEl.textContent = styles;
  document.head.appendChild(styleEl);
}

function hasBeenSeen(storageKey: string): boolean {
  if (typeof window === "undefined") return false;
  try {
    return localStorage.getItem(storageKey) === "1";
  } catch {
    return false;
  }
}

function markAsSeen(storageKey: string): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(storageKey, "1");
  } catch {
    // QuotaExceeded ou disabled — silencioso
  }
}

export default function TeamMessage({ contextKey, onLoaded }: TeamMessageProps) {
  const [message, setMessage] = useState<TeamMessageData | null>(null);
  const [loading, setLoading] = useState(true);
  const onLoadedRef = useRef(onLoaded);
  onLoadedRef.current = onLoaded;

  useEffect(() => {
    injectStyles();
  }, []);

  useEffect(() => {
    let cancelled = false;
    const storageKey = LOCAL_KEY_PREFIX + contextKey;

    // 1. Já viu mensagem desse contexto antes — não mostra de novo.
    if (hasBeenSeen(storageKey)) {
      setMessage(null);
      setLoading(false);
      onLoadedRef.current?.(false);
      return;
    }

    // 2. Primeira vez — fetch backend
    async function fetchMessage() {
      try {
        const { data, error } = await supabase.functions.invoke("get-team-message", {
          body: { context_key: contextKey },
        });

        if (cancelled) return;

        if (error) {
          console.warn("[TeamMessage] fetch error:", error);
          setMessage(null);
          onLoadedRef.current?.(false);
        } else if (data?.text && data?.id) {
          const newMessage: TeamMessageData = {
            id: data.id,
            text: data.text,
            tone: data.tone ?? null,
          };
          setMessage(newMessage);
          onLoadedRef.current?.(true);
          // Marca como visto APÓS aparecer — próxima visita não mostra mais
          markAsSeen(storageKey);
        } else {
          // Sem mensagem ativa — também marca pra não tentar de novo
          setMessage(null);
          onLoadedRef.current?.(false);
          markAsSeen(storageKey);
        }
      } catch (err) {
        if (cancelled) return;
        console.warn("[TeamMessage] fetch failed:", err);
        setMessage(null);
        onLoadedRef.current?.(false);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchMessage();

    return () => {
      cancelled = true;
    };
  }, [contextKey]);

  if (loading || !message) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        padding: "12px 24px",
        animation: "rdwth-teammessage-fade-in 600ms ease-out",
      }}
    >
      <div
        style={{
          fontFamily: "var(--r-font-sys)",
          fontWeight: 300,
          fontSize: 11,
          lineHeight: 1.7,
          color: "var(--r-voice-founders)",
          letterSpacing: "0.04em",
          whiteSpace: "pre-wrap",
        }}
      >
        {message.text}
      </div>
    </div>
  );
}
