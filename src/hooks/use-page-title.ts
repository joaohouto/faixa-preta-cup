"use client";

import { useEffect } from "react";
import { appConfig } from "@/config/app";

/**
 * Atualiza dinamicamente o document.title da aba do navegador no cliente.
 * Se o título já contiver o separador do app (| FPCup), mantém como está;
 * caso contrário, adiciona o template padrão (`%s | FPCup`).
 */
export function usePageTitle(title?: string | null) {
  useEffect(() => {
    if (!title || typeof document === "undefined") return;

    const trimmed = title.trim();
    if (!trimmed) return;

    if (trimmed.includes(`| ${appConfig.shortTitle}`) || trimmed.includes(`| ${appConfig.title}`)) {
      document.title = trimmed;
    } else {
      document.title = `${trimmed} | ${appConfig.shortTitle}`;
    }
  }, [title]);
}
