import { PrismaClient, Belt, Gender, Modality, BracketStatus } from "@prisma/client";

const prisma = new PrismaClient();

// ---------------------------------------------------------------------------
// Regras de classificação (espelham src/lib/utils/classification.ts)
// ---------------------------------------------------------------------------

function calculateAge(birthdate, referenceDate = new Date()) {
  let age = referenceDate.getFullYear() - birthdate.getFullYear();
  const m = referenceDate.getMonth() - birthdate.getMonth();
  if (m < 0 || (m === 0 && referenceDate.getDate() < birthdate.getDate())) {
    age--;
  }
  return age;
}

function getBeltLevel(belt) {
  switch (belt) {
    case Belt.WHITE:
    case Belt.BLUE:
    case Belt.YELLOW:
      return "INICIANTE";
    case Belt.RED:
    case Belt.ORANGE:
    case Belt.GREEN:
      return "INTERMEDIÁRIO";
    case Belt.PURPLE:
    case Belt.BROWN:
    case Belt.BLACK:
      return "AVANÇADO";
  }
}

function getAgeCategory(age) {
  if (age >= 21) return "SENIOR";
  if (age >= 18) return "SUB21";
  if (age >= 16) return "JUNIOR";
  if (age >= 14) return "CADETE";
  if (age >= 12) return "SUB14";
  if (age >= 10) return "10-11 ANOS";
  if (age >= 8) return "8-9 ANOS";
  if (age >= 6) return "6-7 ANOS";
  return "ATÉ 5 ANOS";
}

function getWeightCategory(ageCategory, gender, weight) {
  if (["10-11 ANOS", "8-9 ANOS", "6-7 ANOS", "ATÉ 5 ANOS"].includes(ageCategory)) {
    return "";
  }
  if (gender === Gender.MALE) {
    switch (ageCategory) {
      case "SENIOR":
      case "SUB21":
        if (weight <= 60) return "-60kg";
        if (weight <= 67) return "-67kg";
        if (weight <= 75) return "-75kg";
        if (weight <= 84) return "-84kg";
        return "+84kg";
      case "JUNIOR":
        if (weight <= 55) return "-55kg";
        if (weight <= 61) return "-61kg";
        if (weight <= 68) return "-68kg";
        if (weight <= 76) return "-76kg";
        return "+76kg";
      case "CADETE":
        if (weight <= 52) return "-52kg";
        if (weight <= 57) return "-57kg";
        if (weight <= 63) return "-63kg";
        if (weight <= 70) return "-70kg";
        return "+70kg";
      case "SUB14":
        if (weight <= 40) return "-40kg";
        if (weight <= 45) return "-45kg";
        if (weight <= 50) return "-50kg";
        if (weight <= 55) return "-55kg";
        return "+55kg";
    }
  } else {
    switch (ageCategory) {
      case "SENIOR":
      case "SUB21":
        if (weight <= 50) return "-50kg";
        if (weight <= 55) return "-55kg";
        if (weight <= 61) return "-61kg";
        if (weight <= 68) return "-68kg";
        return "+68kg";
      case "JUNIOR":
        if (weight <= 48) return "-48kg";
        if (weight <= 53) return "-53kg";
        if (weight <= 59) return "-59kg";
        if (weight <= 66) return "-66kg";
        return "+66kg";
      case "CADETE":
        if (weight <= 47) return "-47kg";
        if (weight <= 54) return "-54kg";
        if (weight <= 61) return "-61kg";
        return "+61kg";
      case "SUB14":
        if (weight <= 42) return "-42kg";
        if (weight <= 47) return "-47kg";
        if (weight <= 52) return "-52kg";
        return "+52kg";
    }
  }
  return "";
}

function deriveCategories(c) {
  const age = calculateAge(c.birthdate);
  const ageCat = getAgeCategory(age);
  const beltLvl = getBeltLevel(c.belt);
  const genderLabel = c.gender === Gender.MALE ? "MASCULINO" : "FEMININO";
  const kataCategory = c.kata
    ? `KATA ${genderLabel} ${ageCat} ${beltLvl}`
    : null;
  const weightCat = c.weight ? getWeightCategory(ageCat, c.gender, c.weight) : "";
  const kumiteCategory = c.kumite
    ? `KUMITE ${genderLabel} ${ageCat} ${beltLvl} ${weightCat}`.trim()
    : null;
  return { age, kataCategory, kumiteCategory };
}

function birthdateForAge(yearsOld, month = 4, day = 15) {
  const now = new Date();
  return new Date(now.getFullYear() - yearsOld, month - 1, day, 12, 0, 0, 0);
}

// ---------------------------------------------------------------------------
// Dados 100% fictícios
// ---------------------------------------------------------------------------

const SCHOOLS = [
  "Dojo Dragão Dourado",
  "Academia Sol Nascente",
  "Karatê Bushido",
  "Instituto Tigre Branco",
  "Dojo Ippon",
  "Associação Shorin-Ryu",
];

function buildMainCompetitors() {
  return [
    // Grupo A: Masculino Senior Avançado -75kg (8 atletas) — Kumite (COMPLETED) + Kata (NOT_STARTED)
    { name: "Kenji Takahashi", gender: Gender.MALE, weight: 73.5, birthdate: birthdateForAge(25, 2, 10), belt: Belt.BLACK, school: SCHOOLS[0], kata: true, kumite: true },
    { name: "Lucas Mendes", gender: Gender.MALE, weight: 71.0, birthdate: birthdateForAge(23, 5, 18), belt: Belt.BLACK, school: SCHOOLS[1], kata: true, kumite: true },
    { name: "Rafael Nogueira", gender: Gender.MALE, weight: 74.2, birthdate: birthdateForAge(27, 8, 4), belt: Belt.BROWN, school: SCHOOLS[2], kata: true, kumite: true },
    { name: "Matheus Azevedo", gender: Gender.MALE, weight: 69.8, birthdate: birthdateForAge(22, 1, 22), belt: Belt.BLACK, school: SCHOOLS[3], kata: true, kumite: true },
    { name: "Thiago Siqueira", gender: Gender.MALE, weight: 72.4, birthdate: birthdateForAge(26, 3, 12), belt: Belt.BROWN, school: SCHOOLS[4], kata: true, kumite: true },
    { name: "Bruno Yamazaki", gender: Gender.MALE, weight: 74.9, birthdate: birthdateForAge(24, 6, 30), belt: Belt.BLACK, school: SCHOOLS[5], kata: true, kumite: true },
    { name: "Gabriel Duarte", gender: Gender.MALE, weight: 70.5, birthdate: birthdateForAge(28, 9, 14), belt: Belt.PURPLE, school: SCHOOLS[0], kata: true, kumite: true },
    { name: "Diego Carvalho", gender: Gender.MALE, weight: 73.0, birthdate: birthdateForAge(25, 11, 3), belt: Belt.BROWN, school: SCHOOLS[1], kata: true, kumite: true },

    // Grupo B: Masculino Senior Avançado -84kg (6 atletas) — Kumite (IN_PROGRESS com Final AO VIVO + byes)
    { name: "Renato Fujimoto", gender: Gender.MALE, weight: 81.5, birthdate: birthdateForAge(26, 4, 11), belt: Belt.BLACK, school: SCHOOLS[0], kata: false, kumite: true },
    { name: "Henrique Bastos", gender: Gender.MALE, weight: 79.2, birthdate: birthdateForAge(24, 7, 19), belt: Belt.BLACK, school: SCHOOLS[2], kata: false, kumite: true },
    { name: "Caio Peixoto", gender: Gender.MALE, weight: 82.8, birthdate: birthdateForAge(29, 2, 27), belt: Belt.BROWN, school: SCHOOLS[3], kata: false, kumite: true },
    { name: "Rodrigo Santana", gender: Gender.MALE, weight: 78.4, birthdate: birthdateForAge(23, 10, 5), belt: Belt.BLACK, school: SCHOOLS[4], kata: false, kumite: true },
    { name: "Eduardo Sato", gender: Gender.MALE, weight: 83.1, birthdate: birthdateForAge(27, 1, 16), belt: Belt.BLACK, school: SCHOOLS[5], kata: false, kumite: true },
    { name: "Felipe Vasconcelos", gender: Gender.MALE, weight: 80.0, birthdate: birthdateForAge(25, 6, 8), belt: Belt.PURPLE, school: SCHOOLS[1], kata: false, kumite: true },

    // Grupo C: Feminino Senior Avançado -61kg (6 atletas) — Kumite (COMPLETED) + Kata (IN_PROGRESS)
    { name: "Aiko Nakamura", gender: Gender.FEMALE, weight: 58.0, birthdate: birthdateForAge(24, 3, 21), belt: Belt.BLACK, school: SCHOOLS[1], kata: true, kumite: true },
    { name: "Camila Ferraz", gender: Gender.FEMALE, weight: 59.5, birthdate: birthdateForAge(22, 8, 9), belt: Belt.BLACK, school: SCHOOLS[0], kata: true, kumite: true },
    { name: "Beatriz Alencar", gender: Gender.FEMALE, weight: 56.8, birthdate: birthdateForAge(26, 5, 14), belt: Belt.BROWN, school: SCHOOLS[2], kata: true, kumite: true },
    { name: "Juliana Tavares", gender: Gender.FEMALE, weight: 60.2, birthdate: birthdateForAge(25, 11, 28), belt: Belt.BLACK, school: SCHOOLS[3], kata: true, kumite: true },
    { name: "Mariana Kobayashi", gender: Gender.FEMALE, weight: 57.4, birthdate: birthdateForAge(23, 1, 7), belt: Belt.BROWN, school: SCHOOLS[4], kata: true, kumite: true },
    { name: "Larissa Monteiro", gender: Gender.FEMALE, weight: 58.9, birthdate: birthdateForAge(27, 4, 19), belt: Belt.PURPLE, school: SCHOOLS[5], kata: true, kumite: true },

    // Grupo D: Feminino Cadete Intermediário (4 atletas) — Kata (COMPLETED)
    { name: "Sofia Caldeira", gender: Gender.FEMALE, weight: 51.0, birthdate: birthdateForAge(15, 2, 12), belt: Belt.GREEN, school: SCHOOLS[0], kata: true, kumite: false },
    { name: "Helena Pires", gender: Gender.FEMALE, weight: 49.5, birthdate: birthdateForAge(14, 6, 23), belt: Belt.ORANGE, school: SCHOOLS[2], kata: true, kumite: false },
    { name: "Clara Matsuda", gender: Gender.FEMALE, weight: 52.0, birthdate: birthdateForAge(15, 9, 3), belt: Belt.GREEN, school: SCHOOLS[4], kata: true, kumite: false },
    { name: "Laura Benevides", gender: Gender.FEMALE, weight: 48.0, birthdate: birthdateForAge(14, 4, 17), belt: Belt.RED, school: SCHOOLS[5], kata: true, kumite: false },

    // Grupo E: Masculino Junior Avançado -68kg (6 atletas) — Kumite (IN_PROGRESS)
    { name: "Pedro Henrique Moura", gender: Gender.MALE, weight: 64.5, birthdate: birthdateForAge(17, 3, 9), belt: Belt.BROWN, school: SCHOOLS[0], kata: false, kumite: true },
    { name: "Vinicius Prado", gender: Gender.MALE, weight: 66.0, birthdate: birthdateForAge(16, 7, 15), belt: Belt.PURPLE, school: SCHOOLS[1], kata: false, kumite: true },
    { name: "Daniel Watanabe", gender: Gender.MALE, weight: 63.2, birthdate: birthdateForAge(17, 1, 25), belt: Belt.BLACK, school: SCHOOLS[3], kata: false, kumite: true },
    { name: "Guilherme Rangel", gender: Gender.MALE, weight: 67.1, birthdate: birthdateForAge(16, 5, 11), belt: Belt.BROWN, school: SCHOOLS[4], kata: false, kumite: true },
    { name: "Igor Cavalcanti", gender: Gender.MALE, weight: 65.4, birthdate: birthdateForAge(17, 10, 2), belt: Belt.PURPLE, school: SCHOOLS[2], kata: false, kumite: true },
    { name: "Arthur Neves", gender: Gender.MALE, weight: 62.8, birthdate: birthdateForAge(16, 8, 29), belt: Belt.BROWN, school: SCHOOLS[5], kata: false, kumite: true },

    // Grupo F: Infantil 10-11 Anos Iniciante Masculino (6 atletas) — Kata (NOT_STARTED)
    { name: "Enzo Silveira", gender: Gender.MALE, weight: 36.0, birthdate: birthdateForAge(11, 2, 8), belt: Belt.YELLOW, school: SCHOOLS[0], kata: true, kumite: true },
    { name: "Miguel Barreto", gender: Gender.MALE, weight: 38.5, birthdate: birthdateForAge(10, 5, 14), belt: Belt.BLUE, school: SCHOOLS[1], kata: true, kumite: true },
    { name: "Davi Lacerda", gender: Gender.MALE, weight: 35.0, birthdate: birthdateForAge(11, 7, 20), belt: Belt.WHITE, school: SCHOOLS[2], kata: true, kumite: true },
    { name: "Bernardo Farias", gender: Gender.MALE, weight: 39.0, birthdate: birthdateForAge(10, 9, 11), belt: Belt.YELLOW, school: SCHOOLS[3], kata: true, kumite: true },
    { name: "Heitor Sampaio", gender: Gender.MALE, weight: 37.2, birthdate: birthdateForAge(11, 3, 27), belt: Belt.BLUE, school: SCHOOLS[4], kata: true, kumite: true },
    { name: "Samuel Brito", gender: Gender.MALE, weight: 34.8, birthdate: birthdateForAge(10, 11, 6), belt: Belt.YELLOW, school: SCHOOLS[5], kata: true, kumite: true },
  ];
}

function buildSecondaryCompetitors() {
  return [
    { name: "André Viana", gender: Gender.MALE, weight: 71.0, birthdate: birthdateForAge(24, 3, 12), belt: Belt.BLACK, school: SCHOOLS[0], kata: true, kumite: true },
    { name: "Gustavo Paiva", gender: Gender.MALE, weight: 74.0, birthdate: birthdateForAge(26, 6, 4), belt: Belt.BROWN, school: SCHOOLS[1], kata: true, kumite: true },
    { name: "Marcelo Cunha", gender: Gender.MALE, weight: 72.5, birthdate: birthdateForAge(23, 9, 19), belt: Belt.BLACK, school: SCHOOLS[2], kata: true, kumite: true },
    { name: "Victor Rezende", gender: Gender.MALE, weight: 70.0, birthdate: birthdateForAge(25, 1, 28), belt: Belt.PURPLE, school: SCHOOLS[3], kata: true, kumite: true },
    { name: "Isabela Rocha", gender: Gender.FEMALE, weight: 57.0, birthdate: birthdateForAge(22, 4, 15), belt: Belt.BLACK, school: SCHOOLS[4], kata: true, kumite: false },
    { name: "Fernanda Lopes", gender: Gender.FEMALE, weight: 59.0, birthdate: birthdateForAge(25, 8, 22), belt: Belt.BROWN, school: SCHOOLS[5], kata: true, kumite: false },
  ];
}

// ---------------------------------------------------------------------------
// Helpers para criar chaves e lutas consistentes
// ---------------------------------------------------------------------------

async function createBracketWithMatches({
  tournamentId,
  category,
  modality,
  totalSlots,
  totalRounds,
  status,
  matches,
}) {
  const bracket = await prisma.bracket.create({
    data: {
      tournamentId,
      category,
      modality,
      totalSlots,
      totalRounds,
      status,
    },
  });

  const createdMatches = [];
  for (const m of matches) {
    const created = await prisma.match.create({
      data: {
        bracketId: bracket.id,
        round: m.round,
        position: m.position,
        akaId: m.akaId ?? null,
        aoId: m.aoId ?? null,
        winnerId: m.winnerId ?? null,
        akaScore: m.akaScore ?? 0,
        aoScore: m.aoScore ?? 0,
        decisionByHantei: m.decisionByHantei ?? false,
        akaSenshu: m.akaSenshu ?? false,
        aoSenshu: m.aoSenshu ?? false,
        isBye: m.isBye ?? false,
        isWalkover: m.isWalkover ?? false,
        isThirdPlace: m.isThirdPlace ?? false,
        isCompleted: m.isCompleted ?? false,
        completedAt: m.isCompleted ? new Date() : null,
      },
    });
    createdMatches.push(created);
  }

  return { bracket, matches: createdMatches };
}

async function seed() {
  console.log("Limpando banco de dados...");
  await prisma.refereeLock.deleteMany();
  await prisma.liveMatch.deleteMany();
  await prisma.match.deleteMany();
  await prisma.bracket.deleteMany();
  await prisma.competitor.deleteMany();
  await prisma.tournament.deleteMany();

  // 1. Torneio principal
  const mainTournament = await prisma.tournament.create({
    data: {
      name: "Copa Faixa Preta 2026 — Etapa Estadual",
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3),
    },
  });

  const mainCompetitorData = buildMainCompetitors();
  const createdMain = [];
  for (const c of mainCompetitorData) {
    const derived = deriveCategories(c);
    const comp = await prisma.competitor.create({
      data: {
        ...c,
        ...derived,
        tournamentId: mainTournament.id,
      },
    });
    createdMain.push(comp);
  }

  const byGroup = {
    A: createdMain.slice(0, 8),   // Kumite Masc Senior Avançado -75kg & Kata Masc Senior Avançado
    B: createdMain.slice(8, 14),  // Kumite Masc Senior Avançado -84kg (6 atletas)
    C: createdMain.slice(14, 20), // Kumite Fem Senior Avançado -61kg & Kata Fem Senior Avançado (6 atletas)
    D: createdMain.slice(20, 24), // Kata Fem Cadete Intermediário (4 atletas)
    E: createdMain.slice(24, 30), // Kumite Masc Junior Avançado -68kg (6 atletas)
    F: createdMain.slice(30, 36), // Kata Masc 10-11 Anos Iniciante (6 atletas)
  };

  // --- Chave 1: KUMITE MASCULINO SENIOR AVANÇADO -75kg (8 atletas, COMPLETED) ---
  const A = byGroup.A;
  await createBracketWithMatches({
    tournamentId: mainTournament.id,
    category: A[0].kumiteCategory,
    modality: Modality.KUMITE,
    totalSlots: 8,
    totalRounds: 3,
    status: BracketStatus.COMPLETED,
    matches: [
      // Round 1 (Quartas)
      { round: 1, position: 0, akaId: A[0].id, aoId: A[1].id, winnerId: A[0].id, akaScore: 6, aoScore: 2, akaSenshu: true, isCompleted: true },
      { round: 1, position: 1, akaId: A[2].id, aoId: A[3].id, winnerId: A[3].id, akaScore: 3, aoScore: 3, decisionByHantei: true, isCompleted: true },
      { round: 1, position: 2, akaId: A[4].id, aoId: A[5].id, winnerId: A[5].id, akaScore: 1, aoScore: 5, aoSenshu: true, isCompleted: true },
      { round: 1, position: 3, akaId: A[6].id, aoId: A[7].id, winnerId: A[6].id, akaScore: 0, aoScore: 0, isWalkover: true, isCompleted: true },
      // Round 2 (Semifinais)
      { round: 2, position: 0, akaId: A[0].id, aoId: A[3].id, winnerId: A[0].id, akaScore: 5, aoScore: 4, akaSenshu: true, isCompleted: true },
      { round: 2, position: 1, akaId: A[5].id, aoId: A[6].id, winnerId: A[5].id, akaScore: 7, aoScore: 2, isCompleted: true },
      // Round 3 (Final)
      { round: 3, position: 0, akaId: A[0].id, aoId: A[5].id, winnerId: A[0].id, akaScore: 8, aoScore: 5, akaSenshu: true, isCompleted: true },
      // 3º Lugar
      { round: 3, position: 1, akaId: A[3].id, aoId: A[6].id, winnerId: A[3].id, akaScore: 4, aoScore: 1, isThirdPlace: true, isCompleted: true },
    ],
  });

  // --- Chave 2: KUMITE MASCULINO SENIOR AVANÇADO -84kg (6 atletas, IN_PROGRESS — Final AO VIVO) ---
  const B = byGroup.B;
  const liveBracketResult = await createBracketWithMatches({
    tournamentId: mainTournament.id,
    category: B[0].kumiteCategory,
    modality: Modality.KUMITE,
    totalSlots: 8,
    totalRounds: 3,
    status: BracketStatus.IN_PROGRESS,
    matches: [
      // Round 1 (posições 0 e 3 são byes, 1 e 2 são lutas reais — segue padrão seeded)
      { round: 1, position: 0, akaId: B[4].id, aoId: null, winnerId: B[4].id, isBye: true, isCompleted: true },
      { round: 1, position: 1, akaId: B[0].id, aoId: B[1].id, winnerId: B[0].id, akaScore: 5, aoScore: 2, akaSenshu: true, isCompleted: true },
      { round: 1, position: 2, akaId: B[2].id, aoId: B[3].id, winnerId: B[3].id, akaScore: 2, aoScore: 6, aoSenshu: true, isCompleted: true },
      { round: 1, position: 3, akaId: B[5].id, aoId: null, winnerId: B[5].id, isBye: true, isCompleted: true },
      // Round 2 (Semifinais concluídas)
      { round: 2, position: 0, akaId: B[4].id, aoId: B[0].id, winnerId: B[0].id, akaScore: 3, aoScore: 6, aoSenshu: true, isCompleted: true },
      { round: 2, position: 1, akaId: B[3].id, aoId: B[5].id, winnerId: B[3].id, akaScore: 5, aoScore: 1, akaSenshu: true, isCompleted: true },
      // Round 3 (Final — EM ANDAMENTO / AO VIVO!)
      { round: 3, position: 0, akaId: B[0].id, aoId: B[3].id, winnerId: null, akaScore: 0, aoScore: 0, isCompleted: false },
      // 3º Lugar (já concluído)
      { round: 3, position: 1, akaId: B[4].id, aoId: B[5].id, winnerId: B[4].id, akaScore: 4, aoScore: 2, isThirdPlace: true, isCompleted: true },
    ],
  });

  const liveFinalMatch = liveBracketResult.matches.find(
    (m) => m.round === 3 && m.position === 0 && !m.isThirdPlace
  );

  // Criar LiveMatch ativo para a Final de -84kg (Scoreboard público ao vivo)
  await prisma.liveMatch.create({
    data: {
      tournamentId: mainTournament.id,
      matchId: liveFinalMatch.id,
      bracketId: liveBracketResult.bracket.id,
      akaId: B[0].id,
      akaName: B[0].name,
      akaSchool: B[0].school,
      aoId: B[3].id,
      aoName: B[3].name,
      aoSchool: B[3].school,
      category: liveBracketResult.bracket.category,
      modality: Modality.KUMITE,
      round: 3,
      position: 0,
      totalRounds: 3,
      akaScore: 5,
      aoScore: 3,
      akaChui: 0,
      aoChui: 1,
      akaSenshu: true,
      aoSenshu: false,
      timeRemaining: 78, // 01:18
      timerRunning: false,
      timerEndAt: null,
      winner: null,
      isActive: true,
    },
  });

  // --- Chave 3: KUMITE FEMININO SENIOR AVANÇADO -61kg (6 atletas, COMPLETED) ---
  const C = byGroup.C;
  await createBracketWithMatches({
    tournamentId: mainTournament.id,
    category: C[0].kumiteCategory,
    modality: Modality.KUMITE,
    totalSlots: 8,
    totalRounds: 3,
    status: BracketStatus.COMPLETED,
    matches: [
      { round: 1, position: 0, akaId: C[4].id, aoId: null, winnerId: C[4].id, isBye: true, isCompleted: true },
      { round: 1, position: 1, akaId: C[0].id, aoId: C[1].id, winnerId: C[0].id, akaScore: 6, aoScore: 3, akaSenshu: true, isCompleted: true },
      { round: 1, position: 2, akaId: C[2].id, aoId: C[3].id, winnerId: C[3].id, akaScore: 2, aoScore: 4, isCompleted: true },
      { round: 1, position: 3, akaId: C[5].id, aoId: null, winnerId: C[5].id, isBye: true, isCompleted: true },
      { round: 2, position: 0, akaId: C[4].id, aoId: C[0].id, winnerId: C[0].id, akaScore: 1, aoScore: 5, aoSenshu: true, isCompleted: true },
      { round: 2, position: 1, akaId: C[3].id, aoId: C[5].id, winnerId: C[3].id, akaScore: 4, aoScore: 4, decisionByHantei: true, isCompleted: true },
      { round: 3, position: 0, akaId: C[0].id, aoId: C[3].id, winnerId: C[0].id, akaScore: 7, aoScore: 4, akaSenshu: true, isCompleted: true },
      { round: 3, position: 1, akaId: C[4].id, aoId: C[5].id, winnerId: C[4].id, akaScore: 3, aoScore: 1, isThirdPlace: true, isCompleted: true },
    ],
  });

  // --- Chave 4: KATA FEMININO CADETE INTERMEDIÁRIO (4 atletas, COMPLETED) ---
  const D = byGroup.D;
  await createBracketWithMatches({
    tournamentId: mainTournament.id,
    category: D[0].kataCategory,
    modality: Modality.KATA,
    totalSlots: 4,
    totalRounds: 2,
    status: BracketStatus.COMPLETED,
    matches: [
      { round: 1, position: 0, akaId: D[0].id, aoId: D[1].id, winnerId: D[0].id, akaScore: 4, aoScore: 1, isCompleted: true },
      { round: 1, position: 1, akaId: D[2].id, aoId: D[3].id, winnerId: D[2].id, akaScore: 3, aoScore: 2, isCompleted: true },
      { round: 2, position: 0, akaId: D[0].id, aoId: D[2].id, winnerId: D[2].id, akaScore: 2, aoScore: 3, isCompleted: true },
      { round: 2, position: 1, akaId: D[1].id, aoId: D[3].id, winnerId: D[1].id, akaScore: 4, aoScore: 1, isThirdPlace: true, isCompleted: true },
    ],
  });

  // --- Chave 5: KUMITE MASCULINO JUNIOR AVANÇADO -68kg (6 atletas, IN_PROGRESS) ---
  const E = byGroup.E;
  await createBracketWithMatches({
    tournamentId: mainTournament.id,
    category: E[0].kumiteCategory,
    modality: Modality.KUMITE,
    totalSlots: 8,
    totalRounds: 3,
    status: BracketStatus.IN_PROGRESS,
    matches: [
      { round: 1, position: 0, akaId: E[4].id, aoId: null, winnerId: E[4].id, isBye: true, isCompleted: true },
      { round: 1, position: 1, akaId: E[0].id, aoId: E[1].id, winnerId: E[0].id, akaScore: 5, aoScore: 3, isCompleted: true },
      { round: 1, position: 2, akaId: E[2].id, aoId: E[3].id, winnerId: E[2].id, akaScore: 4, aoScore: 2, isCompleted: true },
      { round: 1, position: 3, akaId: E[5].id, aoId: null, winnerId: E[5].id, isBye: true, isCompleted: true },
      { round: 2, position: 0, akaId: E[4].id, aoId: E[0].id, isCompleted: false },
      { round: 2, position: 1, akaId: E[2].id, aoId: E[5].id, isCompleted: false },
      { round: 3, position: 0, isCompleted: false },
      { round: 3, position: 1, isThirdPlace: true, isCompleted: false },
    ],
  });

  // --- Chave 6: KATA MASCULINO SENIOR AVANÇADO (8 atletas, NOT_STARTED) ---
  await createBracketWithMatches({
    tournamentId: mainTournament.id,
    category: A[0].kataCategory,
    modality: Modality.KATA,
    totalSlots: 8,
    totalRounds: 3,
    status: BracketStatus.NOT_STARTED,
    matches: [
      { round: 1, position: 0, akaId: A[0].id, aoId: A[1].id },
      { round: 1, position: 1, akaId: A[2].id, aoId: A[3].id },
      { round: 1, position: 2, akaId: A[4].id, aoId: A[5].id },
      { round: 1, position: 3, akaId: A[6].id, aoId: A[7].id },
      { round: 2, position: 0 },
      { round: 2, position: 1 },
      { round: 3, position: 0 },
      { round: 3, position: 1, isThirdPlace: true },
    ],
  });

  // --- Chave 7: KATA MASCULINO 10-11 ANOS INICIANTE (6 atletas, NOT_STARTED) ---
  const F = byGroup.F;
  await createBracketWithMatches({
    tournamentId: mainTournament.id,
    category: F[0].kataCategory,
    modality: Modality.KATA,
    totalSlots: 8,
    totalRounds: 3,
    status: BracketStatus.NOT_STARTED,
    matches: [
      { round: 1, position: 0, akaId: F[4].id, aoId: null, winnerId: F[4].id, isBye: true, isCompleted: true },
      { round: 1, position: 1, akaId: F[0].id, aoId: F[1].id },
      { round: 1, position: 2, akaId: F[2].id, aoId: F[3].id },
      { round: 1, position: 3, akaId: F[5].id, aoId: null, winnerId: F[5].id, isBye: true, isCompleted: true },
      { round: 2, position: 0, akaId: F[4].id, aoId: null },
      { round: 2, position: 1, akaId: null, aoId: F[5].id },
      { round: 3, position: 0 },
      { round: 3, position: 1, isThirdPlace: true },
    ],
  });

  // 2. Torneio secundário (para enriquecer /app)
  const secondaryTournament = await prisma.tournament.create({
    data: {
      name: "Torneio Interno de Inverno 2026",
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 30),
    },
  });

  const secondaryComps = [];
  for (const c of buildSecondaryCompetitors()) {
    const derived = deriveCategories(c);
    const comp = await prisma.competitor.create({
      data: {
        ...c,
        ...derived,
        tournamentId: secondaryTournament.id,
      },
    });
    secondaryComps.push(comp);
  }

  const S = secondaryComps.slice(0, 4);
  await createBracketWithMatches({
    tournamentId: secondaryTournament.id,
    category: S[0].kumiteCategory,
    modality: Modality.KUMITE,
    totalSlots: 4,
    totalRounds: 2,
    status: BracketStatus.COMPLETED,
    matches: [
      { round: 1, position: 0, akaId: S[0].id, aoId: S[1].id, winnerId: S[0].id, akaScore: 5, aoScore: 2, isCompleted: true },
      { round: 1, position: 1, akaId: S[2].id, aoId: S[3].id, winnerId: S[2].id, akaScore: 4, aoScore: 1, isCompleted: true },
      { round: 2, position: 0, akaId: S[0].id, aoId: S[2].id, winnerId: S[0].id, akaScore: 6, aoScore: 3, isCompleted: true },
      { round: 2, position: 1, akaId: S[1].id, aoId: S[3].id, winnerId: S[1].id, akaScore: 3, aoScore: 2, isThirdPlace: true, isCompleted: true },
    ],
  });

  console.log("Seed concluído com sucesso!");
  console.log(
    JSON.stringify(
      {
        mainTournamentId: mainTournament.id,
        liveBracketId: liveBracketResult.bracket.id,
        liveMatchId: liveFinalMatch.id,
        secondaryTournamentId: secondaryTournament.id,
      },
      null,
      2
    )
  );
}

seed()
  .catch((err) => {
    console.error("Erro ao rodar seed:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
