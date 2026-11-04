import { Component, type ErrorInfo, type ReactNode } from "react";

/**
 * Se alguma tela quebrar, mostra uma mensagem amigável em vez da tela branca.
 * Os dados da pessoa não são afetados: ficam no banco.
 */
export class ErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("Erro na tela:", error, info.componentStack);
  }

  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <div className="min-h-screen bg-hero flex items-center justify-center px-6">
        <div className="w-full max-w-sm rounded-3xl bg-card p-6 text-center shadow-lg space-y-4">
          <img src="/icon-192.png" alt="" className="mx-auto h-16 w-16" />
          <h1 className="font-brand text-2xl text-foreground">Ops, algo deu errado</h1>
          <p className="text-sm text-muted-foreground">
            Seus dados estão guardados e não foram perdidos. Tente abrir de novo; se continuar, feche e abra o app.
          </p>
          <button
            type="button"
            onClick={() => window.location.replace("/")}
            className="w-full rounded-xl bg-primary px-4 py-3 font-medium text-primary-foreground"
          >
            Abrir de novo
          </button>
        </div>
      </div>
    );
  }
}
