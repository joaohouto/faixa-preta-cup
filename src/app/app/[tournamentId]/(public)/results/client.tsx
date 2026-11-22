"use client";

import { use, useEffect, useState, useCallback, useRef } from "react";
import { Header } from "@/components/header";
import { cn } from "@/lib/utils";
import { Trophy, Clock, Printer, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FaixaPretaLogo } from "@/components/icon/faixa-preta-logo";
import { beltLabels } from "@/lib/constants/labels";
import type { Belt } from "@prisma/client";
import { useEscBack } from "@/hooks/use-esc-back";
import { usePageTitle } from "@/hooks/use-page-title";
import { fetchJson } from "@/lib/api-client";
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle, EmptyDescription } from "@/components/ui/empty";
import { bracketStatusBadgeClass, bracketStatusDotClass } from "@/lib/utils/bracket-status";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type Competitor = {
  id: string;
  name: string;
  school: string;
  belt?: Belt;
  weight?: number | null;
  age?: number;
};

type MatchRecord = {
  round: number;
  position: number;
  isThirdPlace: boolean;
  isBye: boolean;
  isWalkover: boolean;
  isCompleted: boolean;
  aka: Competitor | null;
  ao: Competitor | null;
  akaScore: number | null;
  aoScore: number | null;
  winner: Competitor | null;
  decisionByHantei: boolean;
  akaSenshu: boolean;
  aoSenshu: boolean;
  completedAt: string | null;
};

type CategoryResult = {
  bracketId: string;
  category: string;
  modality: "KATA" | "KUMITE";
  status: "NOT_STARTED" | "IN_PROGRESS" | "COMPLETED";
  participantCount: number;
  podium: {
    first: Competitor | null;
    second: Competitor | null;
    third: Competitor | null;
    fourth: Competitor | null;
  };
  roster: Competitor[];
  matches: MatchRecord[];
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

export default function ResultsClient({
  tournamentId,
}: {
  tournamentId: string;
}) {
  useEscBack();

  const [results, setResults] = useState<CategoryResult[]>([]);
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [loading, setLoading] = useState(true);

  const pageTitle = tournament
    ? `Resultados Oficiais — ${tournament.name}`
    : "Resultados Oficiais";
  usePageTitle(pageTitle);

  // DOM ref for print timestamp — synchronous, no React re-render timing issue
  const footerDateRef = useRef<HTMLSpanElement>(null);

  const fetchResults = useCallback(async () => {
    try {
      const data = await fetchJson<CategoryResult[]>(
        `/api/tournaments/${tournamentId}/results`,
      );
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

  // Auto-refresh every 5s
  useEffect(() => {
    const interval = setInterval(() => fetchResults(), 5_000);
    return () => clearInterval(interval);
  }, [fetchResults]);

  // Fetch tournament name
  useEffect(() => {
    fetchJson<Tournament>(`/api/tournaments/${tournamentId}`)
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

  const resultsBody = loading ? (
    <ResultsSkeleton />
  ) : results.length === 0 ? (
    <Empty className="py-24">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <Trophy />
        </EmptyMedia>
        <EmptyTitle>Nenhuma categoria encontrada</EmptyTitle>
        <EmptyDescription>
          Gere as chaves para ver os resultados.
        </EmptyDescription>
      </EmptyHeader>
    </Empty>
  ) : (
    <div className="space-y-10 print:space-y-6">
      {kumiteResults.length > 0 && (
        <ResultsSection title="Kumite" results={kumiteResults} />
      )}
      {kataResults.length > 0 && (
        <ResultsSection title="Kata" results={kataResults} />
      )}
    </div>
  );

  const printHeader = (
    <div className="pb-2">
      <div className="flex items-center justify-between">
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
      <div style={{ borderTop: "1px solid #e5e7eb", marginTop: "8px" }} />
    </div>
  );

  const printFooter = (
    <div className="pt-2">
      <div style={{ borderTop: "1px solid #e5e7eb", marginBottom: "6px" }} />
      <div
        className="flex items-center justify-between"
        style={{ fontSize: "8px", color: "#9ca3af" }}
      >
        <span>
          Impresso em <span ref={footerDateRef} />
        </span>
        <span>karate.app.br</span>
      </div>
    </div>
  );

  return (
    <>
      {/* @page rule — A4 portrait, margens controladas aqui.
          html.dark também é sobrescrito para forçar o relatório impresso a
          sair sempre no tema claro, mesmo com o app em modo escuro — o
          seletor `html.dark` (especificidade maior que `.dark` sozinho,
          definido em globals.css) garante que essas variáveis vençam. */}
      <style>{`
        @media print {
          @page { size: A4 portrait; margin: 12mm 10mm; }
          html.dark {
            --background: oklch(1 0 0);
            --foreground: oklch(0.145 0 0);
            --card: oklch(1 0 0);
            --card-foreground: oklch(0.145 0 0);
            --popover: oklch(1 0 0);
            --popover-foreground: oklch(0.145 0 0);
            --primary: oklch(0.205 0 0);
            --primary-foreground: oklch(0.985 0 0);
            --secondary: oklch(0.97 0 0);
            --secondary-foreground: oklch(0.205 0 0);
            --muted: oklch(0.97 0 0);
            --muted-foreground: oklch(0.556 0 0);
            --accent: oklch(0.97 0 0);
            --accent-foreground: oklch(0.205 0 0);
            --destructive: oklch(0.577 0.245 27.325);
            --border: oklch(0.922 0 0);
            --input: oklch(0.922 0 0);
            --ring: oklch(0.708 0 0);
          }
        }
      `}</style>

      {/* ── Tela ── */}
      <div className="min-h-screen flex flex-col print:hidden">
        <Header currentTournamentId={tournamentId} />

        <main className="flex-1">
          <div className="container mx-auto p-6">
            <div className="mb-8 flex items-start justify-between gap-4">
              <div>
                <h1 className="text-3xl font-bold">Resultados</h1>
                <p className="text-sm text-muted-foreground mt-1">
                  Classificação final por categoria
                </p>
              </div>

              <div className="flex items-center gap-2">
                {!loading && (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      asChild
                      className="gap-1.5"
                    >
                      <a
                        href={`/api/tournaments/${tournamentId}/backup`}
                        download
                      >
                        <Download className="size-3.5" />
                        Backup
                      </a>
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handlePrint}
                      className="gap-1.5"
                    >
                      <Printer className="size-3.5" />
                      Imprimir
                    </Button>
                  </>
                )}
              </div>
            </div>

            {resultsBody}
          </div>
        </main>
      </div>

      {/* ── Impressão ── */}
      {/* thead/tfoot de uma <table> repetem automaticamente em toda página
          impressa, reservando o próprio espaço em cada quebra de página —
          diferente de position:fixed, que não empurra o conteúdo da página
          2 em diante e acabava ficando por cima dos cards. */}
      <table className="hidden print:table w-full border-collapse">
        <thead>
          <tr>
            <td className="p-0">{printHeader}</td>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td className="p-0 align-top">{resultsBody}</td>
          </tr>
        </tbody>
        <tfoot>
          <tr>
            <td className="p-0">{printFooter}</td>
          </tr>
        </tfoot>
      </table>
    </>
  );
}

function ResultsSkeleton() {
  return (
    <div className="space-y-10 animate-pulse">
      {[0, 1].map((section) => (
        <div key={section}>
          <div className="flex items-center gap-3 mb-4">
            <div className="h-6 w-20 rounded bg-muted" />
            <div className="h-4 w-40 rounded bg-muted" />
            <div className="flex-1 h-px bg-border" />
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {[0, 1, 2, 3].map((card) => (
              <div
                key={card}
                className="rounded-xl border bg-card shadow-sm overflow-hidden"
              >
                <div className="flex items-center justify-between gap-2 px-4 py-2.5 border-b bg-muted/30">
                  <div className="h-4 w-48 rounded bg-muted" />
                  <div className="h-3 w-20 rounded bg-muted" />
                </div>
                <div className="p-4 space-y-3">
                  {[0, 1, 2].map((row) => (
                    <div key={row} className="flex items-center gap-3">
                      <div className="h-3 w-6 rounded bg-muted" />
                      <div className="h-3 flex-1 rounded bg-muted" />
                      <div className="h-3 w-16 rounded bg-muted" />
                      <div className="h-3 w-24 rounded bg-muted" />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
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
  const totalParticipants = results.reduce(
    (sum, r) => sum + r.participantCount,
    0,
  );

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
            {" • "}
            {totalParticipants}{" "}
            {totalParticipants === 1 ? "competidor" : "competidores"}
          </span>
          {completed > 0 && (
            <Badge
              variant="outline"
              className={cn("text-[10px] h-5", bracketStatusBadgeClass.COMPLETED)}
            >
              {completed} concluída{completed > 1 ? "s" : ""}
            </Badge>
          )}
          {inProgress > 0 && (
            <Badge
              variant="outline"
              className={cn("text-[10px] h-5", bracketStatusBadgeClass.IN_PROGRESS)}
            >
              {inProgress} em andamento
            </Badge>
          )}
        </div>
        <div className="flex-1 h-px bg-border" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start print:grid-cols-1 print:gap-3">
        {results.map((result) => (
          <CategoryResultCard key={result.bracketId} result={result} />
        ))}
      </div>
    </section>
  );
}

const placeConfig = {
  1: {
    label: "1º",
    className: "text-yellow-600 dark:text-yellow-500 print:text-yellow-700",
  },
  2: { label: "2º", className: "text-slate-500 dark:text-slate-400" },
  3: { label: "3º", className: "text-amber-700/80" },
  4: { label: "4º", className: "text-muted-foreground print:text-gray-500" },
} as const;

function PlacementBadge({ place }: { place: 1 | 2 | 3 | 4 | null }) {
  if (!place) return <span className="text-muted-foreground/40">—</span>;
  const { label, className } = placeConfig[place];
  return (
    <span className={cn("font-bold tabular-nums", className)}>{label}</span>
  );
}

// Rótulo curto de cada luta: identifica a rodada sem repetir dados que já
// aparecem na tabela de classificação (faixa/escola).
function matchLabel(m: MatchRecord, totalRounds: number): string {
  if (m.isThirdPlace) return "3º lugar";
  if (m.round === totalRounds) return "Final";
  if (m.round === totalRounds - 1) return "Semifinal";
  return `Rodada ${m.round}`;
}

function CategoryResultCard({ result }: { result: CategoryResult }) {
  const { podium, status, roster, matches, participantCount, category } =
    result;

  const placementByCompetitorId = new Map<string, 1 | 2 | 3 | 4>();
  if (podium.first) placementByCompetitorId.set(podium.first.id, 1);
  if (podium.second) placementByCompetitorId.set(podium.second.id, 2);
  if (podium.third) placementByCompetitorId.set(podium.third.id, 3);
  if (podium.fourth) placementByCompetitorId.set(podium.fourth.id, 4);

  // Classificação em uma única lista: pódio primeiro, resto em ordem
  // alfabética — cada competidor aparece exatamente uma vez.
  const classification = [...roster].sort((a, b) => {
    const pa = placementByCompetitorId.get(a.id) ?? 5;
    const pb = placementByCompetitorId.get(b.id) ?? 5;
    if (pa !== pb) return pa - pb;
    return a.name.localeCompare(b.name);
  });

  const totalRounds = matches.reduce((max, m) => Math.max(max, m.round), 0);
  // Inclui tanto lutas disputadas quanto byes (WO) — cada um é renderizado
  // de forma diferente abaixo, mas ambos fazem parte do histórico real da
  // chave.
  const matchLog = matches
    .filter((m) => m.isCompleted && (m.isBye ? m.winner : m.aka && m.ao))
    .sort((a, b) => a.round - b.round || a.position - b.position);

  return (
    <div className="rounded-xl border bg-card shadow-sm overflow-hidden print:break-inside-avoid print:shadow-none print:rounded-md print:border-gray-200">
      {/* Cabeçalho */}
      <div
        className="flex items-center justify-between gap-2 px-4 py-2.5 border-b bg-muted/30 print:bg-transparent"
        style={
          {
            WebkitPrintColorAdjust: "exact",
            printColorAdjust: "exact",
          } as React.CSSProperties
        }
      >
        <span className="font-mono font-bold text-sm leading-tight print:text-xs">
          {category}
        </span>
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-xs text-muted-foreground print:text-gray-400">
            {participantCount}{" "}
            {participantCount === 1 ? "competidor" : "competidores"}
          </span>
          <StatusDot status={status} />
        </div>
      </div>

      {classification.length === 0 ? (
        <div className="px-4 py-3 flex items-center gap-2 text-muted-foreground">
          {status === "NOT_STARTED" ? (
            <>
              <Clock className="size-3 shrink-0 opacity-40" />
              <span className="text-xs print:text-[10px]">Não iniciado</span>
            </>
          ) : (
            <>
              <Trophy className="size-3 shrink-0 opacity-25" />
              <span className="text-xs print:text-[10px]">Sem resultados</span>
            </>
          )}
        </div>
      ) : (
        <Table className="table-fixed">
          <TableHeader>
            <TableRow className="print:[&>th]:h-6 print:[&>th]:text-[9px]">
              <TableHead className="w-14">Class.</TableHead>
              <TableHead>Nome</TableHead>
              <TableHead className="w-24">Faixa</TableHead>
              <TableHead className="w-[30%]">Escola</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {classification.map((c) => (
              <TableRow
                key={c.id}
                className="print:[&>td]:h-6 print:[&>td]:py-0.5 print:[&>td]:text-[10px]"
              >
                <TableCell>
                  <PlacementBadge
                    place={placementByCompetitorId.get(c.id) ?? null}
                  />
                </TableCell>
                <TableCell
                  className={cn(
                    "truncate",
                    placementByCompetitorId.has(c.id) && "font-semibold",
                  )}
                >
                  {c.name}
                </TableCell>
                <TableCell className="text-muted-foreground print:text-gray-500">
                  {c.belt ? beltLabels[c.belt] : "—"}
                </TableCell>
                <TableCell className="text-muted-foreground truncate print:text-gray-500">
                  {c.school}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      {/* Histórico de lutas: informação nova (quem enfrentou quem, com que
          placar, e como foi decidido) — não repete faixa/escola, já
          mostrados na tabela acima. */}
      {matchLog.length > 0 && (
        <div className="px-4 py-2.5 border-t space-y-1 print:py-1.5">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground print:text-gray-400">
            Lutas
          </p>
          <ul className="space-y-0.5">
            {matchLog.map((m) => {
              const decisionTags = [
                m.decisionByHantei && "Hantei",
                m.akaSenshu && `Senshu: ${m.aka?.name}`,
                m.aoSenshu && `Senshu: ${m.ao?.name}`,
              ].filter(Boolean);

              return (
                <li
                  key={`${m.round}-${m.position}-${m.isThirdPlace}`}
                  className="text-xs text-muted-foreground print:text-[10px] print:text-gray-600"
                >
                  <span className="text-foreground/70 print:text-gray-500">
                    {matchLabel(m, totalRounds)}:
                  </span>{" "}
                  {m.isBye ? (
                    // Bye: estrutural, decidido na geração da chave — não
                    // havia segundo competidor para essa posição.
                    <>
                      <span className="font-semibold text-foreground">
                        {m.winner!.name}
                      </span>{" "}
                      passou direto (bye)
                    </>
                  ) : m.isWalkover ? (
                    // W.O.: os dois estavam escalados, mas um não
                    // compareceu — decidido pelo árbitro no dia.
                    <>
                      <span className="font-semibold text-foreground">
                        {m.winner!.name}
                      </span>{" "}
                      vence por W.O. (
                      {m.winner!.id === m.aka?.id ? m.ao!.name : m.aka!.name}{" "}
                      ausente)
                    </>
                  ) : (
                    <>
                      <span
                        className={cn(
                          m.winner?.id === m.aka!.id &&
                            "font-semibold text-foreground",
                        )}
                      >
                        {m.aka!.name}
                      </span>{" "}
                      <span className="font-mono tabular-nums">
                        {m.akaScore} × {m.aoScore}
                      </span>{" "}
                      <span
                        className={cn(
                          m.winner?.id === m.ao!.id &&
                            "font-semibold text-foreground",
                        )}
                      >
                        {m.ao!.name}
                      </span>
                      {decisionTags.length > 0 && (
                        <span className="italic">
                          {" "}
                          ({decisionTags.join(", ")})
                        </span>
                      )}
                    </>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}

function StatusDot({ status }: { status: CategoryResult["status"] }) {
  if (status === "NOT_STARTED") return null;

  return (
    <span className="inline-flex items-center gap-1 text-[10px] font-medium text-muted-foreground/60 shrink-0 print:hidden">
      <span
        className={cn("size-1.5 rounded-full", bracketStatusDotClass[status])}
      />
      {status === "IN_PROGRESS" ? "andamento" : "concluído"}
    </span>
  );
}
