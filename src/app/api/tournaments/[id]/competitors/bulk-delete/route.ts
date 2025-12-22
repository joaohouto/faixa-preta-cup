import { auth } from "@/lib/auth";
import { db } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function DELETE(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const tournamentId = params.id;

    // Verifica se o usuário é o organizador do torneio
    const tournament = await db.tournament.findUnique({
      where: { id: tournamentId },
    });

    if (!tournament || tournament.organizerId !== session.user.id) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    // Deleta todos os competidores do torneio
    const result = await db.competitor.deleteMany({
      where: { tournamentId },
    });

    return NextResponse.json({
      success: true,
      deletedCount: result.count,
    });
  } catch (error) {
    console.log("[COMPETITORS_BULK_DELETE]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
