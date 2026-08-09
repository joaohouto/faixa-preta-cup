"use client";

import { useEffect, useRef, useState } from "react";
import { Match, Bracket, Competitor } from "@prisma/client";
import { toast } from "sonner";
import { ArrowLeft, Clock } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useEscBack } from "@/hooks/use-esc-back";
import { Skeleton } from "@/components/ui/skeleton";
import { fetchJson } from "@/lib/api-client";
import {
  bracketStatusLabel,
  bracketStatusBadgeClass,
  winnerTextClass,
  completedRowClass,
} from "@/lib/utils/bracket-status";

type MatchWithCompetitors = Match & {
  aka?: Competitor;
  ao?: Competitor;
  winner?: Competitor;
};

type BracketWithMatches = Bracket & {
  matches: MatchWithCompetitors[];
};

export default function BracketDetailPage({
  params,
}: {
  params: Promise<{ tournamentId: string; bracketId: string }>;
}) {
  const router = useRouter();
  useEscBack();

  const [bracket, setBracket] = useState<BracketWithMatches | null>(null);
  const [loading, setLoading] = useState(true);
  const [resolvedParams, setResolvedParams] = useState<{
    tournamentId: string;
    bracketId: string;
  } | null>(null);

  // Competidores mudam raramente depois que a chave existe — busca uma vez
  // e reaproveita nos polls seguintes, que só recarregam os matches.
  const competitorsMapRef = useRef<Map<string, Competitor>>(new Map());

  useEffect(() => {
    params.then((p) => setResolvedParams(p));
  }, [params]);

  useEffect(() => {
    if (!resolvedParams) return;
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resolvedParams?.tournamentId, resolvedParams?.bracketId]);

  // Atualização ao vivo: outro árbitro pode estar registrando resultados
  // nessa mesma chave em paralelo. Enquanto a chave não estiver concluída,
  // busca os matches de novo periodicamente (polling simples via GET) —
  // ver explicação da escolha na mensagem de resumo.
  useEffect(() => {
    if (!resolvedParams || bracket?.status === "COMPLETED") return;
    const interval = setInterval(refreshMatches, 5000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resolvedParams?.tournamentId, resolvedParams?.bracketId, bracket?.status]);

  function attachCompetitors(data: Bracket & { matches: Match[] }) {
    const competitorsMap = competitorsMapRef.current;
    const matchesWithComps = data.matches.map((m: Match) => ({
      ...m,
      aka: m.akaId ? competitorsMap.get(m.akaId) : undefined,
      ao: m.aoId ? competitorsMap.get(m.aoId) : undefined,
      winner: m.winnerId ? competitorsMap.get(m.winnerId) : undefined,
    }));
    return { ...data, matches: matchesWithComps };
  }

  async function fetchData() {
    try {
      setLoading(true);

      const data = await fetchJson<Bracket & { matches: Match[] }>(
        `/api/tournaments/${resolvedParams!.tournamentId}/brackets/${resolvedParams!.bracketId}`,
      );

      const competitors = await fetchJson<Competitor[]>(
        `/api/tournaments/${resolvedParams!.tournamentId}/competitors`,
      );
      competitorsMapRef.current = new Map(competitors.map((c) => [c.id, c]));

      setBracket(attachCompetitors(data));
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Erro ao carregar chave e lutas.",
      );
    } finally {
      setLoading(false);
    }
  }

  async function refreshMatches() {
    if (!resolvedParams) return;
    try {
      const data = await fetchJson<Bracket & { matches: Match[] }>(
        `/api/tournaments/${resolvedParams.tournamentId}/brackets/${resolvedParams.bracketId}`,
      );
      setBracket(attachCompetitors(data));
    } catch {
      // poll silencioso — falha pontual não precisa de toast
    }
  }

  function startReferee(matchId: string) {
    router.push(
      `/app/${resolvedParams!.tournamentId}/brackets/${resolvedParams!.bracketId}/referee?matchId=${matchId}`,
    );
  }

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="space-y-4">
          <Skeleton className="h-8 w-1/4" />
          <Skeleton className="h-4 w-1/3" />
        </div>
      </div>
    );
  }

  if (!bracket) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-lg font-medium">Chave não encontrada</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Agrupar matches por rodada
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

  return (
    <div className="container mx-auto p-6 print:p-0">
      {/* Header */}
      <div className="mb-6 flex items-start gap-3 sm:gap-4">
        <Link
          href={`/app/${resolvedParams?.tournamentId}/brackets`}
          className="print:hidden shrink-0"
        >
          <Button variant="ghost" size="icon">
            <ArrowLeft />
          </Button>
        </Link>
        <div className="flex-1 min-w-0">
          <h1 className="text-lg sm:text-2xl font-bold font-mono break-words">
            {bracket.category}
          </h1>
          <div className="flex items-center flex-wrap gap-x-2 gap-y-1 mt-1">
            <Badge variant="secondary">{bracket.modality}</Badge>
            <Badge
              variant="outline"
              className={bracketStatusBadgeClass[bracket.status]}
            >
              {bracketStatusLabel[bracket.status]}
            </Badge>
            <span className="text-sm text-muted-foreground">
              {bracket.totalSlots} vagas • {bracket.totalRounds} rodadas
            </span>
            {bracket.status !== "COMPLETED" && (
              <span className="flex items-center gap-1.5 text-xs text-muted-foreground print:hidden">
                <span className="size-1.5 rounded-full bg-blue-400 animate-pulse" />
                acompanhando ao vivo
              </span>
            )}
          </div>
        </div>
      </div>

      {/* ── Visualização de Chave ── */}
      <Card className="mb-6">
        <CardContent className="p-6 overflow-x-auto">
          <div className="flex min-w-max pb-12">
            {rounds.map((roundNum, index) => {
              const roundMatches = matchesByRound[roundNum].filter(
                (m) => !m.isThirdPlace,
              );
              const isFinal = roundNum === bracket.totalRounds;
              const { pitch, offset } = getRoundGeometry(index);
              const paddingTop = offset - MATCH_HEIGHT / 2;
              const gap = pitch - MATCH_HEIGHT;

              return (
                <div key={roundNum} className="flex">
                  <div className="flex flex-col w-56">
                    <div className="text-center mb-4 h-8">
                      <Badge variant="secondary" className="font-semibold">
                        {isFinal
                          ? "FINAL"
                          : roundNum === bracket.totalRounds - 1
                            ? "SEMIFINAL"
                            : roundNum === bracket.totalRounds - 2
                              ? "QUARTAS"
                              : `R${roundNum}`}
                      </Badge>
                    </div>
                    <div
                      className="flex flex-col"
                      style={{ paddingTop: `${paddingTop}px`, gap: `${gap}px` }}
                    >
                      {roundMatches.map((match) => (
                        <div key={match.id} className="h-[128px]">
                          <MatchCard
                            match={match}
                            onStart={() => startReferee(match.id)}
                          />
                        </div>
                      ))}
                    </div>
                  </div>

                  {!isFinal && (
                    <div className="mt-12">
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
            <div className="mt-12 pt-8 border-t">
              <div className="text-center mb-6">
                <Badge variant="secondary" className="font-semibold">
                  DISPUTA DE 3º LUGAR
                </Badge>
              </div>
              <div className="flex justify-center">
                <MatchCard
                  match={thirdPlaceMatch}
                  onStart={() => startReferee(thirdPlaceMatch.id)}
                />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Lista de Lutas ── */}
      <div className="space-y-4">
        {rounds.map((roundNum) => (
          <Card key={roundNum}>
            <CardHeader>
              <CardTitle className="text-lg">
                {roundNum === bracket.totalRounds
                  ? "Final"
                  : roundNum === bracket.totalRounds - 1
                    ? "Semifinal"
                    : `Rodada ${roundNum}`}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {matchesByRound[roundNum]
                .filter((m) => !m.isThirdPlace)
                .map((match, idx) => (
                  <MatchListRow key={match.id} match={match} index={idx} />
                ))}
            </CardContent>
          </Card>
        ))}

        {thirdPlaceMatch && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                Disputa de 3º Lugar
              </CardTitle>
            </CardHeader>
            <CardContent>
              <MatchListRow match={thirdPlaceMatch} index={0} />
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

// ── Match Card (visualização da chave) ──────────────────────────────────────

function MatchCard({
  match,
  onStart,
}: {
  match: MatchWithCompetitors;
  onStart: () => void;
}) {
  const canStart = match.aka && match.ao && !match.isBye && !match.isCompleted;
  const isCompleted = match.isCompleted;
  const isReady = canStart;

  return (
    <Card
      className={cn(
        "w-56 p-0 z-10 transition-all",
        match.isBye && "bg-muted/50",
        isCompleted && "border-green-500/40",
        isReady &&
          "cursor-pointer hover:shadow-lg hover:scale-105 border-blue-400/60",
        !match.aka && !match.ao && !match.isBye && "opacity-60",
      )}
      onClick={() => isReady && onStart()}
    >
      <CardContent className="p-0 relative">
        {/* Aka */}
        <div
          className={`p-3 h-[64px] border-b ${
            match.akaId !== null && match.winnerId === match.akaId
              ? "bg-green-50 dark:bg-green-950 font-semibold border-l-4 border-l-green-600 rounded-t-lg"
              : ""
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <span className="text-xs text-red-600 font-semibold">AKA</span>
              <span className="text-sm truncate">{match.aka?.name || "—"}</span>
            </div>
            {match.isCompleted && match.isWalkover ? (
              match.winnerId !== match.akaId && (
                <Badge variant="secondary" className="text-[10px] ml-2 shrink-0">
                  W.O.
                </Badge>
              )
            ) : (
              match.isCompleted && (
                <span className="text-sm font-mono ml-2">
                  {match.akaScore ?? 0}
                </span>
              )
            )}
          </div>
          {match.aka && (
            <div className="text-xs text-muted-foreground mt-1 truncate">
              {match.aka.school}
            </div>
          )}
        </div>

        {/* Ao */}
        <div
          className={`p-3 h-[64px] ${
            match.aoId !== null && match.winnerId === match.aoId
              ? "bg-green-50 dark:bg-green-950 font-semibold border-l-4 border-l-green-600 rounded-b-lg"
              : ""
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <span className="text-xs text-blue-600 font-semibold">AO</span>
              <span className="text-sm truncate">{match.ao?.name || "—"}</span>
            </div>
            {match.isCompleted && match.isWalkover ? (
              match.winnerId !== match.aoId && (
                <Badge variant="secondary" className="text-[10px] ml-2 shrink-0">
                  W.O.
                </Badge>
              )
            ) : (
              match.isCompleted && (
                <span className="text-sm font-mono ml-2">
                  {match.aoScore ?? 0}
                </span>
              )
            )}
          </div>
          {match.ao && (
            <div className="text-xs text-muted-foreground mt-1 truncate">
              {match.ao.school}
            </div>
          )}
        </div>

        {/* Bye overlay */}
        {match.isBye && (
          <div className="absolute inset-0 flex items-center justify-center bg-muted/80 rounded-lg">
            <Badge variant="secondary">BYE</Badge>
          </div>
        )}

        {/* Ready indicator */}
        {isReady && (
          <div className="absolute top-2 right-2">
            <div className="h-2 w-2 bg-blue-500 rounded-full animate-pulse" />
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ── Match List Row (lista abaixo da chave) ───────────────────────────────────

function MatchListRow({
  match,
  index,
}: {
  match: MatchWithCompetitors;
  index: number;
}) {
  return (
    <div
      className={cn(
        "flex items-center justify-between p-3 border rounded-lg gap-4",
        match.isCompleted && completedRowClass,
      )}
    >
      <div className="flex items-center gap-4 flex-1 min-w-0">
        <span className="text-sm font-medium text-muted-foreground shrink-0">
          #{index + 1}
        </span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-xs text-red-600 font-semibold shrink-0">
              AKA
            </span>
            <span
              className={cn(
                "text-sm",
                match.winnerId === match.akaId &&
                  match.isCompleted &&
                  winnerTextClass,
              )}
            >
              {match.aka?.name || "—"}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-blue-600 font-semibold shrink-0">
              AO
            </span>
            <span
              className={cn(
                "text-sm",
                match.winnerId === match.aoId &&
                  match.isCompleted &&
                  winnerTextClass,
              )}
            >
              {match.ao?.name || "—"}
            </span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        {match.isBye ? (
          <Badge variant="secondary">BYE</Badge>
        ) : match.isWalkover ? (
          <Badge variant="secondary">W.O.</Badge>
        ) : match.isCompleted ? (
          <Badge variant="secondary" className="font-mono">
            {match.akaScore ?? 0} × {match.aoScore ?? 0}
          </Badge>
        ) : (
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Clock className="h-3.5 w-3.5" />
            {match.aka && match.ao ? "Pronto" : "Aguardando"}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Geometria do Bracket ─────────────────────────────────────────────────────

const MATCH_HEIGHT = 128;
const BASE_GAP = 24;

function getRoundGeometry(roundIndex: number) {
  const pitch = (MATCH_HEIGHT + BASE_GAP) * Math.pow(2, roundIndex);
  let offset = MATCH_HEIGHT / 2;
  for (let i = 0; i < roundIndex; i++) {
    const prevPitch = (MATCH_HEIGHT + BASE_GAP) * Math.pow(2, i);
    offset += prevPitch / 2;
  }
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
  const totalHeight = offset + (numMatches - 1) * pitch + offset;
  const connections = Math.floor(numMatches / 2);

  return (
    <div className="relative w-12 flex-shrink-0">
      <svg
        width="48"
        height={totalHeight}
        className="absolute top-0 left-0 text-muted-foreground opacity-20"
        style={{ overflow: "visible" }}
      >
        {Array.from({ length: connections }).map((_, i) => {
          const y1 = offset + i * 2 * pitch;
          const y2 = offset + (i * 2 + 1) * pitch;
          const yMid = (y1 + y2) / 2;

          return (
            <g key={i}>
              <path
                d={`M 0 ${y1} L 24 ${y1} L 24 ${yMid}`}
                fill="none"
                stroke="currentColor"
                strokeWidth="1"
              />
              <path
                d={`M 0 ${y2} L 24 ${y2} L 24 ${yMid}`}
                fill="none"
                stroke="currentColor"
                strokeWidth="1"
              />
              <path
                d={`M 24 ${yMid} L 48 ${yMid}`}
                fill="none"
                stroke="currentColor"
                strokeWidth="1"
              />
            </g>
          );
        })}
      </svg>
    </div>
  );
}
