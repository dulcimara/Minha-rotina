import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { unlockAudio } from "@/lib/alarm-sound";
import { unlockSpeech } from "@/lib/speech";
import { applyPalette, cachedPalette } from "@/lib/palettes";
// Começa a escutar o convite de instalação do navegador o quanto antes.
import "@/lib/install";

// Abre já com as cores escolhidas (a escolha também fica salva na conta).
applyPalette(cachedPalette());

// O navegador só deixa tocar som e falar depois do primeiro toque na tela.
const unlock = () => {
  unlockAudio();
  unlockSpeech();
};
// O iPhone só aceita liberar som e voz quando o dedo SOLTA a tela (touchend/click).
for (const ev of ["pointerdown", "touchend", "click", "keydown"]) {
  window.addEventListener(ev, unlock, { passive: true, capture: true });
}

// Service worker: permite instalar o app e mostrar notificações.
if ("serviceWorker" in navigator && import.meta.env.PROD) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch(() => {});
  });
}

createRoot(document.getElementById("root")!).render(<App />);
