"use client";

import { use, useEffect, useState, useCallback, useRef } from "react";
import { Header } from "@/components/header";
import { cn } from "@/lib/utils";
import { Trophy, Medal, Award, Clock, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/luxe/spinner";
import { FaixaPretaLogo } from "@/components/icon/faixa-preta-logo";

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

type Tournament = {
  id: string;
  name: string;
  createdAt: string;
};

function formatPrintDate(date: Date): string {
  const day = date.toLocaleDateString("pt-BR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const time = date.toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  return `${day} às ${time}`;
}

export default function ResultsPage({
  params,
}: {
  params: Promise<{ tournamentId: string }>;
}) {
  const { tournamentId } = use(params);

  const [results, setResults] = useState<CategoryResult[]>([]);
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [loading, setLoading] = useState(true);

  // DOM ref for print timestamp — synchronous, no React re-render timing issue
  const footerDateRef = useRef<HTMLSpanElement>(null);

  const fetchResults = useCallback(async () => {
    try {
      const r = await fetch(`/api/tournaments/${tournamentId}/results`);
      const data = await r.json();
      setResults(data);
    } catch {
      // silently fail on refresh
    } finally {
      setLoading(false);
    }
  }, [tournamentId]);

  useEffect(() => {
    fetchResults();
  }, [fetchResults]);

  // Auto-refresh every 60s
  useEffect(() => {
    const interval = setInterval(() => fetchResults(), 60_000);
    return () => clearInterval(interval);
  }, [fetchResults]);

  // Fetch tournament name
  useEffect(() => {
    fetch(`/api/tournaments/${tournamentId}`)
      .then((r) => r.json())
      .then(setTournament)
      .catch(() => {});
  }, [tournamentId]);

  // Set print timestamp directly in DOM before print dialog opens
  useEffect(() => {
    const onBefore = () => {
      if (footerDateRef.current) {
        footerDateRef.current.textContent = formatPrintDate(new Date());
      }
    };
    window.addEventListener("beforeprint", onBefore);
    return () => window.removeEventListener("beforeprint", onBefore);
  }, []);

  const handlePrint = () => {
    if (footerDateRef.current) {
      footerDateRef.current.textContent = formatPrintDate(new Date());
    }
    setTimeout(() => window.print(), 50);
  };

  const kataResults = results.filter((r) => r.modality === "KATA");
  const kumiteResults = results.filter((r) => r.modality === "KUMITE");

  return (
    <>
      {/* @page rule — A4 portrait, margins controlled here */}
      <style>{`
        @media print {
          @page { size: A4 portrait; margin: 14mm 10mm; }
        }
      `}</style>

      {/* ── Print header — fixed, repeats on every page ── */}
      <div
        className="hidden print:block fixed top-0 left-0 right-0 z-50"
        style={{
          backgroundColor: "white",
          WebkitPrintColorAdjust: "exact",
          printColorAdjust: "exact",
        }}
      >
        <div className="flex items-center justify-between px-6 pt-3 pb-2">
          <div>
            <p
              className="text-[8px] uppercase tracking-[0.2em] font-semibold"
              style={{ color: "#9ca3af" }}
            >
              Relatório Oficial de Resultados
            </p>
            <p
              className="text-sm font-bold leading-snug mt-0.5"
              style={{ color: "#111827" }}
            >
              {tournament?.name ?? "Campeonato"}
            </p>
          </div>
          <FaixaPretaLogo className="h-[10px] w-auto text-gray-700" />
        </div>
        <div style={{ borderTop: "1px solid #e5e7eb", margin: "0 1.5rem" }} />
      </div>

      {/* ── Print footer — fixed, repeats on every page ── */}
      <div
        className="hidden print:block fixed bottom-0 left-0 right-0 z-50"
        style={{
          backgroundColor: "white",
          WebkitPrintColorAdjust: "exact",
          printColorAdjust: "exact",
        }}
      >
        <div style={{ borderTop: "1px solid #e5e7eb", margin: "0 1.5rem" }} />
        <div
          className="flex items-center justify-between px-6 py-1.5"
          style={{ fontSize: "8px", color: "#9ca3af" }}
        >
          <span>
            Impresso em <span ref={footerDateRef} />
          </span>
          <span>karate.app.br</span>
        </div>
      </div>

      {/* ── Page ── */}
      <div className="min-h-screen flex flex-col">
        <div className="print:hidden">
          <Header currentTournamentId={tournamentId} />
        </div>

        <main className="flex-1 print:py-4">
          {/* print:pt-[72px] clears the fixed header; print:pb-[40px] clears the footer */}
          <div className="container mx-auto p-6 print:px-6 print:pt-[72px] print:pb-[40px]">
            {/* Screen header — hidden in print (print header replaces it) */}
            <div className="mb-8 flex items-start justify-between gap-4 print:hidden">
              <div>
                <h1 className="text-3xl font-bold">Resultados</h1>
                <p className="text-sm text-muted-foreground mt-1">
                  Classificação final por categoria
                </p>
              </div>

              <div className="flex items-center gap-2">
                {!loading && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handlePrint}
                    className="gap-1.5"
                  >
                    <Printer className="size-3.5" />
                    Imprimir
                  </Button>
                )}
              </div>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-24 gap-3 text-muted-foreground">
                <Spinner />
              </div>
            ) : results.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-24 gap-3 text-muted-foreground">
                <Trophy className="size-12 opacity-20" />
                <p className="text-lg font-medium">
                  Nenhuma categoria encontrada
                </p>
                <p className="text-sm">
                  Gere as chaves para ver os resultados.
                </p>
              </div>
            ) : (
              <div className="space-y-10 print:space-y-6">
                {kumiteResults.length > 0 && (
                  <ResultsSection title="Kumite" results={kumiteResults} />
                )}
                {kataResults.length > 0 && (
                  <ResultsSection title="Kata" results={kataResults} />
                )}
              </div>
            )}
          </div>
        </main>
      </div>
    </>
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
        <h2 className="text-lg font-semibold tracking-tight print:text-sm print:font-bold print:uppercase print:tracking-widest print:text-gray-500">
          {title}
        </h2>
        <div className="flex items-center gap-2 print:hidden">
          <span className="text-sm text-muted-foreground">
            {results.length} {results.length === 1 ? "categoria" : "categorias"}
          </span>
          {completed > 0 && (
            <Badge
              variant="outline"
              className="text-[10px] h-5 border-green-500/40 bg-green-500/10 text-green-600 dark:text-green-400"
            >
              {completed} concluída{completed > 1 ? "s" : ""}
            </Badge>
          )}
          {inProgress > 0 && (
            <Badge
              variant="outline"
              className="text-[10px] h-5 border-blue-500/40 bg-blue-500/10 text-blue-600 dark:text-blue-400"
            >
              {inProgress} em andamento
            </Badge>
          )}
        </div>
        <div className="flex-1 h-px bg-border" />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 print:grid-cols-3 print:gap-2">
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
    <div className="rounded-xl border bg-card shadow-sm overflow-hidden print:break-inside-avoid print:shadow-none print:rounded-md print:border-gray-200">
      {/* Card header */}
      <div
        className="flex items-center justify-between gap-2 px-3 py-2 border-b bg-muted/30 print:bg-transparent"
        style={
          {
            WebkitPrintColorAdjust: "exact",
            printColorAdjust: "exact",
          } as React.CSSProperties
        }
      >
        <span className="font-mono font-bold text-xs leading-tight print:text-[10px]">
          {result.category}
        </span>
        <StatusDot status={status} />
      </div>

      {/* Podium */}
      <div className="divide-y divide-border print:divide-gray-100">
        {hasAnyResult ? (
          <>
            {podium.first && <PodiumRow place={1} competitor={podium.first} />}
            {podium.second && (
              <PodiumRow place={2} competitor={podium.second} />
            )}
            {podium.third && <PodiumRow place={3} competitor={podium.third} />}
            {podium.fourth && (
              <PodiumRow place={4} competitor={podium.fourth} />
            )}
          </>
        ) : (
          <div className="px-3 py-3 flex items-center gap-2 text-muted-foreground">
            {status === "NOT_STARTED" ? (
              <>
                <Clock className="size-3 shrink-0 opacity-40" />
                <span className="text-xs print:text-[9px]">Não iniciado</span>
              </>
            ) : (
              <>
                <Trophy className="size-3 shrink-0 opacity-25" />
                <span className="text-xs print:text-[9px]">Sem resultados</span>
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
    iconClass: "text-yellow-500 print:text-yellow-600",
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
    iconClass: "text-muted-foreground/40 print:text-gray-400",
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
    <div
      className={cn("flex items-center gap-2 px-3 py-2 print:py-1.5", rowClass)}
    >
      <div className={cn("flex items-center gap-1 w-7 shrink-0", iconClass)}>
        {Icon ? (
          <Icon className="size-3 shrink-0" />
        ) : (
          <span className="size-3 shrink-0" />
        )}
        <span className="text-[10px] font-bold tabular-nums">{label}</span>
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-xs leading-tight truncate print:text-[10px]">
          {competitor.name}
        </p>
        <p className="text-[10px] text-muted-foreground truncate mt-0.5 print:text-[9px] print:text-gray-400">
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
