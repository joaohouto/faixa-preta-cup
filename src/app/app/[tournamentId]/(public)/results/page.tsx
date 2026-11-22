import type { Metadata } from "next";
import { db } from "@/lib/prisma";
import ResultsClient from "./client";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ tournamentId: string }>;
}): Promise<Metadata> {
  const { tournamentId } = await params;
  const tournament = await db.tournament.findUnique({
    where: { id: tournamentId },
    select: { name: true },
  });

  return {
    title: tournament
      ? `Resultados Oficiais — ${tournament.name}`
      : "Resultados Oficiais",
  };
}

export default async function ResultsPage({
  params,
}: {
  params: Promise<{ tournamentId: string }>;
}) {
  const { tournamentId } = await params;
  return <ResultsClient tournamentId={tournamentId} />;
}
