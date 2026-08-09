export const importacaoContent = `
## Importação de competidores por CSV

A tela de Competidores permite importar vários competidores de uma vez via arquivo \`.csv\`. A primeira linha do arquivo deve ser o cabeçalho, com exatamente estes nomes de coluna:

\`\`\`
nome, sexo, peso, nascimento, faixa, escola, kumite, kata
\`\`\`

## Campos aceitos

| Campo | Valores aceitos |
|---|---|
| \`nome\` | Texto livre |
| \`sexo\` | \`masculino\` ou \`feminino\` |
| \`peso\` | Número em kg (ex: \`45.5\`) — obrigatório se \`kumite = sim\` |
| \`nascimento\` | Data no formato \`DD/MM/AAAA\` |
| \`faixa\` | \`branca, azul, amarela, vermelha, laranja, verde, roxa, marrom, preta\` |
| \`escola\` | Texto livre |
| \`kumite\` | \`sim\` para inscrever (qualquer outro valor conta como não) |
| \`kata\` | \`sim\` para inscrever (qualquer outro valor conta como não) |

## Depois da importação

A categoria de cada competidor (Kata e/ou Kumite) é calculada automaticamente a partir desses campos — ver [Classificação](#classificacao). Se alguma linha tiver um valor fora do esperado (ex: faixa não mapeada, data em formato errado), a importação inteira é rejeitada e nenhum competidor é criado.
`.trim();
