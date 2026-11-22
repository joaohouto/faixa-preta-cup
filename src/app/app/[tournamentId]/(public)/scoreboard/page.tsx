import type { Metadata } from "next";
import { db } from "@/lib/prisma";
import ScoreboardClient from "./client";

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
    title: tournament ? `Placar — ${tournament.name}` : "Placar",
  };
}

export default async function ScoreboardPage({
  params,
}: {
  params: Promise<{ tournamentId: string }>;
}) {
  const { tournamentId } = await params;
  return <ScoreboardClient tournamentId={tournamentId} />;
}
