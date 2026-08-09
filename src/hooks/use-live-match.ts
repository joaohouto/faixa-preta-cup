import { useEffect, useState, useRef } from "react";

type LiveMatch = {
  id: string;
  matchId: string;
  bracketId: string;
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
  position: number;
  totalRounds: number;
  timeRemaining: number;
  timerRunning: boolean;
  timerEndAt: string | null;
  winner: string | null;
};

export function useLiveMatch(tournamentId: string) {
  const [liveMatch, setLiveMatch] = useState<LiveMatch | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);
  const retryTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const retryDelayRef = useRef(1000);

  useEffect(() => {
    if (!tournamentId) return;

    function connect() {
      const eventSource = new EventSource(
        `/api/live-match/stream?tournamentId=${tournamentId}`
      );

      eventSource.onmessage = (event) => {
        retryDelayRef.current = 1000; // reset backoff on successful message
        const data = JSON.parse(event.data);
        setLiveMatch(data);
      };

      eventSource.onerror = () => {
        eventSource.close();
        eventSourceRef.current = null;

        const delay = Math.min(retryDelayRef.current, 30000);
        retryDelayRef.current = delay * 2;

        retryTimeoutRef.current = setTimeout(connect, delay);
      };

      eventSourceRef.current = eventSource;
    }

    connect();

    return () => {
      eventSourceRef.current?.close();
      if (retryTimeoutRef.current) clearTimeout(retryTimeoutRef.current);
    };
  }, [tournamentId]);

  return liveMatch;
}
