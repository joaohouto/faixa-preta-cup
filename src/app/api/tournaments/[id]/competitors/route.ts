import { db } from "@/lib/prisma";
import {
  calculateAge,
  getKataCategory,
  getKumiteCategory,
} from "@/lib/utils/classification";
import { NextResponse } from "next/server";

export async function POST(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id: tournamentId } = await context.params;
    const body = await req.json();

    const competitorData = {
      ...body,
      tournamentId,
    };

    const age = calculateAge(new Date(competitorData.birthdate));
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
    const { id: tournamentId } = await context.params;

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
