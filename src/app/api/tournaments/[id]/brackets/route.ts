import { db } from "@/lib/prisma";
import { NextResponse } from "next/server";
import {
  generateBracket,
  propagateByeWinners,
} from "@/lib/utils/bracket-generator";
import { Modality } from "@prisma/client";
import { apiError } from "@/lib/api-error";
import { withApiHandler } from "@/lib/api-handler";

/**
 * Gera chave(s) para o torneio. Dois modos:
 *  - `generateAll: true`: gera uma chave por categoria (kata + kumite)
 *    a partir dos campos `kataCategory`/`kumiteCategory` de cada
 *    competidor. Categorias já com chave `NOT_STARTED` são recriadas do
 *    zero (delete + generateBracket); categorias com chave em
 *    IN_PROGRESS/COMPLETED são puladas silenciosamente (`continue`),
 *    então cadastros atrasados nessas categorias nunca entram na chave.
 *  - `category`/`modality` explícitos: gera só aquela chave, mesma regra
 *    de recriação/bloqueio acima, mas retorna erro 400 (em vez de pular
 *    em silêncio) se a chave já foi iniciada — "Cadastros tardios
 *    bloqueados".
 * Em ambos os modos, `propagateByeWinners` roda logo após
 * `generateBracket` para resolver os byes automáticos da 1ª rodada.
 */
export const POST = withApiHandler(
  "BRACKETS_POST",
  async (req: Request, context: { params: Promise<{ id: string }> }) => {
    const { id: tournamentId } = await context.params;
    const body = await req.json();
    const { category, modality, generateAll } = body;

    if (generateAll) {
      // Mesmo critério de ordenação (e mesma ressalva sobre não ser um
      // seeding real) do caminho de categoria única mais abaixo.
      const competitors = await db.competitor.findMany({
        where: { tournamentId },
        orderBy: [
          { age: "asc" },
          { gender: "asc" },
          { weight: "asc" },
          { belt: "asc" },
          { id: "asc" },
        ],
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
      return apiError("Category and modality required", 400);
    }

    const existing = await db.bracket.findUnique({
      where: {
        tournamentId_category: { tournamentId, category },
      },
      include: { matches: true },
    });

    if (existing) {
      if (existing.status !== "NOT_STARTED") {
        return apiError(
          "Chave já iniciada. Cadastros tardios bloqueados.",
          400
        );
      }
      await db.bracket.delete({ where: { id: existing.id } });
    }

    // Esta ordenação NÃO é um sorteio/seeding real: dentro de uma única
    // categoria, age/gender/weight/belt já são praticamente constantes
    // (é isso que define a categoria), então o "critério de seed" acaba
    // sendo, na prática, a ordem de cadastro (via o desempate `id` abaixo)
    // — não há draw aleatório, sorteio por escola (para evitar 2
    // competidores da mesma escola na 1ª rodada) nem seeding por
    // resultado anterior. O desempate final por `id` só existe para
    // tornar a geração determinística (sem ele, empates nos 4 campos
    // acima ficavam a critério da ordem que o SQLite retornasse, que não
    // é garantida pela SQL).
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
        { id: "asc" },
      ],
    });

    if (competitors.length < 2) {
      return apiError(
        "É necessário pelo menos 2 competidores para gerar uma chave",
        400
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
  }
);

export const GET = withApiHandler(
  "BRACKETS_GET",
  async (req: Request, context: { params: Promise<{ id: string }> }) => {
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

    const now = new Date();
    const activeLocks = await db.refereeLock.findMany({
      where: {
        tournamentId,
        expiresAt: { gt: now },
      },
      select: {
        bracketId: true,
        matchId: true,
      },
    });

    const lockByBracket = new Map(
      activeLocks.map((l) => [l.bracketId, l.matchId])
    );

    const bracketsWithLock = brackets.map((b) => ({
      ...b,
      refereeActive: lockByBracket.has(b.id),
      activeMatchId: lockByBracket.get(b.id) || null,
    }));

    return NextResponse.json(bracketsWithLock);
  }
);
