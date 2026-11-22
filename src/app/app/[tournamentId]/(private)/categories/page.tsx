import type { Metadata } from "next";
import { db } from "@/lib/prisma";
import CategoriesClient from "./client";

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
    title: tournament ? `Categorias — ${tournament.name}` : "Categorias",
  };
}

export default async function CategoriesPage({
  params,
}: {
  params: Promise<{ tournamentId: string }>;
}) {
  const { tournamentId } = await params;
  return <CategoriesClient tournamentId={tournamentId} />;
}
