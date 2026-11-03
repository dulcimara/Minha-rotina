import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Home from "@/pages/Home";
import Login from "@/pages/Login";
import Privacy from "@/pages/Privacy";
import NotFound from "@/pages/not-found";
import { AuthProvider, useAuth } from "@/hooks/use-auth";
import { supabaseConfigured } from "@/lib/supabase";
import { useEffect } from "react";
import { readSettings } from "@/lib/settings";
import { applyPalette } from "@/lib/palettes";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route component={NotFound} />
    </Switch>
  );
}

function Gate() {
  const { session, loading, user } = useAuth();
  const palette = readSettings(user).palette;
  // Ao entrar (ou trocar nas configurações), aplica a paleta salva na conta.
  useEffect(() => {
    if (user) applyPalette(palette);
  }, [user, palette]);

  if (!supabaseConfigured) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 text-center">
        <p className="max-w-sm text-muted-foreground">
          O app ainda não está ligado ao Supabase. Configure as variáveis
          VITE_SUPABASE_URL e VITE_SUPABASE_KEY.
        </p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-muted-foreground">
        Carregando...
      </div>
    );
  }

  return session ? <Router /> : <Login />;
}

function App() {
  // A política de privacidade abre para qualquer pessoa, mesmo sem entrar.
  if (window.location.pathname.startsWith("/privacidade")) {
    return (
      <TooltipProvider>
        <Privacy />
      </TooltipProvider>
    );
  }
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <AuthProvider>
          <Gate />
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
