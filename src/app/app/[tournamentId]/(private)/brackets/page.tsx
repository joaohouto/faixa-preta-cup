"use client";

import { use, useEffect, useState } from "react";
import { Bracket, Competitor } from "@prisma/client";
import { toast } from "sonner";
import {
  Trophy,
  Zap,
  Loader2,
  Trash2,
  Eye,
  CheckCircle2,
  Clock,
  Activity,
  AlertTriangle,
} from "lucide-react";
import Link from "next/link";
import { beltLabels, genderLabels } from "@/lib/constants/labels";
import { cn } from "@/lib/utils";
import { fetchJson } from "@/lib/api-client";
import {
  bracketStatusLabel,
  bracketStatusBadgeClass,
  bracketStatusBorderClass,
} from "@/lib/utils/bracket-status";
import { useEscBack } from "@/hooks/use-esc-back";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
import { Skeleton } from "@/components/ui/skeleton";

interface CategoryGroup {
  category: string;
  competitors: Competitor[];
  bracket?: Bracket;
}

type BracketWithCount = Bracket & {
  _count?: { matches: number };
};

const statusIcons = {
  NOT_STARTED: Clock,
  IN_PROGRESS: Activity,
  COMPLETED: CheckCircle2,
};

type DeleteTarget = {
  bracketId: string;
  category: string;
  status: string;
};

export default function BracketsPage({
  params,
}: {
  params: Promise<{ tournamentId: string }>;
}) {
  const { tournamentId } = use(params);
  useEscBack();

  const [kataCategories, setKataCategories] = useState<CategoryGroup[]>([]);
  const [kumiteCategories, setKumiteCategories] = useState<CategoryGroup[]>([]);
  const [brackets, setBrackets] = useState<BracketWithCount[]>([]);
  const [loading, setLoading] = useState(true);
  const [generatingAll, setGeneratingAll] = useState(false);
  const [confirmGenerateAll, setConfirmGenerateAll] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null);

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function fetchData() {
    try {
      setLoading(true);

      const [categoriesData, bracketsData] = await Promise.all([
        fetchJson<{
          kataCategories: CategoryGroup[];
          kumiteCategories: CategoryGroup[];
        }>(`/api/tournaments/${tournamentId}/categories`),
        fetchJson<BracketWithCount[]>(
          `/api/tournaments/${tournamentId}/brackets`,
        ),
      ]);

      applyBracketsToCategories(categoriesData, bracketsData);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Falha ao carregar dados.",
      );
    } finally {
      setLoading(false);
    }
  }

  async function refreshBrackets() {
    try {
      const bracketsData = await fetchJson<BracketWithCount[]>(
        `/api/tournaments/${tournamentId}/brackets`,
      );

      setBrackets(bracketsData);
      const bracketsMap = new Map(
        bracketsData.map((b: BracketWithCount) => [b.category, b]),
      );

      setKataCategories((prev: CategoryGroup[]) =>
        prev.map((cat: CategoryGroup) => ({
          ...cat,
          bracket: bracketsMap.get(cat.category),
        })),
      );
      setKumiteCategories((prev: CategoryGroup[]) =>
        prev.map((cat: CategoryGroup) => ({
          ...cat,
          bracket: bracketsMap.get(cat.category),
        })),
      );
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Falha ao atualizar chaves.",
      );
    }
  }

  function applyBracketsToCategories(
    categoriesData: {
      kataCategories: CategoryGroup[];
      kumiteCategories: CategoryGroup[];
    },
    bracketsData: BracketWithCount[],
  ) {
    setBrackets(bracketsData);
    const bracketsMap = new Map(
      bracketsData.map((b: BracketWithCount) => [b.category, b]),
    );

    setKataCategories(
      categoriesData.kataCategories.map((cat: CategoryGroup) => ({
        ...cat,
        bracket: bracketsMap.get(cat.category),
      })),
    );

    setKumiteCategories(
      categoriesData.kumiteCategories.map((cat: CategoryGroup) => ({
        ...cat,
        bracket: bracketsMap.get(cat.category),
      })),
    );
  }

  async function handleGenerateAll() {
    setGeneratingAll(true);
    try {
      const data = await fetchJson<{ message?: string }>(
        `/api/tournaments/${tournamentId}/brackets`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ generateAll: true }),
        },
      );

      toast.success(data.message || "Chaves geradas com sucesso!");
      setConfirmGenerateAll(false);
      await refreshBrackets();
    } catch (error: any) {
      toast.error(error.message || "Erro ao gerar chaves");
    } finally {
      setGeneratingAll(false);
    }
  }

  async function handleGenerateSingle(category: string, modality: string) {
    setActionLoading(category);
    try {
      await fetchJson(`/api/tournaments/${tournamentId}/brackets`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ category, modality }),
      });

      toast.success("Chave gerada com sucesso!");
      await refreshBrackets();
    } catch (error: any) {
      toast.error(error.message || "Erro ao gerar chave");
    } finally {
      setActionLoading(null);
    }
  }

  function handleDeleteBracketRequest(bracketId: string, category: string) {
    const bracket = brackets.find((b: BracketWithCount) => b.id === bracketId);
    if (!bracket) return;
    setDeleteTarget({ bracketId, category, status: bracket.status });
  }

  async function handleDeleteBracketConfirm() {
    if (!deleteTarget) return;

    const { bracketId, category } = deleteTarget;
    setActionLoading(category);
    setDeleteTarget(null);

    try {
      await fetchJson(
        `/api/tournaments/${tournamentId}/brackets/${bracketId}`,
        { method: "DELETE" },
      );

      toast.success("Chave excluída com sucesso!");

      // Update state directly without full reload
      setBrackets((prev: BracketWithCount[]) =>
        prev.filter((b: BracketWithCount) => b.id !== bracketId),
      );
      setKataCategories((prev: CategoryGroup[]) =>
        prev.map((cat: CategoryGroup) =>
          cat.bracket?.id === bracketId ? { ...cat, bracket: undefined } : cat,
        ),
      );
      setKumiteCategories((prev: CategoryGroup[]) =>
        prev.map((cat: CategoryGroup) =>
          cat.bracket?.id === bracketId ? { ...cat, bracket: undefined } : cat,
        ),
      );
    } catch (error: any) {
      toast.error(error.message || "Erro ao excluir chave");
    } finally {
      setActionLoading(null);
    }
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

  const totalCategories = kataCategories.length + kumiteCategories.length;

  const stats = {
    totalBrackets: brackets.length,
    inProgress: brackets.filter(
      (b: BracketWithCount) => b.status === "IN_PROGRESS",
    ).length,
    completed: brackets.filter(
      (b: BracketWithCount) => b.status === "COMPLETED",
    ).length,
  };

  return (
    <div className="container mx-auto p-6 print:p-0">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Chaves e Categorias</h1>
          <div className="flex items-center flex-wrap gap-x-3 gap-y-1 mt-1.5 print:hidden">
            <span className="text-sm text-muted-foreground">
              {totalCategories} categorias · {stats.totalBrackets} chaves
              geradas
            </span>
            {stats.inProgress > 0 && (
              <span className="inline-flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400">
                <span className="size-1.5 rounded-full bg-blue-400 animate-pulse" />
                {stats.inProgress} em andamento
              </span>
            )}
            {stats.completed > 0 && (
              <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                <CheckCircle2 className="size-3" />
                {stats.completed} concluída{stats.completed !== 1 ? "s" : ""}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Generate All Button */}
      <div className="mb-6 print:hidden">
        <Button
          size="lg"
          onClick={() => setConfirmGenerateAll(true)}
          disabled={generatingAll}
        >
          {generatingAll ? (
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

      {/* Tabs */}
      <Tabs defaultValue="kata" className="w-full">
        <TabsList className="grid w-full grid-cols-2 max-w-md print:hidden">
          <TabsTrigger value="kata">Kata ({kataCategories.length})</TabsTrigger>
          <TabsTrigger value="kumite">
            Kumite ({kumiteCategories.length})
          </TabsTrigger>
        </TabsList>

        {/* Kata Tab */}
        <TabsContent value="kata" className="mt-6">
          {kataCategories.length === 0 ? (
            <Card>
              <CardContent className="py-12">
                <Empty>
                  <EmptyHeader>
                    <EmptyMedia variant="icon">
                      <Trophy />
                    </EmptyMedia>
                    <EmptyTitle>Nenhuma categoria Kata</EmptyTitle>
                    <EmptyDescription>
                      Não há competidores inscritos em Kata ainda.
                    </EmptyDescription>
                  </EmptyHeader>
                </Empty>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-6">
              {kataCategories.map((group) => (
                <CategoryCard
                  key={group.category}
                  group={group}
                  modality="KATA"
                  onGenerateBracket={handleGenerateSingle}
                  onDeleteBracket={handleDeleteBracketRequest}
                  isLoading={actionLoading === group.category}
                  tournamentId={tournamentId}
                />
              ))}
            </div>
          )}
        </TabsContent>

        {/* Kumite Tab */}
        <TabsContent value="kumite" className="mt-6">
          {kumiteCategories.length === 0 ? (
            <Card>
              <CardContent className="py-12">
                <Empty>
                  <EmptyHeader>
                    <EmptyMedia variant="icon">
                      <Trophy />
                    </EmptyMedia>
                    <EmptyTitle>Nenhuma categoria Kumite</EmptyTitle>
                    <EmptyDescription>
                      Não há competidores inscritos em Kumite ainda.
                    </EmptyDescription>
                  </EmptyHeader>
                </Empty>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-6">
              {kumiteCategories.map((group) => (
                <CategoryCard
                  key={group.category}
                  group={group}
                  modality="KUMITE"
                  onGenerateBracket={handleGenerateSingle}
                  onDeleteBracket={handleDeleteBracketRequest}
                  isLoading={actionLoading === group.category}
                  tournamentId={tournamentId}
                />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Confirm Generate All Dialog */}
      <AlertDialog
        open={confirmGenerateAll}
        onOpenChange={setConfirmGenerateAll}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Gerar Todas as Chaves?</AlertDialogTitle>
            <AlertDialogDescription>
              Isso criará chaves para todas as categorias com competidores
              inscritos. Chaves que já estiverem em andamento não serão
              recriadas.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={generatingAll}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleGenerateAll}
              disabled={generatingAll}
            >
              {generatingAll ? (
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

      {/* Confirm Delete Bracket Dialog */}
      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              {deleteTarget?.status !== "NOT_STARTED" && (
                <AlertTriangle className="h-5 w-5 text-destructive" />
              )}
              Excluir Chave?
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2">
                {deleteTarget?.status === "IN_PROGRESS" && (
                  <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-destructive text-sm font-medium">
                    Esta chave está em andamento! Todos os resultados
                    registrados serão perdidos.
                  </div>
                )}
                {deleteTarget?.status === "COMPLETED" && (
                  <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-destructive text-sm font-medium">
                    Esta chave já foi concluída! O histórico completo da
                    competição será perdido.
                  </div>
                )}
                <p>
                  Tem certeza que deseja excluir a chave{" "}
                  <strong className="font-mono text-xs">
                    {deleteTarget?.category}
                  </strong>
                  ? Esta ação não pode ser desfeita.
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteBracketConfirm}
              className="bg-destructive text-background hover:bg-destructive/90"
            >
              <Trash2 />
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// Componente de Card de Categoria
function CategoryCard({
  group,
  modality,
  onGenerateBracket,
  onDeleteBracket,
  isLoading,
  tournamentId,
}: {
  group: CategoryGroup;
  modality: string;
  onGenerateBracket: (category: string, modality: string) => void;
  onDeleteBracket: (bracketId: string, category: string) => void;
  isLoading: boolean;
  tournamentId: string;
}) {
  const StatusIcon = group.bracket ? statusIcons[group.bracket.status] : Clock;

  return (
    <Card
      id={group.bracket ? `bracket-${group.bracket.id}` : undefined}
      className={cn(
        "border-l-4",
        bracketStatusBorderClass[group.bracket?.status ?? "NOT_STARTED"],
      )}
    >
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div className="flex-1 min-w-0">
            <CardTitle className="flex items-center flex-wrap gap-2 mb-2">
              <span className="font-mono text-lg break-all">
                {group.category}
              </span>

              {group.bracket && (
                <Badge
                  variant="outline"
                  className={cn(
                    "flex items-center gap-1 print:hidden",
                    bracketStatusBadgeClass[group.bracket.status],
                  )}
                >
                  <StatusIcon
                    className={cn(
                      "size-3",
                      group.bracket.status === "IN_PROGRESS" && "animate-pulse",
                    )}
                  />
                  {bracketStatusLabel[group.bracket.status]}
                </Badge>
              )}
            </CardTitle>
            <CardDescription>
              {group.competitors.length}{" "}
              {group.competitors.length === 1 ? "competidor" : "competidores"}
            </CardDescription>
          </div>

          <div className="flex items-center gap-2 print:hidden shrink-0">
            {group.bracket ? (
              <>
                {/* Ver Chave */}
                <Link
                  href={`/app/${tournamentId}/brackets/${group.bracket.id}`}
                  className="flex-1 sm:flex-none"
                >
                  <Button variant="outline" className="w-full">
                    <Eye />
                    Ver Chave
                  </Button>
                </Link>

                {/* Deletar */}
                <Button
                  size="icon"
                  variant="outline"
                  onClick={() =>
                    onDeleteBracket(group.bracket!.id, group.category)
                  }
                  disabled={isLoading}
                  className="text-destructive border-destructive/30 hover:bg-destructive/10 hover:border-destructive/60 shrink-0"
                >
                  {isLoading ? (
                    <Loader2 className="animate-spin" />
                  ) : (
                    <Trash2 className="h-4 w-4" />
                  )}
                </Button>
              </>
            ) : (
              /* Gerar Chave */
              <Button
                variant="outline"
                onClick={() => onGenerateBracket(group.category, modality)}
                disabled={isLoading || group.competitors.length < 2}
                className="w-full sm:w-auto"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="animate-spin" />
                    Gerando...
                  </>
                ) : (
                  <>
                    <Zap />
                    Gerar Chave
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {/* Mobile: lista empilhada — a tabela alinhada não cabe numa tela estreita */}
        <div className="sm:hidden rounded-md border divide-y">
          {group.competitors.map((competitor) => (
            <div key={competitor.id} className="p-3">
              <p className="font-medium">{competitor.name}</p>
              <p className="text-sm text-muted-foreground mt-0.5">
                {genderLabels[competitor.gender]} · {competitor.age} anos
                {modality === "KUMITE" &&
                  ` · ${competitor.weight ? `${competitor.weight} kg` : "peso —"}`}
                {" · "}
                {beltLabels[competitor.belt]}
              </p>
              <p className="text-sm text-muted-foreground truncate">
                {competitor.school}
              </p>
            </div>
          ))}
        </div>

        {/* Desktop: tabela com colunas alinhadas entre os cards */}
        <div className="hidden sm:block rounded-md border">
          <Table className="table-fixed">
            <TableHeader>
              <TableRow>
                <TableHead className="w-[30%]">Nome</TableHead>
                <TableHead className="w-24">Sexo</TableHead>
                <TableHead className="w-20">Idade</TableHead>
                {modality === "KUMITE" && (
                  <TableHead className="w-20">Peso</TableHead>
                )}
                <TableHead className="w-28">Faixa</TableHead>
                <TableHead>Escola</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {group.competitors.map((competitor) => (
                <TableRow key={competitor.id}>
                  <TableCell className="font-medium truncate">
                    {competitor.name}
                  </TableCell>
                  <TableCell>{genderLabels[competitor.gender]}</TableCell>
                  <TableCell>{competitor.age} anos</TableCell>
                  {modality === "KUMITE" && (
                    <TableCell>
                      {competitor.weight ? `${competitor.weight} kg` : "—"}
                    </TableCell>
                  )}
                  <TableCell>{beltLabels[competitor.belt]}</TableCell>
                  <TableCell className="text-muted-foreground truncate">
                    {competitor.school}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
