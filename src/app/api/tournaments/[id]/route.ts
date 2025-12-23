import { auth } from "@/lib/auth";
import { db as prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const { id: tournamentId } = await context.params;

    const tournament = await prisma.tournament.findFirst({
      where: {
        id: tournamentId,
        organizerId: session.user.id,
      },
    });

    if (!tournament) {
      return NextResponse.json(
        { error: "Tournament not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(tournament);
  } catch (error) {
    console.log("[TOURNAMENT_GET]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}

export async function PUT(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const { id: tournamentId } = await context.params;

    const tournament = await prisma.tournament.findFirst({
      where: {
        id: tournamentId,
        organizerId: session.user.id,
      },
    });

    if (!tournament) {
      return NextResponse.json(
        { error: "Tournament not found" },
        { status: 404 }
      );
    }

    const body = await req.json();

    const updatedTournament = await prisma.tournament.update({
      where: { id: tournamentId },
      data: {
        name: body.name || tournament.name,
      },
    });

    return NextResponse.json(updatedTournament);
  } catch (error) {
    console.log("[TOURNAMENT_PUT]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const { id: tournamentId } = await context.params;

    const tournament = await prisma.tournament.findFirst({
      where: {
        id: tournamentId,
        organizerId: session.user.id,
      },
    });

    if (!tournament) {
      return NextResponse.json(
        { error: "Tournament not found" },
        { status: 404 }
      );
    }

    // Deleta o torneio (cascata deleta competitors e brackets)
    await prisma.tournament.delete({
      where: { id: tournamentId },
    });

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.log("[TOURNAMENT_DELETE]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
