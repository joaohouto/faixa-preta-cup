"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { toast } from "sonner";

export interface LockHolderInfo {
  clientId: string;
  deviceInfo?: string | null;
  matchId?: string | null;
  acquiredAt: string;
  lastHeartbeat: string;
  expiresAt: string;
}

export type RefereeLockStatus =
  | "checking"
  | "acquired"
  | "locked_by_other"
  | "error";

function getClientId(): string {
  if (typeof window === "undefined") return "";
  const STORAGE_KEY = "faixa_preta_referee_client_id";
  let id = sessionStorage.getItem(STORAGE_KEY);
  if (!id) {
    id =
      typeof crypto !== "undefined" && crypto.randomUUID
        ? crypto.randomUUID()
        : `client_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    sessionStorage.setItem(STORAGE_KEY, id);
  }
  return id;
}

function getDeviceInfo(): string {
  if (typeof window === "undefined") return "Desconhecido";
  const ua = navigator.userAgent;
  const isMobile = /mobile|android|iphone|ipad|ipod/i.test(ua);
  const platform = isMobile ? "Smartphone" : "Computador";

  let browser = "Navegador";
  if (ua.includes("Chrome") && !ua.includes("Edg")) browser = "Chrome";
  else if (ua.includes("Safari") && !ua.includes("Chrome")) browser = "Safari";
  else if (ua.includes("Firefox")) browser = "Firefox";
  else if (ua.includes("Edg")) browser = "Edge";

  return `${platform} (${browser})`;
}

export function useRefereeLock(
  tournamentId: string,
  bracketId: string,
  matchId?: string | null
) {
  const [status, setStatus] = useState<RefereeLockStatus>("checking");
  const [lockHolder, setLockHolder] = useState<LockHolderInfo | null>(null);

  const clientIdRef = useRef<string>("");
  const matchIdRef = useRef<string | null>(matchId || null);
  const heartbeatTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isAcquiredRef = useRef(false);

  useEffect(() => {
    matchIdRef.current = matchId || null;
  }, [matchId]);

  useEffect(() => {
    clientIdRef.current = getClientId();
  }, []);

  const clearHeartbeat = useCallback(() => {
    if (heartbeatTimerRef.current) {
      clearInterval(heartbeatTimerRef.current);
      heartbeatTimerRef.current = null;
    }
  }, []);

  const sendHeartbeat = useCallback(async () => {
    if (!bracketId || !tournamentId || !clientIdRef.current) return;
    try {
      const res = await fetch(
        `/api/tournaments/${tournamentId}/brackets/${bracketId}/referee-lock`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "heartbeat",
            clientId: clientIdRef.current,
          }),
        }
      );

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        if (data.reason === "LOST_LOCK" || res.status === 409) {
          clearHeartbeat();
          isAcquiredRef.current = false;
          setStatus("locked_by_other");
          toast.error(
            "Sua sessão de arbitragem foi assumida por outro dispositivo."
          );
        }
      }
    } catch {
      // Falha temporária de rede — o lock tem 15s de tolerância
    }
  }, [bracketId, tournamentId, clearHeartbeat]);

  const acquireLock = useCallback(
    async (force = false, overrideMatchId?: string) => {
      if (!bracketId || !tournamentId) return false;
      const clientId = clientIdRef.current || getClientId();
      clientIdRef.current = clientId;
      const deviceInfo = getDeviceInfo();
      const targetMatchId = overrideMatchId ?? matchIdRef.current;

      setStatus("checking");

      try {
        const res = await fetch(
          `/api/tournaments/${tournamentId}/brackets/${bracketId}/referee-lock`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              action: "acquire",
              clientId,
              deviceInfo,
              matchId: targetMatchId || null,
              force,
            }),
          }
        );

        const data = await res.json();

        if (res.ok && data.success) {
          isAcquiredRef.current = true;
          setStatus("acquired");
          setLockHolder(null);

          // Iniciar batimento a cada 5 segundos
          clearHeartbeat();
          heartbeatTimerRef.current = setInterval(sendHeartbeat, 5000);
          return true;
        }

        if (res.status === 423 || data.lockedByOther) {
          isAcquiredRef.current = false;
          clearHeartbeat();
          setStatus("locked_by_other");
          setLockHolder(data.lock);
          return false;
        }

        setStatus("error");
        return false;
      } catch {
        setStatus("error");
        return false;
      }
    },
    [bracketId, tournamentId, clearHeartbeat, sendHeartbeat]
  );

  const releaseLock = useCallback(
    async (force = false) => {
      clearHeartbeat();
      const clientId = clientIdRef.current;
      if (!bracketId || !tournamentId || !clientId) return;

      isAcquiredRef.current = false;

      try {
        await fetch(
          `/api/tournaments/${tournamentId}/brackets/${bracketId}/referee-lock`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              action: "release",
              clientId,
              force,
            }),
            keepalive: true,
          }
        );
      } catch {
        // Falha silenciosa no encerramento
      }
    },
    [bracketId, tournamentId, clearHeartbeat]
  );

  // Tentativa inicial de aquisição ao montar
  useEffect(() => {
    if (!tournamentId || !bracketId) return;

    acquireLock(false);

    // Liberar ao descarregar a página
    function handleUnload() {
      if (isAcquiredRef.current && clientIdRef.current) {
        const url = `/api/tournaments/${tournamentId}/brackets/${bracketId}/referee-lock`;
        const payload = JSON.stringify({
          action: "release",
          clientId: clientIdRef.current,
        });

        if (navigator.sendBeacon) {
          const blob = new Blob([payload], { type: "application/json" });
          navigator.sendBeacon(url, blob);
        } else {
          fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: payload,
            keepalive: true,
          }).catch(() => {});
        }
      }
    }

    window.addEventListener("pagehide", handleUnload);
    window.addEventListener("beforeunload", handleUnload);

    return () => {
      window.removeEventListener("pagehide", handleUnload);
      window.removeEventListener("beforeunload", handleUnload);
      clearHeartbeat();
      if (isAcquiredRef.current) {
        releaseLock(false);
      }
    };
  }, [tournamentId, bracketId, acquireLock, clearHeartbeat, releaseLock]);

  return {
    status,
    lockHolder,
    activeMatchId: lockHolder?.matchId || null,
    isAcquired: status === "acquired",
    acquireLock,
    releaseLock,
    forceAcquire: () => acquireLock(true),
  };
}
