import { NextResponse } from "next/server";
import os from "os";

export const dynamic = "force-dynamic";

export interface NetworkInterfaceInfo {
  name: string;
  address: string;
  type: "wifi" | "ethernet" | "vpn" | "virtual" | "other";
  typeLabel: string;
  priority: number;
}

function classifyInterface(name: string): {
  type: "wifi" | "ethernet" | "vpn" | "virtual" | "other";
  typeLabel: string;
  priority: number;
} {
  const lower = name.toLowerCase();

  // 1. Wi-Fi físico (wlp, wlan, wl, wifi) - Máxima prioridade
  if (
    lower.startsWith("wlp") ||
    lower.startsWith("wlan") ||
    lower.startsWith("wl") ||
    lower.includes("wifi")
  ) {
    return {
      type: "wifi",
      typeLabel: "Wi-Fi (Recomendado)",
      priority: 1,
    };
  }

  // 2. Ethernet física (eth, en, eno, ens, enp)
  if (
    lower.startsWith("eth") ||
    lower.startsWith("en") ||
    lower.startsWith("eno") ||
    lower.startsWith("ens") ||
    lower.startsWith("enp")
  ) {
    return {
      type: "ethernet",
      typeLabel: "Ethernet / Cabo",
      priority: 2,
    };
  }

  // 3. Virtual / VPNs / Containers (menor prioridade)
  if (lower.includes("tailscale")) {
    return {
      type: "vpn",
      typeLabel: "Tailscale VPN",
      priority: 4,
    };
  }

  if (lower.includes("waydroid")) {
    return {
      type: "virtual",
      typeLabel: "Waydroid",
      priority: 4,
    };
  }

  if (
    lower.includes("docker") ||
    lower.startsWith("br-") ||
    lower.includes("veth") ||
    lower.includes("virbr") ||
    lower.includes("tun") ||
    lower.includes("tap") ||
    lower.includes("wg")
  ) {
    return {
      type: "virtual",
      typeLabel: "Rede Virtual",
      priority: 4,
    };
  }

  // Outra rede local física
  return {
    type: "other",
    typeLabel: "Rede Local",
    priority: 3,
  };
}

export async function GET() {
  const networkInterfaces = os.networkInterfaces();
  const interfaces: NetworkInterfaceInfo[] = [];

  for (const [name, addrs] of Object.entries(networkInterfaces)) {
    if (!addrs) continue;
    for (const addr of addrs) {
      // Filtrar apenas IPv4 não internos (não 127.0.0.1)
      if (addr.family === "IPv4" && !addr.internal) {
        const { type, typeLabel, priority } = classifyInterface(name);

        interfaces.push({
          name,
          address: addr.address,
          type,
          typeLabel,
          priority,
        });
      }
    }
  }

  // Ordenar priorizando wlp/wlan (Wi-Fi) no topo absoluto
  interfaces.sort((a, b) => {
    if (a.priority !== b.priority) {
      return a.priority - b.priority;
    }
    return a.name.localeCompare(b.name);
  });

  return NextResponse.json({ interfaces });
}
