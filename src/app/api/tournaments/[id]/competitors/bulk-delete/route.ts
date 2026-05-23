import { db } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function DELETE(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
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
      return new NextResponse(
        "Não é possível excluir todos os competidores enquanto há chaves em andamento ou finalizadas.",
        { status: 400 }
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
  } catch (error) {
    console.log("[COMPETITORS_BULK_DELETE]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
