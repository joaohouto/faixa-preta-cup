import { db } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
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

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const tournamentId = searchParams.get("tournamentId");

    if (!tournamentId) {
      return new NextResponse("Tournament ID required", { status: 400 });
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
