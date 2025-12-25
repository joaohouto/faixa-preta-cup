import { auth } from "@/lib/auth";
import { db } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET(
  req: Request,
  context: { params: Promise<{ id: string; bracketId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const { id: tournamentId, bracketId } = await context.params;

    // Verificar ownership
    const tournament = await db.tournament.findUnique({
      where: { id: tournamentId },
    });

    if (!tournament || tournament.organizerId !== session.user.id) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    // Buscar próxima luta não completada
    const nextMatch = await db.match.findFirst({
      where: {
        bracketId,
        isCompleted: false,
        akaId: { not: null },
        aoId: { not: null },
        isBye: false,
      },
      orderBy: [{ round: "asc" }, { position: "asc" }],
    });

    if (!nextMatch) {
      return new NextResponse("No pending matches", { status: 404 });
    }

    return NextResponse.json(nextMatch);
  } catch (error) {
    console.log("[NEXT_MATCH_GET]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
