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
import { usePageTitle } from "@/hooks/use-page-title";

interface CategoryGroup {
  category: string;
  competitors: Competitor[];
}

export default function CategoriesClient({
  tournamentId,
}: {
  tournamentId: string;
}) {
  useEscBack();
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [kataCategories, setKataCategories] = useState<CategoryGroup[]>([]);
  const [kumiteCategories, setKumiteCategories] = useState<CategoryGroup[]>([]);
  const [loading, setLoading] = useState(true);

  const pageTitle = tournament ? `Categorias — ${tournament.name}` : "Categorias";
  usePageTitle(pageTitle);

  useEffect(() => {
    async function fetchData() {
      try {
        const data = await fetchJson<{
          tournament: Tournament | null;
          kataCategories: CategoryGroup[];
          kumiteCategories: CategoryGroup[];
        }>(`/api/tournaments/${tournamentId}/categories`);

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

    fetchData();
  }, [tournamentId]);

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

  const totalCompetitors = [...kataCategories, ...kumiteCategories].reduce(
    (acc, cat) => acc + cat.competitors.length,
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
              Categorias de Kata
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Trophy className="size-6 text-muted-foreground" />
              <span className="text-2xl font-bold">{kataCategories.length}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Categorias de Kumite
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Users className="size-6 text-muted-foreground" />
              <span className="text-2xl font-bold">
                {kumiteCategories.length}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="all" className="space-y-4">
        <TabsList>
          <TabsTrigger value="all">
            Todas ({kataCategories.length + kumiteCategories.length})
          </TabsTrigger>
          <TabsTrigger value="kata">Kata ({kataCategories.length})</TabsTrigger>
          <TabsTrigger value="kumite">
            Kumite ({kumiteCategories.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="space-y-6">
          {kataCategories.length === 0 && kumiteCategories.length === 0 ? (
            <Card>
              <CardContent className="p-12">
                <Empty>
                  <EmptyHeader>
                    <EmptyMedia variant="icon">
                      <ListFilter className="size-8 text-muted-foreground" />
                    </EmptyMedia>
                    <EmptyTitle>Nenhuma categoria encontrada</EmptyTitle>
                    <EmptyDescription>
                      Cadastre competidores para que as categorias sejam geradas
                      automaticamente.
                    </EmptyDescription>
                  </EmptyHeader>
                </Empty>
              </CardContent>
            </Card>
          ) : (
            <>
              {kataCategories.length > 0 && (
                <div>
                  <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                    <Trophy className="size-5" />
                    Categorias de Kata
                  </h2>
                  <div className="space-y-4">
                    {kataCategories.map((group) => (
                      <CategoryCard key={group.category} group={group} />
                    ))}
                  </div>
                </div>
              )}

              {kumiteCategories.length > 0 && (
                <div>
                  <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                    <Users className="size-5" />
                    Categorias de Kumite
                  </h2>
                  <div className="space-y-4">
                    {kumiteCategories.map((group) => (
                      <CategoryCard key={group.category} group={group} />
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </TabsContent>

        <TabsContent value="kata" className="space-y-4">
          {kataCategories.length === 0 ? (
            <Card>
              <CardContent className="p-12">
                <Empty>
                  <EmptyHeader>
                    <EmptyMedia variant="icon">
                      <Trophy className="size-8 text-muted-foreground" />
                    </EmptyMedia>
                    <EmptyTitle>Nenhuma categoria de Kata</EmptyTitle>
                    <EmptyDescription>
                      Não há competidores inscritos em Kata.
                    </EmptyDescription>
                  </EmptyHeader>
                </Empty>
              </CardContent>
            </Card>
          ) : (
            kataCategories.map((group) => (
              <CategoryCard key={group.category} group={group} />
            ))
          )}
        </TabsContent>

        <TabsContent value="kumite" className="space-y-4">
          {kumiteCategories.length === 0 ? (
            <Card>
              <CardContent className="p-12">
                <Empty>
                  <EmptyHeader>
                    <EmptyMedia variant="icon">
                      <Users className="size-8 text-muted-foreground" />
                    </EmptyMedia>
                    <EmptyTitle>Nenhuma categoria de Kumite</EmptyTitle>
                    <EmptyDescription>
                      Não há competidores inscritos em Kumite.
                    </EmptyDescription>
                  </EmptyHeader>
                </Empty>
              </CardContent>
            </Card>
          ) : (
            kumiteCategories.map((group) => (
              <CategoryCard key={group.category} group={group} />
            ))
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function CategoryCard({ group }: { group: CategoryGroup }) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">{group.category}</CardTitle>
          <Badge variant="secondary">
            {group.competitors.length}{" "}
            {group.competitors.length === 1 ? "competidor" : "competidores"}
          </Badge>
        </div>
        <CardDescription>
          Competidores classificados nesta categoria
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Idade</TableHead>
              <TableHead>Sexo</TableHead>
              <TableHead>Faixa</TableHead>
              <TableHead>Peso</TableHead>
              <TableHead>Academia</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {group.competitors.map((competitor) => (
              <TableRow key={competitor.id}>
                <TableCell className="font-medium">{competitor.name}</TableCell>
                <TableCell>{competitor.age} anos</TableCell>
                <TableCell>{genderLabels[competitor.gender]}</TableCell>
                <TableCell>
                  <Badge variant="outline">
                    {beltLabels[competitor.belt]}
                  </Badge>
                </TableCell>
                <TableCell>
                  {competitor.weight ? `${competitor.weight} kg` : "-"}
                </TableCell>
                <TableCell>{competitor.school}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
