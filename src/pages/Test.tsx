import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown } from "lucide-react";
import type { Session } from "@supabase/supabase-js";

const DEFAULT_USER_TEXT = "Estou confuso sobre o que estou sentindo";
const DEFAULT_DIMS = [3, 3, 3, 3] as const;
const DIM_KEYS = ["d1", "d2", "d3", "d4"] as const;

const Test = () => {
  const navigate = useNavigate();
  const [session, setSession] = useState<Session | null>(null);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [result, setResult] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentVersion, setCurrentVersion] = useState<number | null>(null);
  const [userText, setUserText] = useState(DEFAULT_USER_TEXT);
  const [dimsOpen, setDimsOpen] = useState(false);
  const [dims, setDims] = useState<Record<string, number[]>>({
    d1: [...DEFAULT_DIMS],
    d2: [...DEFAULT_DIMS],
    d3: [...DEFAULT_DIMS],
    d4: [...DEFAULT_DIMS],
  });

  const updateDim = (key: string, idx: number, value: number) => {
    setDims((prev) => {
      const arr = [...prev[key]];
      arr[idx] = value;
      return { ...prev, [key]: arr };
    });
  };

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
      const userId = session?.user?.id;
      if (!userId) throw new Error("Usuário não autenticado");

      const { data: userData, error: userError } = await supabase
        .from("users")
        .select("version")
        .eq("id", userId)
        .single();

      if (userError) throw new Error(`Erro ao buscar versão: ${userError.message}`);
      if (!userData) throw new Error("Usuário não encontrado na tabela users");

      const baseVersion = userData.version;
      setCurrentVersion(baseVersion);

      const rawInput = { ...dims, user_text: userText.trim() };
      const payload = { base_version: baseVersion, raw_input: rawInput };

      const { data, error: fnError } = await supabase.functions.invoke("lucid-engine", {
        body: payload,
      });
      if (fnError) throw fnError;
      setCurrentVersion(baseVersion + 1);
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

      <p className="text-xs text-muted-foreground mb-1 font-mono">user_id: {session?.user?.id}</p>
      <p className="text-xs text-muted-foreground mb-4 font-mono">base_version: {currentVersion ?? "—"}</p>

      <Collapsible open={dimsOpen} onOpenChange={setDimsOpen} className="mb-4 border border-border rounded-md">
        <CollapsibleTrigger className="flex w-full items-center justify-between px-4 py-2 text-sm font-medium hover:bg-muted/50 transition-colors">
          Structural Dimensions (Test)
          <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${dimsOpen ? "rotate-180" : ""}`} />
        </CollapsibleTrigger>
        <CollapsibleContent className="px-4 pb-4 pt-2 space-y-2">
          {DIM_KEYS.map((key) => (
            <div key={key} className="flex items-center gap-2">
              <span className="text-xs font-mono w-6 text-muted-foreground">{key}</span>
              {dims[key].map((val, idx) => (
                <input
                  key={idx}
                  type="number"
                  min={0}
                  max={5}
                  value={val}
                  onChange={(e) => updateDim(key, idx, Number(e.target.value))}
                  className="w-14 rounded border border-border bg-background px-2 py-1 text-sm font-mono text-center"
                />
              ))}
            </div>
          ))}
        </CollapsibleContent>
      </Collapsible>

      <label className="block text-sm font-medium mb-1">user_text</label>
      <textarea
        className="w-full rounded border border-border bg-muted p-3 text-sm font-mono mb-4 resize-y min-h-[80px]"
        value={userText}
        onChange={(e) => setUserText(e.target.value)}
        placeholder="Digite o texto do usuário..."
      />

      <pre className="bg-muted p-4 rounded mb-4 text-sm overflow-auto">
        {JSON.stringify({ base_version: currentVersion ?? "(será buscado)", raw_input: { ...dims, user_text: userText } }, null, 2)}
      </pre>

      <Button onClick={callEngine} disabled={loading || !userText.trim()}>
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
