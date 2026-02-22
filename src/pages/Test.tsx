import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

const PAYLOAD = {
  base_version: 0,
  raw_input: {
    d1: [3, 3, 3, 3],
    d2: [3, 3, 3, 3],
    d3: [3, 3, 3, 3],
    d4: [3, 3, 3, 3],
    user_text: "Estou confuso sobre o que estou sentindo",
  },
};

const Test = () => {
  const [result, setResult] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  return (
    <div className="min-h-screen bg-background p-8 max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">LUCID Engine — Test</h1>

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
