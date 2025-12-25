"use client";

import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
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
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";

type MatchWithCompetitors = {
  id: string;
  akaId: string | null;
  aoId: string | null;
  winnerId: string | null;
  akaScore: number | null;
  aoScore: number | null;
  decisionByHantei: boolean;
  isCompleted: boolean;
  aka?: { id: string; name: string; school: string };
  ao?: { id: string; name: string; school: string };
};

const resultSchema = z
  .object({
    akaScore: z.coerce.number().min(0, "Pontuação não pode ser negativa"),
    aoScore: z.coerce.number().min(0, "Pontuação não pode ser negativa"),
    winnerId: z.string().min(1, "Selecione o vencedor"),
    decisionByHantei: z.boolean().default(false),
  })
  .refine(
    (data) => {
      // Se não é decisão por Hantei, os pontos devem ser diferentes
      if (!data.decisionByHantei && data.akaScore === data.aoScore) {
        return false;
      }
      return true;
    },
    {
      message: "Em caso de empate no placar, marque 'Decisão por Hantei'",
      path: ["decisionByHantei"],
    }
  );

type ResultFormValues = z.infer<typeof resultSchema>;

interface MatchResultDialogProps {
  match: MatchWithCompetitors | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  tournamentId: string;
  bracketId: string;
}

export function MatchResultDialog({
  match,
  open,
  onOpenChange,
  onSuccess,
  tournamentId,
  bracketId,
}: MatchResultDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<ResultFormValues>({
    resolver: zodResolver(resultSchema),
    defaultValues: {
      akaScore: match?.akaScore ?? 0,
      aoScore: match?.aoScore ?? 0,
      winnerId: match?.winnerId || "",
      decisionByHantei: match?.decisionByHantei || false,
    },
  });

  // Resetar form quando match mudar
  useState(() => {
    if (match) {
      form.reset({
        akaScore: match.akaScore ?? 0,
        aoScore: match.aoScore ?? 0,
        winnerId: match.winnerId || "",
        decisionByHantei: match.decisionByHantei || false,
      });
    }
  });

  async function onSubmit(values: ResultFormValues) {
    if (!match) return;

    setIsSubmitting(true);
    try {
      const res = await fetch(
        `/api/tournaments/${tournamentId}/brackets/${bracketId}/matches/${match.id}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(values),
        }
      );

      if (!res.ok) {
        const error = await res.text();
        throw new Error(error || "Falha ao registrar resultado");
      }

      toast.success("Resultado registrado com sucesso!");
      onOpenChange(false);
      onSuccess();
    } catch (error: any) {
      toast.error(error.message || "Erro ao registrar resultado");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (!match || !match.aka || !match.ao) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Registrar Resultado</DialogTitle>
          <DialogDescription>
            Insira a pontuação final da luta e selecione o vencedor.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Competidores */}
            <div className="space-y-4">
              {/* AKA */}
              <div
                className={`p-4 rounded-lg border-2 transition-colors ${
                  form.watch("winnerId") === match.akaId
                    ? "border-red-500 bg-red-50 dark:bg-red-950"
                    : "border-border"
                }`}
              >
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-red-600 dark:text-red-200 bg-red-100 dark:bg-red-900 px-2 py-1 rounded">
                        AKA
                      </span>
                      <span className="font-semibold">{match.aka.name}</span>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      {match.aka.school}
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant={
                      form.watch("winnerId") === match.akaId
                        ? "default"
                        : "outline"
                    }
                    size="sm"
                    onClick={() => form.setValue("winnerId", match.akaId!)}
                  >
                    Vencedor
                  </Button>
                </div>

                <FormField
                  control={form.control}
                  name="akaScore"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Pontuação</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min="0"
                          placeholder="0"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="flex items-center justify-center">
                <span className="text-2xl font-bold text-muted-foreground">
                  VS
                </span>
              </div>

              {/* AO */}
              <div
                className={`p-4 rounded-lg border-2 transition-colors ${
                  form.watch("winnerId") === match.aoId
                    ? "border-blue-500 bg-blue-50 dark:bg-blue-950"
                    : "border-border"
                }`}
              >
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-blue-600 dark:text-blue-200 bg-blue-100 dark:bg-blue-900 px-2 py-1 rounded">
                        AO
                      </span>
                      <span className="font-semibold">{match.ao.name}</span>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      {match.ao.school}
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant={
                      form.watch("winnerId") === match.aoId
                        ? "default"
                        : "outline"
                    }
                    size="sm"
                    onClick={() => form.setValue("winnerId", match.aoId!)}
                  >
                    Vencedor
                  </Button>
                </div>

                <FormField
                  control={form.control}
                  name="aoScore"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Pontuação</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min="0"
                          placeholder="0"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            <Separator />

            {/* Decisão por Hantei */}
            <FormField
              control={form.control}
              name="decisionByHantei"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base">
                      Decisão por Hantei
                    </FormLabel>
                    <p className="text-sm text-muted-foreground">
                      Marque se o vencedor foi decidido pelos árbitros em caso
                      de empate no placar.
                    </p>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            <FormMessage>
              {form.formState.errors.decisionByHantei?.message}
            </FormMessage>

            {/* Botões */}
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isSubmitting}
                className="flex-1"
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={isSubmitting} className="flex-1">
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Salvando...
                  </>
                ) : (
                  "Salvar Resultado"
                )}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
