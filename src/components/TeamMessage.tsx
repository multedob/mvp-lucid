// src/components/TeamMessage.tsx
// AFC ONB-2 tipo 3 — mensagem do time (curadoria editorial)
//
// Busca mensagem ativa pro context_key via edge function get-team-message (A #21).
// Backend retorna a próxima mensagem que user nunca viu (priority DESC,
// created_at ASC), e marca como vista (fire-and-forget).
//
// Lifetime de exibição:
// - Mostra 1 vez por user (backend marca como vista no GET)
// - Durante a sessão atual, persiste mesmo após navegar entre telas e voltar
//   (sessionStorage cacheia a resposta)
// - Quando fecha a aba/navegador → sessão acaba, sessionStorage some, próxima
//   sessão faz fetch novo (que provavelmente retorna null — já vista)
//
// Tipografia: voz fundadores (Plex Mono cor de identidade, sem prefixo `> `,
// sem typewriter — mensagem do time é editorial, não voz sistema falando).
//
// Uso típico (banner topo da Home):
//   <TeamMessage contextKey="home_first_visit" />

import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

interface TeamMessageData {
  id: string;
  text: string;
  tone: string | null;
}

interface TeamMessageProps {
  contextKey: string;
}

const STYLE_ID = "rdwth-teammessage-styles";
const SESSION_KEY_PREFIX = "rdwth_team_message_session_";

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

type SessionCache =
  | { kind: "message"; data: TeamMessageData }
  | { kind: "empty" };

function readSessionCache(storageKey: string): SessionCache | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(storageKey);
    if (!raw) return null;
    return JSON.parse(raw) as SessionCache;
  } catch {
    return null;
  }
}

function writeSessionCache(storageKey: string, cache: SessionCache): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(storageKey, JSON.stringify(cache));
  } catch {
    // QuotaExceeded ou disabled — silencioso
  }
}

export default function TeamMessage({ contextKey }: TeamMessageProps) {
  const [message, setMessage] = useState<TeamMessageData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    injectStyles();
  }, []);

  useEffect(() => {
    let cancelled = false;
    const storageKey = SESSION_KEY_PREFIX + contextKey;

    // 1. Tenta sessionStorage primeiro — persiste durante a sessão atual
    const cached = readSessionCache(storageKey);
    if (cached) {
      if (cached.kind === "message") {
        setMessage(cached.data);
      } else {
        setMessage(null);
      }
      setLoading(false);
      return;
    }

    // 2. Sem cache de sessão — fetch backend
    async function fetchMessage() {
      try {
        const { data, error } = await supabase.functions.invoke("get-team-message", {
          body: { context_key: contextKey },
        });

        if (cancelled) return;

        if (error) {
          console.warn("[TeamMessage] fetch error:", error);
          setMessage(null);
          // Não cacheia erro — próxima carga tenta de novo
        } else if (data?.text && data?.id) {
          const newMessage: TeamMessageData = {
            id: data.id,
            text: data.text,
            tone: data.tone ?? null,
          };
          setMessage(newMessage);
          // Cache pra resto da sessão (persiste em navegações entre telas)
          writeSessionCache(storageKey, { kind: "message", data: newMessage });
        } else {
          // { message: null } — user já viu todas, ou nenhuma ativa pro contexto
          setMessage(null);
          // Cacheia "verificado, sem mensagem" pra evitar refetch na sessão
          writeSessionCache(storageKey, { kind: "empty" });
        }
      } catch (err) {
        if (cancelled) return;
        console.warn("[TeamMessage] fetch failed:", err);
        setMessage(null);
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
