import { db } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { apiError } from "@/lib/api-error";
import { withApiHandler } from "@/lib/api-handler";

export const POST = withApiHandler("LIVE_MATCH_POST", async (req: Request) => {
  const body = await req.json();
  const {
    tournamentId,
    matchId,
    bracketId,
    clientId,
    akaId,
    akaName,
    akaSchool,
    aoId,
    aoName,
    aoSchool,
    category,
    modality,
    round,
    position,
    totalRounds,
    akaScore,
    aoScore,
    akaChui,
    aoChui,
    akaSenshu,
    aoSenshu,
    timeRemaining,
    timerRunning,
    timerEndAt,
    winner,
  } = body;

  if (!tournamentId || !matchId || !bracketId) {
    return apiError("tournamentId, bracketId e matchId são obrigatórios", 400);
  }

  // Se houver um RefereeLock ativo para esta chave pertencente a OUTRO cliente,
  // impede que um espectador/segundo dispositivo sobrescreva o telão.
  if (clientId) {
    const activeLock = await db.refereeLock.findUnique({
      where: { bracketId },
    });
    const now = new Date();
    if (
      activeLock &&
      now < activeLock.expiresAt &&
      activeLock.clientId !== clientId
    ) {
      return apiError(
        "Outro árbitro detém o controle desta chave no momento",
        423
      );
    }
  }

  const matchData = {
    matchId,
    bracketId,
    akaId,
    akaName,
    akaSchool,
    aoId,
    aoName,
    aoSchool,
    category,
    modality,
    round,
    position,
    totalRounds,
    akaScore,
    aoScore,
    akaChui,
    aoChui,
    akaSenshu,
    aoSenshu,
    timeRemaining,
    timerRunning,
    timerEndAt: timerEndAt != null ? new Date(timerEndAt) : null,
    winner: winner ?? null,
  };

  const liveMatch = await db.liveMatch.upsert({
    where: { tournamentId },
    create: { tournamentId, ...matchData, isActive: true },
    update: { ...matchData, updatedAt: new Date() },
  });

  return NextResponse.json(liveMatch);
});

export const GET = withApiHandler("LIVE_MATCH_GET", async (req: Request) => {
  const { searchParams } = new URL(req.url);
  const tournamentId = searchParams.get("tournamentId");

  if (!tournamentId) {
    return apiError("Tournament ID required", 400);
  }

  const liveMatch = await db.liveMatch.findUnique({
    where: { tournamentId },
  });

  if (!liveMatch) {
    return NextResponse.json(null);
  }

  return NextResponse.json(liveMatch);
});

export const DELETE = withApiHandler(
  "LIVE_MATCH_DELETE",
  async (req: Request) => {
    const { searchParams } = new URL(req.url);
    const tournamentId = searchParams.get("tournamentId");
    const matchId = searchParams.get("matchId");
    const bracketId = searchParams.get("bracketId");
    const clientId = searchParams.get("clientId");

    if (!tournamentId) {
      return apiError("Tournament ID required", 400);
    }

    // Se um clientId foi informado e outro árbitro detém o lock ativo da chave,
    // ignora a limpeza para não apagar o telão de quem está arbitrando.
    if (bracketId && clientId) {
      const activeLock = await db.refereeLock.findUnique({
        where: { bracketId },
      });
      const now = new Date();
      if (
        activeLock &&
        now < activeLock.expiresAt &&
        activeLock.clientId !== clientId
      ) {
        return new NextResponse(null, { status: 204 });
      }
    }

    await db.liveMatch.deleteMany({
      where: {
        tournamentId,
        ...(matchId ? { matchId } : {}),
        ...(bracketId ? { bracketId } : {}),
      },
    });

    return new NextResponse(null, { status: 204 });
  }
);
