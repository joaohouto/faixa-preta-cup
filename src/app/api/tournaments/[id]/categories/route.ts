import { auth } from "@/lib/auth";
import { db } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { Competitor } from "@prisma/client";

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

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const tournamentId = params.id;

    // Verifica ownership
    const tournament = await db.tournament.findUnique({
      where: { id: tournamentId },
    });
    if (!tournament || tournament.organizerId !== session.user.id) {
      return new NextResponse("Unauthorized", { status: 401 });
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
  } catch (error) {
    console.log("[CATEGORIES_GET]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
