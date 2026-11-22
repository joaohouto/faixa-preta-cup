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

/**
 * Gera a chave (bracket) completa de eliminação simples para uma categoria:
 * cria o registro do Bracket, distribui os competidores na 1ª rodada
 * (com byes quando o número de competidores não é potência de 2),
 * cria os placeholders vazios das rodadas seguintes e, se houver
 * competidores suficientes, o match de 3º lugar.
 *
 * Não propaga os vencedores dos byes da 1ª rodada para a 2ª — isso é
 * feito separadamente por `propagateByeWinners`, que deve ser chamado
 * logo em seguida (ver uso em `brackets/route.ts`).
 */
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
 * Quantas vagas (1 ou 2) cada posição da rodada 1 recebe.
 *
 * O número de byes é sempre `numMatches * 2 - numCompetitors`, que é
 * garantidamente `>= 0` e `< numMatches` (porque `totalSlots` é a menor
 * potência de 2 >= numCompetitors, logo numCompetitors > totalSlots/2 =
 * numMatches). Isso significa que sempre existe pelo menos 1 luta "cheia"
 * (2 competidores reais) e nunca é preciso zerar nenhuma posição.
 *
 * Os byes são atribuídos às últimas posições da ordem `seeded` (ou seja,
 * preferencialmente às bordas, e só invadindo o miolo se houver byes
 * demais para caberem só nas bordas) — o restante recebe 2 (luta real).
 */
export function computeSlots(
  seeded: number[],
  numCompetitors: number,
): Record<number, number> {
  const numMatches = seeded.length;
  const numByes = numMatches * 2 - numCompetitors;

  const slots: Record<number, number> = {};
  for (let i = 0; i < numMatches; i++) {
    slots[seeded[i]] = i < numMatches - numByes ? 2 : 1;
  }

  return slots;
}

function normalizeSchool(school: string | null | undefined): string {
  const normalized = (school ?? "").trim().toLowerCase();
  if (
    !normalized ||
    normalized === "não informado" ||
    normalized === "nao informado" ||
    normalized === "-" ||
    normalized === "—"
  ) {
    // Atletas "Sem escola / Não informado" não contam como mesma academia
    return "";
  }
  return normalized;
}

function isSameSchool(a: Competitor | null, b: Competitor | null): boolean {
  if (!a || !b) return false;
  const schoolA = normalizeSchool(a.school);
  const schoolB = normalizeSchool(b.school);
  return schoolA !== "" && schoolA === schoolB;
}

/**
 * Distribui os competidores nas posições da 1ª rodada respeitando a contagem
 * de slots (1 ou 2) de cada posição e evitando que dois atletas da mesma
 * escola se enfrentem logo na 1ª rodada sempre que matematicamente possível.
 */
export function assignCompetitorsToFirstRound(
  competitors: Competitor[],
  seeded: number[],
  slots: Record<number, number>,
): Record<number, { aka: Competitor | null; ao: Competitor | null }> {
  let compIndex = 0;
  const matchData: Record<
    number,
    { aka: Competitor | null; ao: Competitor | null }
  > = {};

  for (const pos of seeded) {
    const count = slots[pos];
    matchData[pos] = {
      aka: count >= 1 ? competitors[compIndex++] : null,
      ao: count >= 2 ? competitors[compIndex++] : null,
    };
  }

  // Passo anti-colisão de mesma escola na 1ª rodada:
  // Se uma luta real (aka e ao presentes) tiver atletas da mesma escola,
  // procura outra posição na 1ª rodada para trocar um dos lados sem criar
  // outra colisão de escola.
  const fullPositions = seeded.filter((pos) => slots[pos] >= 2);
  const byePositions = seeded.filter((pos) => slots[pos] === 1);

  for (const pos of fullPositions) {
    const current = matchData[pos];
    if (!isSameSchool(current.aka, current.ao)) continue;

    let resolved = false;

    // 1. Tenta trocar o `ao` com o `ao` (ou `aka`) de outra luta cheia
    for (const otherPos of fullPositions) {
      if (otherPos === pos) continue;
      const other = matchData[otherPos];

      if (
        !isSameSchool(current.aka, other.ao) &&
        !isSameSchool(other.aka, current.ao)
      ) {
        const temp = current.ao;
        current.ao = other.ao;
        other.ao = temp;
        resolved = true;
        break;
      }

      if (
        !isSameSchool(current.aka, other.aka) &&
        !isSameSchool(current.ao, other.ao)
      ) {
        const temp = current.ao;
        current.ao = other.aka;
        other.aka = temp;
        resolved = true;
        break;
      }
    }

    // 2. Se não resolveu entre lutas cheias, tenta trocar `ao` com o `aka` de um bye
    if (!resolved) {
      for (const byePos of byePositions) {
        const byeMatch = matchData[byePos];
        if (!isSameSchool(current.aka, byeMatch.aka)) {
          const temp = current.ao;
          current.ao = byeMatch.aka;
          byeMatch.aka = temp;
          resolved = true;
          break;
        }
      }
    }
  }

  return matchData;
}

/**
 * Cria os matches da rodada 1: distribui `competitors` (já ordenados
 * pelo caller) nas posições calculadas por `computeSlots`, na ordem
 * `seeded` (miolo → bordas), evitando colisões da mesma escola na 1ª rodada.
 */
async function generateFirstRoundMatches(
  bracketId: string,
  competitors: Competitor[],
  totalSlots: number,
) {
  const numMatches = totalSlots / 2;
  const seeded = getSeededPositions(numMatches);
  const slots = computeSlots(seeded, competitors.length);
  const matchData = assignCompetitorsToFirstRound(competitors, seeded, slots);

  const matches = [];
  for (let i = 0; i < numMatches; i++) {
    const { aka, ao } = matchData[i];

    const match: any = {
      bracketId,
      round: 1,
      position: i,
      akaId: aka?.id ?? null,
      aoId: ao?.id ?? null,
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

/**
 * Cria os placeholders vazios das rodadas 2..totalRounds (akaId/aoId/
 * winnerId todos null, isBye sempre false).
 */
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

/**
 * Cria o match de 3º lugar. Ele reaproveita `round: totalRounds`
 * (a mesma rodada da final) com `position: 1` — a posição 0 dessa
 * rodada é sempre a final (criada em `generateSubsequentRounds`).
 */
async function createThirdPlaceMatch(bracketId: string, totalRounds: number) {
  await db.match.create({
    data: {
      bracketId,
      round: totalRounds,
      position: 1,
      akaId: null,
      aoId: null,
      winnerId: null,
      isThirdPlace: true,
      isCompleted: false,
    },
  });
}

/**
 * Propaga o vencedor dos byes da rodada 1 para a rodada 2, logo após a
 * geração da chave.
 */
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
