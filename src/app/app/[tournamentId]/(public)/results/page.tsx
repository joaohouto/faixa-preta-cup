"use client";

import { use, useEffect, useState, useCallback } from "react";
import { Header } from "@/components/header";
import { cn } from "@/lib/utils";
import { Trophy, Medal, Award, Clock, Loader2, Printer, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

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
    fourth: Competitor | null;
  };
};

function formatTime(date: Date): string {
  return date.toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

export default function ResultsPage({
  params,
}: {
  params: Promise<{ tournamentId: string }>;
}) {
  const { tournamentId } = use(params);

  const [results, setResults] = useState<CategoryResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastFetchAt, setLastFetchAt] = useState<Date | null>(null);

  const fetchResults = useCallback(
    async (isManual = false) => {
      if (isManual) setRefreshing(true);
      try {
        const r = await fetch(`/api/tournaments/${tournamentId}/results`);
        const data = await r.json();
        setResults(data);
        setLastFetchAt(new Date());
      } catch {
        // silently fail on refresh
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [tournamentId],
  );

  useEffect(() => {
    fetchResults();
  }, [fetchResults]);

  // Auto-refresh every 60s
  useEffect(() => {
    const interval = setInterval(() => fetchResults(), 60_000);
    return () => clearInterval(interval);
  }, [fetchResults]);

  const kataResults = results.filter((r) => r.modality === "KATA");
  const kumiteResults = results.filter((r) => r.modality === "KUMITE");

  return (
    <div className="min-h-screen flex flex-col">
      <Header currentTournamentId={tournamentId} />

      <main className="flex-1">
        <div className="container mx-auto p-6 print:p-4">
          {/* Page header */}
          <div className="mb-8 flex items-start justify-between gap-4 print:mb-6">
            <div>
              <h1 className="text-3xl font-bold print:text-2xl">Resultados</h1>
              <p className="text-sm text-muted-foreground mt-1 print:hidden">
                Classificação final por categoria
              </p>
            </div>

            <div className="flex items-center gap-2 print:hidden">
              {/* Last updated */}
              {lastFetchAt && (
                <span className="text-xs text-muted-foreground flex items-center gap-1.5">
                  <RefreshCw
                    className={cn("size-3", refreshing && "animate-spin")}
                  />
                  Atualizado às {formatTime(lastFetchAt)}
                </span>
              )}

              <Button
                variant="outline"
                size="sm"
                onClick={() => fetchResults(true)}
                disabled={refreshing}
                className="gap-1.5"
              >
                <RefreshCw className={cn("size-3.5", refreshing && "animate-spin")} />
                Atualizar
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={() => window.print()}
                className="gap-1.5"
              >
                <Printer className="size-3.5" />
                Imprimir
              </Button>
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-24 gap-3 text-muted-foreground">
              <Loader2 className="size-5 animate-spin" />
              <span>Carregando resultados...</span>
            </div>
          ) : results.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 gap-3 text-muted-foreground">
              <Trophy className="size-12 opacity-20" />
              <p className="text-lg font-medium">Nenhuma categoria encontrada</p>
              <p className="text-sm">Gere as chaves para ver os resultados.</p>
            </div>
          ) : (
            <div className="space-y-10 print:space-y-8">
              {kumiteResults.length > 0 && (
                <ResultsSection
                  title="Kumite"
                  results={kumiteResults}
                />
              )}
              {kataResults.length > 0 && (
                <ResultsSection
                  title="Kata"
                  results={kataResults}
                />
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

function ResultsSection({
  title,
  results,
}: {
  title: string;
  results: CategoryResult[];
}) {
  const completed = results.filter((r) => r.status === "COMPLETED").length;
  const inProgress = results.filter((r) => r.status === "IN_PROGRESS").length;

  return (
    <section className="print:break-before-avoid">
      {/* Section header */}
      <div className="flex items-center gap-3 mb-4 print:mb-3">
        <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">
            {results.length} {results.length === 1 ? "categoria" : "categorias"}
          </span>
          {completed > 0 && (
            <Badge
              variant="outline"
              className="text-[10px] h-5 border-green-500/40 bg-green-500/10 text-green-600 dark:text-green-400 print:hidden"
            >
              {completed} concluída{completed > 1 ? "s" : ""}
            </Badge>
          )}
          {inProgress > 0 && (
            <Badge
              variant="outline"
              className="text-[10px] h-5 border-blue-500/40 bg-blue-500/10 text-blue-600 dark:text-blue-400 print:hidden"
            >
              {inProgress} em andamento
            </Badge>
          )}
        </div>
        <div className="flex-1 h-px bg-border" />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 print:grid-cols-2 print:gap-2">
        {results.map((result) => (
          <CategoryResultCard key={result.bracketId} result={result} />
        ))}
      </div>
    </section>
  );
}

function CategoryResultCard({ result }: { result: CategoryResult }) {
  const { podium, status } = result;
  const hasAnyResult = podium.first || podium.second || podium.third;

  return (
    <div className="rounded-xl border bg-card shadow-sm overflow-hidden print:break-inside-avoid print:shadow-none print:rounded-lg">
      {/* Card header */}
      <div className="flex items-center justify-between gap-2 px-4 py-2.5 border-b bg-muted/30 print:bg-transparent">
        <span className="font-mono font-semibold text-sm leading-tight">
          {result.category}
        </span>
        <StatusDot status={status} />
      </div>

      {/* Podium */}
      <div className="divide-y">
        {hasAnyResult ? (
          <>
            {podium.first && <PodiumRow place={1} competitor={podium.first} />}
            {podium.second && <PodiumRow place={2} competitor={podium.second} />}
            {podium.third && <PodiumRow place={3} competitor={podium.third} />}
            {podium.fourth && <PodiumRow place={4} competitor={podium.fourth} />}
          </>
        ) : (
          <div className="px-4 py-4 flex items-center gap-2 text-muted-foreground">
            {status === "NOT_STARTED" ? (
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
    iconClass: "text-amber-700/70",
    rowClass: "",
  },
  4: {
    icon: null,
    label: "4º",
    iconClass: "text-muted-foreground/40",
    rowClass: "",
  },
} as const;

function PodiumRow({
  place,
  competitor,
}: {
  place: 1 | 2 | 3 | 4;
  competitor: Competitor;
}) {
  const { icon: Icon, label, iconClass, rowClass } = placeConfig[place];

  return (
    <div className={cn("flex items-center gap-3 px-4 py-2.5", rowClass)}>
      <div className={cn("flex items-center gap-1 w-8 shrink-0", iconClass)}>
        {Icon ? (
          <Icon className="size-3.5 shrink-0" />
        ) : (
          <span className="size-3.5 shrink-0" />
        )}
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

function StatusDot({ status }: { status: CategoryResult["status"] }) {
  if (status === "NOT_STARTED") return null;

  return (
    <span className="inline-flex items-center gap-1 text-[10px] font-medium text-muted-foreground/60 shrink-0 print:hidden">
      <span
        className={cn(
          "size-1.5 rounded-full",
          status === "IN_PROGRESS" && "bg-blue-400 animate-pulse",
          status === "COMPLETED" && "bg-green-500",
        )}
      />
      {status === "IN_PROGRESS" ? "andamento" : "concluído"}
    </span>
  );
}
