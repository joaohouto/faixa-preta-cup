"use client";

import { useRouter } from "next/navigation";
import { useHotkeys } from "react-hotkeys-hook";

/**
 * Esc volta para a tela anterior — exceto quando há um dialog, menu ou
 * select aberto, caso em que o Esc deve só fechá-lo (senão o usuário
 * fecharia o dialog E navegaria pra fora da página com uma tecla só).
 * Não usar na tela de árbitro: lá, sair sem confirmar pode perder o
 * estado de uma luta em andamento — ver `requestLeave` em referee/page.tsx.
 */
export function useEscBack() {
  const router = useRouter();

  useHotkeys(
    "esc",
    () => {
      const blockingUiOpen = document.querySelector(
        '[role="dialog"], [role="alertdialog"], [role="menu"], [role="listbox"]',
      );
      if (blockingUiOpen) return;
      router.back();
    },
    {
      preventDefault: true,
      enableOnFormTags: true,
      enableOnContentEditable: true,
    },
  );
}
