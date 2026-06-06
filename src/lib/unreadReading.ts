// src/lib/unreadReading.ts
// Fix UX 06/jun — sinal de "tem deep reading novo pra ler".
//
// Estado simples via localStorage (MVP). Pós-alpha: migrar pra coluna
// ipe_cycles.deep_reading_read_at no banco.
//
// Fluxo:
//  1. CycleClosedScreen (ready=true) → markReadingUnread()
//     → flag set → SystemPulse fica ativo em #nav-context.
//  2. User abre /context → markReadingRead() limpa a flag → pulse para.
//  3. useUnreadReading() — hook reativo (event-based, sem polling).

const STORAGE_KEY = "rdwth_unread_reading";
const EVENT_NAME = "rdwth:unread-reading-changed";

function emit() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(EVENT_NAME));
}

export function markReadingUnread(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, "1");
    emit();
  } catch {
    // QuotaExceeded / disabled — silencioso.
  }
}

export function markReadingRead(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(STORAGE_KEY);
    emit();
  } catch {
    // silencioso
  }
}

export function isReadingUnread(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return localStorage.getItem(STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

// React hook (sem React import — evita ciclo no bundle: usa import dinâmico)
import { useEffect, useState } from "react";

export function useUnreadReading(): boolean {
  const [unread, setUnread] = useState<boolean>(() => isReadingUnread());

  useEffect(() => {
    const handler = () => setUnread(isReadingUnread());
    window.addEventListener(EVENT_NAME, handler);
    // Reage também a mudanças em outras abas
    window.addEventListener("storage", handler);
    return () => {
      window.removeEventListener(EVENT_NAME, handler);
      window.removeEventListener("storage", handler);
    };
  }, []);

  return unread;
}
