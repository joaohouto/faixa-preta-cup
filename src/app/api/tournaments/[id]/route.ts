import { auth } from "@/lib/auth";
import { db as prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const tournament = await prisma.tournament.findFirst({
    where: {
      id: params.id,
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
}
