import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { unlockAudio } from "@/lib/alarm-sound";

// O navegador só deixa tocar som depois do primeiro toque na tela.
const unlock = () => unlockAudio();
window.addEventListener("pointerdown", unlock, { passive: true });
window.addEventListener("keydown", unlock);

// Service worker: permite instalar o app e mostrar notificações.
if ("serviceWorker" in navigator && import.meta.env.PROD) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch(() => {});
  });
}

createRoot(document.getElementById("root")!).render(<App />);
