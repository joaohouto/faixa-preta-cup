import { db } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { apiError } from "@/lib/api-error";
import { withApiHandler } from "@/lib/api-handler";

export const DELETE = withApiHandler(
  "COMPETITORS_BULK_DELETE",
  async (req: Request, context: { params: Promise<{ id: string }> }) => {
    const { id: tournamentId } = await context.params;

    const bracketsInProgress = await db.bracket.findFirst({
      where: {
        tournamentId,
        status: {
          in: ["IN_PROGRESS", "COMPLETED"],
        },
      },
    });

    if (bracketsInProgress) {
      return apiError(
        "Não é possível excluir todos os competidores enquanto há chaves em andamento ou finalizadas.",
        400
      );
    }

    await db.bracket.deleteMany({
      where: {
        tournamentId,
        status: "NOT_STARTED",
      },
    });

    const result = await db.competitor.deleteMany({
      where: { tournamentId },
    });

    return NextResponse.json({
      deletedCount: result.count,
    });
  }
);
