export type BracketStatus = "NOT_STARTED" | "IN_PROGRESS" | "COMPLETED";

export const bracketStatusLabel: Record<BracketStatus, string> = {
  NOT_STARTED: "Não iniciado",
  IN_PROGRESS: "Em andamento",
  COMPLETED: "Concluído",
};

// Badge outline (header da chave, cards de categoria, resumo de resultados)
export const bracketStatusBadgeClass: Record<BracketStatus, string> = {
  NOT_STARTED: "text-muted-foreground",
  IN_PROGRESS:
    "border-blue-500/40 bg-blue-500/10 text-blue-600 dark:text-blue-400",
  COMPLETED:
    "border-green-500/40 bg-green-500/10 text-green-600 dark:text-green-400",
};

// Borda esquerda dos cards de categoria (listagem de chaves)
export const bracketStatusBorderClass: Record<BracketStatus, string> = {
  NOT_STARTED: "border-l-transparent",
  IN_PROGRESS: "border-l-blue-500",
  COMPLETED: "border-l-green-500",
};

// Bolinha de status (indicador "ao vivo"/"concluído" da página de resultados)
export const bracketStatusDotClass: Record<BracketStatus, string> = {
  NOT_STARTED: "",
  IN_PROGRESS: "bg-blue-400 animate-pulse",
  COMPLETED: "bg-green-500",
};

// Nome do vencedor em destaque (lista de lutas da chave)
export const winnerTextClass = "text-green-600 dark:text-green-400 font-semibold";

// Contorno de linha/luta já concluída (lista de lutas da chave)
export const completedRowClass = "border-green-500/40 bg-green-500/5";
