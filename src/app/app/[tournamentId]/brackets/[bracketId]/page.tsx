"use client";

import { useEffect, useState } from "react";
import { Match, Bracket, Competitor } from "@prisma/client";
import { toast } from "sonner";
import { ArrowLeft, Trophy, Medal } from "lucide-react";
import Link from "next/link";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

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
        }`
      );
      if (!res.ok) throw new Error("Falha ao buscar chave");
      const data = await res.json();

      // Fetch competitors
      const compRes = await fetch(
        `/api/tournaments/${resolvedParams!.tournamentId}/competitors`
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
    (m) => m.round === bracket.totalRounds && !m.isThirdPlace
  );

  const champion = finalMatch?.winner;
  const thirdPlace = thirdPlaceMatch?.winner;

  return (
    <div className="container mx-auto p-6">
      {/* Header */}
      <div className="mb-6 flex items-center gap-4">
        <Link href={`/app/${resolvedParams?.tournamentId}/brackets`}>
          <Button variant="ghost" size="icon">
            <ArrowLeft />
          </Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold font-mono">{bracket.category}</h1>
          <div className="flex items-center gap-2 mt-1">
            <Badge
              variant="secondary"
              className={
                bracket.modality === "KATA"
                  ? "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
                  : "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
              }
            >
              {bracket.modality}
            </Badge>
            <span className="text-sm text-muted-foreground">
              {bracket.totalSlots} vagas • {bracket.totalRounds} rodadas
            </span>
          </div>
        </div>

        {/* Campeão */}
        {champion && (
          <Card className="bg-yellow-50 border-yellow-200 dark:bg-yellow-950 dark:border-yellow-800">
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
        <TabsList className="grid w-full grid-cols-2 max-w-md">
          <TabsTrigger value="bracket">Visualização de Chave</TabsTrigger>
          <TabsTrigger value="list">Lista de Lutas</TabsTrigger>
        </TabsList>

        {/* Visualização de Chave */}
        <TabsContent value="bracket" className="mt-6">
          <Card>
            <CardContent className="p-6 overflow-x-auto">
              <div className="flex gap-12 min-w-max">
                {rounds.map((roundNum) => {
                  const roundMatches = matchesByRound[roundNum].filter(
                    (m) => !m.isThirdPlace
                  );
                  const isFirstRound = roundNum === 1;
                  const isFinal = roundNum === bracket.totalRounds;

                  return (
                    <div key={roundNum} className="flex flex-col gap-6">
                      {/* Título da Rodada */}
                      <div className="text-center">
                        <Badge variant="secondary" className="font-semibold">
                          {isFinal
                            ? "FINAL"
                            : roundNum === bracket.totalRounds - 1
                            ? "SEMIFINAL"
                            : roundNum === bracket.totalRounds - 2
                            ? "QUARTAS"
                            : `RODADA ${roundNum}`}
                        </Badge>
                      </div>

                      {/* Matches */}
                      <div className="flex flex-col gap-6 h-full justify-around">
                        {roundMatches.map((match) => (
                          <MatchCard
                            key={match.id}
                            match={match}
                            onRefresh={fetchData}
                          />
                        ))}
                      </div>
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
                                  match.winnerId === match.akaId
                                    ? "font-bold"
                                    : ""
                                }
                              >
                                {match.aka?.name || "—"}
                              </span>
                              {match.winnerId === match.akaId && (
                                <Trophy className="h-4 w-4 text-yellow-600" />
                              )}
                            </div>
                            <div className="flex items-center gap-2">
                              <span
                                className={
                                  match.winnerId === match.aoId
                                    ? "font-bold"
                                    : ""
                                }
                              >
                                {match.ao?.name || "—"}
                              </span>
                              {match.winnerId === match.aoId && (
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
                              thirdPlaceMatch.winnerId === thirdPlaceMatch.akaId
                                ? "font-bold"
                                : ""
                            }
                          >
                            {thirdPlaceMatch.aka?.name || "—"}
                          </span>
                          {thirdPlaceMatch.winnerId ===
                            thirdPlaceMatch.akaId && (
                            <Trophy className="h-4 w-4 text-amber-600" />
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <span
                            className={
                              thirdPlaceMatch.winnerId === thirdPlaceMatch.aoId
                                ? "font-bold"
                                : ""
                            }
                          >
                            {thirdPlaceMatch.ao?.name || "—"}
                          </span>
                          {thirdPlaceMatch.winnerId ===
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
    </div>
  );
}

// Componente de Match Card
function MatchCard({
  match,
  onRefresh,
  isThirdPlace = false,
}: {
  match: MatchWithCompetitors;
  onRefresh: () => void;
  isThirdPlace?: boolean;
}) {
  return (
    <Card
      className={`w-56 p-0 ${
        match.isBye ? "bg-muted/50" : "hover:shadow-md transition-shadow"
      }`}
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
      </CardContent>
    </Card>
  );
}
