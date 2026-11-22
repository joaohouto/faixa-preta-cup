import { db } from "@/lib/prisma";
import {
  deriveCompetitorCategories,
  parseBirthdate,
  parseWeight,
} from "@/lib/utils/classification";
import { Belt, Gender } from "@prisma/client";
import { NextResponse } from "next/server";
import { apiError } from "@/lib/api-error";
import { withApiHandler } from "@/lib/api-handler";

export const POST = withApiHandler(
  "COMPETITORS_POST",
  async (req: Request, context: { params: Promise<{ id: string }> }) => {
    const { id: tournamentId } = await context.params;
    const body = await req.json();

    const name = typeof body.name === "string" ? body.name.trim() : "";
    const school = typeof body.school === "string" ? body.school.trim() : "";

    if (!name) {
      return apiError("Nome é obrigatório", 400);
    }
    if (!school) {
      return apiError("Escola é obrigatória", 400);
    }
    if (!Object.values(Gender).includes(body.gender)) {
      return apiError("Sexo inválido", 400);
    }
    if (!Object.values(Belt).includes(body.belt)) {
      return apiError("Faixa inválida", 400);
    }

    const kata = Boolean(body.kata);
    const kumite = Boolean(body.kumite);

    if (!kata && !kumite) {
      return apiError(
        "O competidor deve estar inscrito em pelo menos uma modalidade (Kata ou Kumite)",
        400
      );
    }

    let birthdate: Date;
    let weight: number | null;
    let derived: ReturnType<typeof deriveCompetitorCategories>;

    try {
      birthdate = parseBirthdate(body.birthdate);
      weight = parseWeight(body.weight);
      derived = deriveCompetitorCategories({
        birthdate,
        gender: body.gender,
        belt: body.belt,
        weight,
        kata,
        kumite,
      });
    } catch (err) {
      return apiError(
        err instanceof Error ? err.message : "Dados inválidos do competidor",
        400
      );
    }

    const competitor = await db.competitor.create({
      data: {
        name,
        gender: body.gender,
        weight,
        birthdate,
        belt: body.belt,
        school,
        kata,
        kumite,
        age: derived.age,
        kataCategory: derived.kataCategory,
        kumiteCategory: derived.kumiteCategory,
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
