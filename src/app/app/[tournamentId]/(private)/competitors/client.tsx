"use client";

import { useEffect, useState } from "react";
import { Tournament } from "@prisma/client";
import { toast } from "sonner";

import { Card, CardContent } from "@/components/ui/card";
import { CompetitorForm } from "@/components/competitor-form";
import { CompetitorsList } from "@/components/competitors-list";
import { CompetitorImportForm } from "@/components/competitor-import-form";
import { useEscBack } from "@/hooks/use-esc-back";
import { Skeleton } from "@/components/ui/skeleton";
import { fetchJson } from "@/lib/api-client";
import { usePageTitle } from "@/hooks/use-page-title";

export default function CompetitorsClient({
  tournamentId,
}: {
  tournamentId: string;
}) {
  useEscBack();

  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  const pageTitle = tournament ? `Competidores — ${tournament.name}` : "Competidores";
  usePageTitle(pageTitle);

  useEffect(() => {
    if (!tournamentId) return;

    async function fetchTournament() {
      try {
        const data = await fetchJson<Tournament>(
          `/api/tournaments/${tournamentId}`
        );
        setTournament(data);
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Falha ao carregar campeonato."
        );
      } finally {
        setLoading(false);
      }
    }

    fetchTournament();
  }, [tournamentId]);

  function handleRefresh() {
    setRefreshKey((prev) => prev + 1);
  }

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="space-y-4">
          <Skeleton className="h-8 w-1/4" />
          <Skeleton className="h-4 w-1/3" />
        </div>
      </div>
    );
  }

  if (!tournament) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-lg font-medium">Campeonato não encontrado</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Competidores</h1>
        <p className="text-muted-foreground">
          Gerencie os competidores de {tournament.name}
        </p>
      </div>

      {/* Botões de ação */}
      <div className="flex gap-2 mb-6">
        <CompetitorForm
          tournamentId={tournamentId}
          onCompetitorCreated={handleRefresh}
        />
        <CompetitorImportForm
          tournamentId={tournamentId}
          onCompetitorsImported={handleRefresh}
        />
      </div>

      {/* Lista de competidores */}
      <Card>
        <CardContent className="px-6">
          <CompetitorsList
            tournamentId={tournamentId}
            refreshKey={refreshKey}
            onRefresh={handleRefresh}
          />
        </CardContent>
      </Card>
    </div>
  );
}
