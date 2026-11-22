import type { Metadata } from "next";
import { db } from "@/lib/prisma";
import CompetitorsClient from "./client";

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
    title: tournament ? `Competidores — ${tournament.name}` : "Competidores",
  };
}

export default async function CompetitorsPage({
  params,
}: {
  params: Promise<{ tournamentId: string }>;
}) {
  const { tournamentId } = await params;
  return <CompetitorsClient tournamentId={tournamentId} />;
}
