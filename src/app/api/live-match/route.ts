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

    if (!tournamentId) {
      return apiError("Tournament ID required", 400);
    }

    // deleteMany em vez de delete: idempotente. A limpeza roda no unmount
    // da tela de árbitro e pode ser chamada mais de uma vez (StrictMode,
    // navegação rápida) — se a linha já não existir, não é um erro.
    await db.liveMatch.deleteMany({
      where: { tournamentId },
    });

    return new NextResponse(null, { status: 204 });
  }
);
