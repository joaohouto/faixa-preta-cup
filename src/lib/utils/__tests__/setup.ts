import { vi } from "vitest";

// Mock do Prisma para isolar testes de utilitários da infraestrutura de banco de dados
vi.mock("@/lib/prisma", () => ({
  db: {
    bracket: {
      create: vi.fn(),
      findUnique: vi.fn(),
    },
    match: {
      create: vi.fn(),
      createMany: vi.fn(),
      updateMany: vi.fn(),
      findMany: vi.fn(),
    },
  },
}));
