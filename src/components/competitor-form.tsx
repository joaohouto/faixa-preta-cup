"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Belt, Gender } from "@prisma/client";
import { useForm } from "react-hook-form";
import { z } from "zod";

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

const competitorSchema = z.object({
  name: z.string().min(1, "Name is required"),
  gender: z.nativeEnum(Gender),
  weight: z.coerce.number().optional(),
  birthdate: z.string().min(1, "Birthdate is required"),
  belt: z.nativeEnum(Belt),
  school: z.string().min(1, "School is required"),
  kata: z.boolean().default(false),
  kumite: z.boolean().default(false),
});

type CompetitorFormValues = z.infer<typeof competitorSchema>;

interface CompetitorFormProps {
  tournamentId: string;
  onCompetitorCreated: () => void;
}

export function CompetitorForm({
  tournamentId,
  onCompetitorCreated,
}: CompetitorFormProps) {
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

  async function onSubmit(values: CompetitorFormValues) {
    try {
      const response = await fetch("/api/competitors", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ ...values, tournamentId }),
      });

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
        <Button>Register Competitor</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New Competitor</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
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
                  <FormLabel>Gender</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select gender" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {Object.values(Gender).map((g) => (
                        <SelectItem key={g} value={g}>
                          {g}
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
                  <FormLabel>Weight (kg)</FormLabel>
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
                  <FormLabel>Birthdate</FormLabel>
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
                  <FormLabel>Belt</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select belt" />
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
                  <FormLabel>School/Association</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Shotokan Karate" {...field} />
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
            <Button type="submit">Register</Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
