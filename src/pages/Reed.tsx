// src/pages/Reed.tsx
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { callEdgeFunction, getToday } from "@/lib/api";

interface Message {
  role: "reed" | "user";
  text: string;
}

export default function Reed() {
  const navigate = useNavigate();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [cycleId, setCycleId] = useState<string | null>(null);
  const [cycleDisplay, setCycleDisplay] = useState("");
  const [ready, setReady] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => { init(); }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const init = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return navigate("/auth");

      // Buscar ciclo mais recente com pills completadas
      const { data: cycle } = await supabase
        .from("ipe_cycles")
        .select("id, cycle_number, started_at")
        .eq("user_id", session.user.id)
        .order("cycle_number", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (cycle) {
        setCycleId(cycle.id);
        const d = new Date(cycle.started_at);
        const code = String(d.getMonth() + 1).padStart(2, "0") + String(d.getDate()).padStart(2, "0");
        setCycleDisplay(String(cycle.cycle_number).padStart(2, "0") + " · " + code);
      }

      // Mensagem de abertura do Reed
      setMessages([{
        role: "reed",
        text: "hi.\n\ni read structure. i don't interpret who you are.\n\nwhat brought you here today?",
      }]);
      setReady(true);
    } catch (err) {
      console.error("Reed init:", err);
      setMessages([{ role: "reed", text: "hi.\n\nwhat's on your mind?" }]);
      setReady(true);
    }
  };

  const send = async () => {
    const text = input.trim();
    if (!text || loading) return;

    const userMsg: Message = { role: "user", text };
    setMessages(prev => [...prev, userMsg]);
    setInput("");
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
    setLoading(true);

    try {
      // Chamar edge function lucid-engine (ou fallback local)
      const result = await callEdgeFunction<{ response: string }>(
        "lucid-engine",
        {
          ipe_cycle_id: cycleId,
          user_message: text,
          conversation_history: messages.map(m => ({
            role: m.role === "reed" ? "assistant" : "user",
            content: m.text,
          })),
        }
      );

      setMessages(prev => [...prev, {
        role: "reed",
        text: result.response || "···",
      }]);
    } catch (_) {
      setMessages(prev => [...prev, {
        role: "reed",
        text: "something didn't connect. try again.",
      }]);
    }
    setLoading(false);
  };

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  return (
    <div className="r-screen">
      <div className="r-header">
        <span className="r-header-label">_rdwth · reed</span>
        <span className="r-header-date">{getToday()}</span>
      </div>
      <div className="r-line" />

      {/* messages */}
      <div className="r-scroll" style={{ padding: "24px 24px 8px", display: "flex", flexDirection: "column", gap: 20 }}>
        {messages.map((msg, i) => (
          <div key={i} style={{ display: "flex", flexDirection: "column", gap: msg.role === "reed" ? 8 : 0 }}>
            {msg.role === "reed" && (
              <div className="r-reed-sig">{cycleDisplay ? `REED · ${cycleDisplay}` : "REED ·"}</div>
            )}
            <div style={{
              fontFamily: msg.role === "reed" ? "var(--r-font-ed)" : "var(--r-font-ed)",
              fontWeight: msg.role === "reed" ? 800 : 300,
              fontSize: msg.role === "reed" ? 15 : 14,
              lineHeight: 1.7,
              color: msg.role === "reed" ? "var(--r-text)" : "var(--r-dim)",
              whiteSpace: "pre-line",
              paddingLeft: msg.role === "user" ? 16 : 0,
              borderLeft: msg.role === "user" ? "1px solid var(--r-ghost)" : "none",
            }}>
              {msg.text}
            </div>
          </div>
        ))}

        {loading && (
          <div style={{ fontFamily: "var(--r-font-sys)", fontWeight: 300, fontSize: 10, color: "var(--r-ghost)", letterSpacing: "0.06em" }}>
            ···
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* input */}
      <div className="r-line" />
      <div style={{ padding: "12px 24px 8px", flexShrink: 0 }}>
        <div className="r-input-wrap">
          <textarea
            ref={textareaRef}
            className="r-textarea"
            value={input}
            onChange={e => {
              setInput(e.target.value);
              if (textareaRef.current) {
                textareaRef.current.style.height = "auto";
                textareaRef.current.style.height = textareaRef.current.scrollHeight + "px";
              }
            }}
            onKeyDown={handleKey}
            placeholder="anything"
            rows={1}
            disabled={!ready || loading}
          />
          <div
            className={`r-send-dot${input.trim() ? " active" : ""}`}
            onClick={send}
            style={{ cursor: input.trim() ? "pointer" : "default" }}
          />
        </div>
      </div>

      {/* nav */}
      <div className="r-line" />
      <div className="r-nav">
        {(["pills", "context", "reed"] as const).map(tab => (
          <span key={tab} className={`r-nav-item${tab === "reed" ? " active" : ""}`}
            onClick={() => { if (tab === "pills") navigate("/home"); if (tab === "context") navigate("/context"); }}>
            {tab}
          </span>
        ))}
        <div className="r-nav-dot" />
      </div>
    </div>
  );
}
