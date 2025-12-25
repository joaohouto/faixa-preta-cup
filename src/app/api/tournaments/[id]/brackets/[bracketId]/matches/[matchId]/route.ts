import { auth } from "@/lib/auth";
import { db } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function PUT(
  req: Request,
  context: {
    params: Promise<{ id: string; bracketId: string; matchId: string }>;
  }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const { id: tournamentId, bracketId, matchId } = await context.params;
    const body = await req.json();
    const { akaScore, aoScore, winnerId, decisionByHantei } = body;

    // Verificar ownership
    const tournament = await db.tournament.findUnique({
      where: { id: tournamentId },
    });

    if (!tournament || tournament.organizerId !== session.user.id) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    // Buscar o match
    const match = await db.match.findUnique({
      where: { id: matchId },
      include: { bracket: true },
    });

    if (!match || match.bracket.tournamentId !== tournamentId) {
      return new NextResponse("Match not found", { status: 404 });
    }

    // Validar vencedor
    if (winnerId !== match.akaId && winnerId !== match.aoId) {
      return new NextResponse("Invalid winner", { status: 400 });
    }

    // Atualizar match
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

    // Atualizar status do bracket para IN_PROGRESS (se ainda não estiver)
    if (match.bracket.status === "NOT_STARTED") {
      await db.bracket.update({
        where: { id: bracketId },
        data: { status: "IN_PROGRESS" },
      });
    }

    // Propagar vencedor para próxima rodada
    await propagateWinner(match, winnerId);

    // ✅ VERIFICAR SE TODAS AS LUTAS FORAM CONCLUÍDAS
    await checkAndCompleteBracket(bracketId);

    return NextResponse.json(updatedMatch);
  } catch (error) {
    console.log("[MATCH_RESULT_PUT]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}

async function propagateWinner(match: any, winnerId: string) {
  const { round, position, bracketId, bracket, akaId, aoId } = match;

  // Determinar perdedor
  const loserId = winnerId === akaId ? aoId : akaId;

  // Verificar se é semifinal
  const isSemiFinal = round === bracket.totalRounds - 1;

  if (isSemiFinal) {
    // Propagar vencedor para final
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

    // Propagar perdedor para 3º lugar
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
    // Rodada normal - propagar apenas vencedor
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

// ✅ NOVA FUNÇÃO: Verificar e concluir bracket
async function checkAndCompleteBracket(bracketId: string) {
  // Buscar todas as lutas da chave
  const allMatches = await db.match.findMany({
    where: { bracketId },
  });

  // Verificar se TODAS as lutas estão completas
  const allCompleted = allMatches.every((m) => m.isCompleted || m.isBye);

  if (allCompleted) {
    await db.bracket.update({
      where: { id: bracketId },
      data: { status: "COMPLETED" },
    });
  }
}
