"use client";

import { useEffect, useState } from "react";
import { Bracket } from "@prisma/client";
import { toast } from "sonner";
import {
  Loader2,
  Zap,
  Trophy,
  Clock,
  CheckCircle2,
  Trash2,
  Layers,
  Activity,
} from "lucide-react";
import Link from "next/link";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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

type BracketWithCount = Bracket & {
  _count?: {
    matches: number;
  };
};

type BadgeVariant = "default" | "secondary" | "destructive" | "outline";

const statusLabels: Record<string, string> = {
  NOT_STARTED: "Não iniciado",
  IN_PROGRESS: "Em andamento",
  COMPLETED: "Concluído",
};

const statusColors: Record<string, BadgeVariant> = {
  NOT_STARTED: "secondary",
  IN_PROGRESS: "default",
  COMPLETED: "outline",
};

const statusIcons = {
  NOT_STARTED: Clock,
  IN_PROGRESS: Loader2,
  COMPLETED: CheckCircle2,
};

export default function BracketsPage({
  params,
}: {
  params: { tournamentId: string };
}) {
  const [brackets, setBrackets] = useState<BracketWithCount[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

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
    setError(null);

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
      const errorMsg = error.message || "Erro ao gerar chaves";
      setError(errorMsg);
      toast.error(errorMsg);
    } finally {
      setGenerating(false);
    }
  }

  async function handleDeleteBracket(bracketId: string, e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();

    if (!confirm("Tem certeza que deseja excluir esta chave?")) return;

    setDeletingId(bracketId);
    try {
      const res = await fetch(
        `/api/tournaments/${params.tournamentId}/brackets/${bracketId}`,
        { method: "DELETE" }
      );

      if (!res.ok) throw new Error("Falha ao excluir chave");

      toast.success("Chave excluída com sucesso!");
      fetchBrackets();
    } catch (error) {
      toast.error("Erro ao excluir chave");
    } finally {
      setDeletingId(null);
    }
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

  const hasNoBrackets = brackets.length === 0;
  const kataBrackets = brackets.filter((b) => b.modality === "KATA");
  const kumiteBrackets = brackets.filter((b) => b.modality === "KUMITE");

  const stats = {
    total: brackets.length,
    inProgress: brackets.filter((b) => b.status === "IN_PROGRESS").length,
    completed: brackets.filter((b) => b.status === "COMPLETED").length,
  };

  return (
    <div className="container mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Chaves</h1>
        <p className="text-muted-foreground">
          Gerencie as chaves de competição do torneio
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total de Chaves
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Layers className="h-5 w-5 text-muted-foreground" />
              <span className="text-2xl font-bold">{stats.total}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Em Andamento
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-blue-600" />
              <span className="text-2xl font-bold">{stats.inProgress}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Concluídas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
              <span className="text-2xl font-bold">{stats.completed}</span>
            </div>
          </CardContent>
        </Card>
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
        <Tabs defaultValue="kata" className="w-full">
          <TabsList className="grid w-full grid-cols-2 max-w-md">
            <TabsTrigger value="kata">Kata ({kataBrackets.length})</TabsTrigger>
            <TabsTrigger value="kumite">
              Kumite ({kumiteBrackets.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="kata" className="mt-6">
            {kataBrackets.length === 0 ? (
              <Card>
                <CardContent className="py-12">
                  <Empty>
                    <EmptyHeader>
                      <EmptyMedia variant="icon">
                        <Trophy />
                      </EmptyMedia>
                      <EmptyTitle>Nenhuma chave de Kata</EmptyTitle>
                      <EmptyDescription>
                        Não há chaves geradas para categorias de Kata.
                      </EmptyDescription>
                    </EmptyHeader>
                  </Empty>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 gap-4">
                {kataBrackets.map((bracket) => (
                  <BracketCard
                    key={bracket.id}
                    bracket={bracket}
                    tournamentId={params.tournamentId}
                    onDelete={handleDeleteBracket}
                    isDeleting={deletingId === bracket.id}
                  />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="kumite" className="mt-6">
            {kumiteBrackets.length === 0 ? (
              <Card>
                <CardContent className="py-12">
                  <Empty>
                    <EmptyHeader>
                      <EmptyMedia variant="icon">
                        <Trophy />
                      </EmptyMedia>
                      <EmptyTitle>Nenhuma chave de Kumite</EmptyTitle>
                      <EmptyDescription>
                        Não há chaves geradas para categorias de Kumite.
                      </EmptyDescription>
                    </EmptyHeader>
                  </Empty>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 gap-4">
                {kumiteBrackets.map((bracket) => (
                  <BracketCard
                    key={bracket.id}
                    bracket={bracket}
                    tournamentId={params.tournamentId}
                    onDelete={handleDeleteBracket}
                    isDeleting={deletingId === bracket.id}
                  />
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      )}

      {/* Confirm Dialog */}
      <AlertDialog open={confirmDialog} onOpenChange={setConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Gerar Todas as Chaves?</AlertDialogTitle>
            <AlertDialogDescription>
              Isso criará chaves para todas as categorias com competidores
              inscritos. Chaves que já estiverem em andamento não serão
              recriadas.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {error && <p className="text-sm text-destructive mt-2">{error}</p>}
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
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
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

// Componente de Card de Bracket
function BracketCard({
  bracket,
  tournamentId,
  onDelete,
  isDeleting,
}: {
  bracket: BracketWithCount;
  tournamentId: string;
  onDelete: (id: string, e: React.MouseEvent) => void;
  isDeleting: boolean;
}) {
  const StatusIcon = statusIcons[bracket.status];

  return (
    <Link
      href={`/app/${tournamentId}/brackets/${bracket.id}`}
      className="block group"
    >
      <Card className="hover:shadow-lg transition-shadow">
        <CardHeader>
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <CardTitle className="font-mono text-base mb-2 truncate group-hover:text-primary transition-colors">
                {bracket.category}
              </CardTitle>
              <CardDescription>
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge
                    variant="secondary"
                    className={
                      bracket.modality === "KATA"
                        ? "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
                        : "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
                    }
                  >
                    {bracket.modality}
                  </Badge>
                  <span className="text-xs">{bracket.totalSlots} vagas</span>
                  <span className="text-xs">•</span>
                  <span className="text-xs">{bracket.totalRounds} rodadas</span>
                </div>
              </CardDescription>
            </div>

            <div className="flex items-center gap-2">
              <Badge
                variant={statusColors[bracket.status]}
                className="flex items-center gap-1"
              >
                <StatusIcon className="h-3 w-3" />
                {statusLabels[bracket.status]}
              </Badge>

              {bracket.status === "NOT_STARTED" && (
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={(e) => onDelete(bracket.id, e)}
                  disabled={isDeleting}
                  className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                >
                  {isDeleting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Trash2 className="h-4 w-4" />
                  )}
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
      </Card>
    </Link>
  );
}
