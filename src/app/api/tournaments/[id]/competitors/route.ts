import { db } from "@/lib/prisma";
import { deriveCompetitorCategories } from "@/lib/utils/classification";
import { NextResponse } from "next/server";
import { withApiHandler } from "@/lib/api-handler";

export const POST = withApiHandler(
  "COMPETITORS_POST",
  async (req: Request, context: { params: Promise<{ id: string }> }) => {
    const { id: tournamentId } = await context.params;
    const body = await req.json();

    const competitorData = {
      ...body,
      tournamentId,
    };

    const { age, kataCategory, kumiteCategory } = deriveCompetitorCategories({
      birthdate: new Date(competitorData.birthdate),
      gender: competitorData.gender,
      belt: competitorData.belt,
      weight: competitorData.weight,
      kata: competitorData.kata,
      kumite: competitorData.kumite,
    });

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
  }
);

export const GET = withApiHandler(
  "COMPETITORS_GET",
  async (req: Request, context: { params: Promise<{ id: string }> }) => {
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
  }
);
