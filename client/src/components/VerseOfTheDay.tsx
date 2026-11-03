import { useQuery } from "@tanstack/react-query";
import { BookOpen } from "lucide-react";
import { cachedVerse, verseOfTheDay } from "@/lib/verse";

/** Versículo do dia no topo do app. Some sozinho se não conseguir buscar. */
export function VerseOfTheDay() {
  const { data: verse } = useQuery({
    queryKey: ["verse", new Date().toDateString()],
    queryFn: verseOfTheDay,
    initialData: cachedVerse() ?? undefined,
    staleTime: Infinity,
    retry: 1,
  });
  if (!verse) return null;
  return (
    <figure className="mb-4 flex gap-2.5 rounded-2xl border border-card-border bg-card/70 px-3.5 py-2.5" data-testid="verse-of-the-day">
      <BookOpen className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
      <div className="min-w-0">
        <blockquote className="font-display text-[15px] italic leading-snug text-foreground/90">“{verse.text}”</blockquote>
        <figcaption className="mt-1 text-[11px] font-medium text-primary">{verse.ref}</figcaption>
      </div>
    </figure>
  );
}
