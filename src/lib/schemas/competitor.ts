import { Belt, Gender } from "@prisma/client";
import { z } from "zod";

export const competitorSchema = z
  .object({
    name: z.string().trim().min(1, "Nome é obrigatório"),
    gender: z.nativeEnum(Gender),
    weight: z.coerce.number().optional(),
    birthdate: z.string().min(1, "Data de nascimento é obrigatória"),
    belt: z.nativeEnum(Belt),
    school: z.string().trim().min(1, "Escola é obrigatória"),
    kata: z.boolean().default(false),
    kumite: z.boolean().default(false),
  })
  .refine((data) => data.kata || data.kumite, {
    message: "Selecione pelo menos uma modalidade (Kata ou Kumite)",
    path: ["kata"],
  })
  .refine(
    (data) => !data.kumite || (data.weight !== undefined && data.weight > 0),
    {
      message: "Peso maior que zero é obrigatório para inscrição em Kumite",
      path: ["weight"],
    }
  );

export type CompetitorFormValues = z.infer<typeof competitorSchema>;
