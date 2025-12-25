"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Tournament } from "@prisma/client";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { useRouter } from "next/navigation";
import { z } from "zod";
import { Plus, Trophy } from "lucide-react";

import { Header } from "@/components/header";
import { useParams } from "next/navigation";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

const tournamentSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório"),
});

export default function TournamentsPage() {
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const router = useRouter();

  const params = useParams();
  const tournamentId = params?.tournamentId as string | undefined;

  const form = useForm<z.infer<typeof tournamentSchema>>({
    resolver: zodResolver(tournamentSchema),
    defaultValues: {
      name: "",
    },
  });

  async function fetchTournaments() {
    try {
      const response = await fetch("/api/tournaments");
      if (!response.ok) throw new Error("Failed to fetch tournaments");
      const data = await response.json();
      setTournaments(data);
    } catch (error) {
      toast.error("Falha ao carregar campeonatos.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchTournaments();
  }, []);

  async function onSubmit(values: z.infer<typeof tournamentSchema>) {
    try {
      const response = await fetch("/api/tournaments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });

      if (!response.ok) throw new Error("Failed to create tournament");

      const newTournament = await response.json();
      toast.success("Campeonato criado com sucesso!");
      setOpen(false);
      form.reset();

      // Redirecionar para a página de competidores do novo torneio
      router.push(`/app/${newTournament.id}/competitors`);
    } catch (error) {
      toast.error("Falha ao criar campeonato.");
    }
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header currentTournamentId={tournamentId} />
      <main className="flex-1">
        <div className="container mx-auto p-6 max-w-4xl">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold">Campeonatos</h1>
              <p className="text-muted-foreground">
                Gerencie seus torneios de Karatê Shotokan
              </p>
            </div>
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Novo Campeonato
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Criar Novo Campeonato</DialogTitle>
                </DialogHeader>
                <Form {...form}>
                  <form
                    onSubmit={form.handleSubmit(onSubmit)}
                    className="space-y-4"
                  >
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Nome do Campeonato</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="Ex: Copa Nacional de Karatê 2025"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <Button type="submit" className="w-full">
                      Criar
                    </Button>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          </div>

          {loading ? (
            <div className="grid gap-4 md:grid-cols-2">
              {[...Array(4)].map((_, i) => (
                <Card key={i} className="animate-pulse">
                  <CardHeader>
                    <div className="h-6 bg-muted rounded w-3/4" />
                    <div className="h-4 bg-muted rounded w-1/2 mt-2" />
                  </CardHeader>
                </Card>
              ))}
            </div>
          ) : tournaments.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Trophy className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-lg font-medium mb-2">
                  Nenhum campeonato cadastrado
                </p>
                <p className="text-sm text-muted-foreground mb-4">
                  Crie seu primeiro campeonato para começar
                </p>
                <Button onClick={() => setOpen(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Criar Campeonato
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {tournaments.map((tournament) => (
                <Card
                  key={tournament.id}
                  className="hover:shadow-lg transition-shadow cursor-pointer"
                  onClick={() =>
                    router.push(`/app/${tournament.id}/competitors`)
                  }
                >
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Trophy className="h-5 w-5" />
                      {tournament.name}
                    </CardTitle>
                    <CardDescription>
                      Criado em{" "}
                      {new Date(tournament.createdAt).toLocaleDateString(
                        "pt-BR"
                      )}
                    </CardDescription>
                  </CardHeader>
                </Card>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
