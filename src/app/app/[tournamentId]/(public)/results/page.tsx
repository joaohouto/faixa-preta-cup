"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Header } from "@/components/header";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { Trophy, Medal, Award, Clock, Loader2 } from "lucide-react";

type Competitor = {
  id: string;
  name: string;
  school: string;
};

type CategoryResult = {
  bracketId: string;
  category: string;
  modality: "KATA" | "KUMITE";
  status: "NOT_STARTED" | "IN_PROGRESS" | "COMPLETED";
  podium: {
    first: Competitor | null;
    second: Competitor | null;
    third: Competitor | null;
  };
};

export default function ResultsPage({
  params,
}: {
  params: Promise<{ tournamentId: string }>;
}) {
  const routeParams = useParams();
  const tournamentId = routeParams?.tournamentId as string | undefined;

  const [results, setResults] = useState<CategoryResult[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!tournamentId) return;
    fetch(`/api/tournaments/${tournamentId}/results`)
      .then((r) => r.json())
      .then(setResults)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [tournamentId]);

  const kataResults = results.filter((r) => r.modality === "KATA");
  const kumiteResults = results.filter((r) => r.modality === "KUMITE");

  return (
    <div className="min-h-screen flex flex-col">
      <Header currentTournamentId={tournamentId} />

      <main className="flex-1">
        <div className="container mx-auto p-6">
          {/* Header */}
          <div className="mb-6 print:mb-4">
            <h1 className="text-3xl font-bold mb-2 print:text-2xl">
              Resultados
            </h1>
            <p className="text-muted-foreground print:hidden">
              Classificação final por categoria
            </p>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-24 gap-3 text-muted-foreground">
              <Loader2 className="size-5 animate-spin" />
              <span>Carregando resultados...</span>
            </div>
          ) : results.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 gap-3 text-muted-foreground">
              <Trophy className="size-12 opacity-20" />
              <p className="text-lg font-medium">
                Nenhuma categoria encontrada
              </p>
              <p className="text-sm">Gere as chaves para ver os resultados.</p>
            </div>
          ) : (
            <>
              <Tabs defaultValue="kumite" className="w-full">
                <TabsList className="grid w-full grid-cols-2 max-w-md mb-6 print:hidden">
                  <TabsTrigger value="kata">
                    Kata ({kataResults.length})
                  </TabsTrigger>
                  <TabsTrigger value="kumite">
                    Kumite ({kumiteResults.length})
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="kumite" className="print:block">
                  <ResultsGrid results={kumiteResults} />
                </TabsContent>

                <TabsContent value="kata" className="print:block">
                  {/* Print-only section title */}
                  <div className="hidden print:block mb-4 mt-8 border-t pt-6">
                    <h2 className="text-base font-semibold uppercase tracking-widest text-muted-foreground">
                      Kata
                    </h2>
                  </div>
                  <ResultsGrid results={kataResults} />
                </TabsContent>
              </Tabs>
            </>
          )}
        </div>
      </main>
    </div>
  );
}

function ResultsGrid({ results }: { results: CategoryResult[] }) {
  if (results.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-3 text-muted-foreground">
        <Trophy className="size-10 opacity-20" />
        <p className="text-base font-medium">
          Nenhuma categoria nesta modalidade
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 print:grid-cols-1 print:gap-3">
      {results.map((result) => (
        <CategoryResultCard key={result.bracketId} result={result} />
      ))}
    </div>
  );
}

function CategoryResultCard({ result }: { result: CategoryResult }) {
  const hasAnyResult =
    result.podium.first || result.podium.second || result.podium.third;

  return (
    <div className="rounded-xl border bg-card shadow-sm overflow-hidden print:break-inside-avoid print:shadow-none">
      {/* Card header */}
      <div className="flex items-center justify-between gap-2 px-4 py-3 border-b bg-muted/30 print:bg-transparent">
        <span className="font-mono font-semibold text-sm">
          {result.category}
        </span>
        {/* <StatusDot status={result.status} /> */}
      </div>

      {/* Podium */}
      <div className="divide-y">
        {hasAnyResult ? (
          <>
            {result.podium.first && (
              <PodiumRow place={1} competitor={result.podium.first} />
            )}
            {result.podium.second && (
              <PodiumRow place={2} competitor={result.podium.second} />
            )}
            {result.podium.third && (
              <PodiumRow place={3} competitor={result.podium.third} />
            )}
            {result.status === "IN_PROGRESS" && (
              <div className="px-4 py-2 flex items-center gap-1.5 text-xs text-muted-foreground/60 print:hidden">
                <Clock className="size-3 shrink-0" />
                Parcial
              </div>
            )}
          </>
        ) : (
          <div className="px-4 py-5 flex items-center gap-2.5 text-muted-foreground">
            {result.status === "NOT_STARTED" ? (
              <>
                <Clock className="size-3.5 shrink-0 opacity-40" />
                <span className="text-xs">Não iniciado</span>
              </>
            ) : (
              <>
                <Trophy className="size-3.5 shrink-0 opacity-25" />
                <span className="text-xs">Sem resultados</span>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

const placeConfig = {
  1: {
    icon: Trophy,
    label: "1º",
    iconClass: "text-yellow-500",
    rowClass: "bg-yellow-500/5 print:bg-transparent",
  },
  2: {
    icon: Medal,
    label: "2º",
    iconClass: "text-slate-400 dark:text-slate-500",
    rowClass: "",
  },
  3: {
    icon: Award,
    label: "3º",
    iconClass: "text-amber-700/80",
    rowClass: "",
  },
} as const;

function PodiumRow({
  place,
  competitor,
}: {
  place: 1 | 2 | 3;
  competitor: Competitor;
}) {
  const { icon: Icon, label, iconClass, rowClass } = placeConfig[place];

  return (
    <div className={cn("flex items-center gap-3 px-4 py-2.5", rowClass)}>
      <div className={cn("flex items-center gap-1 w-8 shrink-0", iconClass)}>
        <Icon className="size-3.5" />
        <span className="text-xs font-bold tabular-nums">{label}</span>
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-sm leading-tight truncate">
          {competitor.name}
        </p>
        <p className="text-xs text-muted-foreground truncate mt-0.5">
          {competitor.school}
        </p>
      </div>
    </div>
  );
}

/** Minimal status indicator — just a small dot with muted text */
function StatusDot({ status }: { status: CategoryResult["status"] }) {
  if (status === "NOT_STARTED") return null;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 text-[10px] font-medium text-muted-foreground/60 shrink-0 print:hidden",
      )}
    >
      <span
        className={cn(
          "size-1.5 rounded-full",
          status === "IN_PROGRESS" && "bg-blue-400",
          status === "COMPLETED" && "bg-green-500",
        )}
      />
      {status === "IN_PROGRESS" ? "andamento" : "concluído"}
    </span>
  );
}
