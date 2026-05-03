// src/components/TeamMessage.tsx
// AFC ONB-2 tipo 3 — mensagem do time (curadoria editorial)
//
// Busca mensagem ativa pro context_key via edge function get-team-message (A #21).
// Backend retorna a próxima mensagem que user nunca viu (priority DESC,
// created_at ASC), e marca como vista (fire-and-forget).
//
// Lifetime de exibição (front-side, MAX_VIEWS = 3):
// - Visit 1: fetch backend, salva em localStorage com viewCount=1, mostra
// - Visit 2-3: lê cache local, incrementa viewCount, mostra (sem fetch)
// - Visit 4+: limpa cache, faz fetch novo (próxima mensagem ou null)
//
// Tipografia: voz fundadores (Plex Mono cor de identidade, sem prefixo `> ` nem typewriter).
// Sem dismiss UI — visibility é controlada pela lógica de cache + backend.
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

interface CachedTeamMessage extends TeamMessageData {
  viewCount: number;
}

interface TeamMessageProps {
  contextKey: string;
}

const STYLE_ID = "rdwth-teammessage-styles";
const STORAGE_KEY_PREFIX = "rdwth_team_message_cache_";
const MAX_VIEWS = 3;

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

function readCache(storageKey: string): CachedTeamMessage | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(storageKey);
    if (!raw) return null;
    return JSON.parse(raw) as CachedTeamMessage;
  } catch {
    return null;
  }
}

function writeCache(storageKey: string, cache: CachedTeamMessage): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(storageKey, JSON.stringify(cache));
  } catch {
    // QuotaExceeded ou disabled — silencioso
  }
}

function clearCache(storageKey: string): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(storageKey);
  } catch {
    // silencioso
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
    const storageKey = STORAGE_KEY_PREFIX + contextKey;

    // 1. Tenta cache primeiro
    const cached = readCache(storageKey);
    if (cached && cached.viewCount < MAX_VIEWS) {
      setMessage({ id: cached.id, text: cached.text, tone: cached.tone });
      setLoading(false);
      writeCache(storageKey, { ...cached, viewCount: cached.viewCount + 1 });
      return;
    }

    // 2. Cache esgotado ou inexistente — limpa e faz fetch
    if (cached && cached.viewCount >= MAX_VIEWS) {
      clearCache(storageKey);
    }

    async function fetchMessage() {
      try {
        const { data, error } = await supabase.functions.invoke("get-team-message", {
          body: { context_key: contextKey },
        });

        if (cancelled) return;

        if (error) {
          console.warn("[TeamMessage] fetch error:", error);
          setMessage(null);
        } else if (data?.text && data?.id) {
          const newMessage: TeamMessageData = {
            id: data.id,
            text: data.text,
            tone: data.tone ?? null,
          };
          setMessage(newMessage);
          // Cache: primeira visualização contada
          writeCache(storageKey, { ...newMessage, viewCount: 1 });
        } else {
          // { message: null } — user já viu todas, ou nenhuma ativa
          setMessage(null);
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
