"use client";

import { useEffect, useState, useRef } from "react";
import { FaixaPretaLogo } from "@/components/icon/faixa-preta-logo";
import { Trophy } from "lucide-react";
import { cn } from "@/lib/utils";
import { useLiveMatch } from "@/hooks/use-live-match";

type PointSide = "aka" | "ao" | null;

export default function ScoreboardPage({
  params,
}: {
  params: Promise<{ tournamentId: string }>;
}) {
  const [resolvedParams, setResolvedParams] = useState<{
    tournamentId: string;
  } | null>(null);

  // Which side just scored — drives the pulse animation
  const [pulseSide, setPulseSide] = useState<PointSide>(null);
  // Winner overlay
  const [winner, setWinner] = useState<{
    side: "aka" | "ao";
    name: string;
  } | null>(null);

  const prevScoresRef = useRef<{ aka: number; ao: number }>({ aka: 0, ao: 0 });
  const prevTimerRef = useRef<number>(120);
  const pulseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    params.then((p) => setResolvedParams(p));
  }, [params]);

  const liveMatch = useLiveMatch(resolvedParams?.tournamentId || "");

  useEffect(() => {
    if (!liveMatch) {
      setPulseSide(null);
      setWinner(null);
      return;
    }

    const akaScored = liveMatch.akaScore > prevScoresRef.current.aka;
    const aoScored = liveMatch.aoScore > prevScoresRef.current.ao;

    if (akaScored || aoScored) {
      const side = akaScored ? "aka" : "ao";
      if (pulseTimerRef.current) clearTimeout(pulseTimerRef.current);
      setPulseSide(side);
      pulseTimerRef.current = setTimeout(() => setPulseSide(null), 1500);
    }

    // Detect match end (timer hit 0)
    if (
      prevTimerRef.current > 0 &&
      liveMatch.timeRemaining === 0 &&
      !liveMatch.timerRunning
    ) {
      const winningSide =
        liveMatch.akaScore >= liveMatch.aoScore ? "aka" : "ao";
      const winnerName =
        winningSide === "aka" ? liveMatch.akaName : liveMatch.aoName;
      setWinner({ side: winningSide, name: winnerName });
      setTimeout(() => setWinner(null), 6000);
    }

    prevScoresRef.current = { aka: liveMatch.akaScore, ao: liveMatch.aoScore };
    prevTimerRef.current = liveMatch.timeRemaining;
  }, [liveMatch]);

  if (!liveMatch) {
    return (
      <div className="h-screen flex flex-col items-center justify-center gap-4 p-4 bg-gradient-to-br from-background to-muted">
        <FaixaPretaLogo className="h-12 opacity-50" />
      </div>
    );
  }

  const minutes = Math.floor(liveMatch.timeRemaining / 60);
  const seconds = liveMatch.timeRemaining % 60;

  const getMatchTypeLabel = (match: typeof liveMatch): string => {
    if (match && match.round === 4) return "3º LUGAR";
    if (match && match.round === 2) return "FINAL";
    if (match && match.round === 1) return "SEMIFINAL";
    if (match && match.round === 3) return "QUARTAS";
    return `RODADA ${match?.round || "?"}`;
  };

  return (
    <div className="p-4 h-screen flex flex-col items-center justify-center gap-12 bg-gradient-to-br from-background to-muted relative overflow-hidden">
      {/* Winner overlay */}
      {winner && (
        <div
          className={cn(
            "flex flex-col items-center justify-center fixed inset-0 z-50 text-center p-12 animate-in fade-in duration-500",
            winner.side === "aka" ? "bg-red-600" : "bg-blue-600"
          )}
        >
          <Trophy className="h-28 w-28 text-yellow-300 mb-6 drop-shadow-lg animate-bounce" />
          <h2 className="text-white text-5xl font-bold tracking-wide mb-3 uppercase">
            {winner.name}
          </h2>
          <p className="text-white/80 text-2xl font-semibold tracking-widest uppercase">
            Vencedor!
          </p>
        </div>
      )}

      <div className="scale-150 flex flex-col items-center justify-center gap-12">
        <FaixaPretaLogo className="h-5 opacity-50" />

        <div className="grid grid-cols-2 gap-8 w-full max-w-6xl">
          {/* AKA */}
          <section
            className={cn(
              "grid grid-cols-[auto_200px] gap-4 border-2 border-red-500 p-6 rounded-2xl bg-card shadow-2xl transition-all duration-300",
              pulseSide === "aka" && "ring-4 ring-red-400 ring-offset-2"
            )}
          >
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

            <div
              className={cn(
                "relative size-[200px] bg-red-500 text-white rounded-xl flex items-center justify-center shadow-xl transition-all duration-300",
                pulseSide === "aka" && "animate-pulse scale-110"
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
          <section
            className={cn(
              "grid grid-cols-[200px_auto] gap-4 border-2 border-blue-500 p-6 rounded-2xl bg-card shadow-2xl transition-all duration-300",
              pulseSide === "ao" && "ring-4 ring-blue-400 ring-offset-2"
            )}
          >
            <div
              className={cn(
                "relative size-[200px] bg-blue-500 text-white rounded-xl font-bold font-mono text-9xl text-center flex items-center justify-center shadow-xl transition-all duration-300",
                pulseSide === "ao" && "animate-pulse scale-110"
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
