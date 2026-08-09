import { db } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { Competitor } from "@prisma/client";
import { apiError } from "@/lib/api-error";
import { withApiHandler } from "@/lib/api-handler";

export const dynamic = "force-dynamic";

function groupByCategory(
  competitors: Competitor[],
  field: "kataCategory" | "kumiteCategory"
) {
  const groups = competitors.reduce(
    (acc: Record<string, Competitor[]>, competitor) => {
      const category = competitor[field];
      if (!category) return acc;

      if (!acc[category]) acc[category] = [];
      acc[category].push(competitor);
      return acc;
    },
    {} as Record<string, Competitor[]>
  );

  return Object.entries(groups)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([category, competitors]) => ({
      category,
      competitors: competitors.sort((a, b) => {
        if (a.age !== b.age) return a.age - b.age;
        if (a.gender !== b.gender) return a.gender === "FEMALE" ? -1 : 1;
        const weightA = a.weight || 0;
        const weightB = b.weight || 0;
        if (weightA !== weightB) return weightA - weightB;
        return a.belt.localeCompare(b.belt);
      }),
    }));
}

export const GET = withApiHandler(
  "CATEGORIES_GET",
  async (req: Request, context: { params: Promise<{ id: string }> }) => {
    const { id: tournamentId } = await context.params;

    const tournament = await db.tournament.findUnique({
      where: { id: tournamentId },
    });

    if (!tournament) {
      return apiError("Tournament not found", 404);
    }

    const competitors = await db.competitor.findMany({
      where: { tournamentId },
    });

    const kataCategories = groupByCategory(
      competitors.filter((c) => c.kata && c.kataCategory),
      "kataCategory"
    );

    const kumiteCategories = groupByCategory(
      competitors.filter((c) => c.kumite && c.kumiteCategory),
      "kumiteCategory"
    );

    return NextResponse.json({
      tournament,
      kataCategories,
      kumiteCategories,
    });
  }
);
