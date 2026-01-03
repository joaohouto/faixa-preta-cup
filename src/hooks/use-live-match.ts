import { useEffect, useState, useRef } from "react";

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
  totalRounds: number;
  timeRemaining: number;
  timerRunning: boolean;
  isThirdPlace: boolean;
  isFourthPlace: boolean;
};

export function useLiveMatch(tournamentId: string) {
  const [liveMatch, setLiveMatch] = useState<LiveMatch | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);

  useEffect(() => {
    if (!tournamentId) return;

    // Criar conexão SSE
    const eventSource = new EventSource(
      `/api/live-match/stream?tournamentId=${tournamentId}`
    );

    eventSource.onmessage = (event) => {
      const data = JSON.parse(event.data);
      setLiveMatch(data);
    };

    eventSource.onerror = (error) => {
      console.error("SSE Error:", error);
      eventSource.close();
    };

    eventSourceRef.current = eventSource;

    // Cleanup
    return () => {
      eventSource.close();
    };
  }, [tournamentId]);

  return liveMatch;
}
