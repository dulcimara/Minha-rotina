import { useState, type FormEvent } from "react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { BookOpen, Pencil, Plus, Trash2 } from "lucide-react";
import { AppIcon } from "@/components/AppIcons";
import { useToast } from "@/hooks/use-toast";
import { refresh, useLivros, useUserId } from "@/hooks/use-data";
import { deleteLivro, saveLivro, type Livro, type LivroInput } from "@/lib/data";

function LivroForm({ livro, onDone }: { livro?: Livro; onDone: () => void }) {
  const { toast } = useToast();
  const userId = useUserId();
  const [nome, setNome] = useState(livro?.nome ?? "");
  const [autor, setAutor] = useState(livro?.autor ?? "");
  const [resumo, setResumo] = useState(livro?.resumo ?? "");
  const [saving, setSaving] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!nome.trim()) return;
    setSaving(true);
    const input: LivroInput = { nome, autor, resumo };
    try {
      await saveLivro(input, livro?.id);
      refresh(userId, "livros");
      toast({ title: livro ? "Livro atualizado!" : "Livro salvo!" });
      onDone();
    } catch (err) {
      toast({ title: "Não foi possível salvar", description: (err as Error).message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-3 rounded-xl bg-muted/50 p-3">
      <div className="space-y-1.5">
        <Label htmlFor="livro-nome">Nome do livro *</Label>
        <Input id="livro-nome" value={nome} onChange={(e) => setNome(e.target.value)} autoFocus />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="livro-autor">Autor (opcional)</Label>
        <Input id="livro-autor" value={autor} onChange={(e) => setAutor(e.target.value)} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="livro-resumo">Resumo (opcional)</Label>
        <Textarea id="livro-resumo" rows={4} value={resumo} onChange={(e) => setResumo(e.target.value)} />
      </div>
      <div className="flex justify-end gap-2">
        <Button type="button" variant="ghost" size="sm" onClick={onDone}>Cancelar</Button>
        <Button type="submit" size="sm" disabled={saving || !nome.trim()}>Salvar</Button>
      </div>
    </form>
  );
}

/** Cadastro de livros: nome, autor e resumo. Aberto pelo card "Livros" da tela inicial. */
export function LivrosDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const userId = useUserId();
  const { toast } = useToast();
  const { data: livros = [] } = useLivros();
  // "novo" = formulário de cadastro; um id = editando; null = só a lista
  const [editing, setEditing] = useState<Livro | "novo" | null>(null);

  const remove = async (livro: Livro) => {
    if (!window.confirm(`Excluir "${livro.nome}"?`)) return;
    try {
      await deleteLivro(livro.id);
      refresh(userId, "livros");
      toast({ title: "Livro excluído" });
    } catch (err) {
      toast({ title: "Não foi possível excluir", description: (err as Error).message, variant: "destructive" });
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { setEditing(null); onOpenChange(o); }}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogTitle className="flex items-center gap-2">
          <AppIcon name="livros" className="h-9 w-9" /> Meus livros
        </DialogTitle>
        <DialogDescription className="sr-only">Lista de livros com nome, autor e resumo</DialogDescription>

        {editing === "novo" || (editing && editing !== null) ? (
          <LivroForm livro={editing === "novo" ? undefined : editing} onDone={() => setEditing(null)} />
        ) : (
          <div className="space-y-3">
            <Button size="sm" className="w-full" onClick={() => setEditing("novo")}>
              <Plus className="h-4 w-4 mr-1" /> Novo livro
            </Button>
            {livros.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">Nenhum livro cadastrado ainda.</p>}
            <ul className="divide-y">
              {livros.map((l) => (
                <li key={l.id} className="flex items-start gap-3 py-2.5">
                  <BookOpen className="h-4 w-4 mt-1 shrink-0 text-primary" />
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold leading-tight">{l.nome}</p>
                    {l.autor && <p className="text-sm text-muted-foreground">{l.autor}</p>}
                    {l.resumo && <p className="text-sm mt-1 whitespace-pre-line">{l.resumo}</p>}
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => setEditing(l)} aria-label={`Editar ${l.nome}`}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => remove(l)} aria-label={`Excluir ${l.nome}`}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
