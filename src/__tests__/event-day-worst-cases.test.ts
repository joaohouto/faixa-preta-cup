import { afterAll, afterEach, describe, expect, it } from "vitest";
import fs from "fs";
import path from "path";
import { Belt, Gender, Modality } from "@prisma/client";
import { db } from "@/lib/prisma";
import {
  calculateAge,
  deriveCompetitorCategories,
  parseBirthdate,
  parseWeight,
} from "@/lib/utils/classification";
import {
  generateBracket,
  propagateByeWinners,
} from "@/lib/utils/bracket-generator";
import { POST as createCompetitorPOST } from "@/app/api/tournaments/[id]/competitors/route";
import {
  PUT as updateCompetitorPUT,
  DELETE as deleteCompetitorDELETE,
} from "@/app/api/tournaments/[id]/competitors/[competitorId]/route";
import { POST as importCompetitorsPOST } from "@/app/api/tournaments/[id]/competitors/import/route";
import { DELETE as bulkDeleteCompetitorsDELETE } from "@/app/api/tournaments/[id]/competitors/bulk-delete/route";
import {
  POST as bracketsPOST,
  GET as bracketsGET,
} from "@/app/api/tournaments/[id]/brackets/route";
import {
  GET as bracketDetailGET,
  DELETE as bracketDELETE,
} from "@/app/api/tournaments/[id]/brackets/[bracketId]/route";
import { GET as nextMatchGET } from "@/app/api/tournaments/[id]/brackets/[bracketId]/next-match/route";
import {
  PUT as matchResultPUT,
  PATCH as matchReopenPATCH,
} from "@/app/api/tournaments/[id]/brackets/[bracketId]/matches/[matchId]/route";
import {
  GET as refereeLockGET,
  POST as refereeLockPOST,
} from "@/app/api/tournaments/[id]/brackets/[bracketId]/referee-lock/route";
import {
  GET as liveMatchGET,
  POST as liveMatchPOST,
  DELETE as liveMatchDELETE,
} from "@/app/api/live-match/route";
import { GET as resultsGET } from "@/app/api/tournaments/[id]/results/route";
import { GET as backupGET } from "@/app/api/tournaments/[id]/backup/route";

const createdTournamentIds: string[] = [];

async function createTestTournament(name = "Torneio de Teste - Dia do Evento") {
  const tournament = await db.tournament.create({
    data: { name },
  });
  createdTournamentIds.push(tournament.id);
  return tournament;
}

async function cleanupTestTournaments() {
  if (createdTournamentIds.length === 0) return;
  const ids = [...createdTournamentIds];
  createdTournamentIds.length = 0;

  await db.refereeLock.deleteMany({ where: { tournamentId: { in: ids } } });
  await db.liveMatch.deleteMany({ where: { tournamentId: { in: ids } } });
  await db.bracket.deleteMany({ where: { tournamentId: { in: ids } } });
  await db.competitor.deleteMany({ where: { tournamentId: { in: ids } } });
  await db.tournament.deleteMany({ where: { id: { in: ids } } });
}

afterEach(async () => {
  await cleanupTestTournaments();
});

afterAll(async () => {
  await cleanupTestTournaments();
});

describe("1. Classificação, Datas Limítrofes (Fuso Horário) e Pesos Sujos", () => {
  it("calcula exatamente a mesma idade para YYYY-MM-DD (form) e DD/MM/YYYY (CSV) no dia do aniversário", () => {
    const eventDay = new Date(2026, 9, 27, 10, 0, 0); // 27/10/2026
    const fromForm = parseBirthdate("2014-10-27");
    const fromCsv = parseBirthdate("27/10/2014");

    expect(calculateAge(fromForm, eventDay)).toBe(12);
    expect(calculateAge(fromCsv, eventDay)).toBe(12);

    // Um dia depois do evento (ainda tem 11 anos no dia 27/10/2026)
    const tomorrowForm = parseBirthdate("2014-10-28");
    const tomorrowCsv = parseBirthdate("28/10/2014");
    expect(calculateAge(tomorrowForm, eventDay)).toBe(11);
    expect(calculateAge(tomorrowCsv, eventDay)).toBe(11);

    // Garante que toISOString().split("T")[0] (usado no dialog de edição) preserva o dia exato
    expect(fromForm.toISOString().split("T")[0]).toBe("2014-10-27");
    expect(fromCsv.toISOString().split("T")[0]).toBe("2014-10-27");
  });

  it("rejeita datas inexistentes no calendário (ex: 31/02, 29/02 em ano não bissexto) e datas futuras", () => {
    expect(() => parseBirthdate("31/02/2010")).toThrow();
    expect(() => parseBirthdate("29/02/2011")).toThrow();
    expect(() => parseBirthdate("2010-02-31")).toThrow();
    expect(() => parseBirthdate("2010-13-01")).toThrow();
    expect(() => parseBirthdate("data-invalida")).toThrow();

    expect(() =>
      deriveCompetitorCategories({
        birthdate: "01/01/2099",
        gender: Gender.MALE,
        belt: Belt.BLACK,
        weight: 70,
        kata: true,
        kumite: false,
      })
    ).toThrow(/futuro/i);
  });

  it("faz parse correto de pesos com vírgula decimal ('60,5 kg') sem truncar para a categoria inferior", () => {
    expect(parseWeight("60,5 kg")).toBe(60.5);
    expect(parseWeight("60,5")).toBe(60.5);
    expect(parseWeight(" 67.0 kg ")).toBe(67);
    expect(parseWeight("")).toBeNull();
    expect(parseWeight(0)).toBeNull();
    expect(() => parseWeight("-5")).toThrow();
    expect(() => parseWeight("abc")).toThrow();

    // Atleta Senior Masculino com 60,5 kg DEVE cair em -67kg, NUNCA em -60kg!
    const derived = deriveCompetitorCategories({
      birthdate: "01/01/2000",
      gender: Gender.MALE,
      belt: Belt.BLACK,
      weight: parseWeight("60,5 kg"),
      kata: false,
      kumite: true,
      referenceDate: new Date(2026, 9, 27),
    });

    expect(derived.kumiteCategory).toBe(
      "KUMITE MASCULINO SENIOR AVANÇADO -67kg"
    );
  });

  it("bloqueia inscrição em Kumite quando o peso é nulo ou zero", () => {
    expect(() =>
      deriveCompetitorCategories({
        birthdate: "01/01/2000",
        gender: Gender.MALE,
        belt: Belt.BLACK,
        weight: null,
        kata: false,
        kumite: true,
      })
    ).toThrow(/Peso é obrigatório/i);

    expect(() =>
      deriveCompetitorCategories({
        birthdate: "01/01/2000",
        gender: Gender.MALE,
        belt: Belt.BLACK,
        weight: 0,
        kata: false,
        kumite: true,
      })
    ).toThrow(/Peso é obrigatório/i);
  });
});

describe("2. Importação de CSV com Dados Reais e Dados Sujos do Dia do Evento", () => {
  it("importa o arquivo data/competitors.csv real do projeto com 100% de sucesso", async () => {
    const tournament = await createTestTournament("Torneio CSV Real");
    const possiblePaths = [
      path.resolve(process.cwd(), "data/competitors.csv"),
      path.resolve(process.cwd(), "data/competidores-2026.csv"),
    ];
    const csvPath = possiblePaths.find((p) => fs.existsSync(p)) || possiblePaths[0];
    const csvText = fs.readFileSync(csvPath, "utf-8");

    const formData = new FormData();
    formData.append(
      "file",
      new File([csvText], "competitors.csv", { type: "text/csv" })
    );

    const req = new Request(
      `http://localhost:3000/api/tournaments/${tournament.id}/competitors/import`,
      { method: "POST", body: formData }
    );

    const res = await importCompetitorsPOST(req, {
      params: Promise.resolve({ id: tournament.id }),
    });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    const lines = csvText.trim().split("\n").filter((l) => l.trim().length > 0);
    expect(data.count).toBe(lines.length - 1);
  });

  it("sanitiza espaços extras, maiúsculas/minúsculas, sexo abreviado (M/F) e peso com vírgula no CSV", async () => {
    const tournament = await createTestTournament("Torneio CSV Sujo");
    const dirtyCsv = [
      " Nome , Sexo , Peso , Nascimento , Faixa , Escola , Kumite , Kata ",
      " Carlos Silva , M , 60,5 kg , 10/05/2000 , Preta , Dojo Alpha , Sim , Não ",
      " Marina Souza , feminino , , 15/08/2002 , ROXA , Dojo Beta , nao , SIM ",
    ].join("\n");

    const formData = new FormData();
    formData.append(
      "file",
      new File([dirtyCsv], "dirty.csv", { type: "text/csv" })
    );

    const req = new Request(
      `http://localhost:3000/api/tournaments/${tournament.id}/competitors/import`,
      { method: "POST", body: formData }
    );

    const res = await importCompetitorsPOST(req, {
      params: Promise.resolve({ id: tournament.id }),
    });
    expect(res.status).toBe(200);

    const competitors = await db.competitor.findMany({
      where: { tournamentId: tournament.id },
      orderBy: { name: "asc" },
    });

    expect(competitors).toHaveLength(2);
    expect(competitors[0].name).toBe("Carlos Silva");
    expect(competitors[0].weight).toBe(60.5);
    expect(competitors[0].kumiteCategory).toBe(
      "KUMITE MASCULINO SENIOR AVANÇADO -67kg"
    );
    expect(competitors[1].name).toBe("Marina Souza");
    expect(competitors[1].kataCategory).toBe(
      "KATA FEMININO SENIOR AVANÇADO"
    );
  });

  it("rejeita transacionalmente todo o CSV se houver uma linha com data inválida, faixa inexistente ou Kumite sem peso", async () => {
    const tournament = await createTestTournament("Torneio CSV Inválido");

    const badCsvs = [
      // Faixa inexistente na linha 3
      [
        "nome,sexo,peso,nascimento,faixa,escola,kumite,kata",
        "Atleta 1,Masculino,70 kg,10/05/2000,Preta,Dojo A,Sim,Não",
        "Atleta 2,Masculino,70 kg,10/05/2000,Transparente,Dojo B,Sim,Não",
      ].join("\n"),
      // Data inexistente 31/02 na linha 2
      [
        "nome,sexo,peso,nascimento,faixa,escola,kumite,kata",
        "Atleta 1,Masculino,70 kg,31/02/2000,Preta,Dojo A,Sim,Não",
      ].join("\n"),
      // Kumite = Sim mas sem peso
      [
        "nome,sexo,peso,nascimento,faixa,escola,kumite,kata",
        "Atleta 1,Masculino,,10/05/2000,Preta,Dojo A,Sim,Não",
      ].join("\n"),
      // Nenhuma modalidade marcada (kumite=Não e kata=Não)
      [
        "nome,sexo,peso,nascimento,faixa,escola,kumite,kata",
        "Atleta 1,Masculino,70,10/05/2000,Preta,Dojo A,Não,Não",
      ].join("\n"),
    ];

    for (const csvContent of badCsvs) {
      const formData = new FormData();
      formData.append(
        "file",
        new File([csvContent], "bad.csv", { type: "text/csv" })
      );

      const req = new Request(
        `http://localhost:3000/api/tournaments/${tournament.id}/competitors/import`,
        { method: "POST", body: formData }
      );

      const res = await importCompetitorsPOST(req, {
        params: Promise.resolve({ id: tournament.id }),
      });
      expect(res.status).toBe(400);
    }

    const count = await db.competitor.count({
      where: { tournamentId: tournament.id },
    });
    expect(count).toBe(0);
  });
});

describe("3. Simulação Exaustiva de Chaves de Ponta a Ponta (Tamanhos Críticos N=2..65)", () => {
  const criticalSizes = [2, 3, 4, 5, 6, 7, 8, 9, 11, 15, 16, 17, 23, 33, 65];

  it.each(criticalSizes)(
    "gera chave, propaga byes e conclui todas as lutas com pódio completo para N=%i competidores",
    async (numCompetitors) => {
      const tournament = await createTestTournament(`Torneio N=${numCompetitors}`);
      const category = `KATA MASCULINO SENIOR AVANÇADO (N=${numCompetitors})`;

      const competitorsData = Array.from({ length: numCompetitors }, (_, idx) => ({
        name: `Competidor ${String(idx + 1).padStart(3, "0")}`,
        gender: Gender.MALE,
        weight: 70,
        birthdate: new Date(2000, 0, 1, 12, 0, 0),
        belt: Belt.BLACK,
        school: `Escola ${(idx % 5) + 1}`,
        kata: true,
        kumite: false,
        age: 26,
        kataCategory: category,
        kumiteCategory: null,
        tournamentId: tournament.id,
      }));

      await db.competitor.createMany({ data: competitorsData });
      const competitors = await db.competitor.findMany({
        where: { tournamentId: tournament.id },
        orderBy: { id: "asc" },
      });

      const bracket = await generateBracket({
        tournamentId: tournament.id,
        category,
        modality: Modality.KATA,
        competitors,
      });
      expect(bracket).not.toBeNull();
      await propagateByeWinners(bracket!.id);

      // Verifica que nenhum match da rodada 1 nasceu "fantasma" (sem aka e sem ao)
      const round1Matches = await db.match.findMany({
        where: { bracketId: bracket!.id, round: 1 },
      });
      for (const m of round1Matches) {
        expect(Boolean(m.akaId || m.aoId)).toBe(true);
        if (m.isBye) {
          expect(m.isCompleted).toBe(true);
          expect(m.winnerId).toBeTruthy();
        }
      }

      // Joga todas as lutas pendentes até concluir a chave
      let safetyCounter = 0;
      while (safetyCounter < numCompetitors * 3) {
        safetyCounter++;
        const nextRes = await nextMatchGET(
          new Request(
            `http://localhost:3000/api/tournaments/${tournament.id}/brackets/${bracket!.id}/next-match`
          ),
          {
            params: Promise.resolve({
              id: tournament.id,
              bracketId: bracket!.id,
            }),
          }
        );

        if (nextRes.status === 404) {
          break;
        }

        expect(nextRes.status).toBe(200);
        const nextMatch = await nextRes.json();

        // Alterna vitórias entre aka, ao, hantei e walkover para exercitar todos os caminhos
        const mode = safetyCounter % 4;
        const body =
          mode === 0
            ? {
                winnerId: nextMatch.akaId,
                akaScore: 3,
                aoScore: 1,
                decisionByHantei: false,
                akaSenshu: true,
              }
            : mode === 1
              ? {
                  winnerId: nextMatch.aoId,
                  akaScore: 0,
                  aoScore: 2,
                  decisionByHantei: false,
                  aoSenshu: true,
                }
              : mode === 2
                ? {
                    winnerId: nextMatch.akaId,
                    akaScore: 2,
                    aoScore: 2,
                    decisionByHantei: true,
                  }
                : {
                    winnerId: nextMatch.aoId,
                    isWalkover: true,
                  };

        const putRes = await matchResultPUT(
          new Request(
            `http://localhost:3000/api/tournaments/${tournament.id}/brackets/${bracket!.id}/matches/${nextMatch.id}`,
            {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(body),
            }
          ),
          {
            params: Promise.resolve({
              id: tournament.id,
              bracketId: bracket!.id,
              matchId: nextMatch.id,
            }),
          }
        );

        expect(putRes.status).toBe(200);
      }

      // Verifica se a chave terminou como COMPLETED
      const updatedBracket = await db.bracket.findUnique({
        where: { id: bracket!.id },
      });
      expect(updatedBracket?.status).toBe("COMPLETED");

      // Verifica o relatório de resultados oficial
      const resultsRes = await resultsGET(
        new Request(
          `http://localhost:3000/api/tournaments/${tournament.id}/results`
        ),
        { params: Promise.resolve({ id: tournament.id }) }
      );
      expect(resultsRes.status).toBe(200);
      const results = await resultsRes.json();
      expect(results).toHaveLength(1);

      const catResult = results[0];
      expect(catResult.participantCount).toBe(numCompetitors);
      expect(catResult.roster).toHaveLength(numCompetitors);
      expect(catResult.podium.first).not.toBeNull();
      expect(catResult.podium.second).not.toBeNull();
      expect(catResult.podium.first.id).not.toBe(catResult.podium.second.id);

      if (numCompetitors >= 4) {
        expect(catResult.podium.third).not.toBeNull();
        expect(catResult.podium.fourth).not.toBeNull();
        const podiumIds = new Set([
          catResult.podium.first.id,
          catResult.podium.second.id,
          catResult.podium.third.id,
          catResult.podium.fourth.id,
        ]);
        // Os 4 lugares do pódio DEVEM ser 4 atletas diferentes!
        expect(podiumIds.size).toBe(4);
      }
    }
  );
});

describe("4. Anti-Colisão de Mesma Academia na 1ª Rodada", () => {
  it("evita que atletas da mesma escola se enfrentem logo na 1ª rodada quando há outras escolas", async () => {
    const tournament = await createTestTournament("Torneio Anti-Colisão");
    const category = "KATA MASCULINO SENIOR AVANÇADO";

    // Cadastra 2 da Escola A seguidos, 2 da Escola B seguidos, 2 da Escola C seguidos
    const schools = [
      "Dojo Samurai",
      "Dojo Samurai",
      "Dojo Bushido",
      "Dojo Bushido",
      "Dojo Shotokan",
      "Dojo Shotokan",
    ];

    for (let i = 0; i < schools.length; i++) {
      await db.competitor.create({
        data: {
          name: `Atleta ${i + 1}`,
          gender: Gender.MALE,
          weight: 70,
          birthdate: new Date(2000, 0, 1, 12, 0, 0),
          belt: Belt.BLACK,
          school: schools[i],
          kata: true,
          kumite: false,
          age: 26,
          kataCategory: category,
          kumiteCategory: null,
          tournamentId: tournament.id,
        },
      });
    }

    const competitors = await db.competitor.findMany({
      where: { tournamentId: tournament.id },
      orderBy: { id: "asc" },
    });

    const bracket = await generateBracket({
      tournamentId: tournament.id,
      category,
      modality: Modality.KATA,
      competitors,
    });

    const round1Matches = await db.match.findMany({
      where: { bracketId: bracket!.id, round: 1, isBye: false },
    });

    const compById = new Map(competitors.map((c) => [c.id, c]));
    for (const m of round1Matches) {
      const aka = compById.get(m.akaId!);
      const ao = compById.get(m.aoId!);
      expect(aka?.school).not.toBe(ao?.school);
    }
  });
});

describe("5. Caos na Arbitragem: Concorrência, Semifinais Invertidas e Reabertura de Luta", () => {
  it("impede condição de corrida (duplo envio simultâneo) e preserva a integridade do 3º lugar e da reabertura", async () => {
    const tournament = await createTestTournament("Torneio Arbitragem Caos");
    const category = "KUMITE MASCULINO SENIOR AVANÇADO -75kg";

    for (let i = 0; i < 4; i++) {
      await db.competitor.create({
        data: {
          name: `Lutador ${i + 1}`,
          gender: Gender.MALE,
          weight: 72,
          birthdate: new Date(2000, 0, 1, 12, 0, 0),
          belt: Belt.BLACK,
          school: `Escola ${i + 1}`,
          kata: false,
          kumite: true,
          age: 26,
          kataCategory: null,
          kumiteCategory: category,
          tournamentId: tournament.id,
        },
      });
    }

    const genRes = await bracketsPOST(
      new Request(
        `http://localhost:3000/api/tournaments/${tournament.id}/brackets`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ category, modality: "KUMITE" }),
        }
      ),
      { params: Promise.resolve({ id: tournament.id }) }
    );
    expect(genRes.status).toBe(200);
    const bracket = await genRes.json();

    const matches = await db.match.findMany({
      where: { bracketId: bracket.id },
      orderBy: [{ round: "asc" }, { position: "asc" }],
    });

    const semi0 = matches.find((m) => m.round === 1 && m.position === 0)!;
    const semi1 = matches.find((m) => m.round === 1 && m.position === 1)!;

    // 1. Validações de erro: empate sem Hantei, vencedor errado, placar negativo
    const invalidTieRes = await matchResultPUT(
      new Request("http://localhost:3000/api/match", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          winnerId: semi0.akaId,
          akaScore: 2,
          aoScore: 2,
          decisionByHantei: false,
        }),
      }),
      {
        params: Promise.resolve({
          id: tournament.id,
          bracketId: bracket.id,
          matchId: semi0.id,
        }),
      }
    );
    expect(invalidTieRes.status).toBe(400);

    const wrongWinnerRes = await matchResultPUT(
      new Request("http://localhost:3000/api/match", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          winnerId: semi0.aoId,
          akaScore: 5,
          aoScore: 1,
          decisionByHantei: false,
        }),
      }),
      {
        params: Promise.resolve({
          id: tournament.id,
          bracketId: bracket.id,
          matchId: semi0.id,
        }),
      }
    );
    expect(wrongWinnerRes.status).toBe(400);

    // 2. Duplo envio simultâneo (Promise.all) na Semifinal 1 (position 1 antes da position 0!)
    const [resA, resB] = await Promise.all([
      matchResultPUT(
        new Request("http://localhost:3000/api/match", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            winnerId: semi1.akaId,
            akaScore: 3,
            aoScore: 0,
            decisionByHantei: false,
          }),
        }),
        {
          params: Promise.resolve({
            id: tournament.id,
            bracketId: bracket.id,
            matchId: semi1.id,
          }),
        }
      ),
      matchResultPUT(
        new Request("http://localhost:3000/api/match", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            winnerId: semi1.aoId,
            akaScore: 0,
            aoScore: 4,
            decisionByHantei: false,
          }),
        }),
        {
          params: Promise.resolve({
            id: tournament.id,
            bracketId: bracket.id,
            matchId: semi1.id,
          }),
        }
      ),
    ]);

    const statuses = [resA.status, resB.status].sort();
    // Uma deve ter sucesso (200) e a outra deve ser bloqueada (400 ou 409)
    expect(statuses[0]).toBe(200);
    expect([400, 409]).toContain(statuses[1]);

    // Verifica que na disputa de 3º lugar, apenas o aoId (position 1) foi preenchido,
    // e akaId continua null esperando a Semifinal 0!
    const thirdPlaceAfterSemi1 = await db.match.findFirst({
      where: { bracketId: bracket.id, isThirdPlace: true },
    });
    expect(thirdPlaceAfterSemi1?.akaId).toBeNull();
    expect(thirdPlaceAfterSemi1?.aoId).not.toBeNull();

    // 3. Agora finaliza a Semifinal 0
    const semi0Res = await matchResultPUT(
      new Request("http://localhost:3000/api/match", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          winnerId: semi0.akaId,
          akaScore: 2,
          aoScore: 1,
          decisionByHantei: false,
        }),
      }),
      {
        params: Promise.resolve({
          id: tournament.id,
          bracketId: bracket.id,
          matchId: semi0.id,
        }),
      }
    );
    expect(semi0Res.status).toBe(200);

    const thirdPlaceReady = await db.match.findFirst({
      where: { bracketId: bracket.id, isThirdPlace: true },
    });
    expect(thirdPlaceReady?.akaId).toBe(semi0.aoId);
    expect(thirdPlaceReady?.aoId).not.toBe(thirdPlaceReady?.akaId);

    // 4. Reabre a Semifinal 0 para corrigir resultado (invertendo vencedor para semi0.aoId)
    const reopenSemi0 = await matchReopenPATCH(
      new Request("http://localhost:3000/api/match", { method: "PATCH" }),
      {
        params: Promise.resolve({
          id: tournament.id,
          bracketId: bracket.id,
          matchId: semi0.id,
        }),
      }
    );
    expect(reopenSemi0.status).toBe(200);

    const finalAfterReopen = await db.match.findFirst({
      where: { bracketId: bracket.id, round: 2, isThirdPlace: false },
    });
    const thirdAfterReopen = await db.match.findFirst({
      where: { bracketId: bracket.id, isThirdPlace: true },
    });
    expect(finalAfterReopen?.akaId).toBeNull();
    expect(thirdAfterReopen?.akaId).toBeNull();

    // Re-arbitra Semifinal 0 com o vencedor corrigido (semi0.aoId)
    const fixedSemi0Res = await matchResultPUT(
      new Request("http://localhost:3000/api/match", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          winnerId: semi0.aoId,
          akaScore: 1,
          aoScore: 4,
          decisionByHantei: false,
        }),
      }),
      {
        params: Promise.resolve({
          id: tournament.id,
          bracketId: bracket.id,
          matchId: semi0.id,
        }),
      }
    );
    expect(fixedSemi0Res.status).toBe(200);

    const finalAfterFix = await db.match.findFirst({
      where: { bracketId: bracket.id, round: 2, isThirdPlace: false },
    });
    const thirdAfterFix = await db.match.findFirst({
      where: { bracketId: bracket.id, isThirdPlace: true },
    });
    expect(finalAfterFix?.akaId).toBe(semi0.aoId);
    expect(thirdAfterFix?.akaId).toBe(semi0.akaId);
  });
});

describe("6. Conflito de Múltiplos Dispositivos (RefereeLock) e Proteção do Telão (LiveMatch)", () => {
  it("impede que um 2º dispositivo bloqueado apague ou zere o LiveMatch do árbitro titular", async () => {
    const tournament = await createTestTournament("Torneio Multi-Árbitro");
    const bracket = await db.bracket.create({
      data: {
        tournamentId: tournament.id,
        category: "KUMITE MASCULINO SENIOR AVANÇADO -75kg",
        modality: Modality.KUMITE,
        totalSlots: 2,
        totalRounds: 1,
        status: "IN_PROGRESS",
      },
    });
    const match = await db.match.create({
      data: {
        bracketId: bracket.id,
        round: 1,
        position: 0,
        akaId: "comp_1",
        aoId: "comp_2",
      },
    });

    // 1. Dispositivo A (Notebook da mesa) adquire o lock
    const lockARes = await refereeLockPOST(
      new Request("http://localhost:3000/api/lock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "acquire",
          clientId: "notebook_mesa_A",
          deviceInfo: "Computador (Chrome)",
          matchId: match.id,
        }),
      }),
      {
        params: Promise.resolve({
          id: tournament.id,
          bracketId: bracket.id,
        }),
      }
    );
    expect(lockARes.status).toBe(200);

    // 2. Dispositivo A transmite placar 5 x 3 para o telão
    const liveARes = await liveMatchPOST(
      new Request("http://localhost:3000/api/live-match", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tournamentId: tournament.id,
          bracketId: bracket.id,
          matchId: match.id,
          clientId: "notebook_mesa_A",
          akaId: "comp_1",
          akaName: "Atleta Vermelho",
          akaSchool: "Dojo A",
          aoId: "comp_2",
          aoName: "Atleta Azul",
          aoSchool: "Dojo B",
          category: bracket.category,
          modality: "KUMITE",
          round: 1,
          position: 0,
          totalRounds: 1,
          akaScore: 5,
          aoScore: 3,
          akaChui: 1,
          aoChui: 0,
          akaSenshu: true,
          aoSenshu: false,
          timeRemaining: 75,
          timerRunning: true,
          timerEndAt: Date.now() + 75000,
        }),
      })
    );
    expect(liveARes.status).toBe(200);

    // 3. Dispositivo B (Celular) tenta adquirir o lock e recebe 423 Locked
    const lockBRes = await refereeLockPOST(
      new Request("http://localhost:3000/api/lock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "acquire",
          clientId: "celular_arbitro_B",
          deviceInfo: "Smartphone (Safari)",
          matchId: match.id,
        }),
      }),
      {
        params: Promise.resolve({
          id: tournament.id,
          bracketId: bracket.id,
        }),
      }
    );
    expect(lockBRes.status).toBe(423);

    // 4. Dispositivo B tenta sobrescrever o LiveMatch ou deletá-lo ao sair da página
    const overwriteAttempt = await liveMatchPOST(
      new Request("http://localhost:3000/api/live-match", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tournamentId: tournament.id,
          bracketId: bracket.id,
          matchId: match.id,
          clientId: "celular_arbitro_B",
          akaId: "comp_1",
          akaName: "Atleta Vermelho",
          akaSchool: "Dojo A",
          aoId: "comp_2",
          aoName: "Atleta Azul",
          aoSchool: "Dojo B",
          category: bracket.category,
          modality: "KUMITE",
          round: 1,
          position: 0,
          totalRounds: 1,
          akaScore: 0,
          aoScore: 0,
          akaChui: 0,
          aoChui: 0,
          akaSenshu: false,
          aoSenshu: false,
          timeRemaining: -1,
          timerRunning: false,
        }),
      })
    );
    expect(overwriteAttempt.status).toBe(423);

    const deleteAttempt = await liveMatchDELETE(
      new Request(
        `http://localhost:3000/api/live-match?tournamentId=${tournament.id}&bracketId=${bracket.id}&matchId=${match.id}&clientId=celular_arbitro_B`,
        { method: "DELETE" }
      )
    );
    expect(deleteAttempt.status).toBe(204);

    // O placar de 5 x 3 do Dispositivo A continua INTACTO no telão!
    const currentLiveRes = await liveMatchGET(
      new Request(
        `http://localhost:3000/api/live-match?tournamentId=${tournament.id}`
      )
    );
    const currentLive = await currentLiveRes.json();
    expect(currentLive).not.toBeNull();
    expect(currentLive.akaScore).toBe(5);
    expect(currentLive.aoScore).toBe(3);

    // 5. Se o Dispositivo B assumir forçadamente (force: true), o Dispositivo A perde o lock no próximo heartbeat (409)
    const forceRes = await refereeLockPOST(
      new Request("http://localhost:3000/api/lock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "acquire",
          clientId: "celular_arbitro_B",
          deviceInfo: "Smartphone (Safari)",
          matchId: match.id,
          force: true,
        }),
      }),
      {
        params: Promise.resolve({
          id: tournament.id,
          bracketId: bracket.id,
        }),
      }
    );
    expect(forceRes.status).toBe(200);

    const heartbeatARes = await refereeLockPOST(
      new Request("http://localhost:3000/api/lock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "heartbeat",
          clientId: "notebook_mesa_A",
        }),
      }),
      {
        params: Promise.resolve({
          id: tournament.id,
          bracketId: bracket.id,
        }),
      }
    );
    expect(heartbeatARes.status).toBe(409);
  });
});

describe("7. Integridade de Competidor em Múltiplas Chaves (Kata + Kumite) e Backup", () => {
  it("protege chaves em andamento quando um atleta está em Kata (NOT_STARTED) e Kumite (IN_PROGRESS)", async () => {
    const tournament = await createTestTournament("Torneio Multi-Modalidade");

    // Cria 2 atletas inscritos em Kata e Kumite
    const compIds: string[] = [];
    for (let i = 0; i < 2; i++) {
      const res = await createCompetitorPOST(
        new Request(
          `http://localhost:3000/api/tournaments/${tournament.id}/competitors`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              name: `Atleta Completo ${i + 1}`,
              gender: Gender.MALE,
              weight: 72,
              birthdate: "2000-05-10",
              belt: Belt.BLACK,
              school: `Dojo ${i + 1}`,
              kata: true,
              kumite: true,
            }),
          }
        ),
        { params: Promise.resolve({ id: tournament.id }) }
      );
      expect(res.status).toBe(200);
      const created = await res.json();
      compIds.push(created.id);
    }

    // Gera todas as chaves (1 de Kata e 1 de Kumite)
    const genAllRes = await bracketsPOST(
      new Request(
        `http://localhost:3000/api/tournaments/${tournament.id}/brackets`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ generateAll: true }),
        }
      ),
      { params: Promise.resolve({ id: tournament.id }) }
    );
    expect(genAllRes.status).toBe(200);

    // Coloca APENAS a chave de Kumite em IN_PROGRESS (Kata continua NOT_STARTED)
    const kumiteBracket = await db.bracket.findFirst({
      where: { tournamentId: tournament.id, modality: Modality.KUMITE },
    });
    const kataBracket = await db.bracket.findFirst({
      where: { tournamentId: tournament.id, modality: Modality.KATA },
    });
    expect(kumiteBracket).not.toBeNull();
    expect(kataBracket).not.toBeNull();

    await db.bracket.update({
      where: { id: kumiteBracket!.id },
      data: { status: "IN_PROGRESS" },
    });

    // Tenta excluir o competidor: DEVE falhar com 400 E NÃO pode ter deletado a chave de Kata!
    const deleteRes = await deleteCompetitorDELETE(
      new Request("http://localhost:3000/api/competitor", { method: "DELETE" }),
      {
        params: Promise.resolve({
          id: tournament.id,
          competitorId: compIds[0],
        }),
      }
    );
    expect(deleteRes.status).toBe(400);

    const kataBracketStillExists = await db.bracket.findUnique({
      where: { id: kataBracket!.id },
    });
    expect(kataBracketStillExists).not.toBeNull();

    // Tenta alterar o peso do competidor para 90kg (mudaria a categoria de Kumite que já está IN_PROGRESS): DEVE bloquear!
    const editKumiteRes = await updateCompetitorPUT(
      new Request("http://localhost:3000/api/competitor", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Atleta Completo 1",
          gender: Gender.MALE,
          weight: 90,
          birthdate: "2000-05-10",
          belt: Belt.BLACK,
          school: "Dojo 1",
          kata: true,
          kumite: true,
        }),
      }),
      {
        params: Promise.resolve({
          id: tournament.id,
          competitorId: compIds[0],
        }),
      }
    );
    expect(editKumiteRes.status).toBe(400);

    // Testa exportação de Backup do torneio
    const backupRes = await backupGET(
      new Request(
        `http://localhost:3000/api/tournaments/${tournament.id}/backup`
      ),
      { params: Promise.resolve({ id: tournament.id }) }
    );
    expect(backupRes.status).toBe(200);
    const backupJson = await backupRes.json();
    expect(backupJson.tournament.id).toBe(tournament.id);
    expect(backupJson.stats.competitorsCount).toBe(2);
    expect(backupJson.stats.bracketsCount).toBe(2);
  });
});
