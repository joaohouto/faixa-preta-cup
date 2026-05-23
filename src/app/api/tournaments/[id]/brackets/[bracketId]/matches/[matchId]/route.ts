import { db } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";

type MatchWithBracket = Prisma.MatchGetPayload<{ include: { bracket: true } }>;

export async function PUT(
  req: Request,
  context: {
    params: Promise<{ id: string; bracketId: string; matchId: string }>;
  }
) {
  try {
    const { bracketId, matchId } = await context.params;
    const body = await req.json();
    const { akaScore, aoScore, winnerId, decisionByHantei } = body;

    const match = await db.match.findUnique({
      where: { id: matchId },
      include: { bracket: true },
    });

    if (!match) {
      return new NextResponse("Match not found", { status: 404 });
    }

    if (winnerId !== match.akaId && winnerId !== match.aoId) {
      return new NextResponse("Invalid winner", { status: 400 });
    }

    const updatedMatch = await db.match.update({
      where: { id: matchId },
      data: {
        akaScore,
        aoScore,
        winnerId,
        decisionByHantei,
        isCompleted: true,
        completedAt: new Date(),
      },
    });

    if (match.bracket.status === "NOT_STARTED") {
      await db.bracket.update({
        where: { id: bracketId },
        data: { status: "IN_PROGRESS" },
      });
    }

    await propagateWinner(match, winnerId);
    await checkAndCompleteBracket(bracketId);

    return NextResponse.json(updatedMatch);
  } catch (error) {
    console.log("[MATCH_RESULT_PUT]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}

async function propagateWinner(match: MatchWithBracket, winnerId: string) {
  const { round, position, bracketId, bracket, akaId, aoId } = match;

  const loserId = winnerId === akaId ? aoId : akaId;

  const isSemiFinal = round === bracket.totalRounds - 1;

  if (isSemiFinal) {
    const nextRound = round + 1;
    const nextPosition = Math.floor(position / 2);
    const isAka = position % 2 === 0;

    await db.match.updateMany({
      where: {
        bracketId,
        round: nextRound,
        position: nextPosition,
        isThirdPlace: false,
      },
      data: {
        [isAka ? "akaId" : "aoId"]: winnerId,
      },
    });

    const thirdPlaceMatch = await db.match.findFirst({
      where: {
        bracketId,
        isThirdPlace: true,
      },
    });

    if (thirdPlaceMatch) {
      const updateData = !thirdPlaceMatch.akaId
        ? { akaId: loserId }
        : { aoId: loserId };

      await db.match.update({
        where: { id: thirdPlaceMatch.id },
        data: updateData,
      });
    }
  } else if (round < bracket.totalRounds && !match.isThirdPlace) {
    const nextRound = round + 1;
    const nextPosition = Math.floor(position / 2);
    const isAka = position % 2 === 0;

    await db.match.updateMany({
      where: {
        bracketId,
        round: nextRound,
        position: nextPosition,
        isThirdPlace: false,
      },
      data: {
        [isAka ? "akaId" : "aoId"]: winnerId,
      },
    });
  }
}

async function checkAndCompleteBracket(bracketId: string) {
  const allMatches = await db.match.findMany({
    where: { bracketId },
  });

  const allCompleted = allMatches.every((m) => m.isCompleted || m.isBye);

  if (allCompleted) {
    await db.bracket.update({
      where: { id: bracketId },
      data: { status: "COMPLETED" },
    });
  }
}
