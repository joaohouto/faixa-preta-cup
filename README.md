# Faixa Preta Cup

Plataforma para gerenciar torneios de karatê: cadastro de competidores, classificação automática por faixa/idade/peso, geração e arbitragem de chaves (Kata e Kumite), placar ao vivo e relatório oficial de resultados.

Sem login — qualquer pessoa com acesso à URL do app consegue operar. Pensado para ser usado por uma equipe pequena (organização + árbitros) na rede local do evento.

## Stack

- **Next.js 15** (App Router) + **React 19** + TypeScript
- **Prisma** + **SQLite** (arquivo local, sem serviço de banco externo)
- Tailwind + Radix UI (shadcn)
- `react-hotkeys-hook` (atalhos de teclado), `react-markdown` (aba de documentação), `papaparse` (import de CSV)

## Rodando localmente

```bash
pnpm install          # o postinstall já roda "prisma generate"
cp .env.example .env  # ajuste DATABASE_URL / NEXT_PUBLIC_HOSTNAME se precisar
pnpm dlx prisma migrate dev   # aplica as migrations no banco local (local.db)
pnpm dev
```

Abre em `http://localhost:3000`.

### Banco de dados

O projeto usa **migrations do Prisma** em desenvolvimento (histórico versionado em `prisma/migrations/`):

```bash
npx prisma migrate dev      # cria/aplica migrations a partir de mudanças no schema.prisma
npx prisma migrate status   # confere se o banco local está em dia com o schema
npx prisma generate         # regenera o Prisma Client (roda sozinho no postinstall)
```

> Depois de rodar uma migration com o `pnpm dev` já aberto em outro terminal, **reinicie o `pnpm dev`**. O client do Prisma é guardado em `globalThis` de propósito (evita estourar conexões no hot-reload do Next), então o processo não pega o client regerado sozinho — só reiniciando.

Em produção (Docker), não são as migrations que rodam — veja "Deploy" abaixo.

## Deploy (Docker)

```bash
docker compose up -d --build
```

O `Dockerfile` builda o Next em modo `standalone`. No `entrypoint.sh`, o container roda **`prisma db push --accept-data-loss --skip-generate`** contra `/data/local.db` (volume persistente `db_data`, ver `docker-compose.yml`) antes de subir o servidor — ele sincroniza o schema diretamente, sem depender do histórico de migrations estar presente na imagem final (`--skip-generate` porque o client já foi gerado no build; sem essa flag o `db push` tenta gerar de novo e falha ao copiar um `.d.ts` que o build standalone não inclui — não derruba o container, mas suja o log a cada start). Isso funciona bem pra esse tipo de deploy de container único, mas **é destrutivo em mudanças incompatíveis de schema** (`--accept-data-loss` aceita perda de dados quando necessário para aplicar a mudança) — não é o fluxo certo se um dia o projeto precisar de múltiplos ambientes com o mesmo banco.

Testado nesta sessão: `docker build` + `docker run` de ponta a ponta (imagem builda, container sobe, `db push` cria o schema do zero em um volume vazio, app responde 200 em `/app`).

Variáveis de ambiente relevantes (ver `.env.example`):

- `DATABASE_URL` — caminho do arquivo SQLite (`file:./local.db` local, `file:/data/local.db` no container)
- `NEXT_PUBLIC_HOSTNAME` — URL pública do app (usada em metadata/Open Graph)

**Antes do dia do torneio**, faça um teste ponta-a-ponta com essa imagem (não só `pnpm dev`) — é o que efetivamente vai rodar no evento:

```bash
docker build -t faixa-preta-cup .
docker compose up -d
```

## Como operar um torneio

1. **Criar o campeonato** — tela inicial (`/app`), escolha um nome.
2. **Competidores** — cadastro manual ou import de `.csv` em lote (o dialog de import mostra os campos e valores aceitos; ver também a aba Documentação → Importação no app). Categoria de Kata/Kumite é calculada automaticamente a partir de faixa, idade, sexo e peso — não é escolhida manualmente.
3. **Categorias e Chaves** — gere as chaves por categoria (ou todas de uma vez). Eliminação simples, com bye automático quando o número de competidores não é potência de 2, e disputa de 3º lugar quando há 4+ competidores.
4. **Arbitragem** — abra uma luta pela chave. Placar manual, timer configurável (`Espaço` inicia/pausa), Senshu e Chui são informativos. Empate exige decisão por Hantei. Se um competidor faltar, use **Ausente (W.O.)** no card dele — diferente de bye, W.O. só existe quando os dois estavam escalados. O estado da luta é transmitido ao vivo (SSE) para o Scoreboard público, pra outra pessoa acompanhar em tempo real.
5. **Scoreboard** — tela pública (pensada pra telão/projeção), sem interação, mostra a luta em andamento.
6. **Resultados** — classificação por categoria, atualiza sozinha, e tem impressão em PDF do relatório oficial (sempre em modo claro, mesmo com o app no tema escuro).
7. **Documentação** (`/app/docs`) — aba fixa no menu, sempre visível: explica classificação, geração de chaves, regras de arbitragem e formato do CSV — é a referência pra dúvida no meio do evento.

Atalho `Esc` volta pra tela anterior em quase todo o app — **exceto na tela de árbitro**, onde sair sem querer no meio de uma luta perderia o placar (lá o botão de voltar pede confirmação em vez disso).

## Estrutura do projeto

```
src/app/api/tournaments/…              rotas da API (torneio, competidores, categorias, chaves, resultados)
src/app/app/[tournamentId]/(private)/  telas de organização (competidores, chaves, árbitro)
src/app/app/[tournamentId]/(public)/   telas pra exibição (scoreboard, resultados) — impressão/telão
                                        ("private"/"public" são só grupos de rota do Next.js, não controle de acesso — não há auth)
src/app/app/docs/                      aba de documentação in-app
src/lib/utils/classification.ts        regras de categoria (faixa/idade/peso)
src/lib/utils/bracket-generator.ts     geração de chave (seeding, byes, 3º lugar)
prisma/schema.prisma                   modelo de dados
docs/features-overview.md              diagramas do fluxo completo (apoio pra apresentação)
```

## Limitações conhecidas

- Sem autenticação — não exponha a URL publicamente sem alguma camada de rede (VPN, rede local do evento, etc.).
- SQLite em arquivo único — não é para múltiplas instâncias do app escrevendo ao mesmo tempo.
- Chaves são de eliminação simples, sem repescagem.
- `pnpm lint` requer um `eslint.config.js` que não está versionado neste checkout — os demais scripts (`dev`, `build`) não dependem disso.
