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
import PillFlow from "./pages/pill/PillFlow";
import Context from "./pages/Context";
import Reed from "./pages/Reed";
import Questionnaire from "./pages/Questionnaire";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

// ─── ProtectedRoute — desabilitado para dev ───────────────────────
// TODO: reativar antes do lançamento
function ProtectedRoute({ children }: { children: ReactNode }) {
  return <>{children}</>;
}

// ─── ProtectedRoute — versão produção (descomentar antes do lançamento) ───
// function ProtectedRoute({ children }: { children: ReactNode }) {
//   const [checking, setChecking] = useState(true);
//   const [authed, setAuthed] = useState(false);
//   useEffect(() => {
//     supabase.auth.getSession().then(({ data: { session } }) => {
//       setAuthed(!!session);
//       setChecking(false);
//     });
//   }, []);
//   if (checking) return null;
//   if (!authed) return <Navigate to="/auth" replace />;
//   return <>{children}</>;
// }

// ─── RootRedirect ─────────────────────────────────────────────────
function RootRedirect() {
  const [checking, setChecking] = useState(true);
  const [authed, setAuthed] = useState(false);
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setAuthed(!!session);
      setChecking(false);
    });
  }, []);
  if (checking) return null;
  if (!authed) return <Splash />;
  const seen = localStorage.getItem("rdwth_letter_seen");
  if (!seen) return <Navigate to="/letter" replace />;
  return <Navigate to="/home" replace />;
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
        <Route path="/letter" element={<OnboardingLetter />} />
        <Route path="/home" element={<ProtectedRoute><Home /></ProtectedRoute>} />
        <Route path="/pill/:pillId" element={<ProtectedRoute><PillFlow /></ProtectedRoute>} />
        <Route path="/questionnaire" element={<ProtectedRoute><Questionnaire /></ProtectedRoute>} />
        <Route path="/context" element={<ProtectedRoute><Context /></ProtectedRoute>} />
        <Route path="/reed" element={<ProtectedRoute><Reed /></ProtectedRoute>} />
        <Route path="/test" element={<Navigate to="/home" replace />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
