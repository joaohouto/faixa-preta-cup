import { Belt, Gender } from "@prisma/client";

export type BeltLevel = "INICIANTE" | "INTERMEDIÁRIO" | "AVANÇADO";
export type AgeCategory =
  | "SENIOR"
  | "SUB21"
  | "JUNIOR"
  | "CADETE"
  | "SUB14"
  | "10-11 ANOS"
  | "8-9 ANOS"
  | "6-7 ANOS"
  | "ATÉ 5 ANOS";

/**
 * Converte uma string ("YYYY-MM-DD", "DD/MM/YYYY" ou ISO) ou Date em um objeto
 * Date fixado ao meio-dia local (12:00:00), evitando que diferenças de fuso
 * horário (UTC vs America/Sao_Paulo) desloquem o dia de nascimento em -1 dia.
 * Também valida se a data realmente existe no calendário (ex.: rejeita 31/02).
 */
export function parseBirthdate(input: string | Date): Date {
  if (input instanceof Date) {
    if (Number.isNaN(input.getTime())) {
      throw new Error("Data de nascimento inválida");
    }
    return input;
  }

  if (typeof input !== "string" || !input.trim()) {
    throw new Error("Data de nascimento inválida");
  }

  const trimmed = input.trim();

  // Formato DD/MM/AAAA (usado no CSV)
  const brMatch = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(trimmed);
  if (brMatch) {
    const day = Number(brMatch[1]);
    const month = Number(brMatch[2]);
    const year = Number(brMatch[3]);
    return buildValidatedLocalDate(year, month, day);
  }

  // Formato YYYY-MM-DD (usado em <input type="date"> ou prefixo ISO)
  const isoDateMatch = /^(\d{4})-(\d{2})-(\d{2})(?:T.*)?$/.exec(trimmed);
  if (isoDateMatch) {
    const year = Number(isoDateMatch[1]);
    const month = Number(isoDateMatch[2]);
    const day = Number(isoDateMatch[3]);
    return buildValidatedLocalDate(year, month, day);
  }

  throw new Error(
    `Data de nascimento inválida ("${trimmed}"). Use DD/MM/AAAA ou AAAA-MM-DD.`
  );
}

function buildValidatedLocalDate(
  year: number,
  month: number,
  day: number
): Date {
  if (year < 1900 || year > 2100 || month < 1 || month > 12 || day < 1 || day > 31) {
    throw new Error("Data de nascimento inválida");
  }

  // Fixar às 12:00 locais garante que tanto getDate() local quanto
  // toISOString().split("T")[0] em UTC mantenham exatamente o mesmo dia civil.
  const date = new Date(year, month - 1, day, 12, 0, 0, 0);
  if (
    Number.isNaN(date.getTime()) ||
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    throw new Error("Data de nascimento inexistente no calendário");
  }

  return date;
}

/**
 * Converte valores de peso vindos de formulário ou CSV ("65,5 kg", "65.5", 65.5)
 * para número positivo ou null (quando vazio/zero). Lança erro se o texto for inválido.
 */
export function parseWeight(input: unknown): number | null {
  if (input === null || input === undefined || input === "") {
    return null;
  }

  if (typeof input === "number") {
    if (Number.isNaN(input)) {
      throw new Error("Peso inválido");
    }
    if (input < 0) {
      throw new Error("Peso não pode ser negativo");
    }
    return input === 0 ? null : input;
  }

  if (typeof input === "string") {
    const cleaned = input
      .trim()
      .replace(/\s*kg\s*$/i, "")
      .replace(",", ".")
      .trim();

    if (!cleaned) return null;

    if (!/^\d+(\.\d+)?$/.test(cleaned)) {
      throw new Error(`Peso inválido ("${input}")`);
    }

    const parsed = Number.parseFloat(cleaned);
    if (Number.isNaN(parsed) || parsed < 0) {
      throw new Error(`Peso inválido ("${input}")`);
    }
    return parsed === 0 ? null : parsed;
  }

  throw new Error("Peso inválido");
}

export function calculateAge(birthdate: Date, referenceDate?: Date): number {
  if (!(birthdate instanceof Date) || Number.isNaN(birthdate.getTime())) {
    throw new Error("Data de nascimento inválida");
  }
  const today = referenceDate || new Date();
  let age = today.getFullYear() - birthdate.getFullYear();
  const m = today.getMonth() - birthdate.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birthdate.getDate())) {
    age--;
  }
  return age;
}

export function getBeltLevel(belt: Belt): BeltLevel {
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

export function getAgeCategory(age: number): AgeCategory {
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

export function getKataCategory(
  age: number,
  gender: Gender,
  belt: Belt
): string {
  const ageCategory = getAgeCategory(age);
  const beltLevel = getBeltLevel(belt);
  return `KATA ${
    gender === "MALE" ? "MASCULINO" : "FEMININO"
  } ${ageCategory} ${beltLevel}`;
}

function getWeightCategory(
  ageCategory: AgeCategory,
  gender: Gender,
  weight: number
): string {
  // Categorias infantis não usam peso
  if (
    ["10-11 ANOS", "8-9 ANOS", "6-7 ANOS", "ATÉ 5 ANOS"].includes(ageCategory)
  ) {
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

export function getKumiteCategory(
  age: number,
  gender: Gender,
  weight: number | null,
  belt: Belt
): string {
  const ageCategory = getAgeCategory(age);
  const beltLevel = getBeltLevel(belt);
  const weightCategory = weight
    ? getWeightCategory(ageCategory, gender, weight)
    : "";

  return `KUMITE ${
    gender === "MALE" ? "MASCULINO" : "FEMININO"
  } ${ageCategory} ${beltLevel} ${weightCategory}`.trim();
}

export function validateKumiteRegistration(
  kumite: boolean,
  weight: number | null | undefined
): void {
  if (kumite && (!weight || weight <= 0 || Number.isNaN(weight))) {
    throw new Error("Peso é obrigatório para inscrição em Kumite");
  }
}

export function deriveCompetitorCategories(input: {
  birthdate: Date | string;
  gender: Gender;
  belt: Belt;
  weight: number | null;
  kata: boolean;
  kumite: boolean;
  referenceDate?: Date;
}): { age: number; kataCategory: string | null; kumiteCategory: string | null } {
  const parsedBirthdate =
    input.birthdate instanceof Date
      ? input.birthdate
      : parseBirthdate(input.birthdate);

  const age = calculateAge(parsedBirthdate, input.referenceDate);
  if (age < 0) {
    throw new Error("Data de nascimento não pode ser no futuro");
  }

  validateKumiteRegistration(input.kumite, input.weight);

  const kataCategory = input.kata
    ? getKataCategory(age, input.gender, input.belt)
    : null;
  const kumiteCategory = input.kumite
    ? getKumiteCategory(age, input.gender, input.weight, input.belt)
    : null;

  return { age, kataCategory, kumiteCategory };
}
