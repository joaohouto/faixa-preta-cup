# 🥋 Requisitos do Sistema de Gestão de Torneios de Karatê Shotokan (Módulo 1)

## 🎯 Objetivo

Implementar a fundação do sistema, cobrindo o cadastro de torneios e competidores, a classificação automática nas categorias definidas e a geração inicial de chaves por Eliminação Simples.

## 👤 Modelo de Usuário

O sistema opera com um único papel de usuário neste módulo: o **Organizador/Administrador**.

- **Autenticação:** O sistema deve garantir que apenas usuários autenticados (Organizador) possam criar e gerenciar seus próprios torneios e dados.

- **Escopo de Dados:** Cada Organizador só pode visualizar, criar e editar os Torneios e Competidores que ele mesmo cadastrou.

## 📝 Caso de Uso 0: Gestão de Torneios

Permite ao Organizador registrar e selecionar o contexto de trabalho.

- **Criar Torneio:** Cadastro simples, exigindo apenas o **Nome** do evento. A **Data de Criação** será registrada automaticamente pelo sistema.

- **Seleção:** Deve ser possível listar e selecionar o torneio ativo para que os competidores sejam vinculados a ele.

## 📝 Caso de Uso 1: Cadastro e Classificação de Competidores

Este é o módulo central, responsável por coletar dados e classificar o atleta em suas categorias de competição.

### 1.1 Dados do Competidor

Os seguintes campos são mandatórios no cadastro:

Os campos obrigatórios para o cadastro são:

- **Nome** (String)

- **Sexo** (Enum: MASCULINO / FEMININO)

- **Peso** (Numérico/kg): Obrigatório apenas para inscrição em Kumite.

- **Data de Nascimento** (Data): Usado para calcular a idade na data do torneio (para simplificar, considera-se a data de cadastro).

- **Graduação** (Enum): Sequência: Branca $\\to$ Azul $\\to$ Amarela $\\to$ Vermelha $\\to$ Laranja $\\to$ Verde $\\to$ Roxa $\\to$ Marrom $\\to$ Preta.

- **Escola/Associação** (String)

- **Inscrição em Kata** (Booleano): Opcional.

- **Inscrição em Kumite** (Booleano): Opcional.

### 1.2 Regras de Categorização (Hardcoded)

O sistema deve **classificar o competidor automaticamente** para as modalidades inscritas (KATA e/ou KUMITE) assim que o cadastro for concluído, utilizando as seguintes regras:

#### Categorias de Graduação (Níveis Competitivos)

- **Nível Iniciante** (Ordem de Prioridade: Menor): Branca, Azul, Amarela

- **Nível Intermediário** (Ordem de Prioridade: Média): Vermelha, Laranja, Verde

- **Nível Avançado** (Ordem de Prioridade: Maior): Roxa, Marrom, Preta

#### Categorias de Idade (KUMITE e KATA)

- **Sênior:** 18 anos ou mais

- **Sub-21:** 18, 19 ou 20 anos

- **Júnior:** 16 ou 17 anos

- **Cadete:** 14 ou 15 anos

- **Sub-14:** 12 ou 13 anos

- **Extras:** 10 e 11 anos; 8 e 9 anos; 6 e 7 anos; até 5 anos.

#### Categorias de Peso (KUMITE - Masculino e Feminino)

O peso só é aplicado para categorias Juvenis (Sub-14+) e Adultas. As categorias infantis (11 anos e menos) são separadas apenas por Idade/Sexo/Graduação.

**Masculino:**

- **Sênior/Sub-21:** -60 kg, -67 kg, -75 kg, -84 kg, +84 kg

- **Júnior:** -55 kg, -61 kg, -68 kg, -76 kg, +76 kg

- **Cadete:** -52 kg, -57 kg, -63 kg, -70 kg, +70 kg

- **Sub-14:** -40 kg, -45 kg, -50 kg, -55 kg, +55 kg

**Feminino:**

- **Sênior/Sub-21:** -50 kg, -55 kg, -61 kg, -68 kg, +68 kg

- **Júnior:** -48 kg, -53 kg, -59 kg, -66 kg, +66 kg

- **Cadete:** -47 kg, -54 kg, -61 kg, +61 kg

- **Sub-14:** -42 kg, -47 kg, -52 kg, +52 kg

### 1.3 Listagem e Ordenação

Deve ser possível listar os competidores do torneio ativo de duas formas:

1.  **Lista Detalhada:** Todos os competidores com suas categorias Kata e Kumite.

2.  **Lista por Categoria:** Agrupamento de competidores por suas categorias.

O sistema **deve aplicar a seguinte ordem de classificação** (do menor para o maior) ao listar competidores:

1.  **Idade:** Do mais novo para o mais velho.

2.  **Sexo:** Feminino antes de Masculino.

3.  **Peso:** Do menor peso para o maior peso.

4.  **Graduação:** Da menor graduação (Branca) para a maior (Preta).

## 📝 Caso de Uso 2: Geração de Chaves de Competição

- **Sistema Único:** Apenas o sistema de **Eliminação Simples** (Single Elimination) é suportado.

- **Geração:** O Organizador deve acionar a geração de chaves por categoria (Kumite e Kata separadamente). O sistema deve calcular a potência de 2 (2, 4, 8, 16...) e inserir _Byes_ (folgas) conforme necessário.

- **Cadastro Tardio (Recálculo):**

  - Se um competidor for cadastrado em uma categoria cuja chave **ainda não foi iniciada** (nenhuma luta registrada), a chave existente deve ser recalculada e regenerada.

  - Se a chave **já estiver em andamento**, o cadastro tardio para aquela categoria deve ser **bloqueado**.

_Fim dos Requisitos do Módulo 1._
