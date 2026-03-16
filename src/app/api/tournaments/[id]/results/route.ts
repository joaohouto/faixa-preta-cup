import { db } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET(
  _req: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
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

    // Collect all competitor IDs needed for podiums
    const competitorIds = new Set<string>();
    for (const bracket of brackets) {
      const finalMatch = bracket.matches.find(
        (m) => m.round === bracket.totalRounds && !m.isThirdPlace,
      );
      const thirdPlaceMatch = bracket.matches.find((m) => m.isThirdPlace);

      if (finalMatch) {
        if (finalMatch.winnerId) competitorIds.add(finalMatch.winnerId);
        if (finalMatch.akaId) competitorIds.add(finalMatch.akaId);
        if (finalMatch.aoId) competitorIds.add(finalMatch.aoId);
      }
      if (thirdPlaceMatch?.winnerId) competitorIds.add(thirdPlaceMatch.winnerId);
    }

    // Fetch competitors in one query
    const competitors =
      competitorIds.size > 0
        ? await db.competitor.findMany({
            where: { id: { in: Array.from(competitorIds) } },
            select: { id: true, name: true, school: true },
          })
        : [];

    const competitorsMap = new Map(competitors.map((c) => [c.id, c]));

    // Build podium for each bracket
    const results = brackets.map((bracket) => {
      const finalMatch = bracket.matches.find(
        (m) => m.round === bracket.totalRounds && !m.isThirdPlace,
      );
      const thirdPlaceMatch = bracket.matches.find((m) => m.isThirdPlace);

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

      return {
        bracketId: bracket.id,
        category: bracket.category,
        modality: bracket.modality,
        status: bracket.status,
        podium: {
          first: first ?? null,
          second: second ?? null,
          third: third ?? null,
        },
      };
    });

    return NextResponse.json(results);
  } catch (error) {
    console.error("[RESULTS_GET]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
