"use client";

import { useEffect, useState } from "react";
import { Match, Competitor, Bracket } from "@prisma/client";
import { toast } from "sonner";
import {
  Play,
  Pause,
  RotateCcw,
  Save,
  ArrowLeft,
  CheckCircle,
  Loader2,
  Trophy,
} from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useHotkeys } from "react-hotkeys-hook";
import { cn } from "@/lib/utils";
import { Spinner } from "@/components/luxe/spinner";

type MatchWithCompetitors = Match & {
  aka?: Competitor;
  ao?: Competitor;
  bracket?: Bracket;
};

type LiveMatchState = {
  akaScore: number;
  aoScore: number;
  akaChui: number;
  aoChui: number;
  akaSenshu: boolean;
  aoSenshu: boolean;
  timeRemaining: number;
  timerRunning: boolean;
};

export default function RefereePage({
  params,
}: {
  params: Promise<{ tournamentId: string; bracketId: string }>;
}) {
  const [resolvedParams, setResolvedParams] = useState<{
    tournamentId: string;
    bracketId: string;
  } | null>(null);

  const [currentMatch, setCurrentMatch] = useState<MatchWithCompetitors | null>(
    null
  );
  const [allMatches, setAllMatches] = useState<MatchWithCompetitors[]>([]);
  const [bracket, setBracket] = useState<Bracket | null>(null);
  const [liveState, setLiveState] = useState<LiveMatchState>({
    akaScore: 0,
    aoScore: 0,
    akaChui: 0,
    aoChui: 0,
    akaSenshu: false,
    aoSenshu: false,
    timeRemaining: 120,
    timerRunning: false,
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useHotkeys(
    "space",
    () => {
      setLiveState((prev) => ({
        ...prev,
        timerRunning: !prev.timerRunning,
      }));
    },
    {
      preventDefault: true,
      enableOnFormTags: true,
      enableOnContentEditable: true,
    }
  );

  useEffect(() => {
    params.then((p) => setResolvedParams(p));
  }, [params]);

  useEffect(() => {
    if (!resolvedParams) return;
    loadData();
  }, [resolvedParams]);

  useEffect(() => {
    if (!liveState.timerRunning || liveState.timeRemaining <= 0) return;

    const interval = setInterval(() => {
      setLiveState((prev) => ({
        ...prev,
        timeRemaining: Math.max(0, prev.timeRemaining - 1),
      }));
    }, 1000);

    return () => clearInterval(interval);
  }, [liveState.timerRunning, liveState.timeRemaining]);

  useEffect(() => {
    if (!currentMatch || !currentMatch.aka || !currentMatch.ao) return;
    broadcastState();
  }, [liveState, currentMatch]);

  async function loadData() {
    try {
      setLoading(true);

      // Buscar bracket
      const bracketRes = await fetch(
        `/api/tournaments/${resolvedParams!.tournamentId}/brackets/${
          resolvedParams!.bracketId
        }`
      );
      const bracketData = await bracketRes.json();
      setBracket(bracketData);

      // Buscar competidores
      const compRes = await fetch(
        `/api/tournaments/${resolvedParams!.tournamentId}/competitors`
      );
      const competitors: Competitor[] = await compRes.json();
      const competitorsMap = new Map(competitors.map((c) => [c.id, c]));

      // Mapear matches com competidores
      const matchesWithComps: MatchWithCompetitors[] = bracketData.matches
        .filter((m: Match) => !m.isBye && m.akaId && m.aoId)
        .map((m: Match) => ({
          ...m,
          aka: m.akaId ? competitorsMap.get(m.akaId) : undefined,
          ao: m.aoId ? competitorsMap.get(m.aoId) : undefined,
          bracket: bracketData,
        }));

      setAllMatches(matchesWithComps);

      // Buscar próxima luta
      const nextMatch = matchesWithComps.find((m) => !m.isCompleted);
      if (nextMatch) {
        setCurrentMatch(nextMatch);
      } else {
        toast.info("Todas as lutas foram concluídas!");
        // Limpar live match
        await fetch(
          `/api/live-match?tournamentId=${resolvedParams!.tournamentId}`,
          { method: "DELETE" }
        );
        setCurrentMatch(null);
      }
    } catch (error) {
      toast.error("Erro ao carregar dados");
    } finally {
      setLoading(false);
    }
  }

  async function broadcastState() {
    if (!currentMatch || !currentMatch.aka || !currentMatch.ao || !bracket)
      return;

    try {
      await fetch(`/api/live-match`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tournamentId: resolvedParams!.tournamentId,
          matchId: currentMatch.id,
          bracketId: resolvedParams!.bracketId,
          akaId: currentMatch.akaId,
          akaName: currentMatch.aka.name,
          akaSchool: currentMatch.aka.school,
          aoId: currentMatch.aoId,
          aoName: currentMatch.ao.name,
          aoSchool: currentMatch.ao.school,
          category: bracket.category,
          modality: bracket.modality,
          round: currentMatch.round,
          position: currentMatch.position,
          ...liveState,
        }),
      });
    } catch (error) {
      console.error("Erro ao broadcast:", error);
    }
  }

  async function saveResult() {
    if (!currentMatch) return;

    const winnerId =
      liveState.akaScore > liveState.aoScore
        ? currentMatch.akaId
        : currentMatch.aoId;

    setSaving(true);

    try {
      await fetch(
        `/api/tournaments/${resolvedParams!.tournamentId}/brackets/${
          resolvedParams!.bracketId
        }/matches/${currentMatch.id}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            akaScore: liveState.akaScore,
            aoScore: liveState.aoScore,
            winnerId,
            decisionByHantei: liveState.akaScore === liveState.aoScore,
          }),
        }
      );

      // Recarregar dados
      await loadData();

      // Verificar se há mais lutas pendentes
      const hasMoreMatches = allMatches.some(
        (m) => !m.isCompleted && m.id !== currentMatch.id
      );

      // Se não houver mais lutas, limpar live match
      if (!hasMoreMatches) {
        await fetch(
          `/api/live-match?tournamentId=${resolvedParams!.tournamentId}`,
          { method: "DELETE" }
        );
      }

      toast.success("Resultado salvo!");
      resetState();
    } catch (error) {
      toast.error("Erro ao salvar resultado");
    } finally {
      setSaving(false);
    }
  }

  function resetState() {
    setLiveState({
      akaScore: 0,
      aoScore: 0,
      akaChui: 0,
      aoChui: 0,
      akaSenshu: false,
      aoSenshu: false,
      timeRemaining: 120,
      timerRunning: false,
    });
  }

  const minutes = Math.floor(liveState.timeRemaining / 60);
  const seconds = liveState.timeRemaining % 60;

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <Spinner />
      </div>
    );
  }

  if (!currentMatch || !currentMatch.aka || !currentMatch.ao) {
    // Calcular estatísticas
    const completedMatches = allMatches.filter((m) => m.isCompleted);
    const totalMatches = allMatches.length;

    return (
      <div className="flex items-center justify-center p-6">
        <Card className="max-w-2xl w-full">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center">
              <CheckCircle className="h-10 w-10 text-green-600 dark:text-green-400" />
            </div>
            <CardTitle className="text-3xl">Chave Concluída!</CardTitle>
            <p className="text-muted-foreground mt-2">
              Todas as lutas desta chave foram finalizadas
            </p>
          </CardHeader>

          <CardContent className="space-y-6">
            {/* Estatísticas */}
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center p-4 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground mb-1">
                  Total de Lutas
                </p>
                <p className="text-3xl font-bold">{totalMatches}</p>
              </div>
              <div className="text-center p-4 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground mb-1">Concluídas</p>
                <p className="text-3xl font-bold text-green-600">
                  {completedMatches.length}
                </p>
              </div>
            </div>

            {/* Info da Chave */}
            <div className="border rounded-lg p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">
                  Modalidade:
                </span>
                <Badge variant="secondary">{bracket?.modality}</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">
                  Categoria:
                </span>
                <span className="font-mono text-sm">{bracket?.category}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Status:</span>
                <Badge className="bg-green-600">
                  {bracket?.status === "COMPLETED" ? "Concluída" : "Finalizada"}
                </Badge>
              </div>
            </div>

            {/* Resumo das Lutas */}
            <div>
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <Trophy className="h-5 w-5" />
                Resumo das Lutas
              </h3>
              <div className="space-y-2 max-h-[300px] overflow-y-auto">
                {completedMatches.map((match) => (
                  <div
                    key={match.id}
                    className="flex items-center justify-between p-3 bg-muted rounded-lg text-sm"
                  >
                    <div className="flex-1">
                      <div className="font-medium">
                        {match.aka?.name} vs {match.ao?.name}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Rodada {match.round} - Luta {match.position + 1}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-mono font-bold">
                        {match.akaScore} x {match.aoScore}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Vencedor:{" "}
                        {match.winnerId === match.akaId ? "AKA" : "AO"}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Botões */}
            <div className="flex gap-3 pt-4">
              <Link
                href={`/app/${resolvedParams?.tournamentId}/brackets/${resolvedParams?.bracketId}`}
                className="flex-1"
              >
                <Button className="w-full" size="lg">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Ver Chave Completa
                </Button>
              </Link>
              <Link
                href={`/app/${resolvedParams?.tournamentId}/brackets`}
                className="flex-1"
              >
                <Button variant="outline" className="w-full" size="lg">
                  Voltar para Chaves
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <Link
            href={`/app/${resolvedParams?.tournamentId}/brackets/${resolvedParams?.bracketId}`}
          >
            <Button variant="ghost" size="icon">
              <ArrowLeft />
            </Button>
          </Link>

          <div className="text-center flex-1">
            <h1 className="text-2xl font-bold">Painel do Árbitro</h1>
            <div className="flex items-center justify-center gap-2 mt-1">
              <Badge variant="secondary">{bracket?.modality || "N/A"}</Badge>
              <span className="text-sm text-muted-foreground">
                {bracket?.category || "N/A"}
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Rodada {currentMatch.round} - Luta {currentMatch.position + 1}
            </p>
          </div>

          <Link
            href={`/app/${resolvedParams?.tournamentId}/scoreboard`}
            target="_blank"
          >
            <Button variant="outline">Ver Scoreboard</Button>
          </Link>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Painel Principal */}
          <div className="lg:col-span-2 space-y-6">
            {/* Timer */}
            <Card className="p-0">
              <CardContent className="p-8">
                <div className="flex items-center justify-center gap-6">
                  <Button
                    size="lg"
                    variant="outline"
                    onClick={() =>
                      setLiveState((prev) => ({
                        ...prev,
                        timerRunning: !prev.timerRunning,
                      }))
                    }
                  >
                    {liveState.timerRunning ? (
                      <Pause className="h-6 w-6" />
                    ) : (
                      <Play className="h-6 w-6" />
                    )}
                  </Button>

                  <div
                    className={cn(
                      "text-8xl font-mono font-semibold",
                      liveState.timerRunning
                        ? "text-foreground"
                        : "text-muted-foreground"
                    )}
                  >
                    {String(minutes).padStart(2, "0")}:
                    {String(seconds).padStart(2, "0")}
                  </div>

                  <Button
                    size="lg"
                    variant="outline"
                    onClick={() =>
                      setLiveState((prev) => ({ ...prev, timeRemaining: 120 }))
                    }
                  >
                    <RotateCcw className="h-6 w-6" />
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Competitors */}
            <div className="grid grid-cols-2 gap-6">
              {/* AKA */}
              <Card className="border-red-500 border-2 p-0">
                <CardContent className="p-6 space-y-6">
                  <div>
                    <Badge className="bg-red-500 mb-2">AKA</Badge>
                    <h2 className="text-3xl font-bold">
                      {currentMatch.aka.name}
                    </h2>
                    <p className="text-muted-foreground">
                      {currentMatch.aka.school}
                    </p>
                  </div>

                  <div className="flex items-center justify-between">
                    <Button
                      size="lg"
                      variant="outline"
                      onClick={() =>
                        setLiveState((prev) => ({
                          ...prev,
                          akaScore: Math.max(0, prev.akaScore - 1),
                        }))
                      }
                    >
                      -1
                    </Button>
                    <div className="text-8xl font-bold">
                      {liveState.akaScore}
                    </div>
                    <Button
                      size="lg"
                      onClick={() =>
                        setLiveState((prev) => ({
                          ...prev,
                          akaScore: prev.akaScore + 1,
                        }))
                      }
                    >
                      +1
                    </Button>
                  </div>

                  <div>
                    <p className="text-sm text-muted-foreground mb-2">
                      Penalidades (Chui)
                    </p>
                    <div className="flex gap-2">
                      {[1, 2, 3, 4].map((level) => (
                        <Button
                          key={level}
                          size="sm"
                          variant={
                            liveState.akaChui >= level ? "default" : "outline"
                          }
                          onClick={() =>
                            setLiveState((prev) => ({
                              ...prev,
                              akaChui:
                                prev.akaChui === level ? level - 1 : level,
                            }))
                          }
                        >
                          {level}
                        </Button>
                      ))}
                    </div>
                  </div>

                  <Button
                    variant={liveState.akaSenshu ? "default" : "outline"}
                    className="w-full"
                    onClick={() =>
                      setLiveState((prev) => ({
                        ...prev,
                        akaSenshu: !prev.akaSenshu,
                      }))
                    }
                  >
                    Senshu
                  </Button>
                </CardContent>
              </Card>

              {/* AO */}
              <Card className="border-blue-500 border-2 p-0">
                <CardContent className="p-6 space-y-6">
                  <div>
                    <Badge className="bg-blue-500 mb-2">AO</Badge>
                    <h2 className="text-3xl font-bold">
                      {currentMatch.ao.name}
                    </h2>
                    <p className="text-muted-foreground">
                      {currentMatch.ao.school}
                    </p>
                  </div>

                  <div className="flex items-center justify-between">
                    <Button
                      size="lg"
                      variant="outline"
                      onClick={() =>
                        setLiveState((prev) => ({
                          ...prev,
                          aoScore: Math.max(0, prev.aoScore - 1),
                        }))
                      }
                    >
                      -1
                    </Button>
                    <div className="text-8xl font-bold">
                      {liveState.aoScore}
                    </div>
                    <Button
                      size="lg"
                      onClick={() =>
                        setLiveState((prev) => ({
                          ...prev,
                          aoScore: prev.aoScore + 1,
                        }))
                      }
                    >
                      +1
                    </Button>
                  </div>

                  <div>
                    <p className="text-sm text-muted-foreground mb-2">
                      Penalidades (Chui)
                    </p>
                    <div className="flex gap-2">
                      {[1, 2, 3, 4].map((level) => (
                        <Button
                          key={level}
                          size="sm"
                          variant={
                            liveState.aoChui >= level ? "default" : "outline"
                          }
                          onClick={() =>
                            setLiveState((prev) => ({
                              ...prev,
                              aoChui: prev.aoChui === level ? level - 1 : level,
                            }))
                          }
                        >
                          {level}
                        </Button>
                      ))}
                    </div>
                  </div>

                  <Button
                    variant={liveState.aoSenshu ? "default" : "outline"}
                    className="w-full"
                    onClick={() =>
                      setLiveState((prev) => ({
                        ...prev,
                        aoSenshu: !prev.aoSenshu,
                      }))
                    }
                  >
                    Senshu
                  </Button>
                </CardContent>
              </Card>
            </div>

            {/* Actions */}
            <div className="flex gap-4">
              <Button
                size="lg"
                variant="outline"
                className="flex-1"
                onClick={resetState}
                disabled={saving}
              >
                <RotateCcw className="mr-2 h-4 w-4" />
                Reiniciar
              </Button>
              <Button
                size="lg"
                className="flex-1"
                onClick={saveResult}
                disabled={saving}
              >
                {saving ? (
                  <>
                    <Loader2 className="animate-spin" />
                    Salvando...
                  </>
                ) : (
                  <>
                    <Save />
                    Salvar e Próxima
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* Sidebar - Lista de Lutas */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Lutas da Chave</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 max-h-[600px] overflow-y-auto">
                {allMatches.map((match, index) => (
                  <div
                    key={match.id}
                    className={cn(
                      "p-3 rounded-lg border text-sm",
                      match.id === currentMatch.id
                        ? "border-primary bg-primary/5"
                        : match.isCompleted
                        ? "border-green-500/30 bg-green-500/5"
                        : "border-border"
                    )}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-muted-foreground">
                        R{match.round} - L{match.position + 1}
                      </span>
                      {match.isCompleted && (
                        <CheckCircle className="h-3 w-3 text-green-600" />
                      )}
                      {match.id === currentMatch.id && (
                        <Badge variant="default" className="text-xs">
                          Atual
                        </Badge>
                      )}
                    </div>
                    <div className="font-medium">{match.aka?.name}</div>
                    <div className="text-muted-foreground text-xs">vs</div>
                    <div className="font-medium">{match.ao?.name}</div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
