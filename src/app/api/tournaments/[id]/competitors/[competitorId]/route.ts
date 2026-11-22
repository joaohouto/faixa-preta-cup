import { db } from "@/lib/prisma";
import {
  deriveCompetitorCategories,
  parseBirthdate,
  parseWeight,
} from "@/lib/utils/classification";
import { Belt, Gender } from "@prisma/client";
import { NextResponse } from "next/server";
import { apiError } from "@/lib/api-error";
import { withApiHandler, requireEntity } from "@/lib/api-handler";

export const PUT = withApiHandler(
  "COMPETITOR_PUT",
  async (
    req: Request,
    context: { params: Promise<{ id: string; competitorId: string }> }
  ) => {
    const body = await req.json();
    const { id: tournamentId, competitorId } = await context.params;

    const existingCompetitor = requireEntity(
      await db.competitor.findUnique({ where: { id: competitorId } }),
      "Competitor not found",
      (c) => c.tournamentId === tournamentId
    );
    if (existingCompetitor instanceof Response) return existingCompetitor;

    const name =
      typeof body.name === "string"
        ? body.name.trim()
        : existingCompetitor.name;
    const school =
      typeof body.school === "string"
        ? body.school.trim()
        : existingCompetitor.school;
    const gender: Gender = body.gender ?? existingCompetitor.gender;
    const belt: Belt = body.belt ?? existingCompetitor.belt;
    const kata =
      body.kata !== undefined ? Boolean(body.kata) : existingCompetitor.kata;
    const kumite =
      body.kumite !== undefined
        ? Boolean(body.kumite)
        : existingCompetitor.kumite;

    if (!name) {
      return apiError("Nome é obrigatório", 400);
    }
    if (!school) {
      return apiError("Escola é obrigatória", 400);
    }
    if (!Object.values(Gender).includes(gender)) {
      return apiError("Sexo inválido", 400);
    }
    if (!Object.values(Belt).includes(belt)) {
      return apiError("Faixa inválida", 400);
    }
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
      birthdate =
        body.birthdate !== undefined
          ? parseBirthdate(body.birthdate)
          : existingCompetitor.birthdate;
      weight =
        body.weight !== undefined
          ? parseWeight(body.weight)
          : existingCompetitor.weight;

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
        err instanceof Error ? err.message : "Dados inválidos do competidor",
        400
      );
    }

    // Verifica todas as chaves em que o competidor está atualmente escalado
    const matchesWithCompetitor = await db.match.findMany({
      where: {
        OR: [{ akaId: competitorId }, { aoId: competitorId }],
        bracket: { tournamentId },
      },
      include: { bracket: true },
    });

    const bracketsById = new Map(
      matchesWithCompetitor.map((m) => [m.bracket.id, m.bracket])
    );

    const kataCategoryChanged =
      existingCompetitor.kataCategory !== derived.kataCategory;
    const kumiteCategoryChanged =
      existingCompetitor.kumiteCategory !== derived.kumiteCategory;

    const bracketsToDelete: string[] = [];

    for (const bracket of bracketsById.values()) {
      const categoryChangedForModality =
        (bracket.modality === "KATA" && kataCategoryChanged) ||
        (bracket.modality === "KUMITE" && kumiteCategoryChanged);

      if (categoryChangedForModality) {
        if (bracket.status !== "NOT_STARTED") {
          return apiError(
            `Não é possível alterar a categoria de um competidor que está em uma chave já iniciada (${bracket.category}).`,
            400
          );
        }
        bracketsToDelete.push(bracket.id);
      }
    }

    const updatedCompetitor = await db.$transaction(async (tx) => {
      if (bracketsToDelete.length > 0) {
        await tx.refereeLock.deleteMany({
          where: { bracketId: { in: bracketsToDelete } },
        });
        await tx.liveMatch.deleteMany({
          where: { bracketId: { in: bracketsToDelete } },
        });
        await tx.bracket.deleteMany({
          where: { id: { in: bracketsToDelete } },
        });
      }

      return tx.competitor.update({
        where: { id: competitorId },
        data: {
          name,
          gender,
          weight,
          birthdate,
          belt,
          school,
          kata,
          kumite,
          age: derived.age,
          kataCategory: derived.kataCategory,
          kumiteCategory: derived.kumiteCategory,
        },
      });
    });

    return NextResponse.json(updatedCompetitor);
  }
);

export const DELETE = withApiHandler(
  "COMPETITOR_DELETE",
  async (
    req: Request,
    context: { params: Promise<{ id: string; competitorId: string }> }
  ) => {
    const { id: tournamentId, competitorId } = await context.params;

    const competitor = requireEntity(
      await db.competitor.findUnique({ where: { id: competitorId } }),
      "Competitor not found",
      (c) => c.tournamentId === tournamentId
    );
    if (competitor instanceof Response) return competitor;

    // Busca TODAS as chaves em que o competidor aparece (ex.: Kata + Kumite)
    const matchesWithCompetitor = await db.match.findMany({
      where: {
        OR: [{ akaId: competitorId }, { aoId: competitorId }],
        bracket: {
          tournamentId,
        },
      },
      include: {
        bracket: true,
      },
    });

    const uniqueBrackets = Array.from(
      new Map(
        matchesWithCompetitor.map((m) => [m.bracket.id, m.bracket])
      ).values()
    );

    const activeBrackets = uniqueBrackets.filter(
      (b) => b.status !== "NOT_STARTED"
    );

    if (activeBrackets.length > 0) {
      const categories = activeBrackets.map((b) => b.category).join(", ");
      return apiError(
        "Não é possível excluir competidor que está em uma chave já iniciada. Categoria: " +
          categories,
        400
      );
    }

    const notStartedBracketIds = uniqueBrackets.map((b) => b.id);

    await db.$transaction(async (tx) => {
      if (notStartedBracketIds.length > 0) {
        await tx.refereeLock.deleteMany({
          where: { bracketId: { in: notStartedBracketIds } },
        });
        await tx.liveMatch.deleteMany({
          where: { bracketId: { in: notStartedBracketIds } },
        });
        await tx.bracket.deleteMany({
          where: { id: { in: notStartedBracketIds } },
        });
      }

      await tx.competitor.delete({
        where: { id: competitorId },
      });
    });

    return new NextResponse(null, { status: 204 });
  }
);
