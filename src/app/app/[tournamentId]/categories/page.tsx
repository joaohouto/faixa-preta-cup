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
import { Spinner } from "@/components/luxe/spinner";
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
}

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

export default function CategoriesPage({
  params,
}: {
  params: { tournamentId: string };
}) {
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [kataCategories, setKataCategories] = useState<CategoryGroup[]>([]);
  const [kumiteCategories, setKumiteCategories] = useState<CategoryGroup[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        // Buscar torneio
        const tournamentRes = await fetch(
          `/api/tournaments/${params.tournamentId}`
        );
        if (!tournamentRes.ok) throw new Error("Tournament not found");
        const tournamentData = await tournamentRes.json();
        setTournament(tournamentData);

        // Buscar competidores
        const competitorsRes = await fetch(
          `/api/competitors?tournamentId=${params.tournamentId}`
        );
        if (!competitorsRes.ok) throw new Error("Failed to fetch competitors");
        const competitors: Competitor[] = await competitorsRes.json();

        // Agrupar por categoria Kata
        const kataGroups = groupByCategory(
          competitors.filter((c) => c.kata && c.kataCategory),
          "kataCategory"
        );
        setKataCategories(kataGroups);

        // Agrupar por categoria Kumite
        const kumiteGroups = groupByCategory(
          competitors.filter((c) => c.kumite && c.kumiteCategory),
          "kumiteCategory"
        );
        setKumiteCategories(kumiteGroups);
      } catch (error) {
        toast.error("Falha ao carregar categorias.");
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [params.tournamentId]);

  function groupByCategory(
    competitors: Competitor[],
    field: "kataCategory" | "kumiteCategory"
  ): CategoryGroup[] {
    const groups = competitors.reduce((acc, competitor) => {
      const category = competitor[field];
      if (!category) return acc;

      if (!acc[category]) {
        acc[category] = [];
      }
      acc[category].push(competitor);
      return acc;
    }, {} as Record<string, Competitor[]>);

    // Ordenar categorias alfabeticamente e ordenar competidores dentro de cada categoria
    return Object.entries(groups)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([category, competitors]) => ({
        category,
        competitors: competitors.sort((a, b) => {
          // Ordenar por: idade, sexo, peso, graduação
          if (a.age !== b.age) return a.age - b.age;
          if (a.gender !== b.gender) return a.gender === "FEMALE" ? -1 : 1;
          const weightA = a.weight || 0;
          const weightB = b.weight || 0;
          if (weightA !== weightB) return weightA - weightB;
          return a.belt.localeCompare(b.belt);
        }),
      }));
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
