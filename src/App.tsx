import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useEffect, useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import Splash from "./pages/Splash";
import Auth from "./pages/Auth";
import Home from "./pages/Home";
import OnboardingLetter from "./pages/OnboardingLetter";
import AgeCheck from "./pages/AgeCheck";
import Consent from "./pages/Consent";
import Onboarding from "./pages/Onboarding";
import Pills from "./pages/Pills";
import PillFlow from "./pages/pill/PillFlow";
import Context from "./pages/Context";
import Reed from "./pages/Reed";
import Settings from "./pages/Settings";
import Questionnaire from "./pages/Questionnaire";
import Privacy from "./pages/Privacy";
import Terms from "./pages/Terms";
import ThirdParty from "./pages/ThirdParty";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

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
// Ordem de verificação:
//   1. não autenticado → Splash
//   2. sem rdwth_age_confirmed → /age
//   3. sem rdwth_consent_given → /consent
//   4. sem rdwth_letter_seen   → /letter
//   5. sem rdwth_user_name     → /onboarding
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

      // ── Flags de onboarding ──────────────────────────────────────
      if (!localStorage.getItem("rdwth_age_confirmed")) {
        setRedirectTo("/age");
        setChecking(false);
        return;
      }

      if (!localStorage.getItem("rdwth_consent_given")) {
        setRedirectTo("/consent");
        setChecking(false);
        return;
      }

      if (!localStorage.getItem("rdwth_letter_seen")) {
        setRedirectTo("/letter");
        setChecking(false);
        return;
      }

      if (!localStorage.getItem("rdwth_user_name")) {
        setRedirectTo("/onboarding");
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

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<RootRedirect />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/age" element={<AgeCheck />} />
          <Route path="/consent" element={<Consent />} />
          <Route path="/letter" element={<OnboardingLetter />} />
          <Route path="/onboarding" element={<Onboarding />} />
          <Route path="/home" element={<ProtectedRoute><Home /></ProtectedRoute>} />
          <Route path="/pills" element={<ProtectedRoute><Pills /></ProtectedRoute>} />
          <Route path="/pill/:pillId" element={<ProtectedRoute><PillFlow /></ProtectedRoute>} />
          <Route path="/questionnaire" element={<ProtectedRoute><Questionnaire /></ProtectedRoute>} />
          <Route path="/context" element={<ProtectedRoute><Context /></ProtectedRoute>} />
          <Route path="/reed" element={<ProtectedRoute><Reed /></ProtectedRoute>} />
          <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
          <Route path="/privacy" element={<Privacy />} />
          <Route path="/terms" element={<Terms />} />
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
