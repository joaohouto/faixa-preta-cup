import { auth } from "@/lib/auth";
import { db } from "@/lib/prisma";
import {
  calculateAge,
  getKataCategory,
  getKumiteCategory,
} from "@/lib/utils/classification";
import { NextResponse } from "next/server";

export async function PUT(
  req: Request,
  context: { params: Promise<{ id: string; competitorId: string }> }
) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const body = await req.json();
    const { competitorId } = await context.params;

    const competitorData = {
      ...body,
      birthdate: new Date(body.birthdate),
    };

    const idade = calculateAge(competitorData.birthdate);
    const categoriaKata = competitorData.kata
      ? getKataCategory(idade, competitorData.gender, competitorData.belt)
      : null;
    const categoriaKumite = competitorData.kumite
      ? getKumiteCategory(
          idade,
          competitorData.gender,
          competitorData.weight,
          competitorData.belt
        )
      : null;

    const updatedCompetitor = await db.competitor.update({
      where: { id: competitorId },
      data: {
        ...competitorData,
        age: idade,
        kataCategory: categoriaKata,
        kumiteCategory: categoriaKumite,
      },
    });

    return NextResponse.json(updatedCompetitor);
  } catch (error) {
    console.log("[COMPETITOR_PUT]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  context: { params: Promise<{ id: string; competitorId: string }> }
) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const { id: tournamentId, competitorId } = await context.params;

    // Verificar ownership do torneio
    const tournament = await db.tournament.findUnique({
      where: { id: tournamentId },
    });

    if (!tournament || tournament.organizerId !== session.user.id) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    // Verificar se competidor existe
    const competitor = await db.competitor.findUnique({
      where: { id: competitorId },
    });

    if (!competitor || competitor.tournamentId !== tournamentId) {
      return new NextResponse("Competitor not found", { status: 404 });
    }

    // VERIFICAR SE COMPETIDOR ESTÁ EM ALGUMA CHAVE
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
      // Se a chave ainda não iniciou, podemos regenerar
      if (matchesWithCompetitor.bracket.status === "NOT_STARTED") {
        // Deletar o bracket inteiro para ser regenerado
        await db.bracket.delete({
          where: { id: matchesWithCompetitor.bracket.id },
        });
      } else {
        // Se já iniciou, bloquear a exclusão
        return new NextResponse(
          "Não é possível excluir competidor que está em uma chave já iniciada. Categoria: " +
            matchesWithCompetitor.bracket.category,
          { status: 400 }
        );
      }
    }

    // Deletar competidor
    await db.competitor.delete({
      where: { id: competitorId },
    });

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.log("[COMPETITOR_DELETE]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
