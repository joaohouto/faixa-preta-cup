#!/bin/sh
set -e

# --skip-generate: o client já foi gerado no build (Dockerfile). Sem essa
# flag, o db push tenta rodar "generate" de novo aqui, e falha ao copiar
# runtime/library.d.ts (o build standalone do Next não traça .d.ts pro
# bundle final, só o que roda em runtime) — não derruba o container hoje,
# mas é um ENOENT desnecessário a cada start e uma fonte de quebra futura.
prisma db push --accept-data-loss --skip-generate

exec node server.js