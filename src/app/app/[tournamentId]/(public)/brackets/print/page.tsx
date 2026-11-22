import type { Metadata } from "next";
import { db } from "@/lib/prisma";
import PrintBracketsClient from "./client";

export async function generateMetadata({
  params,
  searchParams,
}: {
  params: Promise<{ tournamentId: string }>;
  searchParams?: Promise<{ bracketId?: string }>;
}): Promise<Metadata> {
  const { tournamentId } = await params;
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const bracketId = resolvedSearchParams.bracketId;

  if (bracketId) {
    const bracket = await db.bracket.findUnique({
      where: { id: bracketId },
      select: { category: true },
    });
    if (bracket) {
      return {
        title: `${bracket.category} · Impressão`,
      };
    }
  }

  const tournament = await db.tournament.findUnique({
    where: { id: tournamentId },
    select: { name: true },
  });

  return {
    title: tournament
      ? `Chaves para Impressão — ${tournament.name}`
      : "Impressão de Chaves",
  };
}

export default async function PrintBracketsPage({
  params,
}: {
  params: Promise<{ tournamentId: string }>;
}) {
  const { tournamentId } = await params;
  return <PrintBracketsClient tournamentId={tournamentId} />;
}
