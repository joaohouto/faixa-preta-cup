export const classificacaoContent = `
## Como a categoria é calculada

A categoria de um competidor **não é escolhida manualmente** — ela é calculada automaticamente a partir de idade, sexo, faixa e (para Kumite) peso, no momento do cadastro ou da importação por CSV. A lógica vive em \`src/lib/utils/classification.ts\`.

## Nível de faixa

| Nível | Faixas |
|---|---|
| Iniciante | Branca, Azul, Amarela |
| Intermediário | Vermelha, Laranja, Verde |
| Avançado | Roxa, Marrom, Preta |

## Categoria de idade

A idade é calculada a partir da data de nascimento na data de referência (hoje, por padrão).

| Categoria | Idade |
|---|---|
| Até 5 anos | 5 ou menos |
| 6-7 anos | 6-7 |
| 8-9 anos | 8-9 |
| 10-11 anos | 10-11 |
| Sub14 | 12-13 |
| Cadete | 14-15 |
| Junior | 16-17 |
| Sub21 | 18-20 |
| Senior | 21+ |

## Categoria final

- **Kata**: \`KATA {sexo} {categoria de idade} {nível de faixa}\` — não usa peso.
- **Kumite**: \`KUMITE {sexo} {categoria de idade} {nível de faixa} {categoria de peso}\`.

## Categoria de peso (só para Kumite, a partir de Sub14)

Categorias infantis (Até 5 anos, 6-7, 8-9, 10-11 anos) não usam peso — a disputa é só por idade/faixa/sexo.

**Masculino**

| Idade | Faixas de peso |
|---|---|
| Senior / Sub21 | -60kg, -67kg, -75kg, -84kg, +84kg |
| Junior | -55kg, -61kg, -68kg, -76kg, +76kg |
| Cadete | -52kg, -57kg, -63kg, -70kg, +70kg |
| Sub14 | -40kg, -45kg, -50kg, -55kg, +55kg |

**Feminino**

| Idade | Faixas de peso |
|---|---|
| Senior / Sub21 | -50kg, -55kg, -61kg, -68kg, +68kg |
| Junior | -48kg, -53kg, -59kg, -66kg, +66kg |
| Cadete | -47kg, -54kg, -61kg, +61kg |
| Sub14 | -42kg, -47kg, -52kg, +52kg |

Um competidor com Kumite habilitado precisa ter peso preenchido — sem peso, a inscrição em Kumite é rejeitada.
`.trim();
