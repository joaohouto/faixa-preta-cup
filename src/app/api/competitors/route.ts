import { auth } from "@/lib/auth";
import { db } from "@/lib/prisma";
import {
  calculateAge,
  getKataCategory,
  getKumiteCategory,
} from "@/lib/utils/classification";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const body = await req.json();
    const { tournamentId, ...competitorData } = body;

    if (!tournamentId) {
      return new NextResponse("Tournament ID is required", { status: 400 });
    }

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
        ...competitorData,
        birthdate: new Date(competitorData.birthdate),
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

export async function GET(req: Request) {
  try {
    const session = await auth();
    const { searchParams } = new URL(req.url);
    const tournamentId = searchParams.get("tournamentId");

    if (!session?.user?.id) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    if (!tournamentId) {
      return new NextResponse("Tournament ID is required", { status: 400 });
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
