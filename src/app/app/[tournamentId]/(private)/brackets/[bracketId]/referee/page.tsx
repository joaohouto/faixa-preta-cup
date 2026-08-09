"use client";

import { Suspense, use, useEffect, useState, useRef, useCallback } from "react";
import { Match, Competitor, Bracket } from "@prisma/client";
import { toast } from "sonner";
import {
  Play,
  Pause,
  RotateCcw,
  Save,
  ArrowLeft,
  Loader2,
  Presentation,
} from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Kbd } from "@/components/ui/kbd";
import { useHotkeys } from "react-hotkeys-hook";
import { cn } from "@/lib/utils";
import { fetchJson } from "@/lib/api-client";
import { Spinner } from "@/components/luxe/spinner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

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
  // -1 = sem tempo definido
  timeRemaining: number;
  timerRunning: boolean;
};

const INITIAL_STATE: LiveMatchState = {
  akaScore: 0,
  aoScore: 0,
  akaChui: 0,
  aoChui: 0,
  akaSenshu: false,
  aoSenshu: false,
  timeRemaining: -1,
  timerRunning: false,
};

const TIME_OPTIONS = [
  { label: "--:--", value: -1 },
  { label: "1 minuto", value: 60 },
  { label: "1:30 minutos", value: 90 },
  { label: "2 minutos", value: 120 },
  { label: "2:30 minutos", value: 150 },
  { label: "3 minutos", value: 180 },
];

function getMatchTypeLabel(
  match: MatchWithCompetitors,
  bracket: Bracket | null,
): string {
  if (!bracket) return "";
  if (match.isThirdPlace) return "3º LUGAR";
  if (match.round === bracket.totalRounds) return "FINAL";
  if (match.round === bracket.totalRounds - 1) return "SEMIFINAL";
  return "";
}

// ── Outer page: Suspense boundary fixes useSearchParams hydration loop ───────

export default function RefereePage({
  params,
}: {
  params: Promise<{ tournamentId: string; bracketId: string }>;
}) {
  return (
    <Suspense
      fallback={
        <div className="h-screen flex items-center justify-center">
          <Spinner />
        </div>
      }
    >
      <RefereePageContent params={params} />
    </Suspense>
  );
}

// ── Inner page: full referee logic ───────────────────────────────────────────

function RefereePageContent({
  params,
}: {
  params: Promise<{ tournamentId: string; bracketId: string }>;
}) {
  const { tournamentId, bracketId } = use(params);
  const router = useRouter();
  const searchParams = useSearchParams();
  const matchId = searchParams.get("matchId");

  const [currentMatch, setCurrentMatch] = useState<MatchWithCompetitors | null>(
    null,
  );
  const [bracket, setBracket] = useState<Bracket | null>(null);
  const [liveState, setLiveState] = useState<LiveMatchState>(INITIAL_STATE);
  const [selectedDuration, setSelectedDuration] = useState(-1);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showWinnerDialog, setShowWinnerDialog] = useState(false);
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
  const [woTarget, setWoTarget] = useState<"aka" | "ao" | null>(null);

  // Refs for stable broadcast — reads latest values without stale closures
  const liveStateRef = useRef(liveState);
  const currentMatchRef = useRef(currentMatch);
  const bracketRef = useRef(bracket);
  const routeRef = useRef({ tournamentId, bracketId });
  const announcedWinnerRef = useRef<"aka" | "ao" | null>(null);
  const broadcastDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const broadcastAbortRef = useRef<AbortController | null>(null);
  const timerEndAtRef = useRef<number | null>(null);
  const isNavigatingRef = useRef(false);
  const historyGuardArmedRef = useRef(false);
  const bypassGuardRef = useRef(false);

  // Keep refs in sync
  useEffect(() => {
    liveStateRef.current = liveState;
  }, [liveState]);
  useEffect(() => {
    currentMatchRef.current = currentMatch;
  }, [currentMatch]);
  useEffect(() => {
    bracketRef.current = bracket;
  }, [bracket]);

  // Compute absolute end timestamp whenever timer starts/stops
  useEffect(() => {
    if (liveState.timerRunning && liveState.timeRemaining > 0) {
      timerEndAtRef.current = Date.now() + liveState.timeRemaining * 1000;
    } else {
      timerEndAtRef.current = null;
    }
  }, [liveState.timerRunning]);

  // Space = play/pause (only when there's a timer)
  useHotkeys(
    "space",
    () => {
      setLiveState((prev) => {
        if (prev.timeRemaining < 0) return prev;
        return { ...prev, timerRunning: !prev.timerRunning };
      });
    },
    {
      preventDefault: true,
      enableOnFormTags: true,
      enableOnContentEditable: true,
    },
  );

  // true se sair agora perderia placar ou timer não salvos
  function hasMatchProgress() {
    if (!currentMatchRef.current) return false;
    const state = liveStateRef.current;
    return (
      state.akaScore > 0 ||
      state.aoScore > 0 ||
      state.timerRunning ||
      state.timeRemaining > 0
    );
  }

  // Avisa antes de fechar/recarregar a aba com placar ou timer em andamento
  useEffect(() => {
    function handleBeforeUnload(e: BeforeUnloadEvent) {
      if (!hasMatchProgress()) return;
      e.preventDefault();
      e.returnValue = "";
    }
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, []);

  // Bloqueia o botão "voltar" do navegador enquanto há progresso não salvo.
  // Next.js não expõe um hook de "antes de navegar" para o App Router, então
  // usamos o truque clássico: empilha uma entrada extra no histórico assim
  // que há progresso, e todo popstate é interceptado — se ainda há
  // progresso, a gente reempilha (cancela a navegação) e mostra o dialog;
  // sem progresso, deixa o back seguir. `goBack`/`requestLeave` sabem lidar
  // com essa entrada extra (ver `historyGuardArmedRef`).
  useEffect(() => {
    function handlePopState() {
      if (bypassGuardRef.current) return;
      if (!historyGuardArmedRef.current) return;
      if (!hasMatchProgress()) {
        bypassGuardRef.current = true;
        isNavigatingRef.current = true;
        router.back();
        return;
      }
      window.history.pushState(null, "", window.location.href);
      setShowLeaveConfirm(true);
    }
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (
      (liveState.akaScore > 0 ||
        liveState.aoScore > 0 ||
        liveState.timerRunning ||
        liveState.timeRemaining > 0) &&
      !historyGuardArmedRef.current
    ) {
      window.history.pushState(null, "", window.location.href);
      historyGuardArmedRef.current = true;
    }
  }, [
    liveState.akaScore,
    liveState.aoScore,
    liveState.timerRunning,
    liveState.timeRemaining,
  ]);

  useEffect(() => {
    if (isNavigatingRef.current) return;
    if (!matchId) {
      router.replace(`/app/${tournamentId}/brackets/${bracketId}`);
      return;
    }
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [matchId]);

  // Cleanup live match on unmount
  useEffect(() => {
    return () => {
      const { tournamentId: tid } = routeRef.current;
      if (tid) {
        fetch(`/api/live-match?tournamentId=${tid}`, { method: "DELETE" });
      }
    };
  }, []);

  // Timer countdown — only depends on timerRunning; functional update reads current value
  useEffect(() => {
    if (!liveState.timerRunning) return;
    const interval = setInterval(() => {
      setLiveState((prev) => {
        if (prev.timeRemaining <= 0) return { ...prev, timerRunning: false };
        return { ...prev, timeRemaining: prev.timeRemaining - 1 };
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [liveState.timerRunning]);

  // Broadcast on score/penalty/senshu/play-pause changes
  useEffect(() => {
    if (!currentMatchRef.current?.aka || !currentMatchRef.current?.ao) return;
    scheduleBroadcast();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    liveState.akaScore,
    liveState.aoScore,
    liveState.akaChui,
    liveState.aoChui,
    liveState.akaSenshu,
    liveState.aoSenshu,
    liveState.timerRunning,
  ]);

  // Stable broadcast — reads from refs, so never stale
  const broadcastState = useCallback(async () => {
    const match = currentMatchRef.current;
    const br = bracketRef.current;
    const state = liveStateRef.current;
    const { tournamentId: tid, bracketId: bid } = routeRef.current;
    if (!match?.aka || !match?.ao || !br || !tid) return;

    if (broadcastDebounceRef.current) {
      clearTimeout(broadcastDebounceRef.current);
      broadcastDebounceRef.current = null;
    }
    broadcastAbortRef.current?.abort();
    const controller = new AbortController();
    broadcastAbortRef.current = controller;

    try {
      await fetch(`/api/live-match`, {
        method: "POST",
        signal: controller.signal,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tournamentId: tid,
          matchId: match.id,
          bracketId: bid,
          akaId: match.akaId,
          akaName: match.aka.name,
          akaSchool: match.aka.school,
          aoId: match.aoId,
          aoName: match.ao.name,
          aoSchool: match.ao.school,
          category: br.category,
          modality: br.modality,
          round: match.round,
          position: match.position,
          totalRounds: br.totalRounds,
          ...state,
          timerEndAt: timerEndAtRef.current,
          winner: announcedWinnerRef.current,
        }),
      });
    } catch (error) {
      if ((error as Error).name === "AbortError") return;
    }
  }, []);

  function scheduleBroadcast() {
    if (broadcastDebounceRef.current)
      clearTimeout(broadcastDebounceRef.current);
    broadcastDebounceRef.current = setTimeout(broadcastState, 50);
  }

  async function loadData() {
    try {
      setLoading(true);
      const { tournamentId: tid, bracketId: bid } = routeRef.current;

      const [bracketData, competitors] = await Promise.all([
        fetchJson<Bracket & { matches: Match[] }>(
          `/api/tournaments/${tid}/brackets/${bid}`,
        ),
        fetchJson<Competitor[]>(`/api/tournaments/${tid}/competitors`),
      ]);
      const competitorsMap = new Map(competitors.map((c) => [c.id, c]));

      setBracket(bracketData);

      const match = bracketData.matches.find((m: Match) => m.id === matchId);
      if (!match) {
        toast.error("Luta não encontrada");
        goBack();
        return;
      }

      const aka = match.akaId ? competitorsMap.get(match.akaId) : undefined;
      const ao = match.aoId ? competitorsMap.get(match.aoId) : undefined;

      setCurrentMatch({ ...match, aka, ao, bracket: bracketData });

      // Broadcast imediato para o scoreboard mostrar os dados ao abrir
      if (aka && ao) {
        fetch(`/api/live-match`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            tournamentId: tid,
            matchId: match.id,
            bracketId: bid,
            akaId: match.akaId,
            akaName: aka.name,
            akaSchool: aka.school,
            aoId: match.aoId,
            aoName: ao.name,
            aoSchool: ao.school,
            category: bracketData.category,
            modality: bracketData.modality,
            round: match.round,
            position: match.position,
            totalRounds: bracketData.totalRounds,
            ...INITIAL_STATE,
            winner: null,
          }),
        }).catch(() => {});
      }
    } catch {
      toast.error("Erro ao carregar dados");
    } finally {
      setLoading(false);
    }
  }

  // Sai de fato da página. Se o guard de histórico estiver armado (ver
  // useEffect acima), estamos numa entrada extra empilhada — um único
  // "back" só consumiria ela, então pula duas casas com `go(-2)`.
  function goBack() {
    isNavigatingRef.current = true;
    bypassGuardRef.current = true;
    if (historyGuardArmedRef.current) {
      window.history.go(-2);
    } else {
      router.back();
    }
  }

  // Placar/timer em andamento não devem ser perdidos por um clique sem querer
  function requestLeave() {
    if (!hasMatchProgress()) {
      goBack();
      return;
    }
    setShowLeaveConfirm(true);
  }

  async function saveResult() {
    if (!currentMatchRef.current) return;
    const state = liveStateRef.current;

    if (state.akaScore === state.aoScore) {
      setShowWinnerDialog(true);
      return;
    }

    const winnerId =
      state.akaScore > state.aoScore
        ? currentMatchRef.current.akaId!
        : currentMatchRef.current.aoId!;

    await finalizeSave(winnerId, false);
  }

  async function finalizeResult(winnerId: string, extra: Record<string, unknown>) {
    const match = currentMatchRef.current;
    const { tournamentId: tid, bracketId: bid } = routeRef.current;
    if (!match || !tid) return;

    setSaving(true);
    try {
      await fetchJson(
        `/api/tournaments/${tid}/brackets/${bid}/matches/${match.id}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ winnerId, ...extra }),
        },
      );

      const winningSide = winnerId === match.akaId ? "aka" : "ao";
      announcedWinnerRef.current = winningSide;
      await broadcastState();
      await new Promise((r) => setTimeout(r, 3000));
      announcedWinnerRef.current = null;

      toast.success("Resultado salvo!");
      setShowWinnerDialog(false);
      setWoTarget(null);
      goBack();
    } catch (error: any) {
      toast.error(error.message || "Erro ao salvar resultado");
    } finally {
      setSaving(false);
    }
  }

  function finalizeSave(winnerId: string, hantei: boolean) {
    const state = liveStateRef.current;
    return finalizeResult(winnerId, {
      akaScore: state.akaScore,
      aoScore: state.aoScore,
      decisionByHantei: hantei,
      akaSenshu: state.akaSenshu,
      aoSenshu: state.aoSenshu,
    });
  }

  // W.O.: os dois competidores estavam escalados, mas um não compareceu.
  // Diferente do bye (estrutural, decidido na geração da chave), aqui o
  // árbitro decide na hora, sem placar nenhum.
  function finalizeWalkover(absentSide: "aka" | "ao") {
    const match = currentMatchRef.current;
    if (!match) return;
    const winnerId = absentSide === "aka" ? match.aoId : match.akaId;
    if (!winnerId) return;
    return finalizeResult(winnerId, { isWalkover: true });
  }

  function handleTimeChange(value: string) {
    const newTime = parseInt(value);
    setSelectedDuration(newTime);
    setLiveState((prev) => ({
      ...prev,
      timeRemaining: newTime,
      timerRunning: false,
    }));
    // Update ref immediately so broadcast reads the new time, not the stale one
    liveStateRef.current = {
      ...liveStateRef.current,
      timeRemaining: newTime,
      timerRunning: false,
    };
    scheduleBroadcast();
    // Blur the trigger so Space hotkey starts the timer instead of reopening the select
    (document.activeElement as HTMLElement)?.blur();
  }

  function resetState() {
    const newState = { ...INITIAL_STATE, timeRemaining: selectedDuration };
    setLiveState(newState);
    liveStateRef.current = newState;
    scheduleBroadcast();
  }

  const hasTimer = liveState.timeRemaining >= 0;
  const minutes = hasTimer ? Math.floor(liveState.timeRemaining / 60) : null;
  const seconds = hasTimer ? liveState.timeRemaining % 60 : null;

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <Spinner />
      </div>
    );
  }

  if (!currentMatch || !currentMatch.aka || !currentMatch.ao) {
    return (
      <div className="flex items-center justify-center p-6">
        <Card className="max-w-md w-full">
          <CardContent className="py-12 text-center space-y-4">
            <p className="text-muted-foreground">
              Luta não disponível para arbitragem.
            </p>
            <Button onClick={goBack} variant="outline">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Voltar para a Chave
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const matchTypeLabel = getMatchTypeLabel(currentMatch, bracket);

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <Button variant="ghost" size="icon" onClick={requestLeave}>
            <ArrowLeft />
          </Button>

          <div className="text-center flex-1">
            {matchTypeLabel && (
              <Badge variant="secondary">{matchTypeLabel}</Badge>
            )}
            <div className="flex items-center justify-center gap-2 mt-1">
              <span className="text-lg font-semibold font-mono">
                {bracket?.category}
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Rodada {currentMatch.round} • Luta {currentMatch.position + 1}
            </p>
          </div>

          <Button variant="ghost" size="icon" asChild>
            <Link
              href={`/app/${tournamentId}/scoreboard?matchId=${currentMatch.id}`}
              target="_blank"
            >
              <Presentation />
            </Link>
          </Button>
        </div>

        {/* Timer */}
        <Card className="p-0">
          <CardContent className="p-8 space-y-4">
            <div className="flex items-center justify-center gap-4">
              <span className="text-sm text-muted-foreground">Duração:</span>
              <Select
                value={selectedDuration.toString()}
                onValueChange={handleTimeChange}
                disabled={liveState.timerRunning}
              >
                <SelectTrigger className="w-[180px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TIME_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value.toString()}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center justify-center gap-6">
              <Button
                size="lg"
                variant="outline"
                disabled={!hasTimer}
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

              <div className="flex flex-col items-center gap-1">
                <div
                  className={cn(
                    "text-8xl font-mono font-semibold tabular-nums leading-none",
                    !hasTimer && "text-muted-foreground/50",
                    hasTimer && liveState.timerRunning && "text-yellow-400",
                    hasTimer &&
                      !liveState.timerRunning &&
                      liveState.timeRemaining === 0 &&
                      "text-red-500",
                  )}
                >
                  {hasTimer
                    ? `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`
                    : "00:00"}
                </div>
              </div>

              <Button
                size="lg"
                variant="outline"
                disabled={!hasTimer}
                onClick={() =>
                  setLiveState((prev) => ({
                    ...prev,
                    timeRemaining: selectedDuration,
                    timerRunning: false,
                  }))
                }
              >
                <RotateCcw className="h-6 w-6" />
              </Button>
            </div>

            <div className="flex items-center justify-center gap-4 text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <Kbd>Espaço</Kbd> iniciar/pausar
              </span>
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
                <h2 className="text-3xl font-bold">{currentMatch.aka.name}</h2>
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
                <div className="text-8xl font-bold">{liveState.akaScore}</div>
                <Button
                  size="lg"
                  onClick={() =>
                    setLiveState((prev) => {
                      return {
                        ...prev,
                        akaScore: prev.akaScore + 1,
                      };
                    })
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
                          akaChui: prev.akaChui === level ? level - 1 : level,
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

              <Button
                variant="ghost"
                size="sm"
                className="w-full text-muted-foreground"
                onClick={() => setWoTarget("aka")}
              >
                Ausente (W.O.)
              </Button>
            </CardContent>
          </Card>

          {/* AO */}
          <Card className="border-blue-500 border-2 p-0">
            <CardContent className="p-6 space-y-6">
              <div>
                <Badge className="bg-blue-500 mb-2">AO</Badge>
                <h2 className="text-3xl font-bold">{currentMatch.ao.name}</h2>
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
                <div className="text-8xl font-bold">{liveState.aoScore}</div>
                <Button
                  size="lg"
                  onClick={() =>
                    setLiveState((prev) => {
                      return {
                        ...prev,
                        aoScore: prev.aoScore + 1,
                      };
                    })
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

              <Button
                variant="ghost"
                size="sm"
                className="w-full text-muted-foreground"
                onClick={() => setWoTarget("ao")}
              >
                Ausente (W.O.)
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
            <RotateCcw />
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
                <Loader2 className="animate-spin mr-2 h-4 w-4" />
                Salvando...
              </>
            ) : (
              <>
                <Save />
                Finalizar Luta
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Hantei dialog */}
      <AlertDialog open={showWinnerDialog} onOpenChange={setShowWinnerDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Placar Empatado</AlertDialogTitle>
            <AlertDialogDescription>
              O placar está {liveState.akaScore} x {liveState.aoScore}.
              <br />
              Qual competidor venceu por decisão dos árbitros (Hantei)?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="grid grid-cols-2 gap-4 py-4">
            <Button
              size="lg"
              variant="outline"
              className="h-20 border-red-500 hover:bg-red-50"
              onClick={() => finalizeSave(currentMatch!.akaId!, true)}
              disabled={saving}
            >
              <div className="text-center">
                <div className="font-bold text-lg text-red-500">AKA</div>
                <div className="text-sm text-muted-foreground">
                  {currentMatch?.aka?.name}
                </div>
              </div>
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="h-20 border-blue-500 hover:bg-blue-50"
              onClick={() => finalizeSave(currentMatch!.aoId!, true)}
              disabled={saving}
            >
              <div className="text-center">
                <div className="font-bold text-lg text-blue-500">AO</div>
                <div className="text-sm text-muted-foreground">
                  {currentMatch?.ao?.name}
                </div>
              </div>
            </Button>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={saving}>Cancelar</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={showLeaveConfirm} onOpenChange={setShowLeaveConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Sair da arbitragem?</AlertDialogTitle>
            <AlertDialogDescription>
              O placar e o timer desta luta ainda não foram salvos. Se você
              sair agora, esse progresso será perdido.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Continuar arbitrando</AlertDialogCancel>
            <AlertDialogAction onClick={goBack}>
              Sair mesmo assim
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={!!woTarget}
        onOpenChange={(open) => !open && setWoTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Marcar W.O.?</AlertDialogTitle>
            <AlertDialogDescription>
              {woTarget === "aka"
                ? currentMatch?.aka?.name
                : currentMatch?.ao?.name}{" "}
              será marcado como ausente.{" "}
              {woTarget === "aka"
                ? currentMatch?.ao?.name
                : currentMatch?.aka?.name}{" "}
              vence a luta automaticamente, sem placar.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={saving}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => woTarget && finalizeWalkover(woTarget)}
              disabled={saving}
            >
              Confirmar W.O.
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
