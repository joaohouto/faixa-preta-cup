import type { Metadata } from "next";
import { db } from "@/lib/prisma";
import BracketDetailClient from "./client";

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
    title: bracket ? `${bracket.category} · Chave` : "Chave",
  };
}

export default async function BracketDetailPage({
  params,
}: {
  params: Promise<{ tournamentId: string; bracketId: string }>;
}) {
  const { tournamentId, bracketId } = await params;
  return <BracketDetailClient tournamentId={tournamentId} bracketId={bracketId} />;
}
