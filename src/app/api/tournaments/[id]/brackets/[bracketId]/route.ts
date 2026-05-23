import { db } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET(
  req: Request,
  context: { params: Promise<{ id: string; bracketId: string }> }
) {
  try {
    const { id: tournamentId, bracketId } = await context.params;

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
    const { id: tournamentId, bracketId } = await context.params;

    const bracket = await db.bracket.findUnique({
      where: { id: bracketId },
    });

    if (!bracket || bracket.tournamentId !== tournamentId) {
      return new NextResponse("Bracket not found", { status: 404 });
    }

    await db.bracket.delete({
      where: { id: bracketId },
    });

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.log("[BRACKET_DELETE]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
