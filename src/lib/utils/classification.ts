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

export function calculateAge(birthdate: Date, referenceDate?: Date): number {
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
  weight: number | null
): void {
  if (kumite && !weight) {
    throw new Error("Peso é obrigatório para inscrição em Kumite");
  }
}
