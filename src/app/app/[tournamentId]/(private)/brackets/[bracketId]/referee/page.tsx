import type { Metadata } from "next";
import { db } from "@/lib/prisma";
import RefereeClient from "./client";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ tournamentId: string; bracketId: string }>;
}): Promise<Metadata> {
  const { bracketId } = await params;
  const bracket = await db.bracket.findUnique({
    where: { id: bracketId },
    select: { category: true },
  });

  return {
    title: bracket ? `Árbitro · ${bracket.category}` : "Árbitro",
  };
}

export default async function RefereePage({
  params,
}: {
  params: Promise<{ tournamentId: string; bracketId: string }>;
}) {
  const { tournamentId, bracketId } = await params;
  return <RefereeClient tournamentId={tournamentId} bracketId={bracketId} />;
}
