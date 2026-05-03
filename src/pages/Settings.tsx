// src/pages/Settings.tsx
// v2.0 — iOS.2 compliance: real delete account, data export, no placeholders
// Política de Privacidade | Termos de Uso | Como o rdwth funciona | Baixar meus dados | Apagar conta

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { callEdgeFunction, getToday } from "@/lib/api";
import { track } from "@/lib/analytics";

export default function Settings() {
  const navigate = useNavigate();
  const [deleting, setDeleting] = useState(false);
  const [exporting, setExporting] = useState(false);

  const handleDeleteAccount = async () => {
    const first = window.confirm(
      "Apagar sua conta e todos os dados?\nIsso não pode ser desfeito."
    );
    if (!first) return;
    const second = window.confirm(
      "Tem certeza absoluta? Todas as suas leituras, Pills, dados do questionário e conversas serão apagados permanentemente."
    );
    if (!second) return;

    track("account_delete_started");
    setDeleting(true);
    try {
      await callEdgeFunction("delete-account", {});
      track("account_deleted");
    } catch (err) {
      console.error("Delete account error:", err);
      track("account_delete_failed", { reason: String(err) });
    }
    localStorage.clear();
    await supabase.auth.signOut();
    setDeleting(false);
    navigate("/auth", { replace: true });
  };

  const handleDownloadData = async () => {
    setExporting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user?.id) { setExporting(false); return; }
      const uid = session.user.id;

      const [cyclesRes, pillsRes, qStateRes, hagoRes] = await Promise.all([
        (supabase.from("ipe_cycles") as any).select("*").eq("user_id", uid),
        (supabase.from("pill_responses") as any).select("*").order("created_at", { ascending: true }),
        (supabase.from("questionnaire_state") as any).select("*"),
        (supabase.from("cycles") as any).select("id, user_text, llm_response, created_at, hago_state").eq("user_id", uid).order("created_at", { ascending: true }),
      ]);

      const exportData = {
        exported_at: new Date().toISOString(),
        user_id: uid,
        ipe_cycles: cyclesRes.data ?? [],
        pill_responses: pillsRes.data ?? [],
        questionnaire_state: qStateRes.data ?? [],
        conversations: hagoRes.data ?? [],
      };

      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `rdwth-data-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      track("data_export_completed", {
        cycles_count: exportData.ipe_cycles.length,
        pills_count: exportData.pill_responses.length,
        conversations_count: exportData.conversations.length,
      });
    } catch (err) {
      console.error("Export error:", err);
      track("data_export_failed", { reason: String(err) });
      alert("Algo deu errado ao exportar seus dados. Tente novamente.");
    }
    setExporting(false);
  };

  const handleSignOut = async () => {
    track("signout");
    await supabase.auth.signOut();
    // A2 — onboarding state agora persiste em user_onboarding_state.
    // Não é necessário (nem desejável) limpar flags de onboarding no signout.
    navigate("/auth");
  };

  return (
    <div className="r-screen">
      <div className="r-header">
        <span className="r-header-label" onClick={() => navigate("/home")} style={{ cursor: "pointer" }}>rdwth</span>
        <span className="r-header-section">ajustes</span>
        <span className="r-header-date">{getToday()}</span>
      </div>
      <div className="r-line" />

      <div style={{ flex: 1, padding: "32px 24px 24px", display: "flex", flexDirection: "column", gap: 0 }}>

        {[
          { label: "política de privacidade", action: () => navigate("/privacy-policy") },
          { label: "termos de uso",            action: () => navigate("/terms-of-use") },
          { label: "sistema",                  action: () => navigate("/como-funciona") },
          { label: "sair",                     action: handleSignOut },
        ].map((item, i) => (
          <div key={i}>
            <div
              onClick={item.action}
              style={{
                display: "flex", alignItems: "center", gap: 10,
                padding: "14px 0",
                cursor: "pointer",
              }}
            >
              <div style={{ width: 1, height: 12, background: "var(--r-ghost)", flexShrink: 0 }} />
              <span style={{
                fontFamily: "var(--r-font-sys)", fontWeight: 300, fontSize: 11,
                color: "var(--r-sub)", letterSpacing: "0.06em",
              }}>{item.label}</span>
            </div>
            <div style={{ height: 1, background: "var(--r-ghost)", opacity: 0.25 }} />
          </div>
        ))}

        <div style={{ flex: 1 }} />

        {[
          {
            label: exporting ? "baixando..." : "baixar meus dados",
            color: "var(--r-sub)",
            action: exporting ? undefined : handleDownloadData,
          },
          {
            label: deleting ? "apagando..." : "apagar conta",
            color: "var(--r-telha)",
            action: deleting ? undefined : handleDeleteAccount,
          },
        ].map((item, i) => (
          <div key={i}>
            <div style={{ height: 1, background: "var(--r-ghost)", opacity: 0.25 }} />
            <div
              onClick={item.action}
              style={{
                display: "flex", alignItems: "center", gap: 10,
                padding: "14px 0",
                cursor: item.action ? "pointer" : "default",
                opacity: item.action ? 1 : 0.5,
              }}
            >
              <div style={{ width: 1, height: 12, background: item.color, flexShrink: 0 }} />
              <span style={{
                fontFamily: "var(--r-font-sys)", fontWeight: 300, fontSize: 11,
                color: item.color, letterSpacing: "0.06em",
              }}>{item.label}</span>
            </div>
          </div>
        ))}

      </div>

      <div className="r-line" />
      <div style={{ height: 52, display: "flex", alignItems: "center", padding: "0 24px", flexShrink: 0 }}>
        <span onClick={() => navigate(-1 as any)} style={{ fontFamily: "var(--r-font-sys)", fontWeight: 300, fontSize: 13, color: "var(--r-muted)", cursor: "pointer" }}>‹</span>
      </div>
    </div>
  );
}
