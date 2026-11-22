import { db } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { withApiHandler, requireEntity } from "@/lib/api-handler";

export const GET = withApiHandler(
  "BRACKET_GET",
  async (
    req: Request,
    context: { params: Promise<{ id: string; bracketId: string }> }
  ) => {
    const { id: tournamentId, bracketId } = await context.params;

    const bracket = requireEntity(
      await db.bracket.findUnique({
        where: { id: bracketId },
        include: {
          matches: {
            orderBy: [{ round: "asc" }, { position: "asc" }],
          },
        },
      }),
      "Bracket not found",
      (b) => b.tournamentId === tournamentId
    );
    if (bracket instanceof Response) return bracket;

    return NextResponse.json(bracket);
  }
);

export const DELETE = withApiHandler(
  "BRACKET_DELETE",
  async (
    req: Request,
    context: { params: Promise<{ id: string; bracketId: string }> }
  ) => {
    const { id: tournamentId, bracketId } = await context.params;

    const bracket = requireEntity(
      await db.bracket.findUnique({ where: { id: bracketId } }),
      "Bracket not found",
      (b) => b.tournamentId === tournamentId
    );
    if (bracket instanceof Response) return bracket;

    await db.$transaction([
      db.refereeLock.deleteMany({ where: { bracketId } }),
      db.liveMatch.deleteMany({ where: { bracketId } }),
      db.bracket.delete({ where: { id: bracketId } }),
    ]);

    return new NextResponse(null, { status: 204 });
  }
);
