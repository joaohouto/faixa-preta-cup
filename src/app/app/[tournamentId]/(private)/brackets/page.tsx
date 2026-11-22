import type { Metadata } from "next";
import { db } from "@/lib/prisma";
import BracketsClient from "./client";

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
    title: tournament ? `Chaves — ${tournament.name}` : "Chaves",
  };
}

export default async function BracketsPage({
  params,
}: {
  params: Promise<{ tournamentId: string }>;
}) {
  const { tournamentId } = await params;
  return <BracketsClient tournamentId={tournamentId} />;
}
