// src/components/ErrorBoundary.tsx
// F5A — Boundary que captura erros JS nos filhos e mostra fallback em vez
// de tela branca. Faz log estruturado no PostHog pra rastrear erros em prod.
//
// Uso:
//   <ErrorBoundary boundaryName="reed">
//     <Reed />
//   </ErrorBoundary>
//
// React 18 ainda exige classe pra Error Boundaries — hooks/function components
// não capturam exceções de render. Mantido como classe por necessidade do framework.

import { Component, type ErrorInfo, type ReactNode } from "react";
import CatastrophicError from "./CatastrophicError";
import { track } from "@/lib/analytics";
import { captureException } from "@/lib/sentry";

interface Props {
  /** Identificador no log (ex: 'appshell', 'pillflow', 'thirdparty'). */
  boundaryName: string;
  /** Mensagem mostrada ao usuário. Padrão: copy genérica do rdwth. */
  fallbackMessage?: string;
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(_error: Error): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    // Log estruturado no PostHog (funnel/intent).
    try {
      track("app_error", {
        boundary: this.props.boundaryName,
        message: error.message,
        stack: error.stack?.slice(0, 2000) ?? null,
        component_stack: errorInfo.componentStack?.slice(0, 2000) ?? null,
        url: typeof window !== "undefined" ? window.location.pathname : null,
      });
    } catch {
      /* swallow — não bloqueia render do fallback */
    }

    // Forward pro Sentry (stack trace + breadcrumbs + alerts).
    captureException(error, {
      boundary: this.props.boundaryName,
      component_stack: errorInfo.componentStack,
    });

    // Log no console pra debug em dev.
    if (typeof console !== "undefined") {
      console.error(`[ErrorBoundary:${this.props.boundaryName}]`, error, errorInfo);
    }
  }

  handleReload = (): void => {
    // Recarrega a rota atual. Mais seguro que tentar resetar state — garante
    // que qualquer estado corrompido (localStorage, supabase session stale) seja
    // reavaliado do zero.
    if (typeof window !== "undefined") window.location.reload();
  };

  render(): ReactNode {
    if (this.state.hasError) {
      return (
        <CatastrophicError
          title="algo travou"
          message={
            this.props.fallbackMessage ??
            "encontramos uma falha inesperada. recarregue pra continuar — seu progresso fica salvo."
          }
          actionLabel="recarregar"
          onAction={this.handleReload}
        />
      );
    }
    return this.props.children;
  }
}
