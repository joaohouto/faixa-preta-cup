export const arbitragemContent = `
## Pontuação e arbitragem

A tela de árbitro (\`.../brackets/[bracketId]/referee\`) controla o placar, o timer e as penalidades da luta em tempo real, transmitindo o estado ao vivo para o telão público (Scoreboard) enquanto a luta acontece.

## Durante a luta

- **Placar**: pontos de Aka (vermelho) e Ao (azul), incrementados manualmente pelo árbitro.
- **Chui**: penalidades exibidas por nível — são apenas informativas, não afetam o placar nem o resultado automaticamente.
- **Senshu**: indicador de vantagem de primeiro ponto. Não decide o resultado sozinho (empate ainda exige Hantei), mas é salvo junto com o resultado e aparece no relatório de resultados como referência de quem teve a vantagem.
- **Timer**: duração configurável (1 a 3 minutos), com play/pause e reset.

## Encerrando a luta

Ao clicar em **Finalizar Luta**:

1. Se os placares são diferentes, o vencedor é automaticamente quem tem mais pontos.
2. Se os placares estão **empatados**, é obrigatório abrir a decisão por **Hantei** — o árbitro escolhe manualmente o vencedor.
3. O servidor valida a consistência: sem empate, o vencedor tem que corresponder a quem tem o placar maior (não é possível declarar vencedor um competidor com placar menor sem Hantei).

## Ausência (W.O.)

Se um dos dois competidores escalados não comparecer, o botão **Ausente (W.O.)** no card dele encerra a luta sem placar, declarando o outro vencedor automaticamente. É diferente de um **bye**: bye é estrutural (decidido na geração da chave, quando não havia segundo competidor pra aquela posição), enquanto W.O. só existe quando os dois estavam escalados para a luta e um não apareceu no dia. O relatório de resultados distingue os dois casos.

## Depois de salvar

- O resultado é gravado (placar, vencedor, se houve decisão por Hantei e quem tinha Senshu).
- O vencedor é propagado para a próxima rodada da chave.
- Se a luta era uma semifinal, o perdedor é encaminhado para a disputa de 3º lugar.
- Se essa era a última luta pendente da chave, ela é marcada como concluída.

## Atalhos de teclado (tela de árbitro)

| Tecla | Ação |
|---|---|
| Espaço | Inicia/pausa o timer |

O atalho Esc para voltar (disponível nas outras telas do app) foi desativado de propósito nesta tela: sair sem querer no meio de uma luta perderia o placar e o timer. O botão de voltar aqui sempre pede confirmação se houver placar ou timer em andamento, e a aba também avisa antes de ser fechada/recarregada nesse caso.
`.trim();
