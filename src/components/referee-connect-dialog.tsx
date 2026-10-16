"use client";

import { useEffect, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { toast } from "sonner";
import {
  QrCode,
  Copy,
  Check,
  Wifi,
  Smartphone,
  Loader2,
  RefreshCw,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { fetchJson } from "@/lib/api-client";
import { NetworkInterfaceInfo } from "@/app/api/network-info/route";

interface RefereeConnectDialogProps {
  tournamentId: string;
}

export function RefereeConnectDialog({
  tournamentId,
}: RefereeConnectDialogProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [interfaces, setInterfaces] = useState<NetworkInterfaceInfo[]>([]);
  const [selectedIp, setSelectedIp] = useState<string>("");
  const [copied, setCopied] = useState(false);
  const [port, setPort] = useState<string>("3000");

  useEffect(() => {
    if (typeof window !== "undefined") {
      setPort(window.location.port || "3000");
    }
  }, []);

  useEffect(() => {
    if (open) {
      loadNetworkInfo();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  async function loadNetworkInfo() {
    setLoading(true);
    try {
      const data = await fetchJson<{ interfaces: NetworkInterfaceInfo[] }>(
        "/api/network-info"
      );
      setInterfaces(data.interfaces);

      const currentHost = window.location.hostname;
      // Se estiver em localhost/127.0.0.1 ou se houver interface prioritária (ex: wlp), seleciona a primeira da lista
      if (
        currentHost === "localhost" ||
        currentHost === "127.0.0.1" ||
        currentHost === "0.0.0.0"
      ) {
        if (data.interfaces.length > 0) {
          setSelectedIp(data.interfaces[0].address);
        }
      } else {
        // Se o host atual estiver na lista de interfaces, usa ele, senão dá prioridade ao primeiro (Wi-Fi)
        const hostExists = data.interfaces.some(
          (iface) => iface.address === currentHost
        );
        if (hostExists) {
          setSelectedIp(currentHost);
        } else if (data.interfaces.length > 0) {
          setSelectedIp(data.interfaces[0].address);
        }
      }
    } catch {
      toast.error("Não foi possível detectar o IP da rede local.");
    } finally {
      setLoading(false);
    }
  }

  // Montar a URL completa que o celular do árbitro irá abrir
  const protocol =
    typeof window !== "undefined" ? window.location.protocol : "http:";
  const portSuffix = port && port !== "80" && port !== "443" ? `:${port}` : "";
  const host = selectedIp || "localhost";
  const mobileUrl = `${protocol}//${host}${portSuffix}/app/${tournamentId}/brackets`;

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(mobileUrl);
      setCopied(true);
      toast.success("Link copiado para a área de transferência!");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Erro ao copiar link.");
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <QrCode className="h-4 w-4" />
          <span>Conectar Celular</span>
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-md max-h-[92vh] flex flex-col gap-3 p-5 overflow-hidden">
        <DialogHeader className="pb-1">
          <DialogTitle className="flex items-center gap-2 text-base sm:text-lg">
            <Smartphone className="h-5 w-5 text-primary" />
            Acesso do Árbitro pelo Celular
          </DialogTitle>
          <DialogDescription className="text-xs">
            Escaneie o QR Code com o smartphone para acompanhar as chaves na
            mesma rede Wi-Fi.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto pr-1 space-y-3">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-48 space-y-2">
              <Loader2 className="h-7 w-7 animate-spin text-muted-foreground" />
              <p className="text-xs text-muted-foreground">
                Detectando IP da rede local...
              </p>
            </div>
          ) : (
            <>
              {/* QR Code compacto com moldura branca para alto contraste */}
              <div className="flex justify-center">
                <div className="rounded-lg border-2 border-border bg-white p-2.5 shadow-xs">
                  <QRCodeSVG
                    value={mobileUrl}
                    size={150}
                    level="M"
                    bgColor="#FFFFFF"
                    fgColor="#000000"
                    includeMargin={false}
                  />
                </div>
              </div>

              {/* Seletor de interface de rede */}
              {interfaces.length > 0 && (
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">
                    Interface de Rede (IP):
                  </label>
                  <Select value={selectedIp} onValueChange={setSelectedIp}>
                    <SelectTrigger className="w-full text-xs h-9">
                      <SelectValue placeholder="Selecione o IP da rede" />
                    </SelectTrigger>
                    <SelectContent className="max-h-48 overflow-y-auto">
                      {interfaces.map((iface) => (
                        <SelectItem
                          key={iface.address}
                          value={iface.address}
                          className="text-xs"
                        >
                          <span className="font-mono font-medium">
                            {iface.address}
                          </span>{" "}
                          <span className="text-muted-foreground">
                            ({iface.name} · {iface.typeLabel})
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* URL legível com botão copiar */}
              <div className="rounded-md border bg-muted/50 p-2 flex items-center justify-between gap-2">
                <span className="font-mono text-xs text-muted-foreground truncate select-all flex-1">
                  {mobileUrl}
                </span>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 px-2 shrink-0"
                  onClick={handleCopy}
                >
                  {copied ? (
                    <Check className="h-3.5 w-3.5 text-green-600" />
                  ) : (
                    <Copy className="h-3.5 w-3.5" />
                  )}
                  <span className="sr-only">Copiar</span>
                </Button>
              </div>

              {/* Dica compacta de Wi-Fi */}
              <div className="flex items-center gap-2 text-xs text-muted-foreground rounded-md border p-2.5 bg-card">
                <Wifi className="h-4 w-4 shrink-0 text-blue-500" />
                <span>
                  O celular deve estar conectado à{" "}
                  <strong>mesma rede Wi-Fi</strong> deste computador.
                </span>
              </div>
            </>
          )}
        </div>

        <div className="flex justify-between items-center pt-1 border-t">
          <Button
            variant="ghost"
            size="sm"
            onClick={loadNetworkInfo}
            disabled={loading}
            className="text-xs gap-1.5 h-8 px-2"
          >
            <RefreshCw
              className={`h-3 w-3 ${loading ? "animate-spin" : ""}`}
            />
            Recarregar IPs
          </Button>

          <Button
            variant="secondary"
            size="sm"
            className="h-8 text-xs"
            onClick={() => setOpen(false)}
          >
            Fechar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
