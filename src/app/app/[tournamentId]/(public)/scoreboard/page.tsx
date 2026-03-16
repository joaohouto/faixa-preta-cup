"use client";

import { useEffect, useState, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
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

  const [pulseSide, setPulseSide] = useState<PointSide>(null);
  const [winner, setWinner] = useState<{
    side: "aka" | "ao";
    name: string;
    school: string;
  } | null>(null);

  // Local timer display — counts down independently from server pushes
  const [localTime, setLocalTime] = useState(0);

  const prevScoresRef = useRef<{ aka: number; ao: number }>({ aka: 0, ao: 0 });
  const prevWinnerRef = useRef<string | null>(null);
  const localTimeRef = useRef(0);
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

    const drift = Math.abs(liveMatch.timeRemaining - localTimeRef.current);
    if (!liveMatch.timerRunning || drift > 2) {
      setLocalTime(liveMatch.timeRemaining);
      localTimeRef.current = liveMatch.timeRemaining;
    }

    const akaScored = liveMatch.akaScore > prevScoresRef.current.aka;
    const aoScored = liveMatch.aoScore > prevScoresRef.current.ao;

    if (akaScored || aoScored) {
      const side = akaScored ? "aka" : "ao";
      if (pulseTimerRef.current) clearTimeout(pulseTimerRef.current);
      setPulseSide(side);
      pulseTimerRef.current = setTimeout(() => setPulseSide(null), 1500);
    }

    if (liveMatch.winner !== prevWinnerRef.current) {
      if (liveMatch.winner) {
        const side = liveMatch.winner as "aka" | "ao";
        setWinner({
          side,
          name: side === "aka" ? liveMatch.akaName : liveMatch.aoName,
          school: side === "aka" ? liveMatch.akaSchool : liveMatch.aoSchool,
        });
      } else {
        setWinner(null);
      }
      prevWinnerRef.current = liveMatch.winner;
    }

    prevScoresRef.current = { aka: liveMatch.akaScore, ao: liveMatch.aoScore };
  }, [liveMatch]);

  // Local countdown — runs client-side, no server round-trip needed per tick
  useEffect(() => {
    if (!liveMatch?.timerRunning || localTime <= 0) return;

    const interval = setInterval(() => {
      setLocalTime((prev) => {
        const next = Math.max(0, prev - 1);
        localTimeRef.current = next;
        return next;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [liveMatch?.timerRunning, localTime <= 0]);

  const minutes = Math.floor(localTime / 60);
  const seconds = localTime % 60;

  const getMatchTypeLabel = (match: typeof liveMatch): string => {
    if (!match) return "";
    if (match.round === 4) return "3º LUGAR";
    if (match.round === 2) return "FINAL";
    if (match.round === 1) return "SEMIFINAL";
    if (match.round === 3) return "QUARTAS";
    return `RODADA ${match.round}`;
  };

  return (
    <div className="h-screen flex flex-col items-center justify-center bg-gradient-to-br from-background to-muted relative overflow-hidden">
      {/* Winner overlay */}
      <AnimatePresence>
        {winner && (
          <motion.div
            key="winner-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.35 }}
            className={cn(
              "fixed inset-0 z-50 flex flex-col items-center justify-center text-center p-16 overflow-hidden",
              winner.side === "aka" ? "bg-red-600" : "bg-blue-600",
            )}
          >
            {/* Shimmer sweep */}
            <motion.div
              className="absolute inset-y-0 w-1/2 bg-gradient-to-r from-transparent via-white/10 to-transparent -skew-x-12 pointer-events-none"
              animate={{ x: ["-100%", "300%"] }}
              transition={{
                duration: 2.8,
                repeat: Infinity,
                ease: "linear",
                repeatDelay: 1.5,
              }}
            />

            <motion.div
              initial={{ scale: 0.6, y: 48, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.8, y: -32, opacity: 0 }}
              transition={{
                delay: 0.1,
                type: "spring",
                stiffness: 200,
                damping: 18,
              }}
              className="flex flex-col items-center"
            >
              <Trophy className="size-40 text-white mb-8" />
              <h2
                className="text-white font-bold tracking-tight uppercase leading-none mb-5"
                style={{ fontSize: "clamp(4rem, 10vw, 9rem)" }}
              >
                {winner.name}
              </h2>
              <p className="text-white/90 text-4xl font-semibold tracking-widest uppercase">
                {winner.school}
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main content — transitions between idle and active match */}
      <AnimatePresence mode="wait">
        {!liveMatch ? (
          /* Idle — breathing logo */
          <motion.div
            key="idle"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.5 }}
            className="flex flex-col items-center justify-center"
          >
            <motion.div
              animate={{ opacity: [0.25, 0.55, 0.25] }}
              transition={{
                duration: 3.5,
                repeat: Infinity,
                ease: "easeInOut",
              }}
            >
              <FaixaPretaLogo className="h-16" />
            </motion.div>
          </motion.div>
        ) : (
          /* Active match */
          <motion.div
            key={liveMatch.matchId}
            initial={{ opacity: 0, y: 28 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -28 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            className="scale-150 flex flex-col items-center justify-center gap-10"
          >
            {/* Logo */}
            <FaixaPretaLogo className="h-5 opacity-30" />

            {/* Competitor cards */}
            <div className="grid grid-cols-2 gap-8 w-full max-w-6xl">
              {/* AKA */}
              <section
                className={cn(
                  "grid grid-cols-[auto_200px] gap-4 border-2 p-6 rounded-2xl bg-card shadow-2xl transition-all duration-300",
                  pulseSide === "aka"
                    ? "border-red-500 ring-4 ring-red-400/60 ring-offset-2"
                    : "border-red-500/50",
                )}
              >
                <div className="flex flex-col justify-between gap-3">
                  <p className="text-sm font-medium text-muted-foreground tracking-wide uppercase leading-tight">
                    {liveMatch.akaSchool}
                  </p>

                  <strong className="text-5xl leading-tight line-clamp-2">
                    {liveMatch.akaName}
                  </strong>

                  <div className="flex items-center gap-1.5">
                    {[1, 2, 3, 4].map((level) => (
                      <motion.div
                        key={level}
                        animate={{
                          scale: liveMatch.akaChui >= level ? 1.12 : 1,
                        }}
                        transition={{
                          type: "spring",
                          stiffness: 400,
                          damping: 22,
                        }}
                        className={cn(
                          "text-center py-1.5 px-5 rounded-lg font-bold text-sm transition-colors duration-300",
                          liveMatch.akaChui >= level
                            ? "bg-yellow-400 text-black"
                            : "bg-muted text-muted-foreground",
                        )}
                      >
                        {level}
                      </motion.div>
                    ))}
                  </div>
                </div>

                {/* AKA score box */}
                <div
                  className={cn(
                    "relative size-[200px] bg-red-500 text-white rounded-xl flex items-center justify-center shadow-xl overflow-hidden transition-all duration-300",
                    pulseSide === "aka" && "scale-105",
                  )}
                >
                  <AnimatePresence mode="wait">
                    <motion.span
                      key={liveMatch.akaScore}
                      initial={{ y: -30, opacity: 0, scale: 1.3 }}
                      animate={{ y: 0, opacity: 1, scale: 1 }}
                      exit={{ y: 30, opacity: 0 }}
                      transition={{
                        type: "spring",
                        stiffness: 350,
                        damping: 28,
                      }}
                      className="font-bold font-mono text-9xl text-center"
                    >
                      {liveMatch.akaScore}
                    </motion.span>
                  </AnimatePresence>

                  <AnimatePresence>
                    {liveMatch.akaSenshu && (
                      <motion.div
                        initial={{ scale: 0, opacity: 0, rotate: -15 }}
                        animate={{ scale: 1, opacity: 1, rotate: 0 }}
                        exit={{ scale: 0, opacity: 0 }}
                        transition={{
                          type: "spring",
                          stiffness: 500,
                          damping: 22,
                        }}
                        className="bg-green-600 flex items-end p-3 text-5xl font-bold h-[120px] w-[120px] text-white absolute bottom-0 left-0 rounded-bl-xl [clip-path:polygon(0%_0%,0%_100%,100%_100%)]"
                      >
                        S
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </section>

              {/* AO */}
              <section
                className={cn(
                  "grid grid-cols-[200px_auto] gap-4 border-2 p-6 rounded-2xl bg-card shadow-2xl transition-all duration-300",
                  pulseSide === "ao"
                    ? "border-blue-500 ring-4 ring-blue-400/60 ring-offset-2"
                    : "border-blue-500/50",
                )}
              >
                {/* AO score box */}
                <div
                  className={cn(
                    "relative size-[200px] bg-blue-500 text-white rounded-xl flex items-center justify-center shadow-xl overflow-hidden transition-all duration-300",
                    pulseSide === "ao" && "scale-105",
                  )}
                >
                  <AnimatePresence mode="wait">
                    <motion.span
                      key={liveMatch.aoScore}
                      initial={{ y: -30, opacity: 0, scale: 1.3 }}
                      animate={{ y: 0, opacity: 1, scale: 1 }}
                      exit={{ y: 30, opacity: 0 }}
                      transition={{
                        type: "spring",
                        stiffness: 350,
                        damping: 28,
                      }}
                      className="font-bold font-mono text-9xl text-center"
                    >
                      {liveMatch.aoScore}
                    </motion.span>
                  </AnimatePresence>

                  <AnimatePresence>
                    {liveMatch.aoSenshu && (
                      <motion.div
                        initial={{ scale: 0, opacity: 0, rotate: 15 }}
                        animate={{ scale: 1, opacity: 1, rotate: 0 }}
                        exit={{ scale: 0, opacity: 0 }}
                        transition={{
                          type: "spring",
                          stiffness: 500,
                          damping: 22,
                        }}
                        className="bg-green-600 flex items-end justify-end p-3 text-5xl font-bold h-[120px] w-[120px] text-white absolute bottom-0 right-0 rounded-br-xl [clip-path:polygon(0%_100%,100%_0%,100%_100%)]"
                      >
                        S
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                <div className="flex flex-col justify-between gap-3 text-right">
                  <p className="text-sm font-medium text-muted-foreground tracking-wide uppercase leading-tight">
                    {liveMatch.aoSchool}
                  </p>

                  <strong className="text-5xl leading-tight line-clamp-2">
                    {liveMatch.aoName}
                  </strong>

                  <div className="flex items-center justify-end gap-1.5">
                    {[1, 2, 3, 4].map((level) => (
                      <motion.div
                        key={level}
                        animate={{
                          scale: liveMatch.aoChui >= level ? 1.12 : 1,
                        }}
                        transition={{
                          type: "spring",
                          stiffness: 400,
                          damping: 22,
                        }}
                        className={cn(
                          "text-center py-1.5 px-5 rounded-lg font-bold text-sm transition-colors duration-300",
                          liveMatch.aoChui >= level
                            ? "bg-yellow-400 text-black"
                            : "bg-muted text-muted-foreground",
                        )}
                      >
                        {level}
                      </motion.div>
                    ))}
                  </div>
                </div>
              </section>
            </div>

            {/* Footer */}
            <footer className="px-4 max-w-6xl w-full">
              <div className="grid grid-cols-3 items-center text-center gap-8">
                <p className="font-medium text-2xl text-muted-foreground leading-tight">
                  {liveMatch.category}
                </p>

                <motion.div
                  className={cn(
                    "flex items-center gap-4 justify-center transition-colors duration-500",
                    liveMatch.timerRunning
                      ? "text-yellow-500"
                      : localTime === 0
                        ? "text-red-500"
                        : "text-foreground",
                  )}
                  animate={
                    localTime === 0 && !liveMatch.timerRunning
                      ? { opacity: [1, 0.4, 1] }
                      : { opacity: 1 }
                  }
                  transition={{
                    duration: 0.8,
                    repeat: localTime === 0 ? Infinity : 0,
                  }}
                >
                  <span className="font-semibold font-mono text-8xl tabular-nums">
                    {String(minutes).padStart(2, "0")}:
                    {String(seconds).padStart(2, "0")}
                  </span>
                </motion.div>

                <p className="font-bold text-3xl uppercase tracking-widest">
                  {getMatchTypeLabel(liveMatch)}
                </p>
              </div>
            </footer>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
