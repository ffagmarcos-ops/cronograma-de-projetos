# Portal de Acompanhamento de Projetos (Fullstack)

Este é um sistema robusto e completo para gerenciar e apresentar o acompanhamento de projetos de desenvolvimento de aplicativos para os seus clientes de forma transparente.

## STACK TECNOLÓGICA
* **Backend:** Node.js, Express.js, TypeScript, MariaDB, Swagger/OpenAPI.
* **Frontend:** PWA, React.js (Vite), TypeScript, Mobile First.
* **Infra:** Docker (opcional para MariaDB).

## FLUXO DO SISTEMA
1. A equipe de gestão acessa o painel restrito e cadastra os projetos (Banner, Logo, Prazos).
2. O banco de dados automaticamente preenche as **11 Etapas Padrões** de desenvolvimento.
3. Conforme o desenvolvimento avança, a equipe atualiza a % de conclusão de cada etapa. O sistema calcula o progresso geral e a previsão de entrega matematicamente.
4. O cliente acessa uma URL bonita e pública (`/projeto/aurea-clube`) e visualiza o "Portal do Cliente" sem envio de arquivos e sem aprovações — focado 100% na transparência e no calendário.

---

## INSTALAÇÃO E EXECUÇÃO

### 1. Requisitos
- Node.js (v18+)
- MariaDB ou MySQL (Pode rodar via Docker usando o arquivo incluído)

### 2. Configurando o Banco de Dados (Docker)
Na raiz do projeto, execute:
```bash
docker-compose up -d
```
Isso iniciará um container MariaDB na porta 3306 com as credenciais padrões (`root` / `root`).

### 3. Backend (API)
Navegue para a pasta backend, instale e inicialize o banco:
```bash
cd backend
npm install
npm run initdb   # Cria as tabelas e os dados falsos no MariaDB
npm run dev      # Inicia o servidor Node na porta 3000
```
- A documentação interativa da API (Swagger) estará disponível em: `http://localhost:3000/api-docs`

### 4. Frontend (PWA)
Em outro terminal, navegue para a pasta frontend:
```bash
cd frontend
npm install
npm run dev      # Inicia o servidor Vite React
```

## PWA E MOBILE FIRST
O Frontend utiliza padrões responsivos para que a timeline do projeto se adapte a celulares sem "quebrar" os dados. O suporte a PWA (Manifest e Service Worker) foi estruturado para futura instalação nativa.
