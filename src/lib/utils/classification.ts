import { Belt, Gender } from "@prisma/client";

export function calculateAge(birthdate: Date): number {
  const today = new Date();
  let age = today.getFullYear() - birthdate.getFullYear();
  const m = today.getMonth() - birthdate.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birthdate.getDate())) {
    age--;
  }
  return age;
}

function getBeltLevel(belt: Belt): "BEGINNER" | "INTERMEDIATE" | "ADVANCED" {
  switch (belt) {
    case Belt.WHITE:
    case Belt.BLUE:
    case Belt.YELLOW:
      return "BEGINNER";
    case Belt.RED:
    case Belt.ORANGE:
    case Belt.GREEN:
      return "INTERMEDIATE";
    case Belt.PURPLE:
    case Belt.BROWN:
    case Belt.BLACK:
      return "ADVANCED";
  }
}

function getAgeCategory(age: number): string {
  if (age >= 18) return "SENIOR";
  if (age >= 18 && age <= 20) return "SUB21";
  if (age >= 16 && age <= 17) return "JUNIOR";
  if (age >= 14 && age <= 15) return "CADET";
  if (age >= 12 && age <= 13) return "SUB14";
  if (age >= 10 && age <= 11) return "10-11 YEARS";
  if (age >= 8 && age <= 9) return "8-9 YEARS";
  if (age >= 6 && age <= 7) return "6-7 YEARS";
  return "UP TO 5 YEARS";
}

export function getKataCategory(age: number, belt: Belt): string {
  const ageCategory = getAgeCategory(age);
  const beltLevel = getBeltLevel(belt);
  return `KATA ${ageCategory} ${beltLevel}`;
}

function getWeightCategory(
  ageCategory: string,
  gender: Gender,
  weight: number
): string {
  if (
    ["10-11 YEARS", "8-9 YEARS", "6-7 YEARS", "UP TO 5 YEARS"].includes(
      ageCategory
    )
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
      case "CADET":
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
      case "CADET":
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

  return `KUMITE ${ageCategory} ${gender} ${beltLevel} ${weightCategory}`.trim();
}
