import { db } from "@/lib/prisma";
import { NextResponse } from "next/server";
import Papa from "papaparse";
import { z } from "zod";
import {
  deriveCompetitorCategories,
  parseBirthdate,
  parseWeight,
} from "@/lib/utils/classification";
import { beltMapping, genderMapping } from "@/lib/constants/labels";
import { apiError } from "@/lib/api-error";
import { withApiHandler } from "@/lib/api-handler";

const competitorCsvRowSchema = z.object({
  nome: z.string().trim().min(1, "Nome é obrigatório"),
  sexo: z.string().trim().min(1, "Sexo é obrigatório"),
  peso: z.string().optional().default(""),
  nascimento: z.string().trim().min(1, "Data de nascimento é obrigatória"),
  faixa: z.string().trim().min(1, "Faixa é obrigatória"),
  escola: z.string().trim().min(1, "Escola é obrigatória"),
  kumite: z.string().trim().min(1, "Campo kumite é obrigatório"),
  kata: z.string().trim().min(1, "Campo kata é obrigatório"),
});

function parseYesNo(value: string): boolean {
  const normalized = value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
  return ["sim", "s", "true", "1", "yes"].includes(normalized);
}

/**
 * Converte a matriz de linhas do CSV em objetos indexados pelo cabeçalho,
 * recompondo automaticamente o campo `peso` caso o usuário tenha digitado
 * vírgula decimal sem aspas num CSV separado por vírgula (ex: `..., 60,5 kg, ...`).
 */
function parseCsvRecords(csv: string): Record<string, string>[] {
  const rawParsed = Papa.parse<string[]>(csv, {
    header: false,
    skipEmptyLines: "greedy",
  });

  if (!rawParsed.data || rawParsed.data.length < 2) {
    return [];
  }

  const headers = rawParsed.data[0].map((h) => h.trim().toLowerCase());
  const pesoIdx = headers.indexOf("peso");

  const records: Record<string, string>[] = [];

  for (let r = 1; r < rawParsed.data.length; r++) {
    const cells = [...rawParsed.data[r]];

    // Se a linha ficou com 1 coluna a mais justamente porque o peso tinha
    // vírgula decimal sem aspas (ex.: "60" e "5 kg"), recombina em "60.5 kg".
    if (
      pesoIdx !== -1 &&
      cells.length === headers.length + 1 &&
      /^\s*\d+\s*$/.test(cells[pesoIdx] ?? "") &&
      /^\s*\d+\s*(?:kg)?\s*$/i.test(cells[pesoIdx + 1] ?? "")
    ) {
      const mergedWeight = `${cells[pesoIdx].trim()}.${cells[pesoIdx + 1].trim()}`;
      cells.splice(pesoIdx, 2, mergedWeight);
    }

    const rowObj: Record<string, string> = {};
    for (let c = 0; c < headers.length; c++) {
      const key = headers[c];
      if (key) {
        rowObj[key] = cells[c] ?? "";
      }
    }
    records.push(rowObj);
  }

  return records;
}

export const POST = withApiHandler(
  "COMPETITORS_IMPORT_POST",
  async (req: Request, context: { params: Promise<{ id: string }> }) => {
    const { id: tournamentId } = await context.params;

    const formData = await req.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return apiError("Nenhum arquivo enviado", 400);
    }

    const csv = await file.text();
    const rows = parseCsvRecords(csv);

    if (rows.length === 0) {
      return apiError("O arquivo CSV está vazio", 400);
    }

    const validationResult = z
      .array(competitorCsvRowSchema)
      .safeParse(rows);

    if (!validationResult.success) {
      const firstIssue = validationResult.error.issues[0];
      const rowNum =
        typeof firstIssue?.path?.[0] === "number"
          ? firstIssue.path[0] + 2
          : "?";
      const field = firstIssue?.path?.[1] ?? "campo";
      return NextResponse.json(
        {
          error: `Dados inválidos no CSV (linha ${rowNum}, coluna "${String(field)}"): ${firstIssue?.message || "formato inválido"}`,
          details: validationResult.error.issues,
        },
        { status: 400 }
      );
    }

    const competitorsToCreate = [];

    for (let i = 0; i < validationResult.data.length; i++) {
      const row = validationResult.data[i];
      const rowNumber = i + 2; // +1 header, +1 base-1

      const normalizedBelt = row.faixa.trim().toLowerCase();
      const belt = beltMapping[normalizedBelt];
      if (!belt) {
        return apiError(
          `Linha ${rowNumber} (${row.nome}): faixa inválida "${row.faixa}"`,
          400
        );
      }

      const normalizedGender = row.sexo.trim().toLowerCase();
      const gender =
        genderMapping[normalizedGender] ??
        (normalizedGender === "m"
          ? genderMapping.masculino
          : normalizedGender === "f"
            ? genderMapping.feminino
            : undefined);

      if (!gender) {
        return apiError(
          `Linha ${rowNumber} (${row.nome}): sexo inválido "${row.sexo}"`,
          400
        );
      }

      let birthdate: Date;
      try {
        birthdate = parseBirthdate(row.nascimento);
      } catch (err) {
        return apiError(
          `Linha ${rowNumber} (${row.nome}): ${err instanceof Error ? err.message : "data de nascimento inválida"}`,
          400
        );
      }

      let weight: number | null;
      try {
        weight = parseWeight(row.peso);
      } catch (err) {
        return apiError(
          `Linha ${rowNumber} (${row.nome}): ${err instanceof Error ? err.message : "peso inválido"}`,
          400
        );
      }

      const kata = parseYesNo(row.kata);
      const kumite = parseYesNo(row.kumite);

      if (!kata && !kumite) {
        return apiError(
          `Linha ${rowNumber} (${row.nome}): o competidor deve estar inscrito em pelo menos uma modalidade (Kata ou Kumite)`,
          400
        );
      }

      let derived: ReturnType<typeof deriveCompetitorCategories>;
      try {
        derived = deriveCompetitorCategories({
          birthdate,
          gender,
          belt,
          weight,
          kata,
          kumite,
        });
      } catch (err) {
        return apiError(
          `Linha ${rowNumber} (${row.nome}): ${err instanceof Error ? err.message : "erro ao classificar categoria"}`,
          400
        );
      }

      competitorsToCreate.push({
        name: row.nome.trim(),
        gender,
        weight,
        birthdate,
        belt,
        school: row.escola.trim(),
        kata,
        kumite,
        age: derived.age,
        kataCategory: derived.kataCategory,
        kumiteCategory: derived.kumiteCategory,
        tournamentId,
      });
    }

    await db.competitor.createMany({
      data: competitorsToCreate,
    });

    return NextResponse.json({
      success: true,
      count: competitorsToCreate.length,
    });
  }
);
