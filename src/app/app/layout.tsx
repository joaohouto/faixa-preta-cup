"use client";

import { Header } from "@/components/header";
import { useParams } from "next/navigation";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const params = useParams();
  const tournamentId = params?.tournamentId as string | undefined;

  return (
    <div className="min-h-screen flex flex-col">
      <Header currentTournamentId={tournamentId} />
      <main className="flex-1">{children}</main>
    </div>
  );
}
