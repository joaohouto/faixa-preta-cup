import { auth } from "@/lib/auth";
import { db } from "@/lib/prisma";
import { NextResponse } from "next/server";
import Papa from "papaparse";
import { z } from "zod";
import { Belt, Gender } from "@prisma/client";
import {
  calculateAge,
  getKataCategory,
  getKumiteCategory,
} from "@/lib/utils/classification";

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

const beltMapping: Record<string, Belt> = {
  branca: Belt.WHITE,
  azul: Belt.BLUE,
  amarela: Belt.YELLOW,
  vermelha: Belt.RED,
  laranja: Belt.ORANGE,
  verde: Belt.GREEN,
  roxa: Belt.PURPLE,
  marrom: Belt.BROWN,
  preta: Belt.BLACK,
};

const genderMapping: Record<string, Gender> = {
  masculino: Gender.MALE,
  feminino: Gender.FEMALE,
};

export async function POST(req: Request) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get("file") as File;
    const tournamentId = formData.get("tournamentId") as string;

    if (!file) {
      return new NextResponse("No file uploaded", { status: 400 });
    }

    if (!tournamentId) {
      return new NextResponse("Tournament ID is required", { status: 400 });
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
