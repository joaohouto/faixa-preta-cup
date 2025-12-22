import { auth } from "@/lib/auth";
import { db } from "@/lib/prisma";
import {
  calculateAge,
  getKataCategory,
  getKumiteCategory,
} from "@/lib/utils/classification";
import { NextResponse } from "next/server";

export async function PUT(
  req: Request,
  { params }: { params: { id: string; competitorId: string } }
) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const tournamentId = params.id;
    const competitorId = params.competitorId;
    const body = await req.json();

    // Verifica se o usuário é o organizador do torneio
    const tournament = await db.tournament.findUnique({
      where: { id: tournamentId },
    });

    if (!tournament || tournament.organizerId !== session.user.id) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    // Verifica se o competidor pertence ao torneio
    const competitor = await db.competitor.findUnique({
      where: { id: competitorId },
    });

    if (!competitor || competitor.tournamentId !== tournamentId) {
      return new NextResponse("Competitor not found", { status: 404 });
    }

    const competitorData = {
      ...body,
      birthdate: new Date(body.birthdate),
    };

    const age = calculateAge(competitorData.birthdate);
    const kataCategory = competitorData.kata
      ? getKataCategory(age, competitorData.gender, competitorData.belt)
      : null;
    const kumiteCategory = competitorData.kumite
      ? getKumiteCategory(
          age,
          competitorData.gender,
          competitorData.weight,
          competitorData.belt
        )
      : null;

    const updatedCompetitor = await db.competitor.update({
      where: { id: competitorId },
      data: {
        name: competitorData.name,
        gender: competitorData.gender,
        weight: competitorData.weight,
        birthdate: competitorData.birthdate,
        belt: competitorData.belt,
        school: competitorData.school,
        kata: competitorData.kata,
        kumite: competitorData.kumite,
        age,
        kataCategory,
        kumiteCategory,
      },
    });

    return NextResponse.json(updatedCompetitor);
  } catch (error) {
    console.log("[COMPETITOR_PUT]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: { id: string; competitorId: string } }
) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const tournamentId = params.id;
    const competitorId = params.competitorId;

    // Verifica se o usuário é o organizador do torneio
    const tournament = await db.tournament.findUnique({
      where: { id: tournamentId },
    });

    if (!tournament || tournament.organizerId !== session.user.id) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    // Verifica se o competidor pertence ao torneio
    const competitor = await db.competitor.findUnique({
      where: { id: competitorId },
    });

    if (!competitor || competitor.tournamentId !== tournamentId) {
      return new NextResponse("Competitor not found", { status: 404 });
    }

    await db.competitor.delete({
      where: { id: competitorId },
    });

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.log("[COMPETITOR_DELETE]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
