# Progressão Musical Web

Aplicação web em **Express + EJS** para acompanhar a progressão de alunos de música. O frontend usa **HTML, CSS e Bulma** e se comunica com a API definida em `resources/swagger.json`.

## Visão geral

- API esperada em `http://localhost:3000`
- Aplicação web executando em `http://localhost:4000`
- Login com dois perfis:
  - **Instrutor**: acessa todas as funcionalidades
  - **Aluno**: consulta apenas o próprio progresso
- A progressão é calculada a partir da comparação entre lições cadastradas e lições concluídas pelo aluno
- A interface exibe mensagens de erro quando a API retorna respostas fora da faixa `2xx`

## Requisitos

- Node.js 18 ou superior
- API backend em execução em `http://localhost:3000`

## Instalação

```bash
npm install
```

## Execução

```bash
npm start
```

O servidor web ficará disponível em `http://localhost:4000`.

Para desenvolvimento com reinício automático:

```bash
npm run dev
```

## Estrutura principal

- `server.js`: servidor Express, rotas, autenticação por sessão e integração com a API
- `views/`: páginas EJS do frontend
- `public/styles.css`: estilos adicionais da interface
- `resources/swagger.json`: contrato da API consumida pela aplicação

## Fluxos da aplicação

### Instrutor

- Criar o primeiro instrutor
- Fazer login
- Cadastrar alunos
- Cadastrar lições
- Listar alunos e lições
- Registrar lições concluídas por aluno
- Consultar progresso de qualquer aluno

### Aluno

- Fazer login
- Consultar o próprio progresso em uma tela resumida

## Rotas da interface

- `/` - página inicial com atalhos e resumo conforme o perfil logado
- `/login` - login de instrutor ou aluno
- `/register/instructor` - cadastro do primeiro instrutor
- `/register/student` - cadastro de aluno, disponível apenas para instrutor
- `/students` - lista de alunos, disponível apenas para instrutor
- `/students/:id` - detalhes do aluno e progresso
- `/students/:id/completed-lessons/new` - registro de lição concluída
- `/lessons` - lista de lições, disponível apenas para instrutor
- `/lessons/new` - cadastro de nova lição
- `/progress/me` - progresso do aluno autenticado
- `/progress/students/:id` - progresso de um aluno específico, disponível apenas para instrutor

## API consumida

A aplicação integra com os endpoints descritos no Swagger em `resources/swagger.json`, incluindo:

- `POST /api/auth/login`
- `POST /api/auth/instructors/register`
- `POST /api/auth/students/register`
- `GET /api/students`
- `GET /api/students/:id`
- `POST /api/students/:id/completed-lessons`
- `GET /api/lessons`
- `POST /api/lessons`
- `GET /api/progress/me`
- `GET /api/progress/students/:id`

## Observações

- A aplicação usa sessão para armazenar token e usuário autenticado.
- Se a API retornar erro, a interface mostra a mensagem recebida sempre que possível.
- O backend da aplicação não persiste dados localmente; tudo depende da API externa.