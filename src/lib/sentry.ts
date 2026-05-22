// src/lib/sentry.ts
// F7A — Error tracking real-time em prod via Sentry.
// Wrapper minimalista: init, captureException, setUser, clearUser.
//
// Funciona em paralelo ao PostHog (analytics). PostHog captura intent/funnel,
// Sentry captura exceções com stack trace + breadcrumbs.
//
// Source: sentry.io — projeto rdwth-web.

import * as Sentry from "@sentry/react";

const SENTRY_DSN = import.meta.env.VITE_SENTRY_DSN as string | undefined;

let initialized = false;

export function initSentry(): void {
  if (initialized) return;
  if (!SENTRY_DSN) {
    if (import.meta.env.DEV) {
      console.warn("[sentry] VITE_SENTRY_DSN ausente — sentry desativado");
    }
    return;
  }

  Sentry.init({
    dsn: SENTRY_DSN,
    environment: import.meta.env.PROD ? "production" : "development",
    // 10% de transações pra perf monitoring — controla custo do free tier.
    tracesSampleRate: 0.1,
    // Sem session replay sempre — só em erros.
    replaysSessionSampleRate: 0,
    replaysOnErrorSampleRate: 0.1,
    integrations: [
      Sentry.browserTracingIntegration(),
    ],
    // Filtra ruído conhecido — extensões de browser, network esporádico.
    beforeSend(event, hint) {
      const error = hint.originalException;
      const msg = error instanceof Error ? error.message : String(error ?? "");
      if (/ResizeObserver loop|Non-Error promise rejection captured/i.test(msg)) {
        return null;
      }
      return event;
    },
  });

  initialized = true;
}

export function captureException(
  error: unknown,
  context?: Record<string, unknown>,
): void {
  if (!SENTRY_DSN) return;
  try {
    Sentry.captureException(error, { extra: context });
  } catch {
    /* swallow — não bloqueia caller */
  }
}

export function setSentryUser(userId: string, email?: string | null): void {
  if (!SENTRY_DSN) return;
  try {
    Sentry.setUser({ id: userId, ...(email ? { email } : {}) });
  } catch {
    /* swallow */
  }
}

export function clearSentryUser(): void {
  if (!SENTRY_DSN) return;
  try {
    Sentry.setUser(null);
  } catch {
    /* swallow */
  }
}
