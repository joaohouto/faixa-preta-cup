"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Belt, Competitor, Gender } from "@prisma/client";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { useEffect, useState } from "react";
import { Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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

const competitorSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório"),
  gender: z.nativeEnum(Gender),
  weight: z.coerce.number().optional(),
  birthdate: z.string().min(1, "Data de nascimento é obrigatória"),
  belt: z.nativeEnum(Belt),
  school: z.string().min(1, "Escola é obrigatória"),
  kata: z.boolean().default(false),
  kumite: z.boolean().default(false),
});

type CompetitorFormValues = z.infer<typeof competitorSchema>;

interface CompetitorEditDialogProps {
  competitor: Competitor | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCompetitorUpdated: () => void;
}

const beltLabels: Record<Belt, string> = {
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

const genderLabels: Record<Gender, string> = {
  MALE: "Masculino",
  FEMALE: "Feminino",
};

export function CompetitorEditDialog({
  competitor,
  open,
  onOpenChange,
  onCompetitorUpdated,
}: CompetitorEditDialogProps) {
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const form = useForm<CompetitorFormValues>({
    resolver: zodResolver(competitorSchema),
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

  useEffect(() => {
    if (competitor) {
      form.reset({
        name: competitor.name,
        gender: competitor.gender,
        weight: competitor.weight || 0,
        birthdate: new Date(competitor.birthdate).toISOString().split("T")[0],
        belt: competitor.belt,
        school: competitor.school,
        kata: competitor.kata,
        kumite: competitor.kumite,
      });
    }
  }, [competitor, form]);

  async function onSubmit(values: CompetitorFormValues) {
    if (!competitor) return;

    try {
      const response = await fetch(
        `/api/tournaments/${competitor.tournamentId}/competitors/${competitor.id}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(values),
        }
      );

      if (!response.ok) {
        throw new Error("Failed to update competitor");
      }

      toast.success("Competidor atualizado com sucesso!");
      onOpenChange(false);
      onCompetitorUpdated();
    } catch (error) {
      toast.error("Falha ao atualizar competidor.");
    }
  }

  async function handleDelete() {
    if (!competitor) return;

    try {
      const response = await fetch(
        `/api/tournaments/${competitor.tournamentId}/competitors/${competitor.id}`,
        {
          method: "DELETE",
        }
      );

      if (!response.ok) {
        throw new Error("Failed to delete competitor");
      }

      toast.success("Competidor excluído com sucesso!");
      setDeleteDialogOpen(false);
      onOpenChange(false);
      onCompetitorUpdated();
    } catch (error) {
      toast.error("Falha ao excluir competidor.");
    }
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar Competidor</DialogTitle>
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
                      <Input placeholder="Ex: João Silva" {...field} />
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
                      <Input type="number" step="0.1" {...field} />
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
                        {Object.entries(beltLabels).map(([value, label]) => (
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
                name="school"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Escola/Associação</FormLabel>
                    <FormControl>
                      <Input placeholder="Ex: Dojo São Paulo" {...field} />
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
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm flex-1">
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
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm flex-1">
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

              <div className="flex gap-2 pt-4 border-t">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                  className="flex-1"
                >
                  Cancelar
                </Button>
                <Button type="submit" className="flex-1">
                  Salvar Alterações
                </Button>
              </div>

              {/* Botão de Exclusão */}
              <Button
                type="button"
                variant="destructive"
                className="w-full"
                onClick={() => setDeleteDialogOpen(true)}
              >
                <Trash2 />
                Excluir Competidor
              </Button>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Dialog de Confirmação de Exclusão */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir <strong>{competitor?.name}</strong>
              ? Esta ação não pode ser desfeita e removerá o competidor de todas
              as categorias e chaves.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
