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

export async function DELETE(
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

    // Verificar se bracket existe e pertence ao torneio
    const bracket = await db.bracket.findUnique({
      where: { id: bracketId },
    });

    if (!bracket || bracket.tournamentId !== tournamentId) {
      return new NextResponse("Bracket not found", { status: 404 });
    }

    // Não permitir deletar chaves já iniciadas
    if (bracket.status !== "NOT_STARTED") {
      return new NextResponse("Não é possível excluir chaves já iniciadas", {
        status: 400,
      });
    }

    // Deletar bracket (cascade vai deletar os matches)
    await db.bracket.delete({
      where: { id: bracketId },
    });

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.log("[BRACKET_DELETE]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
