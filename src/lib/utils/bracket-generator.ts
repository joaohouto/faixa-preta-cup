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
function getSeededPositions(numMatches: number): number[] {
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
 *
 * Exemplos para 4 matches (seeded=[1,2,0,3]):
 *   6 comps → 2 byes  → posições [1,2]=2, [0,3]=1  (bordas viram bye)
 *   5 comps → 3 byes  → posições [1]=2, [2,0,3]=1  (só 1 luta cheia)
 *   7 comps → 1 bye   → posições [1,2,0]=2, [3]=1
 *
 * HISTÓRICO: até 2026-08-05 esta função usava uma distribuição por
 * `Math.ceil(remaining / edges)` que podia zerar uma posição (uma luta
 * sem nenhum competidor) sempre que `numCompetitors` estivesse em
 * determinadas faixas (ex.: 5, 9-11, 17-23, 33-47 competidores — quase
 * 40% dos tamanhos possíveis). Esse match "fantasma" nascia com
 * `isBye: true` mas sem `winnerId`, era contado como "resolvido" por
 * `checkAndCompleteBracket` sem nunca propagar ninguém, e travava a
 * chave para sempre (sem campeão, sem erro visível). Corrigido usando a
 * fórmula fechada acima, validada por simulação exaustiva (N=2..200) e
 * execução real ponta-a-ponta contra Prisma/SQLite (N=2..40, todas as
 * chaves completam com campeão).
 */
function computeSlots(
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

/**
 * Cria os matches da rodada 1: distribui `competitors` (já ordenados
 * pelo caller) nas posições calculadas por `computeSlots`, na ordem
 * `seeded` (miolo → bordas). Um match com apenas um lado preenchido
 * é um bye e já nasce completo (`isCompleted: true`, `winnerId` do lado
 * preenchido) — não precisa de arbitragem. Como `computeSlots` agora
 * garante `count >= 1` para toda posição, `aka` e `ao` nunca ficam ambos
 * null aqui (ver histórico do fix em `computeSlots`).
 */
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

/**
 * Cria os placeholders vazios das rodadas 2..totalRounds (akaId/aoId/
 * winnerId todos null, isBye sempre false). Esses matches só são
 * preenchidos depois, via `propagateByeWinners` (byes da rodada 1) e
 * `propagateWinner` em matches/[matchId]/route.ts (vencedores de matches
 * jogados). Diferente da rodada 1, matches aqui NUNCA são marcados como
 * `isBye` — um lado só fica null temporariamente, enquanto a luta da
 * rodada anterior que alimenta esse lado ainda não foi jogada.
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
 * É por isso que toda query que escreve na rodada final usa
 * `isThirdPlace: false` no `where`: sem esse filtro, o `updateMany`
 * poderia (em tese) colidir com essa linha por causa do `round` igual.
 * Na prática a posição de destino calculada em `propagateWinner` para
 * quem vem da semifinal é sempre 0, então a colisão nunca ocorre — mas
 * o filtro é o que garante isso, não a matemática por si só.
 * Só é chamada quando `competitors.length >= 4` (com menos que isso não
 * há dois "perdedores de semifinal" reais para disputar o 3º lugar).
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
 * geração da chave. Só olha para `round === 1` — byes não existem (nem
 * podem ser criados) em rodadas seguintes, essas só avançam por vitória
 * real via `propagateWinner` em matches/[matchId]/route.ts.
 * `position % 2 === 0` decide o lado (aka/ao) do match de destino: essa é
 * a mesma convenção usada em `propagateWinner`, então os dois precisam
 * ficar em sincronia se a numeração de posições mudar.
 * O filtro `match.winnerId` no `.filter()` abaixo é redundante hoje (todo
 * bye de rodada 1 sempre nasce com winnerId — ver `generateFirstRoundMatches`)
 * mas é mantido como proteção defensiva.
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
