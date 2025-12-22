"use client";

import { useEffect, useState } from "react";
import { Tournament } from "@prisma/client";
import { toast } from "sonner";

import { Card, CardContent } from "@/components/ui/card";
import { CompetitorForm } from "@/components/competitor-form";
import { CompetitorsList } from "@/components/competitors-list";
import { CompetitorImportForm } from "@/components/competitor-import-form";

interface CompetitorsPageProps {
  params: Promise<{ tournamentId: string }>;
}

export default function CompetitorsPage({ params }: CompetitorsPageProps) {
  const [tournamentId, setTournamentId] = useState<string>("");
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    params.then((resolvedParams) => {
      setTournamentId(resolvedParams.tournamentId);
    });
  }, [params]);

  useEffect(() => {
    if (!tournamentId) return;

    async function fetchTournament() {
      try {
        const response = await fetch(`/api/tournaments/${tournamentId}`);
        if (!response.ok) throw new Error("Tournament not found");
        const data = await response.json();
        setTournament(data);
      } catch (error) {
        toast.error("Falha ao carregar campeonato.");
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
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded-xl w-1/4" />
          <div className="h-4 bg-muted rounded-xl w-1/3" />
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
