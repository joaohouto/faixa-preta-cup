"use client";

import { Competitor } from "@prisma/client";
import { useEffect, useState } from "react";
import { FolderOpen, Loader2, Trash2 } from "lucide-react";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
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
import { toast } from "sonner";
import { beltLabels, genderLabels } from "@/lib/constants/labels";
import { Spinner } from "./luxe/spinner";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "./ui/empty";
import { CompetitorEditDialog } from "./competitor-edit-dialog";

interface CompetitorsListProps {
  tournamentId: string;
  refreshKey: number;
  onRefresh: () => void;
}


export function CompetitorsList({
  tournamentId,
  refreshKey,
  onRefresh,
}: CompetitorsListProps) {
  const [competitors, setCompetitors] = useState<Competitor[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingCompetitor, setEditingCompetitor] = useState<Competitor | null>(
    null
  );
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteAllDialogOpen, setDeleteAllDialogOpen] = useState(false);
  const [isDeletingAll, setIsDeletingAll] = useState(false);

  async function fetchCompetitors() {
    if (!tournamentId) return;

    setLoading(true);
    try {
      const response = await fetch(
        `/api/tournaments/${tournamentId}/competitors`
      );
      if (!response.ok) {
        throw new Error("Failed to fetch competitors");
      }
      const data = await response.json();
      setCompetitors(data);
    } catch (error) {
      toast.error("Falha ao carregar competidores.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchCompetitors();
  }, [tournamentId, refreshKey]);

  function handleRowClick(competitor: Competitor) {
    setEditingCompetitor(competitor);
    setEditDialogOpen(true);
  }

  async function handleDeleteAll() {
    setIsDeletingAll(true);
    try {
      const response = await fetch(
        `/api/tournaments/${tournamentId}/competitors/bulk-delete`,
        {
          method: "DELETE",
        }
      );

      if (!response.ok) {
        throw new Error("Failed to delete competitors");
      }

      const data = await response.json();

      toast.success(
        `${data.deletedCount} competidor(es) excluído(s) com sucesso!`
      );
      setDeleteAllDialogOpen(false);
      onRefresh();
    } catch (error) {
      toast.error("Falha ao excluir competidores.");
    } finally {
      setIsDeletingAll(false);
    }
  }

  if (loading) {
    return (
      <div className="w-full p-4 flex justify-center">
        <Spinner />
      </div>
    );
  }

  if (competitors.length === 0) {
    return (
      <Empty>
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <FolderOpen />
          </EmptyMedia>
          <EmptyTitle>Vazio por aqui</EmptyTitle>
          <EmptyDescription>
            Não há competidores registrados para esse campeonato.
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  return (
    <>
      <div className="space-y-4">
        {/* Barra de ações */}
        <div className="flex justify-between items-center">
          <p className="text-sm text-muted-foreground">
            {competitors.length}{" "}
            {competitors.length === 1 ? "competidor" : "competidores"}{" "}
            cadastrado
            {competitors.length === 1 ? "" : "s"}
          </p>
          <Button
            variant="destructive"
            size="sm"
            onClick={() => setDeleteAllDialogOpen(true)}
          >
            <Trash2 />
            Excluir Todos
          </Button>
        </div>

        {/* Tabela */}
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Sexo</TableHead>
                <TableHead>Faixa</TableHead>
                <TableHead>Idade</TableHead>
                <TableHead>Escola</TableHead>
                <TableHead>Categoria Kata</TableHead>
                <TableHead>Categoria Kumite</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {competitors.map((c) => (
                <TableRow
                  key={c.id}
                  onClick={() => handleRowClick(c)}
                  className="cursor-pointer hover:bg-muted/50"
                >
                  <TableCell className="font-medium">{c.name}</TableCell>
                  <TableCell>{genderLabels[c.gender]}</TableCell>
                  <TableCell>{beltLabels[c.belt]}</TableCell>
                  <TableCell>{c.age} anos</TableCell>
                  <TableCell className="text-muted-foreground">
                    {c.school}
                  </TableCell>
                  <TableCell>
                    {c.kataCategory ? (
                      <span className="text-xs font-mono bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300 px-2 py-1 rounded">
                        {c.kataCategory}
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {c.kumiteCategory ? (
                      <span className="text-xs font-mono bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300 px-2 py-1 rounded">
                        {c.kumiteCategory}
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Dialog de edição */}
      <CompetitorEditDialog
        competitor={editingCompetitor}
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        onCompetitorUpdated={fetchCompetitors}
      />

      {/* Dialog de confirmação de exclusão em massa */}
      <AlertDialog
        open={deleteAllDialogOpen}
        onOpenChange={setDeleteAllDialogOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Todos os Competidores</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir{" "}
              <strong>todos os {competitors.length} competidores</strong>?
              <br />
              <br />
              Esta ação não pode ser desfeita e removerá todos os competidores
              de todas as categorias e chaves deste campeonato.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeletingAll}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteAll}
              disabled={isDeletingAll}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeletingAll ? (
                <>
                  <Loader2 className="animate-spin" />
                  Excluindo...
                </>
              ) : (
                <>
                  <Trash2 />
                  Excluir Todos
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
