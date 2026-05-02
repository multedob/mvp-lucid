import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import { initAnalytics } from "./lib/analytics";
import "./index.css";

initAnalytics();

// Service worker — só em produção (evita conflito com Vite HMR em dev)
if (import.meta.env.PROD && "serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch((err) => console.warn("[sw] registro falhou:", err));
  });
}

createRoot(document.getElementById("root")!).render(<App />);
