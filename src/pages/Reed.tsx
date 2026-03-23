// src/pages/Reed.tsx
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { getToday } from "@/lib/api";

interface Message {
  role: "reed" | "user";
  text: string;
}

interface PillEco {
  pill_id: string;
  eco_text: string;
}

const SYSTEM_PROMPT = `You are Reed. You read structure — patterns in how a person encounters decisions, relationships, transitions, and internal conflict.

Your role is to help the person see more clearly what they are experiencing. Not to analyze, not to teach, not to fix.

VOICE
- Clear, calm, slightly warm
- Reflective, not analytical  
- Never diagnostic, never superior
- Never prescriptive

LANGUAGE
- Always respond in the same language the user wrote in
- Use simple, everyday language
- Write in natural, connected sentences
- No bullet points. No numbered lists. No headers.
- Maximum 2–3 short paragraphs per response

RELATIONAL DISCIPLINE
- Do not interpret more than the user offered
- Do not offer reassurance or close a tension prematurely
- When the user asks a question about their own character, stay with what they said
- Do not end with a question unless you genuinely need clarification
- Silence or a precise observation is preferable to a forced question`;

export default function Reed() {
  const navigate = useNavigate();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [cycleDisplay, setCycleDisplay] = useState("");
  const [ecos, setEcos] = useState<PillEco[]>([]);
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

      // Ciclo mais recente
      const { data: cycle } = await supabase
        .from("ipe_cycles")
        .select("id, cycle_number, started_at")
        .eq("user_id", session.user.id)
        .order("cycle_number", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (cycle) {
        const d = new Date(cycle.started_at);
        const code = String(d.getMonth() + 1).padStart(2, "0") + String(d.getDate()).padStart(2, "0");
        setCycleDisplay(String(cycle.cycle_number).padStart(2, "0") + " · " + code);

        // Carregar ecos para contexto
        const { data: ecoData } = await supabase
          .from("pill_responses")
          .select("pill_id, eco_text")
          .eq("ipe_cycle_id", cycle.id)
          .not("eco_text", "is", null);

        if (ecoData) setEcos(ecoData);
      }

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

  const buildContext = () => {
    if (ecos.length === 0) return "";
    return "\n\nContext from the user's completed pills:\n" +
      ecos.map(e => `[${e.pill_id}] ${e.eco_text}`).join("\n\n");
  };

  const send = async () => {
    const text = input.trim();
    if (!text || loading) return;

    const userMsg: Message = { role: "user", text };
    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);
    setInput("");
    if (textareaRef.current) textareaRef.current.style.height = "auto";
    setLoading(true);

    try {
      const history = updatedMessages.map(m => ({
        role: m.role === "reed" ? "assistant" : "user",
        content: m.text,
      }));

      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 512,
          system: SYSTEM_PROMPT + buildContext(),
          messages: history,
        }),
      });

      const data = await response.json();
      const replyText = data.content?.[0]?.text || "···";

      setMessages(prev => [...prev, { role: "reed", text: replyText }]);
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

      <div className="r-scroll" style={{ padding: "24px 24px 8px", display: "flex", flexDirection: "column", gap: 20 }}>
        {messages.map((msg, i) => (
          <div key={i} style={{ display: "flex", flexDirection: "column", gap: msg.role === "reed" ? 8 : 0 }}>
            {msg.role === "reed" && (
              <div className="r-reed-sig">
                {cycleDisplay ? `REED · ${cycleDisplay}` : "REED ·"}
              </div>
            )}
            <div style={{
              fontFamily: "var(--r-font-ed)",
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

      <div className="r-line" />
      <div className="r-nav">
        {(["pills", "context", "reed"] as const).map(tab => (
          <span key={tab} className={`r-nav-item${tab === "reed" ? " active" : ""}`}
            onClick={() => {
              if (tab === "pills") navigate("/home");
              if (tab === "context") navigate("/context");
            }}>
            {tab}
          </span>
        ))}
        <div className="r-nav-dot" />
      </div>
    </div>
  );
}
