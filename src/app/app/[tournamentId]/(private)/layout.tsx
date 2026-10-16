"use client";

import { Header } from "@/components/header";
import { useParams, usePathname } from "next/navigation";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const params = useParams();
  const pathname = usePathname();
  const tournamentId = params?.tournamentId as string | undefined;
  const isRefereePage = pathname?.endsWith("/referee");

  return (
    <div className="min-h-screen flex flex-col">
      {!isRefereePage && <Header currentTournamentId={tournamentId} />}
      <main className="flex-1">{children}</main>
    </div>
  );
}
