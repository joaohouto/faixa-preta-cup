import { db } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { withApiHandler } from "@/lib/api-handler";

/**
 * Monta o pódio (1º-4º) de cada chave a partir dos matches já salvos —
 * não há tabela/flag de "campeão" separada, o resultado é sempre
 * derivado on-the-fly da final e do match de 3º lugar:
 *   1º/2º = vencedor/perdedor da final (`round === totalRounds`)
 *   3º/4º = vencedor/perdedor do match `isThirdPlace`
 * Se a final ou o 3º lugar ainda não foram concluídos, os campos
 * correspondentes ficam `null` até alguém completar a luta — não há
 * timeout nem fallback, é só um reflexo direto do estado da chave.
 *
 * Além do pódio, o registro inclui o `roster` completo da categoria e o
 * histórico de todas as lutas da chave (`matches`), para servir de
 * registro oficial detalhado do torneio — não só quem ficou entre os 4
 * primeiros. O roster é obtido a partir da rodada 1 (`round === 1`), já
 * que é nela que todo competidor da categoria entra em algum match
 * (real ou bye) — ver `generateFirstRoundMatches` em bracket-generator.ts.
 */
export const GET = withApiHandler(
  "RESULTS_GET",
  async (_req: Request, context: { params: Promise<{ id: string }> }) => {
    const { id: tournamentId } = await context.params;

    // Fetch all brackets with their matches
    const brackets = await db.bracket.findMany({
      where: { tournamentId },
      include: {
        matches: {
          orderBy: [{ round: "asc" }, { position: "asc" }],
        },
      },
      orderBy: [{ modality: "asc" }, { category: "asc" }],
    });

    // Collect every competitor ID referenced by any match (roster + podium)
    const competitorIds = new Set<string>();
    for (const bracket of brackets) {
      for (const match of bracket.matches) {
        if (match.akaId) competitorIds.add(match.akaId);
        if (match.aoId) competitorIds.add(match.aoId);
      }
    }

    // Fetch competitors in one query
    const competitors =
      competitorIds.size > 0
        ? await db.competitor.findMany({
            where: { id: { in: Array.from(competitorIds) } },
            select: {
              id: true,
              name: true,
              school: true,
              belt: true,
              weight: true,
              age: true,
            },
          })
        : [];

    const competitorsMap = new Map(competitors.map((c) => [c.id, c]));

    // Build podium + roster + match history for each bracket
    const results = brackets.map((bracket) => {
      const finalMatch = bracket.matches.find(
        (m) => m.round === bracket.totalRounds && !m.isThirdPlace,
      );
      const thirdPlaceMatch = bracket.matches.find((m) => m.isThirdPlace);
      const firstRoundMatches = bracket.matches.filter((m) => m.round === 1);

      const first =
        finalMatch?.winnerId && finalMatch.isCompleted
          ? competitorsMap.get(finalMatch.winnerId)
          : undefined;

      const secondId =
        finalMatch?.isCompleted && finalMatch.winnerId
          ? finalMatch.winnerId === finalMatch.akaId
            ? finalMatch.aoId
            : finalMatch.akaId
          : undefined;
      const second = secondId ? competitorsMap.get(secondId) : undefined;

      const third =
        thirdPlaceMatch?.winnerId && thirdPlaceMatch.isCompleted
          ? competitorsMap.get(thirdPlaceMatch.winnerId)
          : undefined;

      const fourthId =
        thirdPlaceMatch?.isCompleted && thirdPlaceMatch.winnerId
          ? thirdPlaceMatch.winnerId === thirdPlaceMatch.akaId
            ? thirdPlaceMatch.aoId
            : thirdPlaceMatch.akaId
          : undefined;
      const fourth = fourthId ? competitorsMap.get(fourthId) : undefined;

      const rosterIds = new Set<string>();
      for (const match of firstRoundMatches) {
        if (match.akaId) rosterIds.add(match.akaId);
        if (match.aoId) rosterIds.add(match.aoId);
      }
      const roster = Array.from(rosterIds)
        .map((id) => competitorsMap.get(id))
        .filter((c): c is NonNullable<typeof c> => Boolean(c))
        .sort((a, b) => a.name.localeCompare(b.name));

      const matches = bracket.matches.map((match) => ({
        round: match.round,
        position: match.position,
        isThirdPlace: match.isThirdPlace,
        isBye: match.isBye,
        isWalkover: match.isWalkover,
        isCompleted: match.isCompleted,
        aka: match.akaId ? (competitorsMap.get(match.akaId) ?? null) : null,
        ao: match.aoId ? (competitorsMap.get(match.aoId) ?? null) : null,
        akaScore: match.akaScore,
        aoScore: match.aoScore,
        winner: match.winnerId
          ? (competitorsMap.get(match.winnerId) ?? null)
          : null,
        decisionByHantei: match.decisionByHantei,
        akaSenshu: match.akaSenshu,
        aoSenshu: match.aoSenshu,
        completedAt: match.completedAt,
      }));

      return {
        bracketId: bracket.id,
        category: bracket.category,
        modality: bracket.modality,
        status: bracket.status,
        participantCount: roster.length,
        podium: {
          first: first ?? null,
          second: second ?? null,
          third: third ?? null,
          fourth: fourth ?? null,
        },
        roster,
        matches,
      };
    });

    return NextResponse.json(results);
  }
);
