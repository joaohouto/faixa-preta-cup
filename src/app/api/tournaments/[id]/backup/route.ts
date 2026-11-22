import { db } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { withApiHandler, requireEntity } from "@/lib/api-handler";

export const dynamic = "force-dynamic";

export const GET = withApiHandler(
  "TOURNAMENT_BACKUP_GET",
  async (_req: Request, context: { params: Promise<{ id: string }> }) => {
    const { id: tournamentId } = await context.params;

    const tournament = requireEntity(
      await db.tournament.findUnique({
        where: { id: tournamentId },
        include: {
          competitors: {
            orderBy: { name: "asc" },
          },
          Bracket: {
            include: {
              matches: {
                orderBy: [{ round: "asc" }, { position: "asc" }],
              },
            },
            orderBy: [{ modality: "asc" }, { category: "asc" }],
          },
        },
      }),
      "Tournament not found"
    );

    if (tournament instanceof Response) return tournament;

    const payload = {
      exportedAt: new Date().toISOString(),
      version: "1.0",
      tournament: {
        id: tournament.id,
        name: tournament.name,
        createdAt: tournament.createdAt,
      },
      stats: {
        competitorsCount: tournament.competitors.length,
        bracketsCount: tournament.Bracket.length,
        completedBracketsCount: tournament.Bracket.filter(
          (b) => b.status === "COMPLETED"
        ).length,
      },
      competitors: tournament.competitors,
      brackets: tournament.Bracket,
    };

    const safeSlug = tournament.name
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");

    const filename = `backup-${safeSlug || tournament.id}-${new Date().toISOString().slice(0, 10)}.json`;

    return new NextResponse(JSON.stringify(payload, null, 2), {
      status: 200,
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  }
);
