import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { useEffect, useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import Splash from "./pages/Splash";
import Auth from "./pages/Auth";
import Home from "./pages/Home";
import OnboardingLetter from "./pages/OnboardingLetter";
import AgeCheck from "./pages/AgeCheck";
import Consent from "./pages/Consent";
import Onboarding from "./pages/Onboarding";
import Warmup from "./pages/Warmup";
import Pills from "./pages/Pills";
import PillFlow from "./pages/pill/PillFlow";
import Context, { ContextSystem } from "./pages/Context";
import Reed from "./pages/Reed";
import Settings from "./pages/Settings";
import Questionnaire from "./pages/Questionnaire";
import Privacy from "./pages/Privacy";
import Terms from "./pages/Terms";
import ThirdParty from "./pages/ThirdParty";
import NotFound from "./pages/NotFound";
import { trackPageView, identifyUser, resetUser } from "./lib/analytics";

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

      // ── Redireciona por estado do ciclo IPE ──────────────────────
      const { data: cycle } = await supabase
        .from("ipe_cycles")
        .select("status")
        .eq("user_id", session.user.id)
        .order("started_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (cycle) {
        switch (cycle.status) {
          case "pills":
            setRedirectTo("/pills");
            break;
          case "questionnaire":
            setRedirectTo("/questionnaire");
            break;
          case "complete":
            setRedirectTo("/reed");
            break;
          case "abandoned":
            setRedirectTo("/home");
            break;
          default:
            setRedirectTo("/home");
        }
      }
      // Se não tem ciclo → /home (default)

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

// ─── AuthIdentifier — identify/reset PostHog ao mudar sessão ──────
function AuthIdentifier() {
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" && session?.user) {
        identifyUser(session.user.id, { email: session.user.email });
      } else if (event === "SIGNED_OUT") {
        resetUser();
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
        <Routes>
          <Route path="/" element={<RootRedirect />} />
          <Route path="/auth" element={<Navigate to="/signin" replace />} />
          <Route path="/signin" element={<Auth />} />
          <Route path="/signup" element={<Auth />} />
          <Route path="/age" element={<AgeCheck />} />
          <Route path="/consent" element={<Consent />} />
          <Route path="/letter" element={<OnboardingLetter />} />
          <Route path="/onboarding" element={<Onboarding />} />
          <Route path="/warmup" element={<ProtectedRoute><Warmup /></ProtectedRoute>} />
          <Route path="/home" element={<ProtectedRoute><Home /></ProtectedRoute>} />
          <Route path="/pills" element={<ProtectedRoute><Pills /></ProtectedRoute>} />
          <Route path="/pill/:pillId" element={<ProtectedRoute><PillFlow /></ProtectedRoute>} />
          <Route path="/questionnaire" element={<ProtectedRoute><Questionnaire /></ProtectedRoute>} />
          <Route path="/context" element={<ProtectedRoute><Context /></ProtectedRoute>} />
          <Route path="/como-funciona" element={<ProtectedRoute><ContextSystem /></ProtectedRoute>} />
          <Route path="/reed" element={<ProtectedRoute><Reed /></ProtectedRoute>} />
          <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
          <Route path="/privacy" element={<Privacy />} />
          <Route path="/privacy-policy" element={<Privacy />} />
          <Route path="/terms" element={<Terms />} />
          <Route path="/terms-of-use" element={<Terms />} />
          {/* W20.2 — Third-party questionnaire (público, sem auth do app) */}
          <Route path="/third-party/:token" element={<ThirdParty />} />
          <Route path="/test" element={<Navigate to="/home" replace />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
