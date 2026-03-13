import { Belt, Gender } from "@prisma/client";

export const beltLabels: Record<Belt, string> = {
  WHITE: "Branca",
  BLUE: "Azul",
  YELLOW: "Amarela",
  RED: "Vermelha",
  ORANGE: "Laranja",
  GREEN: "Verde",
  PURPLE: "Roxa",
  BROWN: "Marrom",
  BLACK: "Preta",
};

export const genderLabels: Record<Gender, string> = {
  MALE: "Masculino",
  FEMALE: "Feminino",
};

// Inverse mappings for CSV import
export const beltMapping: Record<string, Belt> = {
  branca: Belt.WHITE,
  azul: Belt.BLUE,
  amarela: Belt.YELLOW,
  vermelha: Belt.RED,
  laranja: Belt.ORANGE,
  verde: Belt.GREEN,
  roxa: Belt.PURPLE,
  marrom: Belt.BROWN,
  preta: Belt.BLACK,
};

export const genderMapping: Record<string, Gender> = {
  masculino: Gender.MALE,
  feminino: Gender.FEMALE,
};
