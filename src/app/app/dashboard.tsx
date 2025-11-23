"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Tournament } from "@prisma/client";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { CompetitorForm } from "@/components/competitor-form";
import { CompetitorsList } from "@/components/competitors-list";

const tournamentSchema = z.object({
  name: z.string().min(1, "Name is required"),
});

export default function AppDashboard() {
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [selectedTournament, setSelectedTournament] = useState<string | null>(
    null
  );
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  const form = useForm<z.infer<typeof tournamentSchema>>({
    resolver: zodResolver(tournamentSchema),
    defaultValues: {
      name: "",
    },
  });

  async function fetchTournaments() {
    try {
      const response = await fetch("/api/tournaments");
      if (!response.ok) {
        throw new Error("Failed to fetch tournaments");
      }
      const data = await response.json();
      setTournaments(data);
    } catch (error) {
      toast.error("Failed to load tournaments.");
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
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(values),
      });

      if (!response.ok) {
        throw new Error("Failed to create tournament");
      }

      toast.success("Tournament created successfully!");
      fetchTournaments(); // Refresh list
    } catch (error) {
      toast.error("Failed to create tournament.");
    }
  }

  return (
    <div className="container mx-auto p-4">
      <header className="mb-8">
        <h1 className="text-3xl font-bold">Tournament Dashboard</h1>
        <p className="text-muted-foreground">
          Create and manage your karate tournaments.
        </p>
      </header>

      <div className="grid gap-8 md:grid-cols-3">
        <div className="md:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle>Tournaments</CardTitle>
              <CardDescription>
                Create a new tournament or select an existing one.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Dialog>
                <DialogTrigger asChild>
                  <Button className="w-full">Create New Tournament</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>New Tournament</DialogTitle>
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
                            <FormLabel>Tournament Name</FormLabel>
                            <FormControl>
                              <Input
                                placeholder="e.g., National Cup"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <Button type="submit">Create</Button>
                    </form>
                  </Form>
                </DialogContent>
              </Dialog>

              <Select
                onValueChange={(value) => setSelectedTournament(value)}
                disabled={loading}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a tournament..." />
                </SelectTrigger>
                <SelectContent>
                  {tournaments.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>
        </div>

        <div className="md:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Competitors</CardTitle>
              <CardDescription>
                Register and view competitors for the selected tournament.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {selectedTournament ? (
                <div className="space-y-4">
                  <CompetitorForm
                    tournamentId={selectedTournament}
                    onCompetitorCreated={() =>
                      setRefreshKey((prev) => prev + 1)
                    }
                  />
                  <CompetitorsList
                    tournamentId={selectedTournament}
                    refreshKey={refreshKey}
                  />
                </div>
              ) : (
                <p className="text-center text-muted-foreground">
                  Select a tournament to manage competitors.
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
