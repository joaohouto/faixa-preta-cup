# API Routes — Faixa Preta Cup

Este documento lista as rotas atualmente expostas em `/src/app/api` e descreve seu propósito, métodos, autenticação e formato de requisição/resposta.

---

## /api/auth/[...nextauth]

- Métodos: GET, POST
- Propósito: NextAuth (login via Google etc.)
- Notas: handler do NextAuth em `src/app/api/auth/[...nextauth]/route.ts`

---

## /api/tournaments

- Métodos: POST, GET
- POST: cria um torneio
  - Body: `{ name: string }`
  - Retorna: objeto `Tournament` criado
  - Requer sessão
- GET: lista torneios do usuário (organizer)
  - Retorna: `Tournament[]`
  - Requer sessão

Arquivo: `src/app/api/tournaments/route.ts`

---

## /api/tournaments/[id]

- Métodos: GET, PUT, DELETE
- GET: obter detalhes do torneio (somente organizer)
  - Retorna: `Tournament`
- PUT: atualizar nome do torneio
  - Body: `{ name?: string }`
  - Retorna: `Tournament` atualizado
- DELETE: deletar torneio (cascade)
  - Retorna: 204

Arquivo: `src/app/api/tournaments/[id]/route.ts`

---

## /api/tournaments/[id]/competitors

- Métodos: POST, GET
- POST: criar competidor no torneio (valida owner)
  - Body: competidor (nome, birthdate, gender, belt, weight?, school, kata, kumite)
  - Resposta: `Competitor` criado (com `age`, `kataCategory`, `kumiteCategory` calculados)
- GET: listar competidores do torneio (ordenado)
  - Retorna: `Competitor[]`

Arquivo: `src/app/api/tournaments/[id]/competitors/route.ts`

---

## /api/tournaments/[id]/competitors/[competitorId]

- Métodos: PUT, DELETE
- PUT: atualizar competidor (recalcula categorias)
  - Body: campos do competidor
  - Retorna: `Competitor` atualizado
- DELETE: remover competidor do torneio
  - Retorna: 204

Arquivo: `src/app/api/tournaments/[id]/competitors/[competitorId]/route.ts`

---

## /api/tournaments/[id]/competitors/import

- Método: POST
- Função: importar competidores via CSV (form-data: `file`)
- Formato esperado: CSV com colunas em português (`nome, sexo, peso, nascimento, faixa, escola, kumite, kata`)
- Cria múltiplos `Competitor` com categorias calculadas

Arquivo: `src/app/api/tournaments/[id]/competitors/import/route.ts`

---

## /api/tournaments/[id]/competitors/bulk-delete

- Método: DELETE
- Função: deletar todos os competidores do torneio (melhor que N requisições individuais)
- Retorna: `{ success: true, deletedCount: number }`

Arquivo: `src/app/api/tournaments/[id]/competitors/bulk-delete/route.ts`

---

## /api/tournaments/[id]/categories

- Método: GET
- Função: calcula e retorna as categorias já agrupadas para o torneio
- Retorna: `{ tournament, kataCategories: [{ category, competitors[] }], kumiteCategories: [...] }`
- Uso: facilita páginas que exibem categorias sem lógica no cliente

Arquivo: `src/app/api/tournaments/[id]/categories/route.ts`

---

## Notas e pendências

- Brackets e Matches: rotas ainda não finalizadas aqui (proposta de estrutura em `ANALISE_ROTAS_API.md`) — podem ser adicionadas como `/api/tournaments/[id]/brackets` e `/api/tournaments/[id]/brackets/[bracketId]/matches`.
