"use client";

import { FileText, Loader2, Upload } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface CompetitorImportFormProps {
  tournamentId: string;
  onCompetitorsImported: () => void;
}

export function CompetitorImportForm({
  tournamentId,
  onCompetitorsImported,
}: CompetitorImportFormProps) {
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);

  function handleOpenChange(value: boolean) {
    if (!loading) {
      setOpen(value);
      if (!value) setFile(null);
    }
  }

  async function handleImport() {
    if (!file) {
      toast.error("Selecione um arquivo para importar.");
      return;
    }

    setLoading(true);
    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await fetch(
        `/api/tournaments/${tournamentId}/competitors/import`,
        { method: "POST", body: formData }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Falha ao importar competidores");
      }

      toast.success("Competidores importados com sucesso!");
      setFile(null);
      setOpen(false);
      onCompetitorsImported();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline">Importar de .CSV</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Importar Competidores</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-2">
          <label
            htmlFor="csv-import"
            className={`flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed p-8 cursor-pointer transition-colors ${
              loading
                ? "pointer-events-none opacity-50"
                : file
                ? "border-primary/50 bg-primary/5 hover:bg-primary/10"
                : "border-muted-foreground/25 hover:border-muted-foreground/50 hover:bg-muted/30"
            }`}
          >
            {file ? (
              <>
                <FileText className="h-10 w-10 text-primary" />
                <div className="text-center">
                  <p className="font-medium text-sm">{file.name}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {(file.size / 1024).toFixed(1)} KB · Clique para trocar
                  </p>
                </div>
              </>
            ) : (
              <>
                <Upload className="h-10 w-10 text-muted-foreground" />
                <div className="text-center">
                  <p className="font-medium text-sm">Clique para selecionar</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Apenas arquivos .CSV
                  </p>
                </div>
              </>
            )}
            <input
              id="csv-import"
              type="file"
              accept=".csv"
              className="sr-only"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
            />
          </label>

          <Button onClick={handleImport} disabled={loading || !file}>
            {loading ? (
              <>
                <Loader2 className="animate-spin" />
                Importando...
              </>
            ) : (
              <>
                <Upload />
                Importar
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
