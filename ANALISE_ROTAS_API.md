# 📋 Organização das Rotas da API

### Estrutura Proposta (RESTful)

```
/api
├── auth/
│   └── [...nextauth]/route.ts
├── tournaments/
│   ├── route.ts                      [POST, GET]
│   └── [id]/
│       ├── route.ts                  [GET, PUT, DELETE]
│       ├── competitors/
│       │   ├── route.ts              [POST, GET]
│       │   ├── [competitorId]/route.ts [PUT, DELETE]
│       │   ├── import/route.ts       [POST - CSV]
│       │   └── bulk-delete/route.ts  [DELETE]
│       ├── brackets/
│       │   ├── route.ts              [POST, GET]
│       │   └── [bracketId]/
│       │       ├── route.ts          [GET, PUT, DELETE]
│       │       └── matches/
│       │           ├── route.ts      [POST, GET]
│       │           └── [matchId]/route.ts [PUT, DELETE]
│       └── categories/
│           └── route.ts              [GET - calcular categorias]
```

### Novos Endpoints (19 no total)

#### **Tournaments**

| Método | Endpoint            | Função                     |
| ------ | ------------------- | -------------------------- |
| POST   | `/tournaments`      | Criar torneio              |
| GET    | `/tournaments`      | Listar torneios do usuário |
| GET    | `/tournaments/[id]` | Obter detalhes             |
| PUT    | `/tournaments/[id]` | Atualizar nome/config      |
| DELETE | `/tournaments/[id]` | Deletar torneio            |

#### **Competitors** (nested under tournament)

| Método | Endpoint                                    | Função        |
| ------ | ------------------------------------------- | ------------- |
| POST   | `/tournaments/[id]/competitors`             | Criar         |
| GET    | `/tournaments/[id]/competitors`             | Listar        |
| PUT    | `/tournaments/[id]/competitors/[cid]`       | Atualizar     |
| DELETE | `/tournaments/[id]/competitors/[cid]`       | Deletar       |
| POST   | `/tournaments/[id]/competitors/import`      | Importar CSV  |
| DELETE | `/tournaments/[id]/competitors/bulk-delete` | Deletar todos |

#### **Brackets** (nested under tournament)

| Método | Endpoint                           | Função           |
| ------ | ---------------------------------- | ---------------- |
| POST   | `/tournaments/[id]/brackets`       | Gerar chave      |
| GET    | `/tournaments/[id]/brackets`       | Listar chaves    |
| GET    | `/tournaments/[id]/brackets/[bid]` | Obter estrutura  |
| PUT    | `/tournaments/[id]/brackets/[bid]` | Atualizar status |
| DELETE | `/tournaments/[id]/brackets/[bid]` | Deletar chave    |

#### **Matches** (nested under bracket)

| Método | Endpoint                                         | Função              |
| ------ | ------------------------------------------------ | ------------------- |
| POST   | `/tournaments/[id]/brackets/[bid]/matches`       | Criar               |
| GET    | `/tournaments/[id]/brackets/[bid]/matches`       | Listar              |
| PUT    | `/tournaments/[id]/brackets/[bid]/matches/[mid]` | Registrar resultado |
| DELETE | `/tournaments/[id]/brackets/[bid]/matches/[mid]` | Deletar             |

#### **Utilitários**

| Método | Endpoint                       | Função                          |
| ------ | ------------------------------ | ------------------------------- |
| GET    | `/tournaments/[id]/categories` | Calcular categorias automáticas |

---

## 🔒 Benefícios da Nova Estrutura

1. **RESTful:** Padrão hierárquico e previsível
2. **Segurança:** Validação em cascata (user → tournament → resource)
3. **Escalabilidade:** Fácil adicionar novos recursos
4. **Manutenibilidade:** Cada recurso no seu próprio diretório
5. **Clareza:** Relações imediatas entre recursos
