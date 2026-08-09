import { db } from "@/lib/prisma";
import { deriveCompetitorCategories } from "@/lib/utils/classification";
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
    const { competitorId } = await context.params;

    const competitorData = {
      ...body,
      birthdate: new Date(body.birthdate),
    };

    const { age, kataCategory, kumiteCategory } = deriveCompetitorCategories({
      birthdate: competitorData.birthdate,
      gender: competitorData.gender,
      belt: competitorData.belt,
      weight: competitorData.weight,
      kata: competitorData.kata,
      kumite: competitorData.kumite,
    });

    const updatedCompetitor = await db.competitor.update({
      where: { id: competitorId },
      data: {
        ...competitorData,
        age,
        kataCategory,
        kumiteCategory,
      },
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

    const matchesWithCompetitor = await db.match.findFirst({
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

    if (matchesWithCompetitor) {
      if (matchesWithCompetitor.bracket.status === "NOT_STARTED") {
        await db.bracket.delete({
          where: { id: matchesWithCompetitor.bracket.id },
        });
      } else {
        return apiError(
          "Não é possível excluir competidor que está em uma chave já iniciada. Categoria: " +
            matchesWithCompetitor.bracket.category,
          400
        );
      }
    }

    await db.competitor.delete({
      where: { id: competitorId },
    });

    return new NextResponse(null, { status: 204 });
  }
);
