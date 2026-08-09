# Faixa Preta Cup — Visão Geral das Features

Esquema visual do funcionamento ponta-a-ponta da plataforma, para apoiar apresentações e onboarding. Cada diagrama referencia os arquivos reais que implementam o fluxo, para não desatualizar conforme o código evolui.

## 1. Fluxo geral do torneio

```mermaid
flowchart LR
    A[Criar torneio] --> B[Cadastrar competidores]
    B --> C[Classificação automática]
    C --> D[Agrupamento em categorias]
    D --> E[Geração de chaves]
    E --> F[Arbitragem ao vivo]
    F --> G[Propagação de vencedores]
    G --> H{Chave completa?}
    H -- não --> F
    H -- sim --> I[Pódio / Resultados]
    I --> J[Relatório oficial]
```

## 2. Cadastro de competidores e classificação automática

Cada competidor pode ser cadastrado manualmente ou em lote via CSV. Em ambos os casos, o sistema calcula automaticamente a categoria de Kata e/ou Kumite a partir de idade, sexo, faixa e peso — não há input manual de categoria.

```mermaid
flowchart TD
    A["Cadastro manual (CompetitorForm)\nou\nImport CSV (competitor-import-form.tsx)"] --> B["POST /api/tournaments/[id]/competitors\nPOST .../competitors/import"]
    B --> C["calculateAge(birthdate)\nsrc/lib/utils/classification.ts"]
    C --> D["getBeltLevel(belt)\nINICIANTE / INTERMEDIÁRIO / AVANÇADO"]
    C --> E["getAgeCategory(age)\nATÉ 5 ANOS ... SENIOR (9 faixas)"]
    D --> F["getKataCategory\nKATA {sexo} {idade} {nível}"]
    E --> F
    D --> G["getKumiteCategory\nKUMITE {sexo} {idade} {nível} {peso}"]
    E --> G
    G --> H["getWeightCategory\n(só a partir de SUB14 — infantil não tem peso)"]
    F --> I[(Competitor.kataCategory)]
    G --> I2[(Competitor.kumiteCategory)]
```

**CSV aceito** (`competitor-import-form.tsx` + `.../competitors/import/route.ts`): colunas `nome, sexo, peso, nascimento, faixa, escola, kumite, kata`, com `sexo` em `masculino/feminino`, `nascimento` em `DD/MM/AAAA`, `faixa` em português e `kumite/kata` como `sim`/outro.

## 3. Geração de chaves (bracket-generator.ts)

Eliminação simples, com byes distribuídos das bordas para o miolo e disputa de 3º lugar quando há 4+ competidores.

```mermaid
flowchart TD
    A["POST /api/tournaments/[id]/brackets\n(categoria + modalidade)"] --> B["Buscar competidores da categoria\n(kataCategory/kumiteCategory)"]
    B --> C["totalSlots = próxima potência de 2\ntotalRounds = log2(totalSlots)"]
    C --> D["getSeededPositions\npreenche do miolo pras bordas"]
    D --> E["computeSlots\ndistribui byes nas bordas"]
    E --> F["Rodada 1: matches reais + byes\n(bye já nasce isCompleted)"]
    F --> G["propagateByeWinners\nempurra vencedores de bye pra rodada 2"]
    C --> H["Rodadas 2..N: placeholders vazios"]
    C --> I{"≥ 4 competidores?"}
    I -- sim --> J["Cria match de 3º lugar\n(round = totalRounds, position = 1)"]
```

## 4. Arbitragem ao vivo

A tela de árbitro mantém o estado da luta em memória e transmite via SSE para o placar público; o resultado só é persistido ao "Finalizar Luta".

```mermaid
flowchart TD
    A["referee/page.tsx\nplacar, chui, senshu, timer"] -- broadcastState --> B["POST /api/live-match"]
    B --> C["EventSource /api/live-match/stream"]
    C --> D["use-live-match.ts\n(hook somente leitura)"]
    D --> E["scoreboard/page.tsx\n(telão público)"]
    A -- Finalizar Luta --> F{"Placar empatado?"}
    F -- sim --> G["Dialog de Hantei\n(decisão manual do árbitro)"]
    F -- não --> H["Vencedor = maior placar"]
    G --> I["PUT /api/.../matches/[matchId]"]
    H --> I
    I --> J["Valida consistência placar/vencedor\n(matches/[matchId]/route.ts)"]
    J --> K["propagateWinner\n(perdedor de semifinal → 3º lugar)"]
    K --> L["checkAndCompleteBracket"]
```

Atalhos de teclado na tela de árbitro: `Espaço` inicia/pausa o timer. `Esc` para voltar funciona nas demais telas do app (`useEscBack`), mas foi deixado de fora do árbitro de propósito — lá, sair sem querer no meio de uma luta perderia o placar, então o botão de voltar pede confirmação em vez disso.

## 5. Resultados e relatório oficial

```mermaid
flowchart TD
    A["GET /api/tournaments/[id]/results"] --> B["Pódio: derivado on-the-fly\nda final + match de 3º lugar"]
    A --> C["Roster completo: todo competidor\nque apareceu na rodada 1"]
    A --> D["Histórico de lutas: placar,\nHantei, timestamps"]
    B --> E["results/page.tsx\ncards por categoria (Kumite/Kata)"]
    C --> E
    D --> E
    E -- "Imprimir (window.print)" --> F["Relatório oficial A4\ncabeçalho/rodapé fixos + inscritos + lutas"]
```

## Referências de código

| Etapa                          | Arquivo                                                                                                                                        |
| ------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| Classificação                  | `src/lib/utils/classification.ts`                                                                                                              |
| Import de CSV                  | `src/components/competitor-import-form.tsx`, `src/app/api/tournaments/[id]/competitors/import/route.ts`                                        |
| Agrupamento em categorias      | `src/app/api/tournaments/[id]/categories/route.ts`                                                                                             |
| Geração de chaves              | `src/lib/utils/bracket-generator.ts`                                                                                                           |
| Arbitragem ao vivo             | `src/app/app/[tournamentId]/(private)/brackets/[bracketId]/referee/page.tsx`, `src/app/api/live-match/route.ts`, `src/hooks/use-live-match.ts` |
| Registro de resultado          | `src/app/api/tournaments/[id]/brackets/[bracketId]/matches/[matchId]/route.ts`                                                                 |
| Resultados / relatório oficial | `src/app/api/tournaments/[id]/results/route.ts`, `src/app/app/[tournamentId]/(public)/results/page.tsx`                                        |
