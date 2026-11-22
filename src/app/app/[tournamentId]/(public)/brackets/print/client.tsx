"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Bracket, Match, Competitor, Tournament } from "@prisma/client";
import { ArrowLeft, Printer, Trophy, LayoutGrid, ListOrdered } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { fetchJson } from "@/lib/api-client";
import { usePageTitle } from "@/hooks/use-page-title";
import { cn } from "@/lib/utils";
import { winnerTextClass } from "@/lib/utils/bracket-status";

type MatchWithCompetitors = Match & {
  aka?: Competitor;
  ao?: Competitor;
  winner?: Competitor;
};

type BracketWithFullMatches = Bracket & {
  matches: MatchWithCompetitors[];
};

type ViewMode = "tree" | "table" | "both";

export default function PrintBracketsClient({
  tournamentId,
}: {
  tournamentId: string;
}) {
  return (
    <Suspense
      fallback={
        <div className="container mx-auto p-8 space-y-4">
          <Skeleton className="h-10 w-1/3" />
          <Skeleton className="h-64 w-full" />
        </div>
      }
    >
      <PrintBracketsContent tournamentId={tournamentId} />
    </Suspense>
  );
}

function PrintBracketsContent({
  tournamentId,
}: {
  tournamentId: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const targetBracketId = searchParams.get("bracketId");

  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [brackets, setBrackets] = useState<BracketWithFullMatches[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalityFilter, setModalityFilter] = useState<"ALL" | "KATA" | "KUMITE">("ALL");
  const [viewMode, setViewMode] = useState<ViewMode>("both");

  useEffect(() => {
    async function loadAllData() {
      try {
        setLoading(true);
        const [tournamentData, bracketsData, competitorsData] = await Promise.all([
          fetchJson<Tournament>(`/api/tournaments/${tournamentId}`),
          fetchJson<(Bracket & { matches: Match[] })[]>(
            `/api/tournaments/${tournamentId}/brackets?includeMatches=true`
          ),
          fetchJson<Competitor[]>(`/api/tournaments/${tournamentId}/competitors`),
        ]);

        const compMap = new Map(competitorsData.map((c) => [c.id, c]));

        const populatedBrackets: BracketWithFullMatches[] = bracketsData.map((b) => ({
          ...b,
          matches: (b.matches || []).map((m) => ({
            ...m,
            aka: m.akaId ? compMap.get(m.akaId) : undefined,
            ao: m.aoId ? compMap.get(m.aoId) : undefined,
            winner: m.winnerId ? compMap.get(m.winnerId) : undefined,
          })),
        }));

        setTournament(tournamentData);
        setBrackets(populatedBrackets);
      } catch {
        // Silencioso
      } finally {
        setLoading(false);
      }
    }

    loadAllData();
  }, [tournamentId]);

  const filteredBrackets = brackets.filter((b) => {
    if (targetBracketId && b.id !== targetBracketId) return false;
    if (modalityFilter === "ALL") return true;
    return b.modality === modalityFilter;
  });

  const singleBracket = targetBracketId
    ? brackets.find((b) => b.id === targetBracketId)
    : null;

  const pageTitle = singleBracket
    ? `${singleBracket.category} · Impressão`
    : tournament
      ? `Chaves para Impressão — ${tournament.name}`
      : "Impressão de Chaves";
  usePageTitle(pageTitle);

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        <Skeleton className="h-12 w-1/3" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  return (
    <>
      <style>{`
        @media print {
          @page {
            size: A4 landscape;
            margin: 8mm 10mm;
          }
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
          body {
            background-color: white !important;
            color: black !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .bracket-sheet {
            page-break-after: always !important;
            break-after: page !important;
          }
          .bracket-sheet:last-child {
            page-break-after: auto !important;
            break-after: auto !important;
          }
        }
      `}</style>

      {/* ── Barra de Controle Superior (visível somente na tela) ── */}
      <div className="bg-card border-b sticky top-0 z-30 shadow-xs print:hidden">
        <div className="container mx-auto px-4 py-3 flex flex-col md:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-3 w-full md:w-auto">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => router.back()}
              title="Voltar"
              className="shrink-0"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-base sm:text-lg font-bold leading-tight">
                {singleBracket
                  ? singleBracket.category
                  : "Exportar Chaves em PDF"}
              </h1>
              <p className="text-xs text-muted-foreground">
                {tournament?.name} · {filteredBrackets.length}{" "}
                {filteredBrackets.length === 1 ? "chave pronta" : "chaves prontas"} para impressão
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap w-full md:w-auto justify-end">
            {!singleBracket && (
              <div className="flex items-center border rounded-lg p-0.5 bg-muted/40 text-xs">
                <Button
                  variant={modalityFilter === "ALL" ? "secondary" : "ghost"}
                  size="sm"
                  className="h-7 text-xs px-2.5"
                  onClick={() => setModalityFilter("ALL")}
                >
                  Todas ({brackets.length})
                </Button>
                <Button
                  variant={modalityFilter === "KATA" ? "secondary" : "ghost"}
                  size="sm"
                  className="h-7 text-xs px-2.5"
                  onClick={() => setModalityFilter("KATA")}
                >
                  Kata
                </Button>
                <Button
                  variant={modalityFilter === "KUMITE" ? "secondary" : "ghost"}
                  size="sm"
                  className="h-7 text-xs px-2.5"
                  onClick={() => setModalityFilter("KUMITE")}
                >
                  Kumite
                </Button>
              </div>
            )}

            <div className="flex items-center border rounded-lg p-0.5 bg-muted/40 text-xs">
              <Button
                variant={viewMode === "tree" ? "secondary" : "ghost"}
                size="sm"
                className="h-7 text-xs px-2"
                onClick={() => setViewMode("tree")}
                title="Apenas árvore visual da chave"
              >
                <LayoutGrid className="size-3.5 mr-1" />
                Chave
              </Button>
              <Button
                variant={viewMode === "table" ? "secondary" : "ghost"}
                size="sm"
                className="h-7 text-xs px-2"
                onClick={() => setViewMode("table")}
                title="Apenas lista de confrontos"
              >
                <ListOrdered className="size-3.5 mr-1" />
                Lutas
              </Button>
              <Button
                variant={viewMode === "both" ? "secondary" : "ghost"}
                size="sm"
                className="h-7 text-xs px-2"
                onClick={() => setViewMode("both")}
                title="Chave gráfica + lista de confrontos"
              >
                Completo
              </Button>
            </div>

            <Button onClick={handlePrint} className="gap-2 shadow-xs">
              <Printer className="h-4 w-4" />
              <span>Imprimir / Salvar em PDF</span>
            </Button>
          </div>
        </div>
      </div>

      {/* ── Conteúdo das Chaves (Tela e Impressão) ── */}
      <main className="container mx-auto p-4 sm:p-6 print:p-0 print:m-0 print:max-w-none">
        {filteredBrackets.length === 0 ? (
          <div className="text-center py-16 space-y-3">
            <Trophy className="size-12 mx-auto text-muted-foreground opacity-40" />
            <h2 className="text-lg font-semibold">Nenhuma chave encontrada</h2>
            <p className="text-sm text-muted-foreground">
              Gere as chaves na aba de Chaves antes de exportar.
            </p>
          </div>
        ) : (
          <div className="space-y-12 print:space-y-0">
            {filteredBrackets.map((bracket) => (
              <PrintBracketSheet
                key={bracket.id}
                bracket={bracket}
                viewMode={viewMode}
              />
            ))}
          </div>
        )}
      </main>
    </>
  );
}

// ── Folha de Impressão de Cada Chave (1 por folha A4 em Landscape) ───────────

function PrintBracketSheet({
  bracket,
  viewMode,
}: {
  bracket: BracketWithFullMatches;
  viewMode: ViewMode;
}) {
  const matchesByRound: Record<number, MatchWithCompetitors[]> = {};
  bracket.matches.forEach((m) => {
    if (!matchesByRound[m.round]) matchesByRound[m.round] = [];
    matchesByRound[m.round].push(m);
  });
  Object.values(matchesByRound).forEach((matches) => {
    matches.sort((a, b) => a.position - b.position);
  });
  const rounds = Object.keys(matchesByRound)
    .map(Number)
    .sort((a, b) => a - b);

  const thirdPlaceMatch = bracket.matches.find((m) => m.isThirdPlace);

  const participantIds = new Set<string>();
  bracket.matches.forEach((m) => {
    if (m.akaId) participantIds.add(m.akaId);
    if (m.aoId) participantIds.add(m.aoId);
  });
  const participantsCount = participantIds.size;

  return (
    <div className="bracket-sheet bg-card border rounded-xl p-4 sm:p-6 print:border-0 print:p-0 print:rounded-none shadow-xs print:shadow-none">
      {/* ── Cabeçalho Limpo da Chave (sem redundâncias e sem logo) ── */}
      <div className="border-b pb-2 mb-4">
        <h2 className="text-xl sm:text-2xl font-bold font-mono tracking-tight text-foreground print:text-black">
          {bracket.category}
        </h2>
        <p className="text-xs text-muted-foreground print:text-gray-600 mt-0.5">
          {participantsCount} competidores • {bracket.totalSlots} vagas ({bracket.totalRounds} rodadas)
        </p>
      </div>

      {/* ── Árvore Gráfica da Chave ── */}
      {(viewMode === "tree" || viewMode === "both") && (
        <div className="overflow-x-auto print:overflow-visible pb-4">
          <div className="flex min-w-max pb-4 print:pb-0 items-start">
            {rounds.map((roundNum, index) => {
              const roundMatches = matchesByRound[roundNum].filter(
                (m) => !m.isThirdPlace
              );
              const isFinal = roundNum === bracket.totalRounds;
              const { pitch, offset } = getRoundGeometry(index);
              const paddingTop = offset - MATCH_HEIGHT / 2;
              const gap = pitch - MATCH_HEIGHT;

              return (
                <div key={roundNum} className="flex">
                  <div className="flex flex-col w-56 print:w-48">
                    <div className="text-center mb-3 h-6">
                      <Badge
                        variant="secondary"
                        className="font-semibold text-xs print:border print:border-gray-300 print:bg-gray-100 print:text-black"
                      >
                        {isFinal
                          ? "FINAL"
                          : roundNum === bracket.totalRounds - 1
                            ? "SEMIFINAL"
                            : roundNum === bracket.totalRounds - 2
                              ? "QUARTAS"
                              : `RODADA ${roundNum}`}
                      </Badge>
                    </div>
                    <div
                      className="flex flex-col"
                      style={{ paddingTop: `${paddingTop}px`, gap: `${gap}px` }}
                    >
                      {roundMatches.map((match) => (
                        <div key={match.id} className="h-[128px] print:h-[110px]">
                          <PrintMatchCard match={match} />
                        </div>
                      ))}
                    </div>
                  </div>

                  {!isFinal && (
                    <div className="mt-9">
                      <BracketConnectors
                        roundIndex={index}
                        numMatches={roundMatches.length}
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* 3º Lugar */}
          {thirdPlaceMatch && (
            <div className="mt-6 pt-4 border-t print:mt-3 print:pt-2">
              <div className="text-center mb-3">
                <Badge
                  variant="secondary"
                  className="font-semibold text-xs print:border print:border-gray-300 print:bg-gray-100 print:text-black"
                >
                  DISPUTA DE 3º LUGAR
                </Badge>
              </div>
              <div className="flex justify-center">
                <div className="w-56 print:w-48">
                  <PrintMatchCard match={thirdPlaceMatch} />
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Tabela / Ficha de Confrontos do Mesário ── */}
      {(viewMode === "table" || viewMode === "both") && (
        <div className="mt-6 pt-4 border-t print:mt-4 print:pt-2">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground print:text-gray-700">
              Ficha de Confrontos e Resultados
            </h3>
            <span className="text-[10px] text-muted-foreground print:text-gray-500">
              Anotações da Mesa / Árbitro
            </span>
          </div>

          <div className="rounded-lg border print:border-gray-300 overflow-hidden">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="border-b bg-muted/40 print:bg-gray-100 text-muted-foreground print:text-gray-700 text-left">
                  <th className="p-2 w-16 text-center font-semibold">Luta</th>
                  <th className="p-2 w-28 font-semibold">Fase</th>
                  <th className="p-2 font-semibold">AKA (Vermelho)</th>
                  <th className="p-2 w-20 text-center font-semibold">Placar</th>
                  <th className="p-2 font-semibold">AO (Azul)</th>
                  <th className="p-2 w-32 font-semibold">Vencedor / Obs.</th>
                  <th className="p-2 w-24 text-center font-semibold print:table-cell hidden">Visto</th>
                </tr>
              </thead>
              <tbody className="divide-y print:divide-gray-200">
                {bracket.matches
                  .filter((m) => !m.isBye)
                  .map((m, idx) => {
                    const phaseLabel = m.isThirdPlace
                      ? "3º Lugar"
                      : m.round === bracket.totalRounds
                        ? "Final"
                        : m.round === bracket.totalRounds - 1
                          ? "Semifinal"
                          : `Rodada ${m.round}`;

                    return (
                      <tr key={m.id} className="hover:bg-muted/20">
                        <td className="p-2 text-center font-mono font-medium text-muted-foreground print:text-gray-600">
                          #{idx + 1}
                        </td>
                        <td className="p-2 font-medium text-foreground print:text-black">
                          {phaseLabel}
                        </td>
                        <td className="p-2">
                          <span className="inline-block w-2 h-2 rounded-full bg-red-500 mr-1.5" />
                          <span className="font-medium text-foreground print:text-black">
                            {m.aka?.name || "—"}
                          </span>
                          {m.aka?.school && (
                            <span className="text-[10px] text-muted-foreground print:text-gray-500 ml-1">
                              ({m.aka.school})
                            </span>
                          )}
                        </td>
                        <td className="p-2 text-center font-mono font-semibold text-foreground print:text-black">
                          {m.isCompleted ? `${m.akaScore ?? 0} × ${m.aoScore ?? 0}` : "—"}
                        </td>
                        <td className="p-2">
                          <span className="inline-block w-2 h-2 rounded-full bg-blue-500 mr-1.5" />
                          <span className="font-medium text-foreground print:text-black">
                            {m.ao?.name || "—"}
                          </span>
                          {m.ao?.school && (
                            <span className="text-[10px] text-muted-foreground print:text-gray-500 ml-1">
                              ({m.ao.school})
                            </span>
                          )}
                        </td>
                        <td className="p-2 text-muted-foreground print:text-gray-600">
                          {m.winner?.name ? (
                            <span className="font-semibold text-foreground print:text-black">
                              {m.winner.name}
                            </span>
                          ) : (
                            <span className="text-muted-foreground/40 italic">Pendente</span>
                          )}
                        </td>
                        <td className="p-2 text-center print:table-cell hidden">
                          <div className="h-4 border-b border-gray-400 mx-2" />
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Card de Confronto Otimizado para Impressão ───────────────────────────────

function PrintMatchCard({ match }: { match: MatchWithCompetitors }) {
  const isCompleted = match.isCompleted;

  return (
    <div
      className={cn(
        "rounded-lg border bg-card text-card-foreground print:bg-white print:border-gray-300 text-xs shadow-2xs overflow-hidden",
        match.isBye && "bg-muted/40 print:bg-gray-50",
        isCompleted && "border-primary/40 print:border-gray-400"
      )}
    >
      {/* AKA */}
      <div
        className={cn(
          "px-2.5 py-1.5 border-b border-border/60 print:border-gray-200 flex items-center justify-between gap-1.5",
          match.winnerId && match.winnerId === match.akaId
            ? winnerTextClass
            : "text-foreground print:text-black",
          match.winnerId && match.winnerId !== match.akaId && "opacity-60"
        )}
      >
        <div className="flex items-center gap-1.5 min-w-0 flex-1">
          <div className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0" />
          <span className="truncate font-medium">
            {match.aka?.name || (match.isBye ? "—" : "A definir")}
          </span>
        </div>
        {match.aka && (
          <span className="text-[9px] text-muted-foreground print:text-gray-500 truncate max-w-[70px] shrink-0">
            {match.aka.school}
          </span>
        )}
        {isCompleted && match.akaScore !== null && !match.isBye && (
          <span className="font-mono font-bold text-xs shrink-0 ml-1">
            {match.akaScore}
          </span>
        )}
      </div>

      {/* AO */}
      <div
        className={cn(
          "px-2.5 py-1.5 flex items-center justify-between gap-1.5",
          match.winnerId && match.winnerId === match.aoId
            ? winnerTextClass
            : "text-foreground print:text-black",
          match.winnerId && match.winnerId !== match.aoId && "opacity-60"
        )}
      >
        <div className="flex items-center gap-1.5 min-w-0 flex-1">
          <div className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0" />
          <span className="truncate font-medium">
            {match.ao?.name || (match.isBye ? "BYE" : "A definir")}
          </span>
        </div>
        {match.ao && (
          <span className="text-[9px] text-muted-foreground print:text-gray-500 truncate max-w-[70px] shrink-0">
            {match.ao.school}
          </span>
        )}
        {isCompleted && match.aoScore !== null && !match.isBye && (
          <span className="font-mono font-bold text-xs shrink-0 ml-1">
            {match.aoScore}
          </span>
        )}
      </div>
    </div>
  );
}

// ── Geometria e Conectores da Chave ──────────────────────────────────────────

const MATCH_HEIGHT = 128;
const BASE_PITCH = 136;
const CONNECTOR_WIDTH = 32;

function getRoundGeometry(roundIndex: number) {
  const pitch = BASE_PITCH * Math.pow(2, roundIndex);
  const offset = pitch / 2;
  return { pitch, offset };
}

function BracketConnectors({
  roundIndex,
  numMatches,
}: {
  roundIndex: number;
  numMatches: number;
}) {
  const { pitch, offset } = getRoundGeometry(roundIndex);
  const numPairs = Math.ceil(numMatches / 2);
  const pairs = Array.from({ length: numPairs }, (_, i) => i);

  return (
    <div
      className="relative print:border-gray-400"
      style={{
        width: `${CONNECTOR_WIDTH}px`,
        height: `${numMatches * pitch}px`,
      }}
    >
      {pairs.map((pairIdx) => {
        const topY = offset + pairIdx * 2 * pitch;
        const bottomY = topY + pitch;
        const midY = (topY + bottomY) / 2;
        const halfWidth = CONNECTOR_WIDTH / 2;

        return (
          <svg
            key={pairIdx}
            className="absolute left-0 top-0 w-full h-full pointer-events-none"
            style={{ overflow: "visible" }}
          >
            <path
              d={`M 0 ${topY} H ${halfWidth} V ${bottomY} H 0`}
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              className="text-border print:text-gray-400"
            />
            <path
              d={`M ${halfWidth} ${midY} H ${CONNECTOR_WIDTH}`}
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              className="text-border print:text-gray-400"
            />
          </svg>
        );
      })}
    </div>
  );
}
