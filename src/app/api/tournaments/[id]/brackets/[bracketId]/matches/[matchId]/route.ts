import { db } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { apiError } from "@/lib/api-error";
import { withApiHandler } from "@/lib/api-handler";

type MatchWithBracket = Prisma.MatchGetPayload<{ include: { bracket: true } }>;

/**
 * Registra o resultado de uma luta e propaga o vencedor para a próxima
 * rodada (e, se for semifinal, o perdedor para o match de 3º lugar).
 */
export const PUT = withApiHandler(
  "MATCH_RESULT_PUT",
  async (
    req: Request,
    context: {
      params: Promise<{ id: string; bracketId: string; matchId: string }>;
    },
  ) => {
    const { id: tournamentId, bracketId, matchId } = await context.params;
    const body = await req.json();
    const {
      akaScore,
      aoScore,
      winnerId,
      decisionByHantei,
      akaSenshu,
      aoSenshu,
      isWalkover,
    } = body;

    const match = await db.match.findUnique({
      where: { id: matchId },
      include: { bracket: true },
    });

    if (
      !match ||
      match.bracketId !== bracketId ||
      match.bracket.tournamentId !== tournamentId
    ) {
      return apiError("Match not found", 404);
    }

    if (match.isBye) {
      return apiError("Lutas de bye não podem ser arbitradas manualmente", 400);
    }

    if (!match.akaId || !match.aoId) {
      return apiError(
        "A luta ainda não possui os dois competidores definidos",
        400,
      );
    }

    if (match.isCompleted) {
      return apiError(
        "Esta luta já foi finalizada e seu resultado já foi registrado",
        400,
      );
    }

    if (match.bracket.status === "COMPLETED") {
      return apiError("Esta chave já foi concluída", 400);
    }

    if (winnerId !== match.akaId && winnerId !== match.aoId) {
      return apiError("Invalid winner", 400);
    }

    if (isWalkover) {
      if (!match.akaId || !match.aoId) {
        return apiError(
          "W.O. exige os dois competidores escalados para a luta",
          400,
        );
      }
    } else {
      if (
        typeof akaScore !== "number" ||
        typeof aoScore !== "number" ||
        Number.isNaN(akaScore) ||
        Number.isNaN(aoScore) ||
        akaScore < 0 ||
        aoScore < 0
      ) {
        return apiError("Placar inválido", 400);
      }

      const scoresTied = akaScore === aoScore;
      if (scoresTied && !decisionByHantei) {
        return apiError("Placar empatado exige decisão por Hantei", 400);
      }
      if (!scoresTied && !decisionByHantei) {
        const expectedWinnerId = akaScore > aoScore ? match.akaId : match.aoId;
        if (winnerId !== expectedWinnerId) {
          return apiError("Vencedor não corresponde ao placar informado", 400);
        }
      }
    }

    const result = await db.$transaction(async (tx) => {
      // Atualização atômica condicional: garante que duas requisições concorrentes
      // nunca processem a mesma luta duas vezes.
      const completedAt = new Date();
      const updateCount = await tx.match.updateMany({
        where: { id: matchId, isCompleted: false },
        data: isWalkover
          ? {
              akaScore: null,
              aoScore: null,
              winnerId,
              decisionByHantei: false,
              akaSenshu: false,
              aoSenshu: false,
              isWalkover: true,
              isCompleted: true,
              completedAt,
            }
          : {
              akaScore,
              aoScore,
              winnerId,
              decisionByHantei: Boolean(decisionByHantei),
              akaSenshu: Boolean(akaSenshu),
              aoSenshu: Boolean(aoSenshu),
              isWalkover: false,
              isCompleted: true,
              completedAt,
            },
      });

      if (updateCount.count === 0) {
        return null;
      }

      if (match.bracket.status === "NOT_STARTED") {
        await tx.bracket.update({
          where: { id: bracketId },
          data: { status: "IN_PROGRESS" },
        });
      }

      await propagateWinner(tx, match, winnerId);
      await checkAndCompleteBracket(tx, bracketId);

      return tx.match.findUnique({ where: { id: matchId } });
    });

    if (!result) {
      return apiError(
        "Esta luta já foi finalizada por outra requisição simultânea",
        409,
      );
    }

    return NextResponse.json(result);
  },
);

/**
 * Reabre uma luta que foi finalizada por engano (ex.: mesário marcou vencedor
 * ou W.O. errado), desde que a luta subsequente para onde o resultado foi
 * propagado ainda não tenha sido concluída.
 */
async function reopenMatchHandler(
  _req: Request,
  context: {
    params: Promise<{ id: string; bracketId: string; matchId: string }>;
  },
) {
  const { id: tournamentId, bracketId, matchId } = await context.params;

  const match = await db.match.findUnique({
    where: { id: matchId },
    include: { bracket: true },
  });

  if (
    !match ||
    match.bracketId !== bracketId ||
    match.bracket.tournamentId !== tournamentId
  ) {
    return apiError("Luta não encontrada", 404);
  }

  if (match.isBye) {
    return apiError("Lutas de bye são estruturais e não podem ser reabertas", 400);
  }

  if (!match.isCompleted) {
    return apiError("Esta luta ainda não foi finalizada", 400);
  }

  const isSemiFinal =
    match.round === match.bracket.totalRounds - 1 && !match.isThirdPlace;
  const hasNextRound =
    match.round < match.bracket.totalRounds && !match.isThirdPlace;

  if (hasNextRound) {
    const nextRound = match.round + 1;
    const nextPosition = Math.floor(match.position / 2);

    const nextMatch = await db.match.findFirst({
      where: {
        bracketId,
        round: nextRound,
        position: nextPosition,
        isThirdPlace: false,
      },
    });

    if (nextMatch?.isCompleted) {
      return apiError(
        "Não é possível reabrir esta luta porque a luta seguinte já foi concluída. Reabra a luta seguinte primeiro.",
        400,
      );
    }

    if (isSemiFinal) {
      const thirdPlaceMatch = await db.match.findFirst({
        where: {
          bracketId,
          isThirdPlace: true,
        },
      });

      if (thirdPlaceMatch?.isCompleted) {
        return apiError(
          "Não é possível reabrir a semifinal porque a disputa de 3º lugar já foi concluída. Reabra a disputa de 3º lugar primeiro.",
          400,
        );
      }
    }
  }

  const reopenedMatch = await db.$transaction(async (tx) => {
    if (hasNextRound) {
      const nextRound = match.round + 1;
      const nextPosition = Math.floor(match.position / 2);
      const isAka = match.position % 2 === 0;

      await tx.match.updateMany({
        where: {
          bracketId,
          round: nextRound,
          position: nextPosition,
          isThirdPlace: false,
        },
        data: {
          [isAka ? "akaId" : "aoId"]: null,
        },
      });

      if (isSemiFinal) {
        await tx.match.updateMany({
          where: {
            bracketId,
            isThirdPlace: true,
          },
          data: {
            [isAka ? "akaId" : "aoId"]: null,
          },
        });
      }
    }

    const updated = await tx.match.update({
      where: { id: matchId },
      data: {
        winnerId: null,
        akaScore: 0,
        aoScore: 0,
        decisionByHantei: false,
        akaSenshu: false,
        aoSenshu: false,
        isWalkover: false,
        isCompleted: false,
        completedAt: null,
      },
    });

    // Atualiza o status da chave (se estava COMPLETED, volta para IN_PROGRESS;
    // se nenhuma luta real restar concluída, volta para NOT_STARTED).
    const allMatches = await tx.match.findMany({ where: { bracketId } });
    const anyRealMatchCompleted = allMatches.some(
      (m) => !m.isBye && m.isCompleted,
    );

    await tx.bracket.update({
      where: { id: bracketId },
      data: {
        status: anyRealMatchCompleted ? "IN_PROGRESS" : "NOT_STARTED",
      },
    });

    return updated;
  });

  return NextResponse.json(reopenedMatch);
}

export const PATCH = withApiHandler("MATCH_REOPEN_PATCH", reopenMatchHandler);
export const DELETE = withApiHandler("MATCH_REOPEN_DELETE", reopenMatchHandler);

/**
 * Avança o vencedor para o match da próxima rodada e, na semifinal,
 * envia o perdedor para o lado correspondente (`position % 2 === 0 ? akaId : aoId`)
 * da disputa de 3º lugar de forma determinística e sem condição de corrida.
 */
async function propagateWinner(
  tx: Prisma.TransactionClient,
  match: MatchWithBracket,
  winnerId: string,
) {
  const { round, position, bracketId, bracket, akaId, aoId } = match;

  const loserId = winnerId === akaId ? aoId : akaId;

  const isSemiFinal = round === bracket.totalRounds - 1 && !match.isThirdPlace;

  if (isSemiFinal) {
    const nextRound = round + 1;
    const nextPosition = Math.floor(position / 2);
    const isAka = position % 2 === 0;

    await tx.match.updateMany({
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

    await tx.match.updateMany({
      where: {
        bracketId,
        isThirdPlace: true,
      },
      data: {
        [isAka ? "akaId" : "aoId"]: loserId,
      },
    });
  } else if (round < bracket.totalRounds && !match.isThirdPlace) {
    const nextRound = round + 1;
    const nextPosition = Math.floor(position / 2);
    const isAka = position % 2 === 0;

    await tx.match.updateMany({
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

/**
 * Marca a chave como COMPLETED quando todo match está `isCompleted` OU `isBye`.
 */
async function checkAndCompleteBracket(
  tx: Prisma.TransactionClient,
  bracketId: string,
) {
  const allMatches = await tx.match.findMany({
    where: { bracketId },
  });

  const allCompleted = allMatches.every((m) => m.isCompleted || m.isBye);

  if (allCompleted) {
    await tx.bracket.update({
      where: { id: bracketId },
      data: { status: "COMPLETED" },
    });
  }
}
