import { Belt, Gender } from "@prisma/client";
import { z } from "zod";

export const competitorSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório"),
  gender: z.nativeEnum(Gender),
  weight: z.coerce.number().optional(),
  birthdate: z.string().min(1, "Data de nascimento é obrigatória"),
  belt: z.nativeEnum(Belt),
  school: z.string().min(1, "Escola é obrigatória"),
  kata: z.boolean().default(false),
  kumite: z.boolean().default(false),
});

export type CompetitorFormValues = z.infer<typeof competitorSchema>;
