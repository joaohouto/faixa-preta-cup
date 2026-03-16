"use client";

import { useEffect, useState } from "react";
import { Match, Bracket, Competitor } from "@prisma/client";
import { toast } from "sonner";
import { ArrowLeft, Trophy, Medal, Flag } from "lucide-react";
import Link from "next/link";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MatchResultDialog } from "@/components/match-result-dialog";
import { cn } from "@/lib/utils";

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
  const [bracket, setBracket] = useState<BracketWithMatches | null>(null);
  const [loading, setLoading] = useState(true);
  const [resolvedParams, setResolvedParams] = useState<{
    tournamentId: string;
    bracketId: string;
  } | null>(null);

  const [selectedMatch, setSelectedMatch] =
    useState<MatchWithCompetitors | null>(null);
  const [resultDialogOpen, setResultDialogOpen] = useState(false);

  function handleOpenResult(match: MatchWithCompetitors) {
    setSelectedMatch(match);
    setResultDialogOpen(true);
  }

  useEffect(() => {
    params.then((p) => setResolvedParams(p));
  }, [params]);

  useEffect(() => {
    if (!resolvedParams) return;
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resolvedParams?.tournamentId, resolvedParams?.bracketId]);

  async function fetchData() {
    try {
      setLoading(true);

      const res = await fetch(
        `/api/tournaments/${resolvedParams!.tournamentId}/brackets/${
          resolvedParams!.bracketId
        }`,
      );
      if (!res.ok) throw new Error("Falha ao buscar chave");
      const data = await res.json();

      // Fetch competitors
      const compRes = await fetch(
        `/api/tournaments/${resolvedParams!.tournamentId}/competitors`,
      );
      if (!compRes.ok) throw new Error("Falha ao carregar competidores");
      const competitors: Competitor[] = await compRes.json();

      // Map competitors to matches
      const competitorsMap = new Map(competitors.map((c) => [c.id, c]));
      const matchesWithComps = data.matches.map((m: Match) => ({
        ...m,
        aka: m.akaId ? competitorsMap.get(m.akaId) : undefined,
        ao: m.aoId ? competitorsMap.get(m.aoId) : undefined,
        winner: m.winnerId ? competitorsMap.get(m.winnerId) : undefined,
      }));

      setBracket({ ...data, matches: matchesWithComps });
    } catch (err) {
      console.error(err);
      toast.error("Erro ao carregar chave e lutas.");
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded-xl w-1/4" />
          <div className="h-4 bg-muted rounded-xl w-1/3" />
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

  // Ordenar matches dentro de cada rodada por position
  Object.values(matchesByRound).forEach((matches) => {
    matches.sort((a, b) => a.position - b.position);
  });

  const rounds = Object.keys(matchesByRound)
    .map(Number)
    .sort((a, b) => a - b);

  // Encontrar matches especiais
  const thirdPlaceMatch = bracket.matches.find((m) => m.isThirdPlace);
  const finalMatch = bracket.matches.find(
    (m) => m.round === bracket.totalRounds && !m.isThirdPlace,
  );

  const champion = finalMatch?.winner;

  return (
    <div className="container mx-auto p-6 print:p-0">
      {/* Header */}
      <div className="mb-6 flex items-center gap-4">
        <Link
          href={`/app/${resolvedParams?.tournamentId}/brackets`}
          className="print:hidden"
        >
          <Button variant="ghost" size="icon">
            <ArrowLeft />
          </Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold font-mono">{bracket.category}</h1>
          <div className="flex items-center gap-2 mt-1">
            <Badge variant="secondary">{bracket.modality}</Badge>
            <Badge
              variant="outline"
              className={cn(
                bracket.status === "IN_PROGRESS" &&
                  "border-blue-500/40 bg-blue-500/10 text-blue-600 dark:text-blue-400",
                bracket.status === "COMPLETED" &&
                  "border-green-500/40 bg-green-500/10 text-green-600 dark:text-green-400",
                bracket.status === "NOT_STARTED" && "text-muted-foreground",
              )}
            >
              {bracket.status === "NOT_STARTED" && "Não iniciado"}
              {bracket.status === "IN_PROGRESS" && "Em andamento"}
              {bracket.status === "COMPLETED" && "Concluído"}
            </Badge>
            <span className="text-sm text-muted-foreground">
              {bracket.totalSlots} vagas • {bracket.totalRounds} rodadas
            </span>
          </div>
        </div>

        <Button asChild variant="outline" className="print:hidden">
          <Link
            href={`/app/${resolvedParams?.tournamentId}/brackets/${resolvedParams?.bracketId}/referee`}
          >
            <Flag />
            Painel de Árbitro
          </Link>
        </Button>

        {/* Campeão */}
        {champion && (
          <Card className="bg-yellow-50 border-yellow-200 dark:bg-yellow-950 dark:border-yellow-800 p-0">
            <CardContent className="p-4 flex items-center gap-3">
              <Trophy className="h-6 w-6 text-yellow-600 dark:text-yellow-400" />
              <div>
                <p className="text-xs font-semibold text-yellow-800 dark:text-yellow-300">
                  CAMPEÃO
                </p>
                <p className="font-bold text-sm">{champion.name}</p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Tabs: Chave Visual vs Lista */}
      <Tabs defaultValue="bracket" className="w-full">
        <TabsList className="grid w-full grid-cols-2 max-w-md print:hidden">
          <TabsTrigger value="bracket">Visualização de Chave</TabsTrigger>
          <TabsTrigger value="list">Lista de Lutas</TabsTrigger>
        </TabsList>

        {/* Visualização de Chave */}
        <TabsContent value="bracket" className="mt-6 print:block">
          <Card>
            <CardContent className="p-6 overflow-x-auto">
              <div className="flex min-w-max pb-12">
                {/* Adicionado pb-12 para scroll seguro */}
                {rounds.map((roundNum, index) => {
                  const roundMatches = matchesByRound[roundNum].filter(
                    (m) => !m.isThirdPlace,
                  );
                  const isFinal = roundNum === bracket.totalRounds;

                  // Calcular geometria para CSS
                  const { pitch, offset } = getRoundGeometry(index);

                  // Padding Top: Onde começa o primeiro card (centro - metade da altura do card)
                  const paddingTop = offset - MATCH_HEIGHT / 2;

                  // Gap: Distância entre centros (pitch) - altura do card
                  const gap = pitch - MATCH_HEIGHT;

                  return (
                    <div key={roundNum} className="flex">
                      <div className="flex flex-col w-56">
                        {" "}
                        {/* Largura fixa para coluna */}
                        {/* Título da Rodada */}
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
                        {/* Container das Lutas com espaçamento calculado */}
                        <div
                          className="flex flex-col"
                          style={{
                            paddingTop: `${paddingTop}px`,
                            gap: `${gap}px`,
                          }}
                        >
                          {roundMatches.map((match) => (
                            <div key={match.id} className="h-[128px]">
                              {" "}
                              {/* Força altura exata */}
                              <MatchCard
                                key={match.id}
                                match={match}
                                onRefresh={fetchData}
                                onOpenResult={handleOpenResult}
                              />
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Linhas de Conexão (exceto após a final) */}
                      {!isFinal && (
                        <div className="mt-12">
                          {/* mt-12 para compensar o header do título */}
                          <BracketConnectors
                            roundIndex={index} // Passamos o índice 0-based
                            numMatches={roundMatches.length}
                          />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Match de 3º Lugar */}
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
                      onRefresh={fetchData}
                      isThirdPlace
                      onOpenResult={handleOpenResult}
                    />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Lista de Lutas */}
        <TabsContent value="list" className="mt-6">
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
                <CardContent className="space-y-3">
                  {matchesByRound[roundNum]
                    .filter((m) => !m.isThirdPlace)
                    .map((match, idx) => (
                      <div
                        key={match.id}
                        className="flex items-center justify-between p-3 border rounded-lg"
                      >
                        <div className="flex items-center gap-4 flex-1">
                          <span className="text-sm font-medium text-muted-foreground">
                            #{idx + 1}
                          </span>
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span
                                className={
                                  match.winnerId !== null &&
                                  match.winnerId === match.akaId
                                    ? "font-bold"
                                    : ""
                                }
                              >
                                {match.aka?.name || "—"}
                              </span>
                              {match.winnerId !== null &&
                                match.winnerId === match.akaId && (
                                  <Trophy className="h-4 w-4 text-yellow-600" />
                                )}
                            </div>
                            <div className="flex items-center gap-2">
                              <span
                                className={
                                  match.winnerId !== null &&
                                  match.winnerId === match.aoId
                                    ? "font-bold"
                                    : ""
                                }
                              >
                                {match.ao?.name || "—"}
                              </span>
                              {match.winnerId !== null &&
                                match.winnerId === match.aoId && (
                                  <Trophy className="h-4 w-4 text-yellow-600" />
                                )}
                            </div>
                          </div>
                          {match.isCompleted && (
                            <Badge variant="secondary">
                              {match.akaScore ?? 0} x {match.aoScore ?? 0}
                            </Badge>
                          )}
                        </div>
                      </div>
                    ))}
                </CardContent>
              </Card>
            ))}

            {/* 3º Lugar na lista */}
            {thirdPlaceMatch && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Medal className="h-5 w-5 text-amber-600" />
                    Disputa de 3º Lugar
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-4 flex-1">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span
                            className={
                              thirdPlaceMatch.winnerId !== null &&
                              thirdPlaceMatch.winnerId === thirdPlaceMatch.akaId
                                ? "font-bold"
                                : ""
                            }
                          >
                            {thirdPlaceMatch.aka?.name || "—"}
                          </span>
                          {thirdPlaceMatch.winnerId !== null &&
                            thirdPlaceMatch.winnerId ===
                              thirdPlaceMatch.akaId && (
                              <Trophy className="h-4 w-4 text-amber-600" />
                            )}
                        </div>
                        <div className="flex items-center gap-2">
                          <span
                            className={
                              thirdPlaceMatch.winnerId !== null &&
                              thirdPlaceMatch.winnerId === thirdPlaceMatch.aoId
                                ? "font-bold"
                                : ""
                            }
                          >
                            {thirdPlaceMatch.ao?.name || "—"}
                          </span>
                          {thirdPlaceMatch.winnerId !== null &&
                            thirdPlaceMatch.winnerId ===
                              thirdPlaceMatch.aoId && (
                              <Trophy className="h-4 w-4 text-amber-600" />
                            )}
                        </div>
                      </div>
                      {thirdPlaceMatch.isCompleted && (
                        <Badge variant="secondary">
                          {thirdPlaceMatch.akaScore ?? 0} x{" "}
                          {thirdPlaceMatch.aoScore ?? 0}
                        </Badge>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>
      </Tabs>

      <MatchResultDialog
        match={selectedMatch}
        open={resultDialogOpen}
        onOpenChange={setResultDialogOpen}
        onSuccess={fetchData}
        tournamentId={resolvedParams?.tournamentId!}
        bracketId={resolvedParams?.bracketId!}
      />
    </div>
  );
}

// Componente de Match Card
function MatchCard({
  match,
  onOpenResult,
}: {
  match: MatchWithCompetitors;
  onRefresh?: () => void;
  onOpenResult: (match: MatchWithCompetitors) => void;
  isThirdPlace?: boolean;
}) {
  const canEdit = match.aka && match.ao && !match.isBye;
  const isCompleted = match.isCompleted;
  const isReady = canEdit && !isCompleted;

  return (
    <Card
      className={cn(
        "w-56 p-0 z-10 transition-all",
        match.isBye && "bg-muted/50",
        isCompleted && "border-green-500/40",
        isReady &&
          "cursor-pointer hover:shadow-lg hover:scale-105 border-blue-400/60",
        !canEdit && !match.isBye && "opacity-60",
      )}
      onClick={() => canEdit && onOpenResult(match)}
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
            {match.isCompleted && (
              <span className="text-sm font-mono ml-2">
                {match.akaScore ?? 0}
              </span>
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
            {match.isCompleted && (
              <span className="text-sm font-mono ml-2">
                {match.aoScore ?? 0}
              </span>
            )}
          </div>
          {match.ao && (
            <div className="text-xs text-muted-foreground mt-1 truncate">
              {match.ao.school}
            </div>
          )}
        </div>

        {/* Bye Badge */}
        {match.isBye && (
          <div className="absolute inset-0 flex items-center justify-center bg-muted/80 rounded-lg">
            <Badge variant="secondary">BYE</Badge>
          </div>
        )}

        {/* Status indicator */}
        {isReady && (
          <div className="absolute top-2 right-2 flex items-center gap-1">
            <div className="h-2 w-2 bg-blue-500 rounded-full animate-pulse" />
          </div>
        )}
      </CardContent>
    </Card>
  );
}

const MATCH_HEIGHT = 128; // h-32 (64px * 2)
const BASE_GAP = 24; // gap-6 (24px)

// Função para calcular a geometria de cada rodada
function getRoundGeometry(roundIndex: number) {
  // roundIndex deve ser 0 para a primeira rodada, 1 para a segunda, etc.

  // A distância entre o centro de uma luta e o centro da próxima (Pitch)
  // Rodada 0: 152px, Rodada 1: 304px, etc.
  const pitch = (MATCH_HEIGHT + BASE_GAP) * Math.pow(2, roundIndex);

  // O deslocamento do topo até o centro da primeira luta
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

  // Altura total necessária para o SVG
  const totalHeight = offset + (numMatches - 1) * pitch + offset; // margem de segurança

  // Número de conexões é metade do número de lutas desta rodada
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
          // Coordenada Y do centro da luta superior (Aka vs Ao 1)
          const y1 = offset + i * 2 * pitch;
          // Coordenada Y do centro da luta inferior (Aka vs Ao 2)
          const y2 = offset + (i * 2 + 1) * pitch;
          // Ponto médio (para onde vai a linha da próxima rodada)
          const yMid = (y1 + y2) / 2;

          return (
            <g key={i}>
              {/* Linha saindo da luta superior */}
              <path
                d={`M 0 ${y1} L 24 ${y1} L 24 ${yMid}`}
                fill="none"
                stroke="currentColor"
                strokeWidth="1"
              />

              {/* Linha saindo da luta inferior */}
              <path
                d={`M 0 ${y2} L 24 ${y2} L 24 ${yMid}`}
                fill="none"
                stroke="currentColor"
                strokeWidth="1"
              />

              {/* Linha horizontal indo para a direita (próxima rodada) */}
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
