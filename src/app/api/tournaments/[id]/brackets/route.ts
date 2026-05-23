import { db } from "@/lib/prisma";
import { NextResponse } from "next/server";
import {
  generateBracket,
  propagateByeWinners,
} from "@/lib/utils/bracket-generator";
import { Modality } from "@prisma/client";

export async function POST(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id: tournamentId } = await context.params;
    const body = await req.json();
    const { category, modality, generateAll } = body;

    if (generateAll) {
      const competitors = await db.competitor.findMany({
        where: { tournamentId },
      });

      const kataGroups = new Map<string, typeof competitors>();
      competitors
        .filter((c) => c.kata && c.kataCategory)
        .forEach((c) => {
          const cat = c.kataCategory!;
          if (!kataGroups.has(cat)) kataGroups.set(cat, []);
          kataGroups.get(cat)!.push(c);
        });

      const kumiteGroups = new Map<string, typeof competitors>();
      competitors
        .filter((c) => c.kumite && c.kumiteCategory)
        .forEach((c) => {
          const cat = c.kumiteCategory!;
          if (!kumiteGroups.has(cat)) kumiteGroups.set(cat, []);
          kumiteGroups.get(cat)!.push(c);
        });

      async function generateBracketsForGroup(
        groups: Map<string, typeof competitors>,
        modality: Modality
      ) {
        const created = [];
        for (const [cat, comps] of groups.entries()) {
          const existing = await db.bracket.findUnique({
            where: { tournamentId_category: { tournamentId, category: cat } },
          });

          if (existing) {
            if (existing.status !== "NOT_STARTED") continue;
            await db.bracket.delete({ where: { id: existing.id } });
          }

          const bracket = await generateBracket({
            tournamentId,
            category: cat,
            modality,
            competitors: comps,
          });

          if (bracket) {
            await propagateByeWinners(bracket.id);
            created.push(bracket);
          }
        }
        return created;
      }

      const [kataCreated, kumiteCreated] = await Promise.all([
        generateBracketsForGroup(kataGroups, Modality.KATA),
        generateBracketsForGroup(kumiteGroups, Modality.KUMITE),
      ]);
      const createdBrackets = [...kataCreated, ...kumiteCreated];

      return NextResponse.json({
        message: `${createdBrackets.length} chaves geradas com sucesso`,
        brackets: createdBrackets,
      });
    }

    if (!category || !modality) {
      return new NextResponse("Category and modality required", {
        status: 400,
      });
    }

    const existing = await db.bracket.findUnique({
      where: {
        tournamentId_category: { tournamentId, category },
      },
      include: { matches: true },
    });

    if (existing) {
      if (existing.status !== "NOT_STARTED") {
        return new NextResponse(
          "Chave já iniciada. Cadastros tardios bloqueados.",
          { status: 400 }
        );
      }
      await db.bracket.delete({ where: { id: existing.id } });
    }

    const field =
      modality === Modality.KATA ? "kataCategory" : "kumiteCategory";
    const competitors = await db.competitor.findMany({
      where: {
        tournamentId,
        [field]: category,
      },
      orderBy: [
        { age: "asc" },
        { gender: "asc" },
        { weight: "asc" },
        { belt: "asc" },
      ],
    });

    if (competitors.length < 2) {
      return new NextResponse(
        "É necessário pelo menos 2 competidores para gerar uma chave",
        { status: 400 }
      );
    }

    const bracket = await generateBracket({
      tournamentId,
      category,
      modality,
      competitors,
    });

    if (bracket) {
      await propagateByeWinners(bracket.id);
    }

    return NextResponse.json(bracket);
  } catch (error) {
    console.log("[BRACKETS_POST]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}

export async function GET(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id: tournamentId } = await context.params;

    const brackets = await db.bracket.findMany({
      where: { tournamentId },
      include: {
        _count: {
          select: { matches: true },
        },
      },
      orderBy: [{ modality: "asc" }, { category: "asc" }],
    });

    return NextResponse.json(brackets);
  } catch (error) {
    console.log("[BRACKETS_GET]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
