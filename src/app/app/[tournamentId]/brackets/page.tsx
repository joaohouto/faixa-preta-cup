"use client";

import { useEffect, useState } from "react";
import { Bracket } from "@prisma/client";
import { toast } from "sonner";
import { Loader2, Zap } from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import Link from "next/link";

const statusLabels: Record<string, string> = {
  NOT_STARTED: "Não iniciado",
  IN_PROGRESS: "Em andamento",
  COMPLETED: "Concluído",
};

const statusColors: Record<string, string> = {
  NOT_STARTED: "secondary",
  IN_PROGRESS: "default",
  COMPLETED: "success",
};

export default function BracketsPage({
  params,
}: {
  params: { tournamentId: string };
}) {
  const [brackets, setBrackets] = useState<Bracket[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState(false);

  useEffect(() => {
    fetchBrackets();
  }, [params.tournamentId]);

  async function fetchBrackets() {
    try {
      setLoading(true);
      const bracketsRes = await fetch(
        `/api/tournaments/${params.tournamentId}/brackets`
      );
      if (!bracketsRes.ok) throw new Error("Failed to fetch brackets");
      const data = await bracketsRes.json();
      setBrackets(data || []);
    } catch (error) {
      toast.error("Falha ao carregar chaves.");
    } finally {
      setLoading(false);
    }
  }

  async function handleGenerateAll() {
    setGenerating(true);
    try {
      const res = await fetch(
        `/api/tournaments/${params.tournamentId}/brackets`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ generateAll: true }),
        }
      );

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || "Erro ao gerar chaves");
      }

      const data = await res.json();
      toast.success(data.message || "Chaves geradas com sucesso!");
      setConfirmDialog(false);
      fetchBrackets();
    } catch (error: any) {
      toast.error(error.message || "Erro ao gerar chaves");
    } finally {
      setGenerating(false);
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto p-6 flex justify-center items-center min-h-[400px]">
        <Loader2 className="animate-spin" />
      </div>
    );
  }

  const hasNoBrackets = brackets.length === 0;

  return (
    <div className="container mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Chaves</h1>
        <p className="text-muted-foreground">
          Gerencie as chaves de competição do torneio
        </p>
      </div>

      {/* Action Button */}
      <div className="mb-8">
        <Button
          size="lg"
          onClick={() => setConfirmDialog(true)}
          disabled={generating}
        >
          {generating ? (
            <>
              <Loader2 className="animate-spin" />
              Gerando...
            </>
          ) : (
            <>
              <Zap />
              Gerar Todas as Chaves
            </>
          )}
        </Button>
      </div>

      {/* Brackets List */}
      {hasNoBrackets ? (
        <Card>
          <CardContent className="py-12">
            <Empty>
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <Zap />
                </EmptyMedia>
                <EmptyTitle>Nenhuma chave gerada</EmptyTitle>
                <EmptyDescription>
                  Clique no botão acima para gerar as chaves de todas as
                  categorias.
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {brackets.map((bracket) => (
            <Link
              key={bracket.id}
              href={`/app/${params.tournamentId}/brackets/${bracket.id}`}
              className="block"
            >
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="font-mono text-base">
                        {bracket.category}
                      </CardTitle>
                      <CardDescription>
                        {bracket.modality} • {bracket.totalSlots} slots •{" "}
                        {bracket.totalRounds} rounds
                      </CardDescription>
                    </div>
                    <Badge variant={statusColors[bracket.status] as any}>
                      {statusLabels[bracket.status]}
                    </Badge>
                  </div>
                </CardHeader>
              </Card>
            </Link>
          ))}
        </div>
      )}

      {/* Confirm Dialog */}
      <AlertDialog open={confirmDialog} onOpenChange={setConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Gerar Todas as Chaves?</AlertDialogTitle>
            <AlertDialogDescription>
              Isso criará chaves para todas as categorias com competidores
              inscritos.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={generating}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleGenerateAll}
              disabled={generating}
            >
              {generating ? (
                <>
                  <Loader2 className="animate-spin" />
                  Gerando...
                </>
              ) : (
                "Gerar"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
