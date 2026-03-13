"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Belt, Gender } from "@prisma/client";
import { useForm } from "react-hook-form";
import type { Resolver } from "react-hook-form";

import { beltLabels, genderLabels } from "@/lib/constants/labels";
import {
  competitorSchema,
  type CompetitorFormValues,
} from "@/lib/schemas/competitor";
import { Button } from "@/components/ui/button";
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
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";


interface CompetitorFormProps {
  tournamentId: string;
  onCompetitorCreated: () => void;
}

export function CompetitorForm({
  tournamentId,
  onCompetitorCreated,
}: CompetitorFormProps) {
  const form = useForm<CompetitorFormValues>({
    resolver: zodResolver(competitorSchema) as Resolver<CompetitorFormValues>,
    defaultValues: {
      name: "",
      gender: Gender.MALE,
      weight: 0,
      birthdate: "",
      belt: Belt.WHITE,
      school: "",
      kata: false,
      kumite: false,
    },
  });

  async function onSubmit(values: CompetitorFormValues) {
    try {
      const response = await fetch(
        `/api/tournaments/${tournamentId}/competitors`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(values),
        }
      );

      if (!response.ok) {
        throw new Error("Failed to create competitor");
      }

      toast.success("Competitor created successfully!");
      onCompetitorCreated(); // Refresh list
    } catch (error) {
      toast.error("Failed to create competitor.");
    }
  }

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button>Registrar Competidor</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Novo Competidor</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., John Doe" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="gender"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Sexo</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecionar sexo" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {Object.entries(genderLabels).map(([value, label]) => (
                        <SelectItem key={value} value={value}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="weight"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Peso (kg)</FormLabel>
                  <FormControl>
                    <Input type="number" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="birthdate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Data de Nascimento</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="belt"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Faixa</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecionar faixa" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {Object.values(Belt).map((b) => (
                        <SelectItem key={b} value={b}>
                          {b}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="school"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Escola/Associação</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="e.g., Shotokan Karate"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="flex items-center space-x-4">
              <FormField
                control={form.control}
                name="kata"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                    <FormLabel>Kata</FormLabel>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="kumite"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                    <FormLabel>Kumite</FormLabel>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>
            <Button type="submit">Registrar</Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
