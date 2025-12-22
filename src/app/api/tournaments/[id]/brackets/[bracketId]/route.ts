import { auth } from "@/lib/auth";
import { db } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET(
  req: Request,
  { params }: { params: { id: string; bracketId: string } }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const { id: tournamentId, bracketId } = params;

    // Verificar ownership
    const tournament = await db.tournament.findUnique({
      where: { id: tournamentId },
    });

    if (!tournament || tournament.organizerId !== session.user.id) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const bracket = await db.bracket.findUnique({
      where: { id: bracketId },
      include: {
        matches: {
          orderBy: [{ round: "asc" }, { position: "asc" }],
        },
      },
    });

    if (!bracket || bracket.tournamentId !== tournamentId) {
      return new NextResponse("Bracket not found", { status: 404 });
    }

    return NextResponse.json(bracket);
  } catch (error) {
    console.log("[BRACKET_GET]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
