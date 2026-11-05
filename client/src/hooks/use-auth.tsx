import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";

interface AuthContextValue {
  session: Session | null;
  user: User | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((event, newSession) => {
      // Link de "Esqueci minha senha" que caiu na página inicial (ex.: endereço de volta
      // não liberado no Supabase): leva para a tela de nova senha mesmo assim.
      if (event === "PASSWORD_RECOVERY" && !window.location.pathname.startsWith("/nova-senha")) {
        window.location.replace("/nova-senha");
        return;
      }
      setSession(newSession);
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  const value: AuthContextValue = {
    session,
    user: session?.user ?? null,
    loading,
    signOut: async () => {
      await supabase.auth.signOut();
    },
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/** Como chamar a pessoa nos avisos: o apelido escolhido ou, se não houver, o primeiro nome. */
export function displayName(user: User | null | undefined): string | undefined {
  const meta = (user?.user_metadata ?? {}) as { name?: string; nickname?: string };
  const nick = meta.nickname?.trim();
  if (nick) return nick;
  return meta.name?.trim().split(/\s+/)[0] || undefined;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth precisa estar dentro de <AuthProvider>");
  return ctx;
}
