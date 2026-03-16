import { describe, it, expect } from "vitest";
import {
  nextPowerOf2,
  getSeededPositions,
  computeSlots,
} from "../bracket-generator";

// ---------------------------------------------------------------------------
// nextPowerOf2
// ---------------------------------------------------------------------------
describe("nextPowerOf2", () => {
  it("retorna 2 para n=2", () => {
    expect(nextPowerOf2(2)).toBe(2);
  });

  it("retorna 4 para n=3", () => {
    expect(nextPowerOf2(3)).toBe(4);
  });

  it("retorna 4 para n=4", () => {
    expect(nextPowerOf2(4)).toBe(4);
  });

  it("retorna 8 para n=5", () => {
    expect(nextPowerOf2(5)).toBe(8);
  });

  it("retorna 8 para n=8", () => {
    expect(nextPowerOf2(8)).toBe(8);
  });

  it("retorna 16 para n=9", () => {
    expect(nextPowerOf2(9)).toBe(16);
  });

  it("retorna 16 para n=16", () => {
    expect(nextPowerOf2(16)).toBe(16);
  });

  it("retorna 32 para n=17", () => {
    expect(nextPowerOf2(17)).toBe(32);
  });
});

// ---------------------------------------------------------------------------
// getSeededPositions
// ---------------------------------------------------------------------------
describe("getSeededPositions", () => {
  it("retorna [0] para numMatches=1", () => {
    expect(getSeededPositions(1)).toEqual([0]);
  });

  it("retorna [0, 1] para numMatches=2", () => {
    expect(getSeededPositions(2)).toEqual([0, 1]);
  });

  it("retorna posições do miolo para bordas para numMatches=4", () => {
    // half=2 → [1, 0, 2, 3] conforme algoritmo inside-out
    const result = getSeededPositions(4);
    expect(result).toHaveLength(4);
    // Verifica que é uma permutação de [0,1,2,3]
    expect([...result].sort((a, b) => a - b)).toEqual([0, 1, 2, 3]);
    // Verifica que as posições do miolo (1, 2) vêm antes das bordas (0, 3)
    const middleIdx1 = result.indexOf(1);
    const middleIdx2 = result.indexOf(2);
    const edgeIdx0 = result.indexOf(0);
    const edgeIdx3 = result.indexOf(3);
    expect(Math.max(middleIdx1, middleIdx2)).toBeLessThan(
      Math.min(edgeIdx0, edgeIdx3)
    );
  });

  it("retorna 8 posições válidas para numMatches=8", () => {
    const result = getSeededPositions(8);
    expect(result).toHaveLength(8);
    expect([...result].sort((a, b) => a - b)).toEqual([0, 1, 2, 3, 4, 5, 6, 7]);
  });

  it("não tem duplicatas nas posições retornadas", () => {
    for (const n of [2, 4, 8, 16]) {
      const result = getSeededPositions(n);
      const unique = new Set(result);
      expect(unique.size).toBe(result.length);
    }
  });
});

// ---------------------------------------------------------------------------
// computeSlots
// ---------------------------------------------------------------------------
describe("computeSlots", () => {
  it("distribui 2 competidores em 1 match (cada position recebe 2)", () => {
    const seeded = getSeededPositions(1);
    const slots = computeSlots(seeded, 2);
    const total = Object.values(slots).reduce((s, v) => s + v, 0);
    expect(total).toBe(2);
  });

  it("distribui 3 competidores em 2 matches: 2 no miolo, 1 na borda", () => {
    const seeded = getSeededPositions(2); // [0, 1]
    const slots = computeSlots(seeded, 3);
    const total = Object.values(slots).reduce((s, v) => s + v, 0);
    expect(total).toBe(3);
    // Nenhuma posição pode ter mais de 2
    expect(Object.values(slots).every((v) => v <= 2)).toBe(true);
  });

  it("distribui 4 competidores em 2 matches: 2 em cada", () => {
    const seeded = getSeededPositions(2);
    const slots = computeSlots(seeded, 4);
    const total = Object.values(slots).reduce((s, v) => s + v, 0);
    expect(total).toBe(4);
    expect(Object.values(slots).every((v) => v === 2)).toBe(true);
  });

  it("distribui 5 competidores em 4 matches corretamente", () => {
    const seeded = getSeededPositions(4);
    const slots = computeSlots(seeded, 5);
    const total = Object.values(slots).reduce((s, v) => s + v, 0);
    expect(total).toBe(5);
    expect(Object.values(slots).every((v) => v <= 2)).toBe(true);
  });

  it("distribui 6 competidores em 4 matches corretamente", () => {
    const seeded = getSeededPositions(4);
    const slots = computeSlots(seeded, 6);
    const total = Object.values(slots).reduce((s, v) => s + v, 0);
    expect(total).toBe(6);
    expect(Object.values(slots).every((v) => v <= 2)).toBe(true);
  });

  it("distribui 7 competidores em 4 matches corretamente", () => {
    const seeded = getSeededPositions(4);
    const slots = computeSlots(seeded, 7);
    const total = Object.values(slots).reduce((s, v) => s + v, 0);
    expect(total).toBe(7);
    expect(Object.values(slots).every((v) => v <= 2)).toBe(true);
  });

  it("distribui 8 competidores em 4 matches: 2 em cada", () => {
    const seeded = getSeededPositions(4);
    const slots = computeSlots(seeded, 8);
    const total = Object.values(slots).reduce((s, v) => s + v, 0);
    expect(total).toBe(8);
    expect(Object.values(slots).every((v) => v === 2)).toBe(true);
  });

  it("o total de slots sempre corresponde ao número de competidores", () => {
    for (const numComps of [2, 3, 4, 5, 6, 7, 8, 9, 10, 15, 16]) {
      const totalSlots = nextPowerOf2(numComps);
      const numMatches = totalSlots / 2;
      const seeded = getSeededPositions(numMatches);
      const slots = computeSlots(seeded, numComps);
      const total = Object.values(slots).reduce((s, v) => s + v, 0);
      expect(total).toBe(numComps);
    }
  });

  it("nenhuma posição recebe mais de 2 competidores", () => {
    for (const numComps of [2, 3, 4, 5, 6, 7, 8, 9, 10, 15, 16]) {
      const totalSlots = nextPowerOf2(numComps);
      const numMatches = totalSlots / 2;
      const seeded = getSeededPositions(numMatches);
      const slots = computeSlots(seeded, numComps);
      expect(Object.values(slots).every((v) => v <= 2)).toBe(true);
    }
  });
});
