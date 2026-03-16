import { describe, it, expect } from "vitest";
import { Belt, Gender } from "@prisma/client";
import {
  calculateAge,
  getAgeCategory,
  getBeltLevel,
  getKataCategory,
  getKumiteCategory,
  validateKumiteRegistration,
} from "../classification";

// ---------------------------------------------------------------------------
// calculateAge
// ---------------------------------------------------------------------------
describe("calculateAge", () => {
  it("retorna a idade correta quando o aniversário já passou no ano atual", () => {
    const birthdate = new Date(2000, 0, 1); // 1 jan 2000
    const reference = new Date(2025, 5, 15); // 15 jun 2025
    expect(calculateAge(birthdate, reference)).toBe(25);
  });

  it("retorna a idade correta quando o aniversário ainda não aconteceu no ano atual", () => {
    const birthdate = new Date(2000, 11, 31); // 31 dez 2000
    const reference = new Date(2025, 5, 15); // 15 jun 2025
    expect(calculateAge(birthdate, reference)).toBe(24);
  });

  it("retorna 0 para recém-nascido no mesmo dia", () => {
    const birthdate = new Date(2025, 5, 15);
    const reference = new Date(2025, 5, 15);
    expect(calculateAge(birthdate, reference)).toBe(0);
  });

  it("retorna a idade exata no dia do aniversário", () => {
    const birthdate = new Date(1990, 3, 10); // 10 abr 1990
    const reference = new Date(2025, 3, 10); // 10 abr 2025
    expect(calculateAge(birthdate, reference)).toBe(35);
  });

  it("não conta o aniversário um dia antes", () => {
    const birthdate = new Date(1990, 3, 10); // 10 abr 1990
    const reference = new Date(2025, 3, 9);  // 9 abr 2025
    expect(calculateAge(birthdate, reference)).toBe(34);
  });
});

// ---------------------------------------------------------------------------
// getAgeCategory
// ---------------------------------------------------------------------------
describe("getAgeCategory", () => {
  it("retorna SENIOR para >= 21 anos", () => {
    expect(getAgeCategory(21)).toBe("SENIOR");
    expect(getAgeCategory(35)).toBe("SENIOR");
    expect(getAgeCategory(60)).toBe("SENIOR");
  });

  it("retorna SUB21 para 18-20 anos", () => {
    expect(getAgeCategory(18)).toBe("SUB21");
    expect(getAgeCategory(20)).toBe("SUB21");
  });

  it("retorna JUNIOR para 16-17 anos", () => {
    expect(getAgeCategory(16)).toBe("JUNIOR");
    expect(getAgeCategory(17)).toBe("JUNIOR");
  });

  it("retorna CADETE para 14-15 anos", () => {
    expect(getAgeCategory(14)).toBe("CADETE");
    expect(getAgeCategory(15)).toBe("CADETE");
  });

  it("retorna SUB14 para 12-13 anos", () => {
    expect(getAgeCategory(12)).toBe("SUB14");
    expect(getAgeCategory(13)).toBe("SUB14");
  });

  it("retorna '10-11 ANOS' para 10-11 anos", () => {
    expect(getAgeCategory(10)).toBe("10-11 ANOS");
    expect(getAgeCategory(11)).toBe("10-11 ANOS");
  });

  it("retorna '8-9 ANOS' para 8-9 anos", () => {
    expect(getAgeCategory(8)).toBe("8-9 ANOS");
    expect(getAgeCategory(9)).toBe("8-9 ANOS");
  });

  it("retorna '6-7 ANOS' para 6-7 anos", () => {
    expect(getAgeCategory(6)).toBe("6-7 ANOS");
    expect(getAgeCategory(7)).toBe("6-7 ANOS");
  });

  it("retorna 'ATÉ 5 ANOS' para <= 5 anos", () => {
    expect(getAgeCategory(5)).toBe("ATÉ 5 ANOS");
    expect(getAgeCategory(0)).toBe("ATÉ 5 ANOS");
  });
});

// ---------------------------------------------------------------------------
// getBeltLevel
// ---------------------------------------------------------------------------
describe("getBeltLevel", () => {
  it("classifica faixas branca, azul e amarela como INICIANTE", () => {
    expect(getBeltLevel(Belt.WHITE)).toBe("INICIANTE");
    expect(getBeltLevel(Belt.BLUE)).toBe("INICIANTE");
    expect(getBeltLevel(Belt.YELLOW)).toBe("INICIANTE");
  });

  it("classifica faixas vermelha, laranja e verde como INTERMEDIÁRIO", () => {
    expect(getBeltLevel(Belt.RED)).toBe("INTERMEDIÁRIO");
    expect(getBeltLevel(Belt.ORANGE)).toBe("INTERMEDIÁRIO");
    expect(getBeltLevel(Belt.GREEN)).toBe("INTERMEDIÁRIO");
  });

  it("classifica faixas roxa, marrom e preta como AVANÇADO", () => {
    expect(getBeltLevel(Belt.PURPLE)).toBe("AVANÇADO");
    expect(getBeltLevel(Belt.BROWN)).toBe("AVANÇADO");
    expect(getBeltLevel(Belt.BLACK)).toBe("AVANÇADO");
  });
});

// ---------------------------------------------------------------------------
// getKataCategory
// ---------------------------------------------------------------------------
describe("getKataCategory", () => {
  it("gera categoria KATA MASCULINO SENIOR AVANÇADO", () => {
    expect(getKataCategory(25, Gender.MALE, Belt.BLACK)).toBe(
      "KATA MASCULINO SENIOR AVANÇADO"
    );
  });

  it("gera categoria KATA FEMININO CADETE INICIANTE", () => {
    expect(getKataCategory(14, Gender.FEMALE, Belt.WHITE)).toBe(
      "KATA FEMININO CADETE INICIANTE"
    );
  });

  it("gera categoria KATA MASCULINO SUB21 INTERMEDIÁRIO", () => {
    expect(getKataCategory(19, Gender.MALE, Belt.GREEN)).toBe(
      "KATA MASCULINO SUB21 INTERMEDIÁRIO"
    );
  });

  it("gera categoria KATA FEMININO 8-9 ANOS INICIANTE para criança de 8 anos", () => {
    expect(getKataCategory(8, Gender.FEMALE, Belt.YELLOW)).toBe(
      "KATA FEMININO 8-9 ANOS INICIANTE"
    );
  });
});

// ---------------------------------------------------------------------------
// getKumiteCategory
// ---------------------------------------------------------------------------
describe("getKumiteCategory", () => {
  it("gera categoria KUMITE MASCULINO SENIOR AVANÇADO -60kg para peso <= 60", () => {
    expect(getKumiteCategory(25, Gender.MALE, 60, Belt.BLACK)).toBe(
      "KUMITE MASCULINO SENIOR AVANÇADO -60kg"
    );
  });

  it("gera categoria KUMITE MASCULINO SENIOR AVANÇADO +84kg para peso > 84", () => {
    expect(getKumiteCategory(25, Gender.MALE, 90, Belt.BLACK)).toBe(
      "KUMITE MASCULINO SENIOR AVANÇADO +84kg"
    );
  });

  it("gera categoria KUMITE FEMININO SENIOR AVANÇADO -50kg para peso <= 50", () => {
    expect(getKumiteCategory(22, Gender.FEMALE, 49, Belt.BLACK)).toBe(
      "KUMITE FEMININO SENIOR AVANÇADO -50kg"
    );
  });

  it("gera categoria sem peso para faixa etária infantil (8-9 anos)", () => {
    expect(getKumiteCategory(8, Gender.MALE, 30, Belt.WHITE)).toBe(
      "KUMITE MASCULINO 8-9 ANOS INICIANTE"
    );
  });

  it("gera categoria sem peso quando weight é null", () => {
    expect(getKumiteCategory(25, Gender.MALE, null, Belt.BROWN)).toBe(
      "KUMITE MASCULINO SENIOR AVANÇADO"
    );
  });

  it("gera categoria KUMITE MASCULINO JUNIOR INTERMEDIÁRIO -55kg", () => {
    expect(getKumiteCategory(16, Gender.MALE, 55, Belt.GREEN)).toBe(
      "KUMITE MASCULINO JUNIOR INTERMEDIÁRIO -55kg"
    );
  });

  it("gera categoria KUMITE FEMININO CADETE INICIANTE -47kg para peso <= 47", () => {
    expect(getKumiteCategory(14, Gender.FEMALE, 45, Belt.BLUE)).toBe(
      "KUMITE FEMININO CADETE INICIANTE -47kg"
    );
  });

  it("gera categoria KUMITE MASCULINO SUB14 INICIANTE -40kg para peso <= 40", () => {
    expect(getKumiteCategory(12, Gender.MALE, 38, Belt.YELLOW)).toBe(
      "KUMITE MASCULINO SUB14 INICIANTE -40kg"
    );
  });
});

// ---------------------------------------------------------------------------
// validateKumiteRegistration
// ---------------------------------------------------------------------------
describe("validateKumiteRegistration", () => {
  it("não lança erro quando kumite é false", () => {
    expect(() => validateKumiteRegistration(false, null)).not.toThrow();
    expect(() => validateKumiteRegistration(false, 70)).not.toThrow();
  });

  it("não lança erro quando kumite é true e peso fornecido", () => {
    expect(() => validateKumiteRegistration(true, 70)).not.toThrow();
  });

  it("lança erro quando kumite é true e peso é null", () => {
    expect(() => validateKumiteRegistration(true, null)).toThrow(
      "Peso é obrigatório para inscrição em Kumite"
    );
  });
});
