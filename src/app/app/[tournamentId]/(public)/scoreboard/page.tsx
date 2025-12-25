"use client";

import { useEffect, useState, useRef } from "react";
import { FaixaPretaLogo } from "@/components/icon/faixa-preta-logo";
import { TimerIcon, Trophy } from "lucide-react";
import { cn } from "@/lib/utils";

type LiveMatch = {
  akaName: string;
  akaSchool: string;
  akaScore: number;
  akaChui: number;
  akaSenshu: boolean;
  aoName: string;
  aoSchool: string;
  aoScore: number;
  aoChui: number;
  aoSenshu: boolean;
  category: string;
  modality: string;
  round: number;
  timeRemaining: number;
  timerRunning: boolean;
};

type Notification = {
  type: "aka_point" | "ao_point" | "winner";
  message: string;
  winner?: "aka" | "ao";
};

export default function ScoreboardPage({
  params,
}: {
  params: Promise<{ tournamentId: string }>;
}) {
  const [resolvedParams, setResolvedParams] = useState<{
    tournamentId: string;
  } | null>(null);
  const [liveMatch, setLiveMatch] = useState<LiveMatch | null>(null);
  const [notification, setNotification] = useState<Notification | null>(null);
  const prevScoresRef = useRef<{ aka: number; ao: number }>({ aka: 0, ao: 0 });
  const prevTimerRef = useRef<number>(120);

  useEffect(() => {
    params.then((p) => setResolvedParams(p));
  }, [params]);

  useEffect(() => {
    if (!resolvedParams) return;

    const interval = setInterval(async () => {
      try {
        const res = await fetch(
          `/api/live-match?tournamentId=${resolvedParams.tournamentId}`
        );
        if (res.ok) {
          const data = await res.json();

          // Verificar pontos
          if (liveMatch) {
            if (data.akaScore > prevScoresRef.current.aka) {
              showNotification({
                type: "aka_point",
                message: "PONTO PARA AKA!",
              });
            }
            if (data.aoScore > prevScoresRef.current.ao) {
              showNotification({
                type: "ao_point",
                message: "PONTO PARA AO!",
              });
            }

            // Verificar se o tempo zerou (fim da luta)
            if (
              prevTimerRef.current > 0 &&
              data.timeRemaining === 0 &&
              !data.timerRunning
            ) {
              const winner = data.akaScore > data.aoScore ? "aka" : "ao";
              showNotification({
                type: "winner",
                message: winner === "aka" ? "AKA VENCEU!" : "AO VENCEU!",
                winner,
              });
            }
          }

          prevScoresRef.current = { aka: data.akaScore, ao: data.aoScore };
          prevTimerRef.current = data.timeRemaining;
          setLiveMatch(data);
        } else {
          setLiveMatch(null);
          setNotification(null);
        }
      } catch (error) {
        console.error("Error fetching live match:", error);
        setLiveMatch(null);
        setNotification(null);
      }
    }, 200); // Polling mais rápido para capturar mudanças

    return () => clearInterval(interval);
  }, [resolvedParams, liveMatch]);

  function showNotification(notif: Notification) {
    setNotification(notif);
    setTimeout(() => {
      setNotification(null);
    }, 3000); // Mostrar por 3 segundos
  }

  if (!liveMatch) {
    return (
      <div className="h-screen flex flex-col items-center justify-center gap-4 p-4 bg-gradient-to-br from-background to-muted">
        <FaixaPretaLogo className="h-12 opacity-50" />
        <p className="text-2xl text-muted-foreground mt-8">
          Aguardando próxima luta...
        </p>
      </div>
    );
  }

  const minutes = Math.floor(liveMatch.timeRemaining / 60);
  const seconds = liveMatch.timeRemaining % 60;

  const getRoundLabel = (round: number, totalRounds: number = 4) => {
    if (round === totalRounds) return "FINAL";
    if (round === totalRounds - 1) return "SEMIFINAL";
    if (round === totalRounds - 2) return "QUARTAS";
    return `RODADA ${round}`;
  };

  return (
    <div className="p-4 h-screen flex flex-col items-center justify-center gap-8 bg-gradient-to-br from-background to-muted relative">
      <FaixaPretaLogo className="h-3 opacity-50" />

      {/* Notificação Flutuante */}
      {notification && (
        <div
          className={cn(
            "fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm",
            "animate-in fade-in duration-300"
          )}
        >
          <div
            className={cn(
              "text-center p-12 rounded-3xl shadow-2xl transform scale-110",
              notification.type === "aka_point" &&
                "bg-red-500 text-white border-4 border-red-700",
              notification.type === "ao_point" &&
                "bg-blue-500 text-white border-4 border-blue-700",
              notification.type === "winner" &&
                notification.winner === "aka" &&
                "bg-red-600 text-white border-4 border-red-800",
              notification.type === "winner" &&
                notification.winner === "ao" &&
                "bg-blue-600 text-white border-4 border-blue-800"
            )}
          >
            {notification.type === "winner" && (
              <Trophy className="mx-auto h-24 w-24 mb-4" />
            )}
            <h2 className="text-8xl font-bold tracking-wider animate-pulse">
              {notification.message}
            </h2>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-8 w-full max-w-7xl">
        {/* AKA */}
        <section className="grid grid-cols-[auto_200px] gap-4 border-2 border-red-500 p-6 rounded-2xl bg-card shadow-2xl">
          <div className="flex flex-col justify-between">
            <div>
              <strong className="text-xl leading-tight text-balance">
                {liveMatch.akaSchool}
              </strong>
            </div>

            <div className="flex flex-col my-4">
              <strong className="text-5xl">{liveMatch.akaName}</strong>
            </div>

            <div className="flex items-center space-x-2 text-sm">
              {[1, 2, 3, 4].map((level) => (
                <div
                  key={level}
                  className={`text-center p-2 px-6 rounded-lg font-bold transition-all ${
                    liveMatch.akaChui >= level
                      ? "bg-yellow-400 text-black scale-110"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {level}
                </div>
              ))}
            </div>
          </div>

          <div className="relative size-[200px] bg-red-500 text-white rounded-xl flex items-center justify-center shadow-xl">
            <span className="font-bold font-mono text-9xl text-center">
              {liveMatch.akaScore}
            </span>

            {liveMatch.akaSenshu && (
              <div className="bg-green-600 flex items-end p-3 text-5xl font-bold h-[120px] w-[120px] text-white absolute bottom-0 left-0 rounded-bl-xl [clip-path:polygon(0%_0%,0%_100%,100%_100%)]">
                S
              </div>
            )}
          </div>
        </section>

        {/* AO */}
        <section className="grid grid-cols-[200px_auto] gap-4 border-2 border-blue-500 p-6 rounded-2xl bg-card shadow-2xl">
          <div className="relative size-[200px] bg-blue-500 text-white rounded-xl font-bold font-mono text-9xl text-center flex items-center justify-center shadow-xl">
            {liveMatch.aoScore}

            {liveMatch.aoSenshu && (
              <div className="bg-green-600 flex items-end justify-end p-3 text-5xl font-bold h-[120px] w-[120px] text-white absolute bottom-0 right-0 rounded-br-xl [clip-path:polygon(0%_100%,100%_0%,100%_100%)]">
                S
              </div>
            )}
          </div>

          <div className="flex flex-col justify-between text-right">
            <div>
              <strong className="text-xl leading-tight text-balance">
                {liveMatch.aoSchool}
              </strong>
            </div>

            <div className="flex flex-col my-4">
              <strong className="text-5xl">{liveMatch.aoName}</strong>
            </div>

            <div className="flex items-center justify-end space-x-2 text-sm">
              {[1, 2, 3, 4].map((level) => (
                <div
                  key={level}
                  className={`text-center p-2 px-6 rounded-lg font-bold transition-all ${
                    liveMatch.aoChui >= level
                      ? "bg-yellow-400 text-black scale-110"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {level}
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>

      {/* Footer */}
      <footer className="p-4 max-w-7xl w-full">
        <div className="grid grid-cols-3 items-center justify-center text-center gap-8">
          <div>
            <span className="leading-tight text-balance font-semibold text-lg">
              {liveMatch.category}
            </span>
          </div>

          <div
            className={cn(
              "flex items-center gap-4 justify-center transition-colors",
              liveMatch.timerRunning
                ? "text-yellow-500"
                : liveMatch.timeRemaining === 0
                ? "text-red-500 animate-pulse"
                : "text-muted-foreground"
            )}
          >
            <TimerIcon className="size-8" />
            <span className="font-semibold font-mono text-7xl">
              {String(minutes).padStart(2, "0")}:
              {String(seconds).padStart(2, "0")}
            </span>
          </div>

          <div>
            <span className="leading-tight text-balance font-semibold text-lg uppercase">
              {getRoundLabel(liveMatch.round)}
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}
