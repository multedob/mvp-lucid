// supabase/functions/lucid-engine/index.ts
// LUCID Engine — Skeleton v0.1
// Structural Model Version: 3.0
// Status: scaffold only — sem lógica de negócio

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, " +
    "x-supabase-client-platform, x-supabase-client-platform-version, " +
    "x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req: Request): Promise<Response> => {
  // CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: CORS_HEADERS });
  }

  // Método não permitido
  if (req.method !== "POST") {
    return json({ error: "INVALID_INPUT", message: "Method not allowed" }, 400);
  }

  // Parse body
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return json({ error: "INVALID_INPUT", message: "Body must be valid JSON" }, 400);
  }

  // Validação mínima
  if (
    typeof body !== "object" ||
    body === null ||
    typeof (body as Record<string, unknown>)["raw_input"] !== "string" ||
    typeof (body as Record<string, unknown>)["base_version"] !== "number"
  ) {
    return json(
      {
        error: "INVALID_INPUT",
        message: "Body must contain raw_input (string) and base_version (number)",
      },
      400
    );
  }

  const { raw_input, base_version } = body as {
    raw_input: string;
    base_version: number;
  };

  // Placeholder response
  return json({
    status: "lucid-engine skeleton active",
    raw_input,
    base_version,
  });
});
