# Nós no Cabo Server
API para o Webring Nós no Cabo.

> **Migração em andamento.** A nova API `/v1` roda em Cloudflare Workers (TypeScript), em
> `packages/` e `services/`, ao lado do servidor Flask atual, que será desligado na virada
> (ADR 0002 e plano em `nos-client/docs`). As instruções em Python mais abaixo valem só para a
> API antiga.

## API v1 (Cloudflare Workers)

| Pasta | O que é |
| --- | --- |
| `packages/contract` | `@nosnocabo/contract`: schemas zod e tipos da API, publicados no npm e usados pelo nos-client |
| `services/gateway` | Única entrada pública: CORS, rate limit e repasse de `/v1/*` |
| `services/catalog` | Sites e categorias (D1): preview, cadastro, status, listagem paginada, vizinhos no anel |

Requisitos: Node 22+ e npm.

```bash
npm install          # também compila o contract
npm run dev          # aplica as migrations locais e sobe gateway + catalog em http://localhost:8787
npm run typecheck
npm test             # testes dentro do runtime dos Workers (Miniflare)
```

Para ter dados: `npm run seed:local -w @nosnocabo/catalog` (ou `seed:staging`) carrega os
projetos de `services/catalog/seed/websites.json`. Rodar de novo não duplica nada.

Localmente, `npm run dev` cria `services/catalog/.dev.vars` a partir de `.dev.vars.example`: o
Turnstile usa a chave de teste (aceita qualquer token). `AUTO_PUBLISH=true` publica os sites na
hora, até a moderação existir.

### Staging

1. Crie o banco: `npx wrangler d1 create nnc-catalog-staging` e copie o `database_id` para
   `services/catalog/wrangler.jsonc` (`env.staging`). Feito: `47b0086b-…`.
2. Defina os segredos do catalog:
   `npx wrangler secret put TURNSTILE_SECRET --env staging` e
   `npx wrangler secret put IP_HASH_SALT --env staging` (dentro de `services/catalog`). Feito.
3. No GitHub, crie os segredos `CLOUDFLARE_API_TOKEN` e `CLOUDFLARE_ACCOUNT_ID` no ambiente
   `staging`. Cada push em `main` testa e publica catalog e gateway.

### Publicar o contract

Mude a versão em `packages/contract/package.json`, crie a tag `contract-vX.Y.Z` e faça push.
O CI publica via Trusted Publishing, sem token: em npmjs.com, nas configurações do pacote
`@nosnocabo/contract`, adicione um *trusted publisher* do GitHub Actions com o repositório
`joaolfern/nos-no-cabo-server`, o workflow `workers.yml` e o ambiente em branco. Para publicar
à mão: `npm publish -w @nosnocabo/contract` (pede a confirmação de 2FA no navegador). Durante o desenvolvimento, use `npm link` no nos-client
em vez de publicar cada mudança.

## API antiga (Flask)

## Requisitos
- Python > 3.10 && <= 3.12
- pip

## Instalação e execução da aplicação

1. **Defina uma senha de administrador** (Opcional)
Esse passo é necessário para ter acesso às operações de administrador do sistema.
Crie um arquivo chamado `.env` na raiz do projeto e adicione a linha abaixo:

```
ADMIN_PASSWORD=sua_senha_aqui
```

Esse mesmo valor também deve ser definido na env do front-end (`VITE_ADMIN_PASSWORD`),

2. **Execute a aplicação com Docker Compose:**

```bash
docker-compose up --build
```

O servidor será iniciado em `http://localhost:3000`.


## Documentação da API

Após iniciar o servidor, acesse:
- [http://localhost:3000/openapi](http://localhost:3000/openapi) para a documentação interativa da API (Swagger, Redoc, RapiDoc)

### 📊 Arquitetura da Aplicação

<img width="762" height="372" alt="Frame 30@2x" src="https://github.com/user-attachments/assets/c6e3910c-11a3-402f-983e-46bb20d14f1f" />

O diagram acima ilustra os principais módulos e integrações da aplicação.

---



### Front-end

https://github.com/joaolfern/nos-no-cabo-client