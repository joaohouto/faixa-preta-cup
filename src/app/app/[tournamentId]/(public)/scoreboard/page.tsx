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
              "fixed inset-0 z-50 flex flex-col items-center justify-center text-center p-8 sm:p-16 overflow-hidden",
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
              <Trophy className="size-20 sm:size-28 md:size-36 lg:size-40 text-white mb-4 sm:mb-6 lg:mb-8" />
              <h2
                className="text-white font-bold tracking-tight uppercase leading-none mb-3 sm:mb-5"
                style={{ fontSize: "clamp(2rem, 10vw, 9rem)" }}
              >
                {winner.name}
              </h2>
              <p
                className="text-white/90 font-semibold tracking-widest uppercase"
                style={{ fontSize: "clamp(1rem, 3.5vw, 2.5rem)" }}
              >
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
              <FaixaPretaLogo className="h-12 sm:h-16" />
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
            className="w-full flex flex-col items-center justify-center gap-3 sm:gap-5 lg:gap-8 2xl:gap-10 px-3 sm:px-5 lg:px-8 2xl:px-10"
          >
            {/* Logo */}
            <FaixaPretaLogo className="h-4 sm:h-5 opacity-30" />

            {/* Competitor cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 lg:gap-6 2xl:gap-8 w-full">
              {/* AKA */}
              <section
                className={cn(
                  "grid grid-cols-[1fr_auto] gap-3 sm:gap-3 lg:gap-4 border-2 p-3 sm:p-4 lg:p-5 2xl:p-7 rounded-2xl bg-card shadow-2xl transition-all duration-300",
                  pulseSide === "aka"
                    ? "border-red-500 ring-4 ring-red-400/60 ring-offset-2"
                    : "border-red-500/50",
                )}
              >
                <div className="flex flex-col justify-between gap-2 sm:gap-2 lg:gap-3 min-w-0">
                  <p className="font-medium text-muted-foreground tracking-wide uppercase leading-tight truncate text-[0.6rem] sm:text-xs md:text-xs lg:text-sm">
                    {liveMatch.akaSchool}
                  </p>

                  <strong className="leading-tight line-clamp-2 text-xl sm:text-2xl md:text-3xl lg:text-4xl xl:text-5xl">
                    {liveMatch.akaName}
                  </strong>

                  <div className="flex items-center gap-1 sm:gap-1 lg:gap-1.5">
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
                          "text-center rounded-lg font-bold transition-colors duration-300",
                          "py-0.5 px-2 text-[0.6rem] sm:py-1 sm:px-3 sm:text-xs md:text-xs lg:py-1.5 lg:px-4 lg:text-sm 2xl:px-5",
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
                    "relative bg-red-500 text-white rounded-xl flex items-center justify-center shadow-xl overflow-hidden transition-all duration-300 flex-shrink-0",
                    "size-20 sm:size-28 md:size-36 lg:size-44 xl:size-52 2xl:size-[18rem]",
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
                      className="font-bold font-mono text-center text-5xl sm:text-6xl md:text-7xl lg:text-8xl xl:text-9xl 2xl:text-[10rem]"
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
                        className={cn(
                          "bg-green-600 flex items-end font-bold text-white absolute bottom-0 left-0 rounded-bl-xl [clip-path:polygon(0%_0%,0%_100%,100%_100%)]",
                          "p-1.5 h-12 w-12 text-2xl",
                          "sm:p-2 sm:h-[4.2rem] sm:w-[4.2rem] sm:text-3xl",
                          "md:h-[5.4rem] md:w-[5.4rem]",
                          "lg:p-2.5 lg:h-[6.6rem] lg:w-[6.6rem] lg:text-4xl",
                          "xl:h-[7.8rem] xl:w-[7.8rem] xl:text-5xl",
                          "2xl:p-3 2xl:h-[10.8rem] 2xl:w-[10.8rem] 2xl:text-6xl",
                        )}
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
                  "grid grid-cols-[auto_1fr] gap-3 sm:gap-3 lg:gap-4 border-2 p-3 sm:p-4 lg:p-5 2xl:p-7 rounded-2xl bg-card shadow-2xl transition-all duration-300",
                  pulseSide === "ao"
                    ? "border-blue-500 ring-4 ring-blue-400/60 ring-offset-2"
                    : "border-blue-500/50",
                )}
              >
                {/* AO score box */}
                <div
                  className={cn(
                    "relative bg-blue-500 text-white rounded-xl flex items-center justify-center shadow-xl overflow-hidden transition-all duration-300 flex-shrink-0",
                    "size-20 sm:size-28 md:size-36 lg:size-44 xl:size-52 2xl:size-[18rem]",
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
                      className="font-bold font-mono text-center text-5xl sm:text-6xl md:text-7xl lg:text-8xl xl:text-9xl 2xl:text-[10rem]"
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
                        className={cn(
                          "bg-green-600 flex items-end justify-end font-bold text-white absolute bottom-0 right-0 rounded-br-xl [clip-path:polygon(0%_100%,100%_0%,100%_100%)]",
                          "p-1.5 h-12 w-12 text-2xl",
                          "sm:p-2 sm:h-[4.2rem] sm:w-[4.2rem] sm:text-3xl",
                          "md:h-[5.4rem] md:w-[5.4rem]",
                          "lg:p-2.5 lg:h-[6.6rem] lg:w-[6.6rem] lg:text-4xl",
                          "xl:h-[7.8rem] xl:w-[7.8rem] xl:text-5xl",
                          "2xl:p-3 2xl:h-[10.8rem] 2xl:w-[10.8rem] 2xl:text-6xl",
                        )}
                      >
                        S
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                <div className="flex flex-col justify-between gap-2 sm:gap-2 lg:gap-3 text-right min-w-0">
                  <p className="font-medium text-muted-foreground tracking-wide uppercase leading-tight truncate text-[0.6rem] sm:text-xs md:text-xs lg:text-sm">
                    {liveMatch.aoSchool}
                  </p>

                  <strong className="leading-tight line-clamp-2 text-xl sm:text-2xl md:text-3xl lg:text-4xl xl:text-5xl">
                    {liveMatch.aoName}
                  </strong>

                  <div className="flex items-center justify-end gap-1 sm:gap-1 lg:gap-1.5">
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
                          "text-center rounded-lg font-bold transition-colors duration-300",
                          "py-0.5 px-2 text-[0.6rem] sm:py-1 sm:px-3 sm:text-xs md:text-xs lg:py-1.5 lg:px-4 lg:text-sm 2xl:px-5",
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
            <footer className="w-full px-1 sm:px-2">
              <div className="grid grid-cols-3 items-center text-center gap-2 sm:gap-4 lg:gap-8">
                <p className="font-medium text-muted-foreground leading-tight truncate text-xs sm:text-base md:text-lg lg:text-2xl">
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
                  <span className="font-semibold font-mono tabular-nums text-3xl sm:text-5xl md:text-6xl lg:text-7xl xl:text-8xl 2xl:text-[9rem]">
                    {String(minutes).padStart(2, "0")}:
                    {String(seconds).padStart(2, "0")}
                  </span>
                </motion.div>

                <p className="font-bold uppercase tracking-widest text-xs sm:text-lg md:text-xl lg:text-2xl xl:text-3xl">
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
