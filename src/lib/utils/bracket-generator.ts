import { Competitor, Modality } from "@prisma/client";
import { db } from "@/lib/prisma";

interface BracketGenerationInput {
  tournamentId: string;
  category: string;
  modality: Modality;
  competitors: Competitor[];
}

// Calcula próxima potência de 2
export function nextPowerOf2(n: number): number {
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

/**
 * Ordem de preenchimento: do miolo para as bordas.
 * 4 matches → [1, 2, 0, 3]
 * 8 matches → [3, 4, 2, 5, 1, 6, 0, 7]
 */
export function getSeededPositions(numMatches: number): number[] {
  if (numMatches <= 1) return [0];

  const positions: number[] = [];
  const half = numMatches / 2;

  for (let i = 0; i < half; i++) {
    positions.push(half - 1 - i);
    positions.push(half + i);
  }

  return positions;
}

/**
 * Quantas vagas cada posição recebe:
 * - Positions do miolo (primeira metade da ordem seeded) recebem 2 cada.
 * - Positions das bordas (segunda metade) recebem o restante distribuído
 *   proporcionalmente (1 por ponta até acabar), nunca mais que 2.
 *
 * Exemplos para 4 matches:
 *   6 comps → miolo [1,2]=2 cada, bordas [0,3]=1 cada
 *   5 comps → miolo [1,2]=2 cada, borda [0]=1, borda [3]=0
 *   7 comps → miolo [1,2]=2 cada, bordas [0]=2, [3]=1
 */
export function computeSlots(
  seeded: number[],
  numCompetitors: number,
): Record<number, number> {
  const numMatches = seeded.length;
  const numMiddle = numMatches / 2;
  const middlePositions = seeded.slice(0, numMiddle);
  const edgePositions = seeded.slice(numMiddle);

  const slots: Record<number, number> = {};
  for (const pos of seeded) slots[pos] = 0;

  let remaining = numCompetitors;

  // Middles: 2 por posição
  for (const pos of middlePositions) {
    const take = Math.min(2, remaining);
    slots[pos] = take;
    remaining -= take;
    if (remaining === 0) break;
  }

  // Bordas: distribuição proporcional com ceil (1 por ponta até esgotar)
  for (let i = 0; i < edgePositions.length && remaining > 0; i++) {
    const take = Math.min(Math.ceil(remaining / (edgePositions.length - i)), 2);
    slots[edgePositions[i]] = take;
    remaining -= take;
  }

  return slots;
}

async function generateFirstRoundMatches(
  bracketId: string,
  competitors: Competitor[],
  totalSlots: number,
) {
  const numMatches = totalSlots / 2;
  const seeded = getSeededPositions(numMatches);
  const slots = computeSlots(seeded, competitors.length);

  // Atribui competidores às posições na ordem seeded, respeitando o slot count
  let compIndex = 0;
  const matchData: Record<number, { aka: Competitor | null; ao: Competitor | null }> = {};

  for (const pos of seeded) {
    const count = slots[pos];
    matchData[pos] = {
      aka: count >= 1 ? competitors[compIndex++] : null,
      ao:  count >= 2 ? competitors[compIndex++] : null,
    };
  }

  const matches = [];
  for (let i = 0; i < numMatches; i++) {
    const { aka, ao } = matchData[i];

    const match: any = {
      bracketId,
      round: 1,
      position: i,
      akaId: aka?.id ?? null,
      aoId:  ao?.id  ?? null,
      isBye: !aka || !ao,
      isCompleted: false,
    };

    if (aka && !ao) {
      match.winnerId = aka.id;
      match.isCompleted = true;
    } else if (!aka && ao) {
      match.winnerId = ao.id;
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
