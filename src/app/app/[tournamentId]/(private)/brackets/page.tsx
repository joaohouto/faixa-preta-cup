"use client";

import { useEffect, useState } from "react";
import { Bracket, Competitor } from "@prisma/client";
import { toast } from "sonner";
import {
  Users,
  Trophy,
  ListFilter,
  Zap,
  Loader2,
  Play,
  Trash2,
  Eye,
  CheckCircle2,
  Clock,
  Flag,
  HeartPulse,
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

interface CategoryGroup {
  category: string;
  competitors: Competitor[];
  bracket?: Bracket;
}

type BracketWithCount = Bracket & {
  _count?: { matches: number };
};

const beltLabels: Record<string, string> = {
  WHITE: "Branca",
  BLUE: "Azul",
  YELLOW: "Amarela",
  RED: "Vermelha",
  ORANGE: "Laranja",
  GREEN: "Verde",
  PURPLE: "Roxa",
  BROWN: "Marrom",
  BLACK: "Preta",
};

const genderLabels: Record<string, string> = {
  MALE: "Masculino",
  FEMALE: "Feminino",
};

const statusLabels: Record<string, string> = {
  NOT_STARTED: "Não iniciado",
  IN_PROGRESS: "Em andamento",
  COMPLETED: "Concluído",
};

const statusIcons = {
  NOT_STARTED: Clock,
  IN_PROGRESS: Activity,
  COMPLETED: CheckCircle2,
};

export default function BracketsPage({
  params,
}: {
  params: Promise<{ tournamentId: string }>;
}) {
  const [resolvedParams, setResolvedParams] = useState<{
    tournamentId: string;
  } | null>(null);

  const [kataCategories, setKataCategories] = useState<CategoryGroup[]>([]);
  const [kumiteCategories, setKumiteCategories] = useState<CategoryGroup[]>([]);
  const [brackets, setBrackets] = useState<BracketWithCount[]>([]);
  const [loading, setLoading] = useState(true);
  const [generatingAll, setGeneratingAll] = useState(false);
  const [confirmGenerateAll, setConfirmGenerateAll] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    params.then((p) => setResolvedParams(p));
  }, [params]);

  useEffect(() => {
    if (!resolvedParams) return;
    fetchData();
  }, [resolvedParams]);

  async function fetchData() {
    try {
      setLoading(true);

      // Buscar categorias
      const categoriesRes = await fetch(
        `/api/tournaments/${resolvedParams!.tournamentId}/categories`
      );
      if (!categoriesRes.ok) throw new Error("Failed to fetch categories");
      const categoriesData = await categoriesRes.json();

      // Buscar brackets
      const bracketsRes = await fetch(
        `/api/tournaments/${resolvedParams!.tournamentId}/brackets`
      );
      if (!bracketsRes.ok) throw new Error("Failed to fetch brackets");
      const bracketsData: BracketWithCount[] = await bracketsRes.json();

      setBrackets(bracketsData);

      // Mapear brackets para categorias
      const bracketsMap = new Map(bracketsData.map((b) => [b.category, b]));

      const kataWithBrackets = categoriesData.kataCategories.map(
        (cat: CategoryGroup) => ({
          ...cat,
          bracket: bracketsMap.get(cat.category),
        })
      );

      const kumiteWithBrackets = categoriesData.kumiteCategories.map(
        (cat: CategoryGroup) => ({
          ...cat,
          bracket: bracketsMap.get(cat.category),
        })
      );

      setKataCategories(kataWithBrackets);
      setKumiteCategories(kumiteWithBrackets);
    } catch (error) {
      toast.error("Falha ao carregar dados.");
    } finally {
      setLoading(false);
    }
  }

  async function handleGenerateAll() {
    setGeneratingAll(true);
    try {
      const res = await fetch(
        `/api/tournaments/${resolvedParams!.tournamentId}/brackets`,
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
      setConfirmGenerateAll(false);
      fetchData();
    } catch (error: any) {
      toast.error(error.message || "Erro ao gerar chaves");
    } finally {
      setGeneratingAll(false);
    }
  }

  async function handleGenerateSingle(category: string, modality: string) {
    setActionLoading(category);
    try {
      const res = await fetch(
        `/api/tournaments/${resolvedParams!.tournamentId}/brackets`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ category, modality }),
        }
      );

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || "Erro ao gerar chave");
      }

      toast.success("Chave gerada com sucesso!");
      fetchData();
    } catch (error: any) {
      toast.error(error.message || "Erro ao gerar chave");
    } finally {
      setActionLoading(null);
    }
  }

  async function handleDeleteBracket(bracketId: string, category: string) {
    const bracket = brackets.find((b) => b.id === bracketId);
    if (!bracket) return;

    let confirmMessage = "Tem certeza que deseja excluir esta chave?";

    if (bracket.status === "IN_PROGRESS") {
      confirmMessage =
        "⚠️ ATENÇÃO: Esta chave está em andamento!\n\n" +
        "Todos os resultados registrados serão PERDIDOS.\n\n" +
        "Tem certeza que deseja continuar?";
    } else if (bracket.status === "COMPLETED") {
      confirmMessage =
        "⚠️ ATENÇÃO: Esta chave já foi concluída!\n\n" +
        "O histórico completo da competição será PERDIDO.\n\n" +
        "Tem certeza que deseja continuar?";
    }

    if (!confirm(confirmMessage)) return;

    setActionLoading(category);
    try {
      const res = await fetch(
        `/api/tournaments/${
          resolvedParams!.tournamentId
        }/brackets/${bracketId}`,
        { method: "DELETE" }
      );

      if (!res.ok) throw new Error("Falha ao excluir chave");

      toast.success("Chave excluída com sucesso!");
      fetchData();
    } catch (error) {
      toast.error("Erro ao excluir chave");
    } finally {
      setActionLoading(null);
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

  const totalCategories = kataCategories.length + kumiteCategories.length;
  const totalKataCompetitors = kataCategories.reduce(
    (sum, cat) => sum + cat.competitors.length,
    0
  );
  const totalKumiteCompetitors = kumiteCategories.reduce(
    (sum, cat) => sum + cat.competitors.length,
    0
  );

  const stats = {
    totalBrackets: brackets.length,
    inProgress: brackets.filter((b) => b.status === "IN_PROGRESS").length,
    completed: brackets.filter((b) => b.status === "COMPLETED").length,
  };

  return (
    <div className="container mx-auto p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Chaves e Categorias</h1>
        <p className="text-muted-foreground">
          Gerencie categorias e suas chaves de competição
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Categorias
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <ListFilter className="h-5 w-5 text-muted-foreground" />
              <span className="text-2xl font-bold">{totalCategories}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Chaves Geradas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-muted-foreground" />
              <span className="text-2xl font-bold">{stats.totalBrackets}</span>
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
              <Loader2 className="h-5 w-5 text-blue-600" />
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

      {/* Generate All Button */}
      <div className="mb-6">
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
        <TabsList className="grid w-full grid-cols-2 max-w-md">
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
                  onDeleteBracket={handleDeleteBracket}
                  isLoading={actionLoading === group.category}
                  tournamentId={resolvedParams!.tournamentId}
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
                  onDeleteBracket={handleDeleteBracket}
                  isLoading={actionLoading === group.category}
                  tournamentId={resolvedParams!.tournamentId}
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
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <CardTitle className="flex items-center gap-2 mb-2">
              <span className="font-mono text-lg">{group.category}</span>

              {group.bracket && (
                <Badge
                  variant={
                    group.bracket.status === "COMPLETED" ? "default" : "outline"
                  }
                  className="flex items-center gap-1"
                >
                  <StatusIcon />

                  {statusLabels[group.bracket.status]}
                </Badge>
              )}
            </CardTitle>
            <CardDescription>
              {group.competitors.length}{" "}
              {group.competitors.length === 1 ? "competidor" : "competidores"}
            </CardDescription>
          </div>

          <div className="flex items-center gap-2">
            {/* Status Badge */}

            {/* Botões de Ação */}
            {group.bracket ? (
              <>
                {/* Ver Chave */}
                <Link
                  href={`/app/${tournamentId}/brackets/${group.bracket.id}`}
                >
                  <Button size="sm" variant="outline">
                    <Eye />
                    Ver Chave
                  </Button>
                </Link>

                {/* Painel de Árbitro (se não completada) */}
                {group.bracket.status !== "COMPLETED" && (
                  <Link
                    href={`/app/${tournamentId}/brackets/${group.bracket.id}/referee`}
                  >
                    <Button size="sm">
                      <Flag />
                      Arbitrar
                    </Button>
                  </Link>
                )}

                {/* Deletar */}
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() =>
                    onDeleteBracket(group.bracket!.id, group.category)
                  }
                  disabled={isLoading}
                  className="text-destructive hover:text-destructive hover:bg-destructive/10"
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
                size="sm"
                variant="outline"
                onClick={() => onGenerateBracket(group.category, modality)}
                disabled={isLoading || group.competitors.length < 2}
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
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">#</TableHead>
                <TableHead>Nome</TableHead>
                <TableHead>Sexo</TableHead>
                <TableHead>Idade</TableHead>
                {modality === "KUMITE" && <TableHead>Peso</TableHead>}
                <TableHead>Faixa</TableHead>
                <TableHead>Escola</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {group.competitors.map((competitor, index) => (
                <TableRow key={competitor.id}>
                  <TableCell className="font-medium text-muted-foreground">
                    {index + 1}
                  </TableCell>
                  <TableCell className="font-medium">
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
                  <TableCell className="text-muted-foreground">
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
