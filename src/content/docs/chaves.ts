export const chavesContent = `
## Geração de chaves

As chaves são de **eliminação simples** (sem repescagem), geradas por categoria e modalidade a partir dos competidores já classificados. A lógica vive em \`src/lib/utils/bracket-generator.ts\`.

## Tamanho da chave e byes

- O número de posições (\`totalSlots\`) é sempre a próxima potência de 2 acima do número de competidores (5 competidores → 8 posições, 9 → 16, etc).
- As posições que sobram viram **bye** (avanço automático, sem luta).
- Os byes são distribuídos preferencialmente nas **bordas** da chave, avançando para o miolo apenas quando o número de byes exceder o número de bordas — assim nenhuma luta da 1ª rodada fica sem competidor algum.
- Um bye já nasce com resultado definido (vencedor = quem recebeu o bye) e não passa pela arbitragem.

## Ordem de preenchimento

Os competidores são posicionados do **miolo para as bordas** da chave (não é um sorteio aleatório — dentro de uma categoria, idade/sexo/peso/faixa já são praticamente constantes, então a ordem final é a ordem de cadastro).

## Disputa de 3º lugar

Quando a categoria tem **4 ou mais competidores**, é criada uma luta extra de 3º lugar, disputada pelos dois perdedores de semifinal.

## Propagação de resultados

- Vencedores de bye avançam automaticamente para a 2ª rodada assim que a chave é gerada.
- Vencedores de lutas reais avançam para a próxima rodada ao serem registrados pelo árbitro.
- Quando todas as lutas de uma chave estão concluídas (jogadas ou bye), a chave é marcada como **concluída** automaticamente.
`.trim();
