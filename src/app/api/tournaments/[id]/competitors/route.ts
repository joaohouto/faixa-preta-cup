import { auth } from "@/lib/auth";
import { db } from "@/lib/prisma";
import {
  calculateAge,
  getKataCategory,
  getKumiteCategory,
} from "@/lib/utils/classification";
import { competitorSchema } from "@/lib/schemas/competitor";
import { NextResponse } from "next/server";

export async function POST(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const { id: tournamentId } = await context.params;
    const body = await req.json();

    // Verifica se o usuário é o organizador do torneio
    const tournament = await db.tournament.findUnique({
      where: { id: tournamentId },
    });

    if (!tournament || tournament.organizerId !== session.user.id) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const validation = competitorSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: "Dados inválidos", details: validation.error.issues },
        { status: 400 }
      );
    }

    const competitorData = validation.data;

    const age = calculateAge(new Date(competitorData.birthdate));
    const kataCategory = competitorData.kata
      ? getKataCategory(age, competitorData.gender, competitorData.belt)
      : null;
    const kumiteCategory = competitorData.kumite
      ? getKumiteCategory(
          age,
          competitorData.gender,
          competitorData.weight ?? null,
          competitorData.belt
        )
      : null;

    const competitor = await db.competitor.create({
      data: {
        name: competitorData.name,
        gender: competitorData.gender,
        weight: competitorData.weight,
        birthdate: new Date(competitorData.birthdate),
        belt: competitorData.belt,
        school: competitorData.school,
        kata: competitorData.kata,
        kumite: competitorData.kumite,
        age,
        kataCategory,
        kumiteCategory,
        tournamentId,
      },
    });

    return NextResponse.json(competitor);
  } catch (error) {
    console.log("[COMPETITORS_POST]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}

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

    // Verifica se o usuário é o organizador do torneio
    const tournament = await db.tournament.findUnique({
      where: { id: tournamentId },
    });

    if (!tournament || tournament.organizerId !== session.user.id) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const competitors = await db.competitor.findMany({
      where: {
        tournamentId,
      },
      orderBy: [
        { birthdate: "desc" },
        { gender: "asc" },
        { weight: "asc" },
        { belt: "asc" },
      ],
    });

    return NextResponse.json(competitors);
  } catch (error) {
    console.log("[COMPETITORS_GET]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
