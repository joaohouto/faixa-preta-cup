import { auth } from "@/lib/auth";
import { db } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { z } from "zod";

const createTournamentSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório").max(200, "Nome muito longo"),
});

export async function POST(req: Request) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const body = await req.json();
    const validation = createTournamentSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: "Dados inválidos", details: validation.error.issues },
        { status: 400 }
      );
    }

    const tournament = await db.tournament.create({
      data: {
        name: validation.data.name,
        organizerId: session.user.id,
      },
    });

    return NextResponse.json(tournament);
  } catch (error) {
    console.log("[TOURNAMENTS_POST]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}

export async function GET() {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const tournaments = await db.tournament.findMany({
      where: {
        organizerId: session.user.id,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json(tournaments);
  } catch (error) {
    console.log("[TOURNAMENTS_GET]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
