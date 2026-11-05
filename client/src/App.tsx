import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Home from "@/pages/Home";
import Login from "@/pages/Login";
import { AppLock } from "@/components/AppLock";
import Privacy from "@/pages/Privacy";
import NewPassword from "@/pages/NewPassword";
import CompleteSignup from "@/pages/CompleteSignup";
import { needsSignupCompletion } from "@/lib/google-login";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import NotFound from "@/pages/not-found";
import { AuthProvider, useAuth } from "@/hooks/use-auth";
import { supabaseConfigured } from "@/lib/supabase";
import { lazy, Suspense, useEffect } from "react";
import { readSettings } from "@/lib/settings";
import { applyPalette } from "@/lib/palettes";
import { startAnalytics } from "@/lib/analytics";
import { recordActiveDay } from "@/lib/admin";

// A área de gestão só é baixada por quem abre /admin
const Admin = lazy(() => import("@/pages/Admin"));

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/admin">
        <Suspense fallback={<p className="p-10 text-center text-muted-foreground">Carregando...</p>}>
          <Admin />
        </Suspense>
      </Route>
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
  // Estatísticas: o dia de uso (nosso banco) e o Google Analytics só com consentimento
  const analyticsConsent = readSettings(user).analytics;
  useEffect(() => {
    if (!user) return;
    void recordActiveDay(user.id);
    startAnalytics(analyticsConsent);
  }, [user, analyticsConsent]);

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

  if (!session) return <Login />;
  // Primeira entrada pelo Google: falta aceitar a política e informar o nascimento.
  if (needsSignupCompletion(user?.user_metadata)) return <CompleteSignup />;
  return (
    <AppLock>
      <Router />
    </AppLock>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <AppContent />
    </ErrorBoundary>
  );
}

function AppContent() {
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
          {/* Link do e-mail "Esqueci minha senha": fora da trava e da tela inicial */}
          {window.location.pathname.startsWith("/nova-senha") ? <NewPassword /> : <Gate />}
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
