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
  Presentation,
  Lock,
  ShieldAlert,
  CheckCircle,
} from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Kbd } from "@/components/ui/kbd";
import { useHotkeys } from "react-hotkeys-hook";
import { cn } from "@/lib/utils";
import { fetchJson } from "@/lib/api-client";
import { Spinner } from "@/components/luxe/spinner";
import { useRefereeLock } from "@/hooks/use-referee-lock";
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
  const [showFinalizeConfirm, setShowFinalizeConfirm] = useState(false);
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
  const [showForceConfirm, setShowForceConfirm] = useState(false);
  const [woTarget, setWoTarget] = useState<"aka" | "ao" | null>(null);
  const [mobileView, setMobileView] = useState<"both" | "aka" | "ao">("both");

  const {
    status: lockStatus,
    lockHolder,
    forceAcquire,
    releaseLock,
  } = useRefereeLock(tournamentId, bracketId, matchId);

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
  const isMatchFinalizedRef = useRef(false);

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
    if (isMatchFinalizedRef.current || bypassGuardRef.current) return false;
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
      if (
        bypassGuardRef.current ||
        isMatchFinalizedRef.current ||
        !hasMatchProgress()
      )
        return;
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
        fetch(`/api/live-match?tournamentId=${tid}`, {
          method: "DELETE",
          keepalive: true,
        }).catch(() => {});
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
    if (isMatchFinalizedRef.current) return;
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
    if (isMatchFinalizedRef.current) return;
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
    releaseLock();
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

  function requestFinalizeMatch() {
    if (!currentMatchRef.current) return;
    const state = liveStateRef.current;

    if (state.akaScore === state.aoScore) {
      setShowWinnerDialog(true);
      return;
    }

    setShowFinalizeConfirm(true);
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

      isMatchFinalizedRef.current = true;
      bypassGuardRef.current = true;
      if (broadcastDebounceRef.current) {
        clearTimeout(broadcastDebounceRef.current);
        broadcastDebounceRef.current = null;
      }
      broadcastAbortRef.current?.abort();

      // Limpar o liveMatch do banco para o scoreboard voltar imediatamente ao estado de espera
      await fetch(`/api/live-match?tournamentId=${tid}`, {
        method: "DELETE",
        keepalive: true,
      }).catch(() => {});

      toast.success("Resultado salvo!");
      setShowWinnerDialog(false);
      setShowFinalizeConfirm(false);
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
    setTimeout(() => {
      (document.activeElement as HTMLElement)?.blur();
    }, 50);
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

  if (loading || lockStatus === "checking") {
    return (
      <div className="h-screen flex flex-col items-center justify-center gap-3">
        <Spinner />
        <p className="text-sm text-muted-foreground">
          {lockStatus === "checking"
            ? "Verificando sessão de arbitragem..."
            : "Carregando dados da luta..."}
        </p>
      </div>
    );
  }

  if (bracket?.status === "COMPLETED" || currentMatch?.isCompleted) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-background">
        <Card className="max-w-md w-full">
          <CardHeader className="text-center pb-2">
            <div className="mx-auto w-12 h-12 rounded-full bg-muted flex items-center justify-center text-muted-foreground mb-2">
              <CheckCircle className="w-6 h-6 text-primary" />
            </div>
            <CardTitle className="text-xl">Luta Concluída</CardTitle>
            <CardDescription>
              {bracket?.status === "COMPLETED"
                ? "Esta chave já foi concluída e não pode ser arbitrada."
                : "Esta luta já foi finalizada e seu resultado registrado."}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 pt-2">
            <Button
              onClick={() =>
                router.push(`/app/${tournamentId}/brackets/${bracketId}`)
              }
              className="w-full"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Voltar para a Chave
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (lockStatus === "locked_by_other") {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-background">
        <Card className="max-w-md w-full border-amber-500/40">
          <CardHeader className="text-center pb-2">
            <div className="mx-auto w-12 h-12 rounded-full bg-amber-500/10 flex items-center justify-center text-amber-600 mb-2">
              <Lock className="w-6 h-6" />
            </div>
            <CardTitle className="text-xl">Área de Arbitragem Ocupada</CardTitle>
            <CardDescription>
              Outro árbitro já está com a sessão de arbitragem aberta para esta chave.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 pt-2">
            <div className="rounded-lg border bg-muted/40 p-3 space-y-1 text-sm">
              <div className="flex justify-between text-muted-foreground">
                <span>Dispositivo:</span>
                <span className="font-medium text-foreground">
                  {lockHolder?.deviceInfo || "Outro computador/celular"}
                </span>
              </div>
              {lockHolder?.acquiredAt && (
                <div className="flex justify-between text-muted-foreground">
                  <span>Conectado às:</span>
                  <span className="font-medium text-foreground">
                    {new Date(lockHolder.acquiredAt).toLocaleTimeString("pt-BR", {
                      hour: "2-digit",
                      minute: "2-digit",
                      second: "2-digit",
                    })}
                  </span>
                </div>
              )}
            </div>

            <p className="text-xs text-muted-foreground text-center">
              Para evitar conflito de placar e cronômetro em tempo real, apenas um
              árbitro pode operar a mesa desta chave simultaneamente.
            </p>

            <div className="flex flex-col gap-2 pt-2">
              <Button
                onClick={() =>
                  router.push(`/app/${tournamentId}/brackets/${bracketId}`)
                }
                className="w-full"
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Voltar para a Chave
              </Button>

              <Button
                variant="outline"
                onClick={() => setShowForceConfirm(true)}
                className="w-full text-muted-foreground hover:text-destructive"
              >
                Assumir Arbitragem
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Confirmação de assunção de sessão */}
        <AlertDialog open={showForceConfirm} onOpenChange={setShowForceConfirm}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2">
                <ShieldAlert className="h-5 w-5 text-amber-500" />
                Assumir Arbitragem?
              </AlertDialogTitle>
              <AlertDialogDescription>
                Esta ação desconectará o árbitro atualmente ativo nesta chave (
                {lockHolder?.deviceInfo || "outro dispositivo"}). Use esta opção
                caso o outro árbitro tenha se ausentado ou o dispositivo dele tenha
                descarregado.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                onClick={async () => {
                  setShowForceConfirm(false);
                  const ok = await forceAcquire();
                  if (ok) {
                    toast.success("Você assumiu o controle da arbitragem.");
                  }
                }}
              >
                Confirmar e Assumir
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
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
    <div className="min-h-screen bg-background p-2 sm:p-4 pb-20 sm:pb-6">
      <div className="max-w-4xl mx-auto space-y-3 sm:space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between gap-2 border-b pb-2 sm:border-0 sm:pb-0">
          <Button
            variant="ghost"
            size="icon"
            onClick={requestLeave}
            className="shrink-0 h-9 w-9"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>

          <div className="text-center flex-1 min-w-0 px-1">
            <div className="flex items-center justify-center gap-1.5 flex-wrap">
              {matchTypeLabel && (
                <Badge variant="secondary" className="text-[10px] sm:text-xs px-2 py-0">
                  {matchTypeLabel}
                </Badge>
              )}
              <span className="text-xs sm:text-base font-semibold font-mono truncate max-w-[200px] sm:max-w-none">
                {bracket?.category}
              </span>
            </div>
            <p className="text-[10px] sm:text-xs text-muted-foreground mt-0.5">
              Rodada {currentMatch.round} • Luta {currentMatch.position + 1}
            </p>
          </div>

          <Button variant="ghost" size="icon" asChild className="shrink-0 h-9 w-9">
            <Link
              href={`/app/${tournamentId}/scoreboard?matchId=${currentMatch.id}`}
              target="_blank"
            >
              <Presentation className="h-5 w-5" />
            </Link>
          </Button>
        </div>

        {/* Timer Card */}
        <Card className="p-0 border shadow-xs">
          <CardContent className="p-3 sm:p-5 space-y-2 sm:space-y-3">
            <div className="flex items-center justify-between sm:justify-center gap-2 sm:gap-4">
              <span className="text-xs sm:text-sm text-muted-foreground font-medium">
                Duração:
              </span>
              <Select
                value={selectedDuration.toString()}
                onValueChange={handleTimeChange}
                disabled={liveState.timerRunning}
              >
                <SelectTrigger className="w-[125px] sm:w-[160px] h-7 sm:h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent onCloseAutoFocus={(e) => e.preventDefault()}>
                  {TIME_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value.toString()}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center justify-center gap-4 sm:gap-6">
              <Button
                variant="outline"
                disabled={!hasTimer}
                className="h-10 w-10 sm:h-12 sm:w-12 shrink-0 p-0 rounded-full"
                onClick={() =>
                  setLiveState((prev) => ({
                    ...prev,
                    timerRunning: !prev.timerRunning,
                  }))
                }
              >
                {liveState.timerRunning ? (
                  <Pause className="h-5 w-5 sm:h-6 sm:w-6" />
                ) : (
                  <Play className="h-5 w-5 sm:h-6 sm:w-6 ml-0.5" />
                )}
              </Button>

              <div className="flex flex-col items-center">
                <div
                  className={cn(
                    "text-5xl sm:text-7xl md:text-8xl font-mono font-semibold tabular-nums leading-none tracking-tight",
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
                variant="outline"
                disabled={!hasTimer}
                className="h-10 w-10 sm:h-12 sm:w-12 shrink-0 p-0 rounded-full"
                onClick={() =>
                  setLiveState((prev) => ({
                    ...prev,
                    timeRemaining: selectedDuration,
                    timerRunning: false,
                  }))
                }
              >
                <RotateCcw className="h-5 w-5 sm:h-6 sm:w-6" />
              </Button>
            </div>

            <div className="hidden sm:flex items-center justify-center gap-4 text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <Kbd>Espaço</Kbd> iniciar/pausar
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Mobile View Switcher (Ambos / AKA / AO) */}
        <div className="flex md:hidden items-center justify-center p-1 bg-muted/60 rounded-lg text-xs font-medium gap-1">
          <button
            type="button"
            className={cn(
              "flex-1 py-1 rounded-md text-center transition-all",
              mobileView === "both"
                ? "bg-background text-foreground shadow-xs font-semibold"
                : "text-muted-foreground hover:text-foreground"
            )}
            onClick={() => setMobileView("both")}
          >
            Ambos
          </button>
          <button
            type="button"
            className={cn(
              "flex-1 py-1 rounded-md text-center transition-all",
              mobileView === "aka"
                ? "bg-red-500 text-white font-semibold shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            )}
            onClick={() => setMobileView("aka")}
          >
            AKA (Vermelho)
          </button>
          <button
            type="button"
            className={cn(
              "flex-1 py-1 rounded-md text-center transition-all",
              mobileView === "ao"
                ? "bg-blue-500 text-white font-semibold shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            )}
            onClick={() => setMobileView("ao")}
          >
            AO (Azul)
          </button>
        </div>

        {/* Competitors */}
        <div
          className={cn(
            "grid gap-2 sm:gap-4 md:gap-6",
            mobileView === "both"
              ? "grid-cols-2"
              : "grid-cols-1 md:grid-cols-2"
          )}
        >
          {/* AKA (Vermelho) */}
          {(mobileView === "both" || mobileView === "aka") && (
            <Card className="border-red-500 border-2 p-0 shadow-xs">
              <CardContent className="p-3 sm:p-5 space-y-3 sm:space-y-4">
                <div>
                  <div className="flex items-center justify-between">
                    <Badge className="bg-red-500 text-[10px] sm:text-xs px-2 py-0">
                      AKA
                    </Badge>
                    {liveState.akaSenshu && (
                      <Badge variant="outline" className="text-red-500 border-red-400 text-[10px]">
                        Senshu
                      </Badge>
                    )}
                  </div>
                  <h2 className="text-sm sm:text-lg md:text-2xl font-bold truncate mt-1">
                    {currentMatch.aka.name}
                  </h2>
                  <p className="text-[10px] sm:text-xs text-muted-foreground truncate">
                    {currentMatch.aka.school}
                  </p>
                </div>

                <div className="text-center">
                  <div className="text-5xl sm:text-6xl md:text-7xl font-bold font-mono my-1">
                    {liveState.akaScore}
                  </div>

                  <div className="grid grid-cols-1 gap-1.5 mt-2">
                    <Button
                      size="lg"
                      className="w-full h-12 sm:h-14 bg-red-600 hover:bg-red-700 text-white font-bold text-xl sm:text-2xl shadow-sm active:scale-95 transition-transform"
                      onClick={() =>
                        setLiveState((prev) => ({
                          ...prev,
                          akaScore: prev.akaScore + 1,
                        }))
                      }
                    >
                      +1
                    </Button>

                    <Button
                      size="sm"
                      variant="outline"
                      className="w-full h-7 sm:h-8 text-xs text-muted-foreground"
                      onClick={() =>
                        setLiveState((prev) => ({
                          ...prev,
                          akaScore: Math.max(0, prev.akaScore - 1),
                        }))
                      }
                    >
                      -1 Ponto
                    </Button>
                  </div>
                </div>

                <div>
                  <p className="text-[10px] sm:text-xs text-muted-foreground mb-1 font-medium">
                    Penalidades (Chui)
                  </p>
                  <div className="grid grid-cols-4 gap-1">
                    {[1, 2, 3, 4].map((level) => (
                      <Button
                        key={level}
                        size="sm"
                        variant={
                          liveState.akaChui >= level ? "default" : "outline"
                        }
                        className={cn(
                          "h-7 sm:h-8 text-xs font-semibold p-0",
                          liveState.akaChui >= level && "bg-red-600 hover:bg-red-700 text-white"
                        )}
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

                <div className="space-y-1 pt-1">
                  <Button
                    variant={liveState.akaSenshu ? "default" : "outline"}
                    className={cn(
                      "w-full h-7 sm:h-8 text-xs font-semibold",
                      liveState.akaSenshu && "bg-red-600 hover:bg-red-700 text-white"
                    )}
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
                    className="w-full h-6 text-[10px] text-muted-foreground p-0 hover:text-destructive"
                    onClick={() => setWoTarget("aka")}
                  >
                    Ausente (W.O.)
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* AO (Azul) */}
          {(mobileView === "both" || mobileView === "ao") && (
            <Card className="border-blue-500 border-2 p-0 shadow-xs">
              <CardContent className="p-3 sm:p-5 space-y-3 sm:space-y-4">
                <div>
                  <div className="flex items-center justify-between">
                    <Badge className="bg-blue-500 text-[10px] sm:text-xs px-2 py-0">
                      AO
                    </Badge>
                    {liveState.aoSenshu && (
                      <Badge variant="outline" className="text-blue-500 border-blue-400 text-[10px]">
                        Senshu
                      </Badge>
                    )}
                  </div>
                  <h2 className="text-sm sm:text-lg md:text-2xl font-bold truncate mt-1">
                    {currentMatch.ao.name}
                  </h2>
                  <p className="text-[10px] sm:text-xs text-muted-foreground truncate">
                    {currentMatch.ao.school}
                  </p>
                </div>

                <div className="text-center">
                  <div className="text-5xl sm:text-6xl md:text-7xl font-bold font-mono my-1">
                    {liveState.aoScore}
                  </div>

                  <div className="grid grid-cols-1 gap-1.5 mt-2">
                    <Button
                      size="lg"
                      className="w-full h-12 sm:h-14 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xl sm:text-2xl shadow-sm active:scale-95 transition-transform"
                      onClick={() =>
                        setLiveState((prev) => ({
                          ...prev,
                          aoScore: prev.aoScore + 1,
                        }))
                      }
                    >
                      +1
                    </Button>

                    <Button
                      size="sm"
                      variant="outline"
                      className="w-full h-7 sm:h-8 text-xs text-muted-foreground"
                      onClick={() =>
                        setLiveState((prev) => ({
                          ...prev,
                          aoScore: Math.max(0, prev.aoScore - 1),
                        }))
                      }
                    >
                      -1 Ponto
                    </Button>
                  </div>
                </div>

                <div>
                  <p className="text-[10px] sm:text-xs text-muted-foreground mb-1 font-medium">
                    Penalidades (Chui)
                  </p>
                  <div className="grid grid-cols-4 gap-1">
                    {[1, 2, 3, 4].map((level) => (
                      <Button
                        key={level}
                        size="sm"
                        variant={
                          liveState.aoChui >= level ? "default" : "outline"
                        }
                        className={cn(
                          "h-7 sm:h-8 text-xs font-semibold p-0",
                          liveState.aoChui >= level && "bg-blue-600 hover:bg-blue-700 text-white"
                        )}
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

                <div className="space-y-1 pt-1">
                  <Button
                    variant={liveState.aoSenshu ? "default" : "outline"}
                    className={cn(
                      "w-full h-7 sm:h-8 text-xs font-semibold",
                      liveState.aoSenshu && "bg-blue-600 hover:bg-blue-700 text-white"
                    )}
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
                    className="w-full h-6 text-[10px] text-muted-foreground p-0 hover:text-destructive"
                    onClick={() => setWoTarget("ao")}
                  >
                    Ausente (W.O.)
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Actions (barra fixa na parte inferior no mobile, inline no desktop) */}
        <div className="fixed sm:static bottom-0 left-0 right-0 p-2 sm:p-0 bg-background/95 sm:bg-transparent backdrop-blur-md sm:backdrop-blur-none border-t sm:border-0 z-30 flex gap-2 sm:gap-4 max-w-4xl mx-auto shadow-lg sm:shadow-none">
          <Button
            size="lg"
            variant="outline"
            className="flex-1 h-10 sm:h-12 text-xs sm:text-base"
            onClick={resetState}
            disabled={saving}
          >
            <RotateCcw className="mr-1.5 h-3.5 w-3.5 sm:h-4 sm:w-4" />
            Reiniciar
          </Button>
          <Button
            size="lg"
            className="flex-1 h-10 sm:h-12 text-xs sm:text-base font-semibold"
            onClick={requestFinalizeMatch}
            disabled={saving}
          >
            {saving ? (
              <>
                <Spinner size="size-3.5 sm:size-4" className="mr-1.5" />
                Salvando...
              </>
            ) : (
              <>
                <Save className="mr-1.5 h-3.5 w-3.5 sm:h-4 sm:w-4" />
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

      {/* Confirm Finalize Dialog */}
      <AlertDialog
        open={showFinalizeConfirm}
        onOpenChange={setShowFinalizeConfirm}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Finalizar Luta?</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3 pt-2 text-sm text-foreground">
                <p className="text-muted-foreground">
                  Confirma a finalização da luta e o registro do placar oficial?
                </p>
                <div className="flex items-center justify-center gap-6 p-4 rounded-lg bg-muted/50 border">
                  <div className="text-center">
                    <span className="text-xs font-bold text-red-600 block">
                      AKA
                    </span>
                    <span className="text-2xl font-bold font-mono">
                      {liveState.akaScore}
                    </span>
                    <span className="text-xs text-muted-foreground block truncate max-w-[120px]">
                      {currentMatch?.aka?.name || "AKA"}
                    </span>
                  </div>
                  <span className="text-muted-foreground font-bold">×</span>
                  <div className="text-center">
                    <span className="text-xs font-bold text-blue-600 block">
                      AO
                    </span>
                    <span className="text-2xl font-bold font-mono">
                      {liveState.aoScore}
                    </span>
                    <span className="text-xs text-muted-foreground block truncate max-w-[120px]">
                      {currentMatch?.ao?.name || "AO"}
                    </span>
                  </div>
                </div>
                <p className="text-center text-xs text-muted-foreground">
                  Vencedor da luta:{" "}
                  <strong className="text-foreground font-semibold">
                    {liveState.akaScore > liveState.aoScore
                      ? `${currentMatch?.aka?.name || "AKA"} (AKA)`
                      : `${currentMatch?.ao?.name || "AO"} (AO)`}
                  </strong>
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={saving}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setShowFinalizeConfirm(false);
                saveResult();
              }}
              disabled={saving}
            >
              {saving ? (
                <>
                  <Spinner size="size-4" className="mr-2" />
                  Salvando...
                </>
              ) : (
                "Confirmar e Finalizar"
              )}
            </AlertDialogAction>
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
