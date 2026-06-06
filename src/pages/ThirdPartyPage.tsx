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
        <div style={{ display: "flex", justifyContent: "flex-end", padding: "12px 24px 0" }}>
          <FeedbackButton />
        </div>
        <div style={{ padding: "32px 24px", display: "flex", justifyContent: "center" }}>
          <div className="r-sub" style={{ textAlign: "center" }}>
            nenhum ciclo ativo. complete um ciclo pra começar.
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <div style={{ display: "flex", justifyContent: "flex-end", padding: "12px 24px 0" }}>
        <FeedbackButton />
      </div>
      <ContextThirdParty
        ipeCycleId={ipeCycleId}
        onBack={() => navigate(-1)}
        userName={userName}
      />
    </>
  );
}
