"use client";

import { useEffect, useState } from "react";
import { Match, Bracket } from "@prisma/client";
import { toast } from "sonner";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";

export default function BracketDetailPage({
  params,
}: {
  params: { tournamentId: string; bracketId: string };
}) {
  const [bracket, setBracket] = useState<Bracket | null>(null);
  const [matches, setMatches] = useState<Match[]>([]);
  const [competitorsMap, setCompetitorsMap] = useState<Record<string, string>>(
    {}
  );
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, [params.tournamentId, params.bracketId]);

  async function fetchData() {
    try {
      setLoading(true);

      const res = await fetch(
        `/api/tournaments/${params.tournamentId}/brackets/${params.bracketId}`
      );
      if (!res.ok) throw new Error("Falha ao buscar chave");
      const data = await res.json();

      setBracket(data);
      setMatches(data.matches || []);

      // Fetch competitors for name resolution
      const compRes = await fetch(
        `/api/tournaments/${params.tournamentId}/competitors`
      );
      if (!compRes.ok) throw new Error("Falha ao carregar competidores");
      const compData = await compRes.json();
      const map: Record<string, string> = {};
      compData.forEach((c: any) => (map[c.id] = c.name));
      setCompetitorsMap(map);
    } catch (err) {
      console.error(err);
      toast.error("Erro ao carregar chave e lutas.");
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto p-6 flex justify-center items-center min-h-[300px]">
        Carregando...
      </div>
    );
  }

  if (!bracket) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-lg font-medium">Chave não encontrada</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6 flex items-center gap-4">
        <Link href={`/app/${params.tournamentId}/brackets`}>
          <Button variant="ghost" size="icon">
            <ArrowLeft />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold">{bracket.category}</h1>
          <p className="text-muted-foreground">
            {bracket.modality} • {bracket.totalSlots} slots •{" "}
            {bracket.totalRounds} rounds
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Matches</CardTitle>
          <CardDescription>Lista de lutas desta chave</CardDescription>
        </CardHeader>
        <CardContent>
          {matches.length === 0 ? (
            <Empty>
              <EmptyHeader>
                <EmptyMedia variant="icon">—</EmptyMedia>
                <EmptyTitle>Sem lutas</EmptyTitle>
                <EmptyDescription>
                  Essa chave não possui lutas ainda.
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Round</TableHead>
                  <TableHead>Posição</TableHead>
                  <TableHead>Aka</TableHead>
                  <TableHead>Aka Score</TableHead>
                  <TableHead>Ao</TableHead>
                  <TableHead>Ao Score</TableHead>
                  <TableHead>Winner</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {matches.map((m) => (
                  <TableRow key={m.id}>
                    <TableCell>{m.round}</TableCell>
                    <TableCell>{m.position}</TableCell>
                    <TableCell>{competitorsMap[m.akaId] || "—"}</TableCell>
                    <TableCell>{m.akaScore ?? ""}</TableCell>
                    <TableCell>{competitorsMap[m.aoId] || "—"}</TableCell>
                    <TableCell>{m.aoScore ?? ""}</TableCell>
                    <TableCell>{competitorsMap[m.winnerId] || "—"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
