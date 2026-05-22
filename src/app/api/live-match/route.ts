import { auth } from "@/lib/auth";
import { db } from "@/lib/prisma";
import { NextResponse } from "next/server";

// POST - Atualizar estado da luta ao vivo
export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

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
      winner,
    } = body;

    // Verificar ownership — select mínimo, só o campo necessário
    const tournament = await db.tournament.findUnique({
      where: { id: tournamentId },
      select: { organizerId: true },
    });

    if (!tournament || tournament.organizerId !== session.user.id) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    // Upsert
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
      winner: winner ?? null,
    };

    const liveMatch = await db.liveMatch.upsert({
      where: { tournamentId },
      create: { tournamentId, ...matchData, isActive: true },
      update: { ...matchData, updatedAt: new Date() },
    });

    return NextResponse.json(liveMatch);
  } catch (error) {
    console.log("[LIVE_MATCH_POST]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
// GET - Buscar luta ao vivo
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const tournamentId = searchParams.get("tournamentId");

    if (!tournamentId) {
      return new NextResponse("Tournament ID required", { status: 400 });
    }

    const liveMatch = await db.liveMatch.findUnique({
      where: { tournamentId },
    });

    if (!liveMatch) {
      return NextResponse.json(null);
    }

    return NextResponse.json(liveMatch);
  } catch (error) {
    console.log("[LIVE_MATCH_GET]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}

// DELETE - Finalizar luta ao vivo
export async function DELETE(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const tournamentId = searchParams.get("tournamentId");

    if (!tournamentId) {
      return new NextResponse("Tournament ID required", { status: 400 });
    }

    // Verificar ownership — select mínimo, só o campo necessário
    const tournament = await db.tournament.findUnique({
      where: { id: tournamentId },
      select: { organizerId: true },
    });

    if (!tournament || tournament.organizerId !== session.user.id) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    await db.liveMatch.delete({
      where: { tournamentId },
    });

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.log("[LIVE_MATCH_DELETE]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
