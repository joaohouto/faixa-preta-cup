import { db } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { apiError } from "@/lib/api-error";
import { withApiHandler } from "@/lib/api-handler";

type MatchWithBracket = Prisma.MatchGetPayload<{ include: { bracket: true } }>;

/**
 * Registra o resultado de uma luta e propaga o vencedor para a próxima
 * rodada (e, se for semifinal, o perdedor para o match de 3º lugar).
 *
 * Valida que `winnerId` é um dos dois competidores do match E que é
 * consistente com o placar: em caso de empate, exige
 * `decisionByHantei: true`; sem empate, o vencedor tem que ser quem tem
 * o placar maior.
 *
 * `isWalkover: true` pula a validação de placar — usado quando os dois
 * competidores estavam escalados mas um não compareceu. Diferente de
 * `isBye` (que é estrutural, definido na geração da chave quando não há
 * segundo competidor pra aquela posição), o walkover só existe quando
 * ambos os lados (`akaId`/`aoId`) já estavam preenchidos.
 */
export const PUT = withApiHandler(
  "MATCH_RESULT_PUT",
  async (
    req: Request,
    context: {
      params: Promise<{ id: string; bracketId: string; matchId: string }>;
    },
  ) => {
    const { bracketId, matchId } = await context.params;
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

    if (!match) {
      return apiError("Match not found", 404);
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

    const updatedMatch = await db.match.update({
      where: { id: matchId },
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
            completedAt: new Date(),
          }
        : {
            akaScore,
            aoScore,
            winnerId,
            decisionByHantei,
            akaSenshu: !!akaSenshu,
            aoSenshu: !!aoSenshu,
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
  }
);

/**
 * Avança o vencedor para o match da próxima rodada (mesma convenção de
 * `bracketId, round: position>>1, isAka = position par` usada em toda a
 * geração da chave — ver comentários em bracket-generator.ts).
 *
 * "Semifinal" aqui é definido estruturalmente como `round === totalRounds - 1`,
 * não por um flag no banco: é a penúltima rodada, a única que precisa
 * também mandar o perdedor para o match de 3º lugar. Rodadas anteriores
 * só propagam o vencedor. A rodada final (`round === totalRounds`) e o
 * próprio match de 3º lugar caem nas duas condições como false e viram
 * no-op — não há "próxima rodada" para eles.
 *
 * `isThirdPlace: false` no `where` dos updateMany é o que impede a
 * escrita de acidentalmente acertar o match de 3º lugar (que também usa
 * `round: totalRounds`) em vez da final — ver nota em
 * `createThirdPlaceMatch` no bracket-generator.
 */
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

/**
 * Marca a chave como COMPLETED quando todo match está `isCompleted` OU
 * `isBye` (byes nunca passam por esse endpoint — já nascem completos em
 * `generateFirstRoundMatches`, em bracket-generator.ts).
 */
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
