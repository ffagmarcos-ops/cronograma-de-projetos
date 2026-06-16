# Cronograma de Projetos

Projeto fullstack para acompanhamento de etapas de desenvolvimento com painel administrativo e portal do cliente.

## Stack

- Backend: Node.js, Express, TypeScript, MariaDB
- Frontend: React + Vite + TypeScript
- Infra: Docker Compose, Traefik, Portainer, phpMyAdmin

## Estrutura

- `backend`: API, initdb e Swagger
- `frontend`: aplicação web React
- `docker-compose.yml`: stack completa para deploy
- `.env.example`: variáveis para ambiente local/prod

## Dominios configurados

- App: `projetos.aporttec.com`
- phpMyAdmin: `phpmyadmin.projetos.aporttec.com`

## Serviços Docker

- `projetos_db`: MariaDB 10.11
- `projetos_api`: API Express
- `projetos_app`: Frontend com Nginx
- `projetos_phpmyadmin`: gerenciamento do banco

Todos os serviços usam `restart: always`, healthcheck e redes separadas:

- `projetos_internal`: rede interna da aplicação
- `traefik` (externa): rede de publicação via reverse proxy

## Variáveis de ambiente

Copie o exemplo e ajuste conforme o ambiente:

```bash
cp .env.example .env
```

Principais variáveis:

- `APP_DOMAIN`: dominio público do frontend/app
- `PHPMYADMIN_DOMAIN`: dominio público do phpMyAdmin
- `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`
- `PUBLIC_BASE_URL`: URL pública usada para montar links de upload
- `VITE_API_BASE_URL`: base da API no frontend (default `/api`)

## Rodando localmente (dev)

### 1. Banco (MariaDB)

```bash
docker compose up -d projetos_db
```

### 2. Backend

```bash
cd backend
npm install
npm run initdb:dev
npm run dev
```

API local: `http://localhost:3000`

### 3. Frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend local: `http://localhost:5173`

No modo dev, o Vite faz proxy automático de `/api` para `http://localhost:3000`.

## Deploy com Portainer + Traefik

Pré-requisitos:

- Traefik já rodando no host com rede Docker externa `traefik`
- CertResolver `letsencrypt` configurado no Traefik
- DNS dos domínios apontando para o servidor

Passos:

1. Suba o código no servidor.
2. Crie o `.env` com base no `.env.example`.
3. No Portainer, faça deploy da stack usando o `docker-compose.yml`.
4. Verifique se a rede externa `traefik` existe.
5. Aguarde os healthchecks ficarem `healthy`.

### Roteamento

- Frontend: `Host(APP_DOMAIN)`
- API: `Host(APP_DOMAIN) && PathPrefix(/api)` com prioridade maior e `StripPrefix(/api)`
- phpMyAdmin: `Host(PHPMYADMIN_DOMAIN)`

## Initdb (idempotente e não destrutivo)

O script `backend/src/initdb.ts`:

- Cria tabelas com `CREATE TABLE IF NOT EXISTS`
- Não apaga dados existentes
- Faz seed inicial somente quando não há projetos

No container da API, o `entrypoint.sh` roda `npm run initdb` antes de iniciar a aplicação.
No container da API, o `entrypoint.sh` roda `npm run initdb` antes de iniciar a aplicação, e esse script usa o arquivo compilado `dist/initdb.js`.

Para uso local com TypeScript direto, utilize `npm run initdb:dev`.

## Healthchecks

- MariaDB: `mariadb-admin ping`
- API: `GET /health`
- Frontend: `GET /`
- phpMyAdmin: `GET /`

## Comandos úteis

```bash
# subir tudo

docker compose up -d --build

# ver status

docker compose ps

# logs da API

docker compose logs -f projetos_api

# logs do app

docker compose logs -f projetos_app

# derrubar stack

docker compose down
```

## Troubleshooting rápido

- `network traefik not found`:
  - criar rede: `docker network create traefik`
- erro de conexão da API com banco:
  - validar `DB_HOST=projetos_db` e se `projetos_db` está healthy
- rota `/api` retornando 404 no domínio:
  - conferir labels do Traefik na `projetos_api` e middleware de strip prefix
- uploads com URL local incorreta:
  - ajustar `PUBLIC_BASE_URL` no `.env`
