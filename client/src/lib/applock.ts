/**
 * Trava do app com o desbloqueio do próprio celular (Face ID, digital ou PIN da tela).
 *
 * Usa o WebAuthn do navegador: na hora de ligar, o celular cria uma "chave" guardada no
 * aparelho; para abrir o app, o celular pede o rosto/digital/PIN para usar essa chave.
 * O app nunca vê o rosto nem a digital — só recebe "deu certo" ou "não deu".
 * A trava vale por aparelho: cada celular liga a sua.
 */

export type RelockAfter = 0 | 1 | 5 | 15; // minutos fora do app até travar de novo

interface LockConfig {
  credId: string; // base64url
  relockAfter: RelockAfter;
}

const key = (userId: string) => `minha-rotina:trava:${userId}`;
const HIDDEN_AT = "minha-rotina:trava:saiu-em";

const b64url = (buf: ArrayBuffer) =>
  btoa(String.fromCharCode(...Array.from(new Uint8Array(buf))))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
const fromB64url = (s: string) => {
  const bin = atob(s.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((s.length + 3) % 4));
  return Uint8Array.from(bin, (c) => c.charCodeAt(0));
};
const challenge = () => crypto.getRandomValues(new Uint8Array(32));

/** O aparelho tem desbloqueio por rosto, digital ou PIN que o navegador pode usar? */
export async function lockSupported(): Promise<boolean> {
  try {
    return Boolean(window.PublicKeyCredential && (await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable()));
  } catch {
    return false;
  }
}

export function lockConfig(userId?: string): LockConfig | null {
  if (!userId) return null;
  try {
    const raw = localStorage.getItem(key(userId));
    return raw ? (JSON.parse(raw) as LockConfig) : null;
  } catch {
    return null;
  }
}

function saveConfig(userId: string, cfg: LockConfig | null) {
  try {
    if (cfg) localStorage.setItem(key(userId), JSON.stringify(cfg));
    else localStorage.removeItem(key(userId));
  } catch {
    /* sem armazenamento: a trava não fica salva */
  }
}

/** Liga a trava: o celular pede o rosto/digital uma vez para criar a chave. */
export async function enableLock(user: { id: string; email?: string; name?: string }, relockAfter: RelockAfter = 1) {
  const cred = (await navigator.credentials.create({
    publicKey: {
      challenge: challenge(),
      rp: { name: "Minha Rotina", id: window.location.hostname },
      user: { id: new TextEncoder().encode(user.id), name: user.email ?? user.id, displayName: user.name ?? "Minha Rotina" },
      pubKeyCredParams: [
        { type: "public-key", alg: -7 },
        { type: "public-key", alg: -257 },
      ],
      authenticatorSelection: { authenticatorAttachment: "platform", userVerification: "required", residentKey: "discouraged" },
      timeout: 60_000,
      attestation: "none",
    },
  })) as PublicKeyCredential | null;
  if (!cred) throw new Error("O celular não criou a chave de desbloqueio.");
  saveConfig(user.id, { credId: b64url(cred.rawId), relockAfter });
}

export function disableLock(userId: string) {
  saveConfig(userId, null);
}

export function setRelockAfter(userId: string, relockAfter: RelockAfter) {
  const cfg = lockConfig(userId);
  if (cfg) saveConfig(userId, { ...cfg, relockAfter });
}

/** Pede o rosto/digital/PIN. Resolve true se a pessoa foi confirmada. */
export async function unlock(userId: string): Promise<boolean> {
  const cfg = lockConfig(userId);
  if (!cfg) return true;
  const res = await navigator.credentials.get({
    publicKey: {
      challenge: challenge(),
      rpId: window.location.hostname,
      allowCredentials: [{ type: "public-key", id: fromB64url(cfg.credId) }],
      userVerification: "required",
      timeout: 60_000,
    },
  });
  return Boolean(res);
}

/** Guarda a hora em que a pessoa saiu do app (para travar de novo depois de X minutos). */
export function markHidden() {
  try {
    sessionStorage.setItem(HIDDEN_AT, String(Date.now()));
  } catch {
    /* ignora */
  }
}

export function shouldRelock(userId: string): boolean {
  const cfg = lockConfig(userId);
  if (!cfg) return false;
  try {
    const at = Number(sessionStorage.getItem(HIDDEN_AT));
    if (!at) return false;
    return Date.now() - at >= cfg.relockAfter * 60_000;
  } catch {
    return true;
  }
}
