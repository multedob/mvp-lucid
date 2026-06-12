// src/lib/analytics.ts
// Wrapper PostHog. Helpers para init, identify, reset, track e pageview.
// Source: PostHog us.posthog.com — projeto rdwth.

import posthog from "posthog-js";

const POSTHOG_KEY = import.meta.env.VITE_POSTHOG_KEY as string | undefined;
const POSTHOG_HOST = (import.meta.env.VITE_POSTHOG_HOST as string | undefined) ?? "https://us.i.posthog.com";

let initialized = false;

export function initAnalytics(): void {
  if (initialized) return;
  if (!POSTHOG_KEY) {
    if (import.meta.env.DEV) {
      console.warn("[analytics] VITE_POSTHOG_KEY ausente — analytics desativado");
    }
    return;
  }
  posthog.init(POSTHOG_KEY, {
    api_host: POSTHOG_HOST,
    person_profiles: "identified_only",
    capture_pageview: false,           // já capturamos manual via trackPageView (não duplicar)
    capture_pageleave: true,           // tempo em cada tela
    autocapture: true,                 // cliques → heatmaps e "onde clicam primeiro"
    mask_all_text: true,               // privacidade: autocapture não guarda o texto dos elementos
    mask_all_element_attributes: true,
    session_recording: {
      maskAllInputs: true,             // não grava o que a pessoa digita (Reed, questionário)
      maskTextSelector: "*",           // mascara TODO texto na gravação — conteúdo íntimo (LGPD)
    },
    loaded: () => {
      if (import.meta.env.DEV) console.log("[analytics] posthog ok");
    },
  });
  initialized = true;
}

export function identifyUser(userId: string, properties?: Record<string, unknown>): void {
  if (!POSTHOG_KEY) return;
  posthog.identify(userId, properties);
}

export function resetUser(): void {
  if (!POSTHOG_KEY) return;
  posthog.reset();
}

export function track(event: string, properties?: Record<string, unknown>): void {
  if (!POSTHOG_KEY) return;
  posthog.capture(event, properties);
}

export function trackPageView(path: string): void {
  if (!POSTHOG_KEY) return;
  posthog.capture("$pageview", { $current_url: window.location.origin + path });
}
