# syntax=docker/dockerfile:1
FROM node:22-alpine AS base
# Instala as dependências de sistema exigidas pelo motor do Prisma
RUN apk add --no-cache libc6-compat openssl

FROM base AS builder
WORKDIR /app

# Habilita o pnpm
RUN corepack enable pnpm

# Copia os arquivos de dependência primeiro para aproveitar o cache do Docker
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml* ./
COPY prisma ./prisma

# Instala as dependências (o pnpm gerencia os symlinks internamente aqui).
# --trust-lockfile pula a verificação de supply-chain (minimumReleaseAge/
# trustPolicy) que o pnpm 10+ faz por padrão a cada pacote do lockfile —
# ela soma uma request de atestação por pacote (600+ aqui), o que deixa o
# build lento e frágil em redes restritas/CI. Seguro aqui porque o
# pnpm-lock.yaml é versionado e revisado no repositório.
# --network-concurrency baixo evita que muitos downloads pequenos em
# paralelo disputem banda com os poucos pacotes grandes (SWC do Next,
# engines do Prisma), que em redes mais lentas/instáveis acabavam
# estourando o timeout do pnpm por ficarem "starved".
# O --mount=type=cache persiste o content-addressable store do pnpm entre
# builds (e entre tentativas de um build que falhou no meio): pacotes já
# baixados uma vez não precisam ser buscados de novo da rede, o que só
# ajuda em builds locais repetidos e torna qualquer falha de rede
# transiente muito mais barata de repetir.
# fetch-timeout maior (padrão do npm/pnpm é 60s) dá folga pros binários
# grandes (SWC do Next, engines do Prisma, ~80-150MB) em redes mais
# lentas; fetch-retries maior insiste mais antes de desistir.
RUN --mount=type=cache,id=pnpm-store,target=/root/.local/share/pnpm/store \
    npm_config_fetch_timeout=300000 npm_config_fetch_retries=5 \
    pnpm install --frozen-lockfile --ignore-scripts --trust-lockfile --network-concurrency 4

# Copia o restante do código da aplicação
COPY . .

# Variáveis para a fase de build
ENV NEXT_TELEMETRY_DISABLED=1
ENV DATABASE_URL="file:/tmp/build.db"

# Gera o client do Prisma e faz o build do Next.js
RUN npx prisma generate && pnpm run build

FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
# Aponta para a pasta onde o SQLite persistirá
ENV DATABASE_URL="file:/data/local.db"

# Cria o diretório para o banco de dados
RUN mkdir -p /data

# O grande truque de simplificação:
# Instalar a CLI do Prisma globalmente apenas para rodar o db push no entrypoint.
# Isso evita a necessidade de copiar a espagueteira de symlinks do pnpm.
# A versão é fixada (igual ao "prisma" do package.json) de propósito: um
# `npm install -g prisma` sem versão pega sempre a última CLI disponível
# no momento do build, que pode ser uma major diferente da usada pelo
# projeto (ex.: a 7.x já removeu a flag --skip-generate que o
# entrypoint.sh usa) — isso quebra o container na inicialização sem
# nenhuma mudança de código, só porque o dia do build mudou. Se atualizar
# o "prisma" no package.json, atualize aqui também.
RUN npm install -g prisma@6.15.0

# Copia a pasta pública
COPY --from=builder /app/public ./public

# O build standalone já contém o server.js, a pasta node_modules filtrada e o @prisma/client
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

# Copia o schema para que a CLI do Prisma consiga ler no entrypoint
COPY --from=builder /app/prisma ./prisma

# Configura o entrypoint
COPY entrypoint.sh ./
RUN chmod +x entrypoint.sh

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

ENTRYPOINT ["./entrypoint.sh"]