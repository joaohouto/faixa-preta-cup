import { apiError } from "@/lib/api-error";

/**
 * `entity` já veio de um `findUnique`/`findFirst`; retorna ele mesmo, ou
 * a Response 404 (com `message`) se for `null` ou reprovar `extraCheck`
 * (usado pra checar posse — ex. `bracket.tournamentId === tournamentId`,
 * já que nada aqui tem autenticação real, só escopo por torneio).
 * Chamador sempre segue com `if (result instanceof Response) return result;`.
 */
export function requireEntity<T>(
  entity: T | null,
  message: string,
  extraCheck?: (entity: T) => boolean
): T | Response {
  if (!entity || (extraCheck && !extraCheck(entity))) {
    return apiError(message, 404);
  }
  return entity;
}

/**
 * Envolve um handler de rota com o try/catch + log + resposta 500 padrão,
 * repetido antes em todo `route.ts`. `tag` vira o prefixo do log
 * (ex. "[COMPETITORS_GET]"), igual ao que já era escrito na mão.
 */
export function withApiHandler<Args extends unknown[]>(
  tag: string,
  handler: (...args: Args) => Promise<Response>
) {
  return async (...args: Args): Promise<Response> => {
    try {
      return await handler(...args);
    } catch (error) {
      console.error(`[${tag}]`, error);
      return apiError("Internal Error", 500);
    }
  };
}
