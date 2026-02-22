import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import type { Session } from "@supabase/supabase-js";

const PAYLOAD = {
  base_version: 1,
  raw_input: {
    d1: [3, 3, 3, 3],
    d2: [3, 3, 3, 3],
    d3: [3, 3, 3, 3],
    d4: [3, 3, 3, 3],
    user_text: "Estou confuso sobre o que estou sentindo",
  },
};

const Test = () => {
  const navigate = useNavigate();
  const [session, setSession] = useState<Session | null>(null);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [result, setResult] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      setCheckingAuth(false);
      if (!s) navigate("/auth");
    });
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s);
      setCheckingAuth(false);
      if (!s) navigate("/auth");
    });
    return () => subscription.unsubscribe();
  }, [navigate]);

  const callEngine = async () => {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const { data, error: fnError } = await supabase.functions.invoke("lucid-engine", {
        body: PAYLOAD,
      });
      if (fnError) throw fnError;
      setResult(JSON.stringify(data, null, 2));
    } catch (e: any) {
      setError(e.message ?? String(e));
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  if (checkingAuth) return <div className="min-h-screen bg-background flex items-center justify-center">Carregando...</div>;

  return (
    <div className="min-h-screen bg-background p-8 max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold">LUCID Engine — Test</h1>
        <div className="flex items-center gap-3">
          <span className="text-sm text-muted-foreground truncate max-w-[200px]">{session?.user?.email}</span>
          <Button variant="outline" size="sm" onClick={handleLogout}>Logout</Button>
        </div>
      </div>

      <p className="text-xs text-muted-foreground mb-4 font-mono">user_id: {session?.user?.id}</p>

      <pre className="bg-muted p-4 rounded mb-4 text-sm overflow-auto">
        {JSON.stringify(PAYLOAD, null, 2)}
      </pre>

      <Button onClick={callEngine} disabled={loading}>
        {loading ? "Enviando..." : "Enviar POST"}
      </Button>

      {error && (
        <pre className="mt-4 p-4 rounded bg-destructive/10 text-destructive text-sm whitespace-pre-wrap">
          {error}
        </pre>
      )}

      {result && (
        <pre className="mt-4 p-4 rounded bg-muted text-sm overflow-auto whitespace-pre-wrap">
          {result}
        </pre>
      )}
    </div>
  );
};

export default Test;
