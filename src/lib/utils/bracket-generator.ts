import { Competitor, Modality } from "@prisma/client";
import { db } from "@/lib/prisma";

interface BracketGenerationInput {
  tournamentId: string;
  category: string;
  modality: Modality;
  competitors: Competitor[];
}

// Calcula próxima potência de 2
function nextPowerOf2(n: number): number {
  return Math.pow(2, Math.ceil(Math.log2(n)));
}

// Gera estrutura de bracket com matches
export async function generateBracket(input: BracketGenerationInput) {
  const { tournamentId, category, modality, competitors } = input;

  if (competitors.length < 2) {
    console.warn("Not enough competitors to generate a bracket");
    return null;
  }

  // Calcular estrutura
  const totalSlots = nextPowerOf2(competitors.length);
  const totalRounds = Math.log2(totalSlots);

  // Criar bracket
  const bracket = await db.bracket.create({
    data: {
      tournamentId,
      category,
      modality,
      totalSlots,
      totalRounds,
      status: "NOT_STARTED",
    },
  });

  // Gerar matches da primeira rodada
  await generateFirstRoundMatches(bracket.id, competitors, totalSlots);

  // Gerar matches das rodadas seguintes (vazios)
  await generateSubsequentRounds(bracket.id, totalRounds, totalSlots);

  // Criar match de terceiro lugar
  if (competitors.length >= 4) {
    await createThirdPlaceMatch(bracket.id, totalRounds);
  }

  return bracket;
}

async function generateFirstRoundMatches(
  bracketId: string,
  competitors: Competitor[],
  totalSlots: number
) {
  const numMatches = totalSlots / 2;
  const matches = [];
  let compIndex = 0;

  for (let i = 0; i < numMatches; i++) {
    const aka =
      compIndex < competitors.length ? competitors[compIndex++] : null;
    const ao = compIndex < competitors.length ? competitors[compIndex++] : null;

    const match: any = {
      bracketId,
      round: 1,
      position: i,
      akaId: aka?.id || null,
      aoId: ao?.id || null,
      isBye: !aka || !ao,
      isCompleted: false,
    };

    // Se é bye, já define o vencedor
    if (!aka && ao) {
      match.winnerId = ao.id;
      match.isCompleted = true;
    } else if (aka && !ao) {
      match.winnerId = aka.id;
      match.isCompleted = true;
    }

    matches.push(match);
  }

  await db.match.createMany({ data: matches });
}

async function generateSubsequentRounds(
  bracketId: string,
  totalRounds: number,
  totalSlots: number
) {
  const matches = [];

  for (let round = 2; round <= totalRounds; round++) {
    const numMatches = totalSlots / Math.pow(2, round);

    for (let pos = 0; pos < numMatches; pos++) {
      matches.push({
        bracketId,
        round,
        position: pos,
        akaId: null,
        aoId: null,
        winnerId: null,
        isBye: false,
        isThirdPlace: false,
        isCompleted: false,
      });
    }
  }

  if (matches.length > 0) {
    await db.match.createMany({ data: matches });
  }
}

async function createThirdPlaceMatch(bracketId: string, totalRounds: number) {
  // Match de 3º lugar acontece na mesma rodada da final
  await db.match.create({
    data: {
      bracketId,
      round: totalRounds,
      position: 1, // Posição 0 = final, posição 1 = 3º lugar
      akaId: null,
      aoId: null,
      winnerId: null,
      isThirdPlace: true,
      isCompleted: false,
    },
  });
}

// Propagar vencedor após bye automático
export async function propagateByeWinners(bracketId: string) {
  const bracket = await db.bracket.findUnique({
    where: { id: bracketId },
    include: {
      matches: {
        orderBy: [{ round: "asc" }, { position: "asc" }],
      },
    },
  });

  if (!bracket) return;

  // Processar byes da primeira rodada em paralelo
  const firstRoundMatches = bracket.matches.filter((m) => m.round === 1);

  await Promise.all(
    firstRoundMatches
      .filter((match) => match.isBye && match.winnerId)
      .map((match) => {
        const nextRound = match.round + 1;
        const nextPosition = Math.floor(match.position / 2);
        const isAka = match.position % 2 === 0;

        return db.match.updateMany({
          where: {
            bracketId,
            round: nextRound,
            position: nextPosition,
            isThirdPlace: false,
          },
          data: {
            [isAka ? "akaId" : "aoId"]: match.winnerId,
          },
        });
      })
  );
}
