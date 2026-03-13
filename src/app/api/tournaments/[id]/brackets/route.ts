import { auth } from "@/lib/auth";
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
    const session = await auth();
    if (!session?.user?.id) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const { id: tournamentId } = await context.params;
    const body = await req.json();
    const { category, modality, generateAll } = body;

    // Verificar ownership
    const tournament = await db.tournament.findUnique({
      where: { id: tournamentId },
    });

    if (!tournament || tournament.organizerId !== session.user.id) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    // Gerar todas as chaves
    if (generateAll) {
      const competitors = await db.competitor.findMany({
        where: { tournamentId },
      });

      // Agrupar por categoria Kata
      const kataGroups = new Map<string, typeof competitors>();
      competitors
        .filter((c) => c.kata && c.kataCategory)
        .forEach((c) => {
          const cat = c.kataCategory!;
          if (!kataGroups.has(cat)) kataGroups.set(cat, []);
          kataGroups.get(cat)!.push(c);
        });

      // Agrupar por categoria Kumite
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

    // Gerar chave única
    if (!category || !modality) {
      return new NextResponse("Category and modality required", {
        status: 400,
      });
    }

    // Verificar se já existe chave para esta categoria
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
      // Deletar e recriar
      await db.bracket.delete({ where: { id: existing.id } });
    }

    // Buscar competidores da categoria
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

    // Propagar vencedores dos byes
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
    const session = await auth();
    if (!session?.user?.id) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const { id: tournamentId } = await context.params;

    // Verificar ownership
    const tournament = await db.tournament.findUnique({
      where: { id: tournamentId },
    });

    if (!tournament || tournament.organizerId !== session.user.id) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

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
