import { auth } from "@/lib/auth";
import { db } from "@/lib/prisma";
import { NextResponse } from "next/server";
import Papa from "papaparse";
import { z } from "zod";
import {
  calculateAge,
  getKataCategory,
  getKumiteCategory,
} from "@/lib/utils/classification";
import { beltMapping, genderMapping } from "@/lib/constants/labels";

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

    // Verifica se o usuário é o organizador do torneio
    const tournament = await db.tournament.findUnique({
      where: { id: tournamentId },
    });

    if (!tournament || tournament.organizerId !== session.user.id) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return new NextResponse("No file uploaded", { status: 400 });
    }

    const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
    if (file.size > MAX_FILE_SIZE) {
      return new NextResponse("Arquivo muito grande (máximo 5MB)", { status: 400 });
    }

    const isValidType =
      file.type === "text/csv" ||
      file.type === "application/csv" ||
      file.type === "text/plain" ||
      file.name.toLowerCase().endsWith(".csv");

    if (!isValidType) {
      return new NextResponse("Apenas arquivos CSV são permitidos", { status: 400 });
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
      const age = calculateAge(birthdate);
      const belt = beltMapping[row.faixa.toLowerCase()];
      const gender = genderMapping[row.sexo.toLowerCase()];
      const weight = row.peso ? parseFloat(row.peso.replace(" kg", "")) : null;

      const kata = row.kata.toLowerCase() === "sim";
      const kumite = row.kumite.toLowerCase() === "sim";

      const kataCategory = kata ? getKataCategory(age, gender, belt) : null;
      const kumiteCategory = kumite
        ? getKumiteCategory(age, gender, weight, belt)
        : null;

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
  } catch (error) {
    console.log("[COMPETITORS_IMPORT_POST]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
