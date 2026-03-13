"use client";

import { useEffect, useState, useRef } from "react";
import { FaixaPretaLogo } from "@/components/icon/faixa-preta-logo";
import { Trophy } from "lucide-react";
import { cn } from "@/lib/utils";
import { useLiveMatch } from "@/hooks/use-live-match";

export default function ScoreboardPage({
  params,
}: {
  params: Promise<{ tournamentId: string }>;
}) {
  const [resolvedParams, setResolvedParams] = useState<{
    tournamentId: string;
  } | null>(null);

  const [akaPulse, setAkaPulse] = useState(false);
  const [aoPulse, setAoPulse] = useState(false);

  const prevScoresRef = useRef<{ aka: number; ao: number }>({ aka: 0, ao: 0 });

  useEffect(() => {
    params.then((p) => setResolvedParams(p));
  }, [params]);

  const liveMatch = useLiveMatch(resolvedParams?.tournamentId || "");

  // Detect score changes → pulse the correct side
  useEffect(() => {
    if (!liveMatch) return;

    if (liveMatch.akaScore > prevScoresRef.current.aka) {
      setAkaPulse(true);
      setTimeout(() => setAkaPulse(false), 900);
    }
    if (liveMatch.aoScore > prevScoresRef.current.ao) {
      setAoPulse(true);
      setTimeout(() => setAoPulse(false), 900);
    }

    prevScoresRef.current = { aka: liveMatch.akaScore, ao: liveMatch.aoScore };
  }, [liveMatch?.akaScore, liveMatch?.aoScore]);

  if (!liveMatch) {
    return (
      <div className="h-screen flex flex-col items-center justify-center gap-4 p-4 bg-gradient-to-br from-background to-muted">
        <FaixaPretaLogo className="h-12 opacity-50" />
      </div>
    );
  }

  const minutes = Math.floor(liveMatch.timeRemaining / 60);
  const seconds = liveMatch.timeRemaining % 60;

  // Persistent winner — shown whenever the timer is at 0 and stopped
  const matchOver = liveMatch.timeRemaining === 0 && !liveMatch.timerRunning;
  const winner = matchOver
    ? liveMatch.akaScore >= liveMatch.aoScore
      ? "aka"
      : "ao"
    : null;

  const getMatchTypeLabel = (match: typeof liveMatch): string => {
    if (match.round === 4) return "3º LUGAR";
    if (match.round === 2) return "FINAL";
    if (match.round === 1) return "SEMIFINAL";
    if (match.round === 3) return "QUARTAS";
    return `RODADA ${match.round || "?"}`;
  };

  return (
    <div className="p-4 h-screen flex flex-col items-center justify-center gap-12 bg-gradient-to-br from-background to-muted relative">
      {/* Winner overlay — persistent while match is over */}
      {winner && (
        <div
          className={cn(
            "fixed inset-0 z-50 flex flex-col items-center justify-center gap-8 text-white animate-in fade-in duration-700",
            winner === "aka" ? "bg-red-600/95" : "bg-blue-600/95"
          )}
        >
          <Trophy className="h-32 w-32 drop-shadow-lg" />
          <div className="text-center space-y-3">
            <p className="text-4xl font-semibold tracking-widest uppercase opacity-80">
              Vencedor
            </p>
            <h2 className="text-8xl font-black tracking-wider">
              {winner === "aka" ? liveMatch.akaName : liveMatch.aoName}
            </h2>
            <p className="text-3xl font-medium opacity-70">
              {winner === "aka" ? liveMatch.akaSchool : liveMatch.aoSchool}
            </p>
          </div>
          <div className="flex items-center gap-6 text-5xl font-bold font-mono">
            <span className={winner === "aka" ? "opacity-100" : "opacity-40"}>
              {liveMatch.akaScore}
            </span>
            <span className="opacity-50 text-3xl">×</span>
            <span className={winner === "ao" ? "opacity-100" : "opacity-40"}>
              {liveMatch.aoScore}
            </span>
          </div>
        </div>
      )}

      <div className="scale-150 flex flex-col items-center justify-center gap-12">
        <FaixaPretaLogo className="h-5 opacity-50" />

        <div className="grid grid-cols-2 gap-8 w-full max-w-6xl">
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
                        ? "bg-yellow-400 text-black"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {level}
                  </div>
                ))}
              </div>
            </div>

            {/* AKA score — pulses on point */}
            <div
              className={cn(
                "relative size-[200px] bg-red-500 text-white rounded-xl flex items-center justify-center shadow-xl transition-all duration-150",
                akaPulse && "scale-110 ring-4 ring-red-300 shadow-red-400 shadow-2xl"
              )}
            >
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
            {/* AO score — pulses on point */}
            <div
              className={cn(
                "relative size-[200px] bg-blue-500 text-white rounded-xl font-bold font-mono text-9xl text-center flex items-center justify-center shadow-xl transition-all duration-150",
                aoPulse && "scale-110 ring-4 ring-blue-300 shadow-blue-400 shadow-2xl"
              )}
            >
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
        <footer className="p-4 max-w-6xl w-full">
          <div className="grid grid-cols-3 items-center justify-center text-center gap-8">
            <div>
              <span className="leading-tight text-balance font-semibold text-3xl">
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
              <span className="font-semibold font-mono text-8xl">
                {String(minutes).padStart(2, "0")}:
                {String(seconds).padStart(2, "0")}
              </span>
            </div>

            <div>
              <span className="leading-tight text-balance font-semibold text-3xl uppercase">
                {getMatchTypeLabel(liveMatch)}
              </span>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
