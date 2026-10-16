"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { useState, useRef } from "react";
import { Upload, FileText, X } from "lucide-react";
import { Spinner } from "@/components/luxe/spinner";
import { cn } from "@/lib/utils";
import { fetchJson } from "@/lib/api-client";

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
  const [dragging, setDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleFileChange(selectedFile: File | null) {
    if (selectedFile && !selectedFile.name.endsWith(".csv")) {
      toast.error("Apenas arquivos .csv são aceitos.");
      return;
    }
    setFile(selectedFile);
  }

  function handleDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDragging(false);
    const dropped = e.dataTransfer.files[0];
    handleFileChange(dropped || null);
  }

  function handleDialogOpenChange(value: boolean) {
    if (!loading) {
      setOpen(value);
      if (!value) {
        setFile(null);
        setDragging(false);
      }
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
      const data = await fetchJson<{ message?: string; count?: number }>(
        `/api/tournaments/${tournamentId}/competitors/import`,
        {
          method: "POST",
          body: formData,
        }
      );

      toast.success(
        data.message ||
          `${data.count ?? "Competidores"} importados com sucesso!`
      );
      setOpen(false);
      setFile(null);
      onCompetitorsImported();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleDialogOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Upload className="h-4 w-4" />
          Importar CSV
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[440px]">
        <DialogHeader>
          <DialogTitle>Importar Competidores</DialogTitle>
          <DialogDescription>
            Envie um arquivo <strong>.csv</strong> com as colunas abaixo (a
            primeira linha deve ser o cabeçalho com esses nomes exatos).
          </DialogDescription>
        </DialogHeader>

        <div className="rounded-lg border bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
          <ul className="space-y-1">
            <li>
              <span className="font-mono font-medium text-foreground">
                nome
              </span>{" "}
              — texto livre
            </li>
            <li>
              <span className="font-mono font-medium text-foreground">
                sexo
              </span>{" "}
              — <span className="font-mono">masculino</span> ou{" "}
              <span className="font-mono">feminino</span>
            </li>
            <li>
              <span className="font-mono font-medium text-foreground">
                peso
              </span>{" "}
              — número em kg (ex: <span className="font-mono">45.5</span>),
              obrigatório se kumite = sim
            </li>
            <li>
              <span className="font-mono font-medium text-foreground">
                nascimento
              </span>{" "}
              — data no formato{" "}
              <span className="font-mono">DD/MM/AAAA</span>
            </li>
            <li>
              <span className="font-mono font-medium text-foreground">
                faixa
              </span>{" "}
              —{" "}
              <span className="font-mono">
                branca, azul, amarela, vermelha, laranja, verde, roxa, marrom
                ou preta
              </span>
            </li>
            <li>
              <span className="font-mono font-medium text-foreground">
                escola
              </span>{" "}
              — texto livre
            </li>
            <li>
              <span className="font-mono font-medium text-foreground">
                kumite
              </span>{" "}
              e{" "}
              <span className="font-mono font-medium text-foreground">
                kata
              </span>{" "}
              — <span className="font-mono">sim</span> para inscrever (qualquer
              outro valor conta como não)
            </li>
          </ul>
        </div>

        <div className="space-y-4 py-2">
          {/* Drop Zone */}
          <div
            className={cn(
              "relative flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed p-8 text-center transition-colors cursor-pointer",
              dragging
                ? "border-primary bg-primary/5"
                : "border-muted-foreground/25 hover:border-muted-foreground/50 hover:bg-muted/30",
              file && "border-green-500/50 bg-green-500/5"
            )}
            onClick={() => fileInputRef.current?.click()}
            onDragOver={(e) => {
              e.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              className="sr-only"
              onChange={(e) => handleFileChange(e.target.files?.[0] || null)}
            />

            {file ? (
              <>
                <div className="h-12 w-12 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center">
                  <FileText className="h-6 w-6 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <p className="font-medium text-sm">{file.name}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {(file.size / 1024).toFixed(1)} KB
                  </p>
                </div>
                <button
                  type="button"
                  className="absolute top-2 right-2 p-1 rounded-md hover:bg-muted transition-colors"
                  onClick={(e) => {
                    e.stopPropagation();
                    setFile(null);
                    if (fileInputRef.current) fileInputRef.current.value = "";
                  }}
                >
                  <X className="h-4 w-4 text-muted-foreground" />
                </button>
              </>
            ) : (
              <>
                <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center">
                  <Upload className="h-6 w-6 text-muted-foreground" />
                </div>
                <div>
                  <p className="font-medium text-sm">
                    Clique ou arraste o arquivo aqui
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Apenas arquivos .csv
                  </p>
                </div>
              </>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => handleDialogOpenChange(false)}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button
              className="flex-1"
              onClick={handleImport}
              disabled={loading || !file}
            >
              {loading ? (
                <>
                  <Spinner size="size-4" className="mr-2" />
                  Importando...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4" />
                  Importar
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
