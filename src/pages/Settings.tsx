// src/pages/Settings.tsx
// Privacy Policy | Terms of Use | How _rdwth works
// Download my data | Delete account

import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { getToday } from "@/lib/api";
import NavBottom from "@/components/NavBottom";

export default function Settings() {
  const navigate = useNavigate();

  const handleDeleteAccount = async () => {
    const confirm = window.confirm("Delete your account and all data? This cannot be undone.");
    if (!confirm) return;
    await supabase.auth.signOut();
    localStorage.clear();
    navigate("/auth");
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    localStorage.removeItem("rdwth_letter_seen");
    navigate("/auth");
  };

  return (
    <div className="r-screen">
      <div className="r-header">
        <span className="r-header-label"><span onClick={() => navigate("/home")} style={{ cursor: "pointer" }}>_rdwth</span> · settings</span>
        <span className="r-header-date">{getToday()}</span>
      </div>
      <div className="r-line" />

      <div style={{ flex: 1, padding: "32px 24px 24px", display: "flex", flexDirection: "column", gap: 0 }}>

        {[
          { label: "Privacy Policy",      action: null },
          { label: "Terms of Use",        action: null },
          { label: "How _rdwth works",    action: () => navigate("/context") },
          { label: "Sign out",            action: handleSignOut },
        ].map((item, i) => (
          <div key={i}>
            <div
              onClick={item.action || undefined}
              style={{
                display: "flex", alignItems: "center", gap: 10,
                padding: "14px 0",
                cursor: item.action ? "pointer" : "default",
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
          { label: "Download my data", color: "var(--r-sub)",    action: null },
          { label: "Delete account",   color: "var(--r-accent)", action: handleDeleteAccount },
        ].map((item, i) => (
          <div key={i}>
            <div style={{ height: 1, background: "var(--r-ghost)", opacity: 0.25 }} />
            <div
              onClick={item.action || undefined}
              style={{
                display: "flex", alignItems: "center", gap: 10,
                padding: "14px 0", cursor: item.action ? "pointer" : "default",
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

      <NavBottom active="settings" />
    </div>
  );
}
