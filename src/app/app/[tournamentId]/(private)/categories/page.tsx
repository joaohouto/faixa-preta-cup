"use client";

import { useEffect, useState } from "react";
import { Competitor, Tournament } from "@prisma/client";
import { toast } from "sonner";
import { Users, Trophy, ListFilter } from "lucide-react";

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
import { Badge } from "@/components/ui/badge";
import { beltLabels, genderLabels } from "@/lib/constants/labels";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Skeleton } from "@/components/ui/skeleton";
import { fetchJson } from "@/lib/api-client";
import { useEscBack } from "@/hooks/use-esc-back";

interface CategoryGroup {
  category: string;
  competitors: Competitor[];
}


export default function CategoriesPage({
  params,
}: {
  params: Promise<{ tournamentId: string }>;
}) {
  useEscBack();
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [kataCategories, setKataCategories] = useState<CategoryGroup[]>([]);
  const [kumiteCategories, setKumiteCategories] = useState<CategoryGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [resolvedParams, setResolvedParams] = useState<{
    tournamentId: string;
  } | null>(null);

  useEffect(() => {
    params.then((p) => setResolvedParams(p));
  }, [params]);

  useEffect(() => {
    async function fetchData() {
      try {
        const data = await fetchJson<{
          tournament: Tournament | null;
          kataCategories: CategoryGroup[];
          kumiteCategories: CategoryGroup[];
        }>(`/api/tournaments/${resolvedParams!.tournamentId}/categories`);

        setTournament(data.tournament || null);
        setKataCategories(data.kataCategories || []);
        setKumiteCategories(data.kumiteCategories || []);
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Falha ao carregar categorias."
        );
      } finally {
        setLoading(false);
      }
    }

    if (!resolvedParams) return;

    fetchData();
  }, [resolvedParams?.tournamentId]);

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

  const totalKataCompetitors = kataCategories.reduce(
    (sum, cat) => sum + cat.competitors.length,
    0
  );
  const totalKumiteCompetitors = kumiteCategories.reduce(
    (sum, cat) => sum + cat.competitors.length,
    0
  );

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Categorias</h1>
        <p className="text-muted-foreground">
          Competidores organizados por categoria em {tournament.name}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total de Categorias
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <ListFilter className="size-6 text-muted-foreground" />
              <span className="text-2xl font-bold">
                {kataCategories.length + kumiteCategories.length}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Competidores Kata
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Trophy className="size-6 text-muted-foreground" />
              <span className="text-2xl font-bold">{totalKataCompetitors}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Competidores Kumite
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Trophy className="size-6 text-muted-foreground" />
              <span className="text-2xl font-bold">
                {totalKumiteCompetitors}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="kata" className="w-full">
        <TabsList className="grid w-full grid-cols-2 max-w-md">
          <TabsTrigger value="kata">Kata ({kataCategories.length})</TabsTrigger>
          <TabsTrigger value="kumite">
            Kumite ({kumiteCategories.length})
          </TabsTrigger>
        </TabsList>

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
                <Card key={group.category}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="flex items-center gap-2">
                          <span className="font-mono text-lg">
                            {group.category}
                          </span>
                        </CardTitle>
                        <CardDescription className="mt-1">
                          {group.competitors.length}{" "}
                          {group.competitors.length === 1
                            ? "competidor"
                            : "competidores"}
                        </CardDescription>
                      </div>
                      <Badge variant="secondary">
                        <Users />
                        {group.competitors.length}
                      </Badge>
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
                              <TableCell>
                                {genderLabels[competitor.gender]}
                              </TableCell>
                              <TableCell>{competitor.age} anos</TableCell>
                              <TableCell>
                                {beltLabels[competitor.belt]}
                              </TableCell>
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
              ))}
            </div>
          )}
        </TabsContent>

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
                <Card key={group.category}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="flex items-center gap-2">
                          <span className="font-mono text-lg">
                            {group.category}
                          </span>
                        </CardTitle>
                        <CardDescription className="mt-1">
                          {group.competitors.length}{" "}
                          {group.competitors.length === 1
                            ? "competidor"
                            : "competidores"}
                        </CardDescription>
                      </div>
                      <Badge variant="secondary">
                        <Users />
                        {group.competitors.length}
                      </Badge>
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
                            <TableHead>Peso</TableHead>
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
                              <TableCell>
                                {genderLabels[competitor.gender]}
                              </TableCell>
                              <TableCell>{competitor.age} anos</TableCell>
                              <TableCell>
                                {competitor.weight
                                  ? `${competitor.weight} kg`
                                  : "—"}
                              </TableCell>
                              <TableCell>
                                {beltLabels[competitor.belt]}
                              </TableCell>
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
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
