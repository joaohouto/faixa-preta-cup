import { afterAll, describe, expect, it } from "vitest";
import { db } from "@/lib/prisma";
import { Belt, Gender, Modality } from "@prisma/client";
import {
  POST as bracketsPOST,
  GET as bracketsGET,
} from "@/app/api/tournaments/[id]/brackets/route";
import { appConfig } from "@/config/app";

const createdTournamentIds: string[] = [];

async function createTestTournament(name = "Torneio Teste - Impressão e Títulos") {
  const t = await db.tournament.create({
    data: {
      name,
    },
  });
  createdTournamentIds.push(t.id);
  return t;
}

afterAll(async () => {
  for (const tid of createdTournamentIds) {
    await db.refereeLock.deleteMany({ where: { tournamentId: tid } }).catch(() => {});
    await db.match.deleteMany({ where: { bracket: { tournamentId: tid } } }).catch(() => {});
    await db.bracket.deleteMany({ where: { tournamentId: tid } }).catch(() => {});
    await db.competitor.deleteMany({ where: { tournamentId: tid } }).catch(() => {});
    await db.tournament.delete({ where: { id: tid } }).catch(() => {});
  }
});

describe("1. Endpoint de Brackets com Suporte a Impressão (?includeMatches=true)", () => {
  it("retorna apenas contagem de lutas por padrão (includeMatches ausente)", async () => {
    const tournament = await createTestTournament("Torneio Sem IncludeMatches");

    // Cadastrar competidores para gerar chave
    for (let i = 1; i <= 4; i++) {
      await db.competitor.create({
        data: {
          tournamentId: tournament.id,
          name: `Atleta ${i}`,
          age: 25,
          birthdate: new Date("1999-05-10"),
          gender: Gender.MALE,
          belt: Belt.BLACK,
          school: "Dojo Central",
          kumite: true,
          kumiteCategory: "Senior Masculino Preta",
        },
      });
    }

    // Gerar chave
    const reqPost = new Request(
      `http://localhost:3000/api/tournaments/${tournament.id}/brackets`,
      {
        method: "POST",
        body: JSON.stringify({
          category: "Senior Masculino Preta",
          modality: Modality.KUMITE,
        }),
      }
    );
    await bracketsPOST(reqPost, { params: Promise.resolve({ id: tournament.id }) });

    // Chamada GET padrão
    const reqGet = new Request(
      `http://localhost:3000/api/tournaments/${tournament.id}/brackets`
    );
    const resGet = await bracketsGET(reqGet, {
      params: Promise.resolve({ id: tournament.id }),
    });

    expect(resGet.status).toBe(200);
    const data = await resGet.json();
    expect(data.length).toBe(1);
    expect(data[0]._count.matches).toBe(4); // 4 competidores -> 2 semifinais + 1 final + 1 disputa de 3º lugar
    expect(data[0].matches).toBeUndefined();
    expect(data[0].refereeActive).toBe(false);
  });

  it("retorna todas as lutas ordenadas quando includeMatches=true", async () => {
    const tournament = await createTestTournament("Torneio Com IncludeMatches");

    for (let i = 1; i <= 4; i++) {
      await db.competitor.create({
        data: {
          tournamentId: tournament.id,
          name: `Competidor ${i}`,
          age: 20,
          birthdate: new Date("2004-03-15"),
          gender: Gender.FEMALE,
          belt: Belt.PURPLE,
          school: "Dojo Central",
          kata: true,
          kataCategory: "Sub-21 Feminino Roxa",
        },
      });
    }

    const reqPost = new Request(
      `http://localhost:3000/api/tournaments/${tournament.id}/brackets`,
      {
        method: "POST",
        body: JSON.stringify({
          category: "Sub-21 Feminino Roxa",
          modality: Modality.KATA,
        }),
      }
    );
    await bracketsPOST(reqPost, { params: Promise.resolve({ id: tournament.id }) });

    const reqGet = new Request(
      `http://localhost:3000/api/tournaments/${tournament.id}/brackets?includeMatches=true`
    );
    const resGet = await bracketsGET(reqGet, {
      params: Promise.resolve({ id: tournament.id }),
    });

    expect(resGet.status).toBe(200);
    const data = await resGet.json();
    expect(data.length).toBe(1);
    expect(data[0].matches).toBeDefined();
    expect(data[0].matches.length).toBe(4); // 4 competidores -> 4 lutas com disputa de 3º lugar

    // Verificar ordenação round asc, position asc
    const matches = data[0].matches;
    for (let i = 1; i < matches.length; i++) {
      const prev = matches[i - 1];
      const curr = matches[i];
      if (prev.round === curr.round) {
        expect(curr.position).toBeGreaterThanOrEqual(prev.position);
      } else {
        expect(curr.round).toBeGreaterThan(prev.round);
      }
    }
  });
});

describe("2. Títulos e Formatação de Página", () => {
  it("valida convenção de título curto e completo do appConfig", () => {
    expect(appConfig.shortTitle).toBe("FPCup");
    expect(appConfig.title).toBe("Faixa Preta Cup");
  });

  it("garante consistência no padrão de títulos dinâmicos", () => {
    const formatTitle = (title: string) => {
      const trimmed = title.trim();
      if (trimmed.includes(`| ${appConfig.shortTitle}`) || trimmed.includes(`| ${appConfig.title}`)) {
        return trimmed;
      }
      return `${trimmed} | ${appConfig.shortTitle}`;
    };

    expect(formatTitle("Senior Masculino · Chave")).toBe("Senior Masculino · Chave | FPCup");
    expect(formatTitle("Competidores — Torneio Oficial")).toBe("Competidores — Torneio Oficial | FPCup");
    expect(formatTitle("Árbitro: João vs Maria (Kumite)")).toBe("Árbitro: João vs Maria (Kumite) | FPCup");
    // Não duplica se já possuir sufixo
    expect(formatTitle("Já Formatado | FPCup")).toBe("Já Formatado | FPCup");
  });
});
