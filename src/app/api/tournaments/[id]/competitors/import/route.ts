import { db } from "@/lib/prisma";
import { NextResponse } from "next/server";
import Papa from "papaparse";
import { z } from "zod";
import { deriveCompetitorCategories } from "@/lib/utils/classification";
import { beltMapping, genderMapping } from "@/lib/constants/labels";
import { apiError } from "@/lib/api-error";
import { withApiHandler } from "@/lib/api-handler";

const competitorSchema = z.object({
  nome: z.string().min(1),
  sexo: z.string().min(1),
  peso: z.string().optional(),
  nascimento: z.string().min(1),
  faixa: z.string().min(1),
  escola: z.string().min(1),
  kumite: z.string().min(1),
  kata: z.string().min(1),
});

export const POST = withApiHandler(
  "COMPETITORS_IMPORT_POST",
  async (req: Request, context: { params: Promise<{ id: string }> }) => {
    const { id: tournamentId } = await context.params;

    const formData = await req.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return apiError("No file uploaded", 400);
    }

    const csv = await file.text();

    const parsed = Papa.parse(csv, {
      header: true,
      skipEmptyLines: true,
    });

    const validationResult = z.array(competitorSchema).safeParse(parsed.data);

    if (!validationResult.success) {
      return NextResponse.json(
        { error: "Invalid CSV data", details: validationResult.error.issues },
        { status: 400 }
      );
    }

    const competitorsToCreate = validationResult.data.map((row) => {
      const birthdateParts = row.nascimento.split("/");
      const birthdate = new Date(
        parseInt(birthdateParts[2]),
        parseInt(birthdateParts[1]) - 1,
        parseInt(birthdateParts[0])
      );
      const belt = beltMapping[row.faixa.toLowerCase()];
      const gender = genderMapping[row.sexo.toLowerCase()];
      const weight = row.peso ? parseFloat(row.peso.replace(" kg", "")) : null;

      const kata = row.kata.toLowerCase() === "sim";
      const kumite = row.kumite.toLowerCase() === "sim";

      const { age, kataCategory, kumiteCategory } = deriveCompetitorCategories(
        { birthdate, gender, belt, weight, kata, kumite }
      );

      return {
        name: row.nome,
        gender,
        weight,
        birthdate,
        belt,
        school: row.escola,
        kata,
        kumite,
        age,
        kataCategory,
        kumiteCategory,
        tournamentId,
      };
    });

    await db.competitor.createMany({
      data: competitorsToCreate,
    });

    return NextResponse.json({ success: true });
  }
);
