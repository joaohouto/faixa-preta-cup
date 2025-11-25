"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { useState } from "react";
import { Spinner } from "@/components/luxe/spinner";
import { Loader2 } from "lucide-react";

interface CompetitorImportFormProps {
  tournamentId: string;
  onCompetitorsImported: () => void;
}

export function CompetitorImportForm({
  tournamentId,
  onCompetitorsImported,
}: CompetitorImportFormProps) {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleImport() {
    if (!file) {
      toast.error("Please select a file to import.");
      return;
    }

    setLoading(true);

    const formData = new FormData();
    formData.append("file", file);
    formData.append("tournamentId", tournamentId);

    try {
      const response = await fetch("/api/competitors/import", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to import competitors");
      }

      toast.success("Competitors imported successfully!");
      onCompetitorsImported();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline">Importar de .CSV</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Importar Competidores</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <Input
            type="file"
            accept=".csv"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
          />
          <Button onClick={handleImport} disabled={loading}>
            {loading ? <Loader2 className="animate-spin" /> : "Importar"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
