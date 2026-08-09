import { db } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { withApiHandler, requireEntity } from "@/lib/api-handler";

export const GET = withApiHandler(
  "TOURNAMENT_GET",
  async (req: Request, context: { params: Promise<{ id: string }> }) => {
    const { id: tournamentId } = await context.params;

    const tournament = requireEntity(
      await db.tournament.findFirst({ where: { id: tournamentId } }),
      "Tournament not found"
    );
    if (tournament instanceof Response) return tournament;

    return NextResponse.json(tournament);
  }
);

export const PUT = withApiHandler(
  "TOURNAMENT_PUT",
  async (req: Request, context: { params: Promise<{ id: string }> }) => {
    const { id: tournamentId } = await context.params;

    const tournament = requireEntity(
      await db.tournament.findFirst({ where: { id: tournamentId } }),
      "Tournament not found"
    );
    if (tournament instanceof Response) return tournament;

    const body = await req.json();

    if (!body.name) {
      return NextResponse.json(tournament);
    }

    const updatedTournament = await db.tournament.update({
      where: { id: tournamentId },
      data: { name: body.name },
    });

    return NextResponse.json(updatedTournament);
  }
);

export const DELETE = withApiHandler(
  "TOURNAMENT_DELETE",
  async (req: Request, context: { params: Promise<{ id: string }> }) => {
    const { id: tournamentId } = await context.params;

    const tournament = requireEntity(
      await db.tournament.findFirst({ where: { id: tournamentId } }),
      "Tournament not found"
    );
    if (tournament instanceof Response) return tournament;

    await db.tournament.delete({
      where: { id: tournamentId },
    });

    return new NextResponse(null, { status: 204 });
  }
);
