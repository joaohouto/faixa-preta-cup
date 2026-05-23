import { db as prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id: tournamentId } = await context.params;

    const tournament = await prisma.tournament.findFirst({
      where: { id: tournamentId },
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
    const { id: tournamentId } = await context.params;

    const tournament = await prisma.tournament.findFirst({
      where: { id: tournamentId },
    });

    if (!tournament) {
      return NextResponse.json(
        { error: "Tournament not found" },
        { status: 404 }
      );
    }

    const body = await req.json();

    if (!body.name) {
      return NextResponse.json(tournament);
    }

    const updatedTournament = await prisma.tournament.update({
      where: { id: tournamentId },
      data: { name: body.name },
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
    const { id: tournamentId } = await context.params;

    const tournament = await prisma.tournament.findFirst({
      where: { id: tournamentId },
    });

    if (!tournament) {
      return NextResponse.json(
        { error: "Tournament not found" },
        { status: 404 }
      );
    }

    await prisma.tournament.delete({
      where: { id: tournamentId },
    });

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.log("[TOURNAMENT_DELETE]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
