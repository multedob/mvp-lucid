import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { lazy, Suspense, useEffect, useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";

// ── Eager: entry path, leve, ou frequente ──
import Splash from "./pages/Splash";
import Auth from "./pages/Auth";
import Home from "./pages/Home";
import OnboardingLetter from "./pages/OnboardingLetter";
import AgeCheck from "./pages/AgeCheck";
import Consent from "./pages/Consent";
import Onboarding from "./pages/Onboarding";
import Warmup from "./pages/Warmup";
import NotFound from "./pages/NotFound";
import AppShell from "./components/AppShell";
import ErrorBoundary from "./components/ErrorBoundary";
import { FeedbackButton } from "./components/FeedbackButton";

// ── Lazy: pesado ou visitado depois do entry path ──
// F6 — Bundle optimization. Reduz bundle inicial separando rotas internas
// e institucionais em chunks sob demanda. Suspense fallback = null
// (transições são curtas, sem flash visível).
const Pills          = lazy(() => import("./pages/Pills"));
const PillFlow       = lazy(() => import("./pages/pill/PillFlow"));
const Context        = lazy(() => import("./pages/Context"));
const ContextSystem  = lazy(() => import("./pages/Context").then((m) => ({ default: m.ContextSystem })));
const Reed           = lazy(() => import("./pages/Reed"));
const Questionnaire  = lazy(() => import("./pages/Questionnaire"));
const Settings       = lazy(() => import("./pages/Settings"));
const ThirdPartyPage = lazy(() => import("./pages/ThirdPartyPage"));
const ThirdParty     = lazy(() => import("./pages/ThirdParty"));
const Privacy        = lazy(() => import("./pages/Privacy"));
const Terms          = lazy(() => import("./pages/Terms"));
const Sobre          = lazy(() => import("./pages/Sobre"));
const ResetPassword  = lazy(() => import("./pages/ResetPassword"));

import { trackPageView, identifyUser, resetUser } from "./lib/analytics";
import { setSentryUser, clearSentryUser } from "./lib/sentry";

const queryClient = new QueryClient();

// A2 — cleanup one-time de flags antigas de localStorage (substituídas por user_onboarding_state).
// Roda uma única vez por device (idempotente). Pode ser removido após algumas versões.
(function cleanupLegacyOnboardingFlags() {
  if (typeof window === "undefined") return;
  if (localStorage.getItem("rdwth_a2_cleanup_done") === "1") return;
  ["rdwth_age_confirmed", "rdwth_consent_given", "rdwth_letter_seen"].forEach(
    (k) => localStorage.removeItem(k)
  );
  localStorage.setItem("rdwth_a2_cleanup_done", "1");
})();

// ─── ProtectedRoute — verifica sessão Supabase ───────────────────
function ProtectedRoute({ children }: { children: ReactNode }) {
  const [checking, setChecking] = useState(true);
  const [authed, setAuthed] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setAuthed(!!session);
      setChecking(false);
    });
  }, []);

  if (checking) return null;
  if (!authed) return <Navigate to="/auth" replace />;
  return <>{children}</>;
}

// ─── RootRedirect — fluxo completo de onboarding + ciclo IPE ─────
// Ordem de verificação (A2 — source of truth = user_onboarding_state):
//   1. não autenticado → Splash
//   2. sem age_confirmed_at → /age
//   3. sem consent_given_at → /consent
//   4. sem letter_seen_at   → /letter
//   5. sem name_set_at      → /onboarding
//   6. com tudo → redireciona por status do ciclo IPE
function RootRedirect() {
  const [checking, setChecking] = useState(true);
  const [authed, setAuthed] = useState(false);
  const [redirectTo, setRedirectTo] = useState("/home");

  useEffect(() => {
    async function resolve() {
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        setChecking(false);
        return; // não autenticado → mostra Splash
      }

      setAuthed(true);

      // ── Onboarding state via Supabase (single source of truth) ───
      const { data: ob } = await (supabase
        .from("user_onboarding_state") as any)
        .select("age_confirmed_at, consent_given_at, letter_seen_at, name_set_at, warmup_completed_at")
        .eq("user_id", session.user.id)
        .maybeSingle();

      if (!ob?.age_confirmed_at) {
        setRedirectTo("/age");
        setChecking(false);
        return;
      }

      if (!ob?.consent_given_at) {
        setRedirectTo("/consent");
        setChecking(false);
        return;
      }

      if (!ob?.letter_seen_at) {
        setRedirectTo("/letter");
        setChecking(false);
        return;
      }

      if (!ob?.name_set_at) {
        setRedirectTo("/onboarding");
        setChecking(false);
        return;
      }

      // AFC ONB-6 — warmup como step antes da Home/ciclo
      if (!ob?.warmup_completed_at) {
        setRedirectTo("/warmup");
        setChecking(false);
        return;
      }

      // Onboarding completo → SEMPRE /home no retorno.
      // (Antes redirecionava por status do ciclo IPE — pills/questionnaire/reed.
      //  Decisão: usuário que volta ao app deve cair no portal central da home,
      //  e de lá decidir o que continuar fazendo.)
      setRedirectTo("/home");
      setChecking(false);
    }

    resolve();
  }, []);

  if (checking) return null;
  if (!authed) return <Splash />;
  return <Navigate to={redirectTo} replace />;
}

// ─── PageViewTracker — captura $pageview a cada mudança de rota ──
function PageViewTracker() {
  const location = useLocation();
  useEffect(() => {
    trackPageView(location.pathname);
  }, [location.pathname]);
  return null;
}

// ─── AuthIdentifier — identify/reset PostHog + Sentry ao mudar sessão ──────
function AuthIdentifier() {
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" && session?.user) {
        identifyUser(session.user.id, { email: session.user.email });
        setSentryUser(session.user.id, session.user.email);
      } else if (event === "SIGNED_OUT") {
        resetUser();
        clearSentryUser();
      }
    });
    return () => subscription.unsubscribe();
  }, []);
  return null;
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <PageViewTracker />
        <AuthIdentifier />
        <Suspense fallback={null}>
          <Routes>
            <Route path="/" element={<RootRedirect />} />
            <Route path="/auth" element={<Navigate to="/signin" replace />} />
            <Route path="/signin" element={<Auth />} />
            <Route path="/signup" element={<Auth />} />
            <Route path="/age" element={<AgeCheck />} />
            <Route path="/consent" element={<Consent />} />
            <Route path="/letter" element={<OnboardingLetter />} />
            <Route path="/onboarding" element={<Onboarding />} />
            <Route path="/warmup" element={<ProtectedRoute><ErrorBoundary boundaryName="warmup"><><Warmup /><FeedbackButton /></></ErrorBoundary></ProtectedRoute>} />
            {/* AppShell — header + footer persistentes pra rotas autenticadas que
                compartilham canvas. Transições entre essas rotas usam flowTo() —
                ver hooks/useFlow.tsx. */}
            <Route element={<ProtectedRoute><AppShell /></ProtectedRoute>}>
              <Route path="/home" element={<Home />} />
              <Route path="/pills" element={<Pills />} />
              <Route path="/questionnaire" element={<Questionnaire />} />
              <Route path="/context" element={<Context />} />
              <Route path="/terceiros" element={<ThirdPartyPage />} />
              <Route path="/reed" element={<Reed />} />
              <Route path="/settings" element={<Settings />} />
            </Route>
            <Route path="/pill/:pillId" element={<ProtectedRoute><ErrorBoundary boundaryName="pillflow"><><PillFlow /><FeedbackButton /></></ErrorBoundary></ProtectedRoute>} />
            <Route path="/como-funciona" element={<ProtectedRoute><><ContextSystem /><FeedbackButton /></></ProtectedRoute>} />
            <Route path="/privacy" element={<Privacy />} />
            <Route path="/privacy-policy" element={<Privacy />} />
            <Route path="/terms" element={<Terms />} />
            <Route path="/terms-of-use" element={<Terms />} />
            <Route path="/sobre" element={<Sobre />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            {/* W20.2 — Third-party questionnaire (público, sem auth do app) */}
            <Route path="/third-party/:token" element={<ErrorBoundary boundaryName="thirdparty"><ThirdParty /></ErrorBoundary>} />
            {/* Slug curto: rdwth.com/c/{8-chars} — link amigável pra convidar terceiros. */}
            <Route path="/c/:slug" element={<ErrorBoundary boundaryName="thirdparty"><ThirdParty /></ErrorBoundary>} />
            <Route path="/test" element={<Navigate to="/home" replace />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
