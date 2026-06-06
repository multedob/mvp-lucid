// src/pages/ThirdPartyPage.tsx
// Wrapper pra rota /terceiros (acessada via NavBottom).
// Busca o ciclo ativo do user e passa pro ContextThirdParty.
// Sem ciclo: mostra estado vazio.

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useShell } from "@/hooks/useShell";
import { useUserName } from "@/hooks/useUserName";
import { ContextThirdParty } from "./Context";
import { FeedbackButton } from "@/components/FeedbackButton";

export default function ThirdPartyPage() {
  useShell({ section: "amigos", active: "thirdparty" });
  const navigate = useNavigate();
  const userName = useUserName();

  const [ipeCycleId, setIpeCycleId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) { navigate("/auth"); return; }

        const { data: cycle } = await supabase
          .from("ipe_cycles")
          .select("id")
          .eq("user_id", session.user.id)
          .order("cycle_number", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (cycle?.id) setIpeCycleId(cycle.id);
      } catch (err) {
        console.error("[ThirdPartyPage] erro buscando ciclo:", err);
      } finally {
        setLoading(false);
      }
    })();
  }, [navigate]);

  if (loading) return null;

  if (!ipeCycleId) {
    return (
      <>
        <div style={{ minHeight: 110, flexShrink: 0, padding: "12px 24px 0" }}>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
            <div style={{ flex: 1, minWidth: 0, fontFamily: "var(--r-font-sys)", fontWeight: 300, fontSize: 11, lineHeight: 1.7, color: "var(--r-voice-sys)", letterSpacing: "0.04em" }}>
              <span aria-hidden="true">{"> "}</span>amigos abrem depois que você começa uma tensão.
            </div>
            <FeedbackButton />
          </div>
        </div>
      </>
    );
  }

  return (
    <ContextThirdParty
      ipeCycleId={ipeCycleId}
      onBack={() => navigate(-1)}
      userName={userName}
    />
  );
}
