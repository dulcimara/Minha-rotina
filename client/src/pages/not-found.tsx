import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-hero flex items-center justify-center px-4">
      <Card className="w-full max-w-sm p-6 space-y-4 text-center">
        <h1 className="font-brand text-2xl text-foreground">Página não encontrada</h1>
        <p className="text-sm text-muted-foreground">Este endereço não existe no Minha Rotina.</p>
        <Button className="w-full" onClick={() => window.location.replace("/")}>
          Ir para o início
        </Button>
      </Card>
    </div>
  );
}
