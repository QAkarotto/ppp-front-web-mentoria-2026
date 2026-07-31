Objetivo:
Criar uma Aplicação Web para acompanhamento da progressão de alunos de música.

Contexto:
- A Aplicação Web será baseada na API de acompanhamento da progressão de alunos de música que está definida no Swagger file aramazenado em resources/swagger.json
- Para que eu possa usar as funcionalidades, preciso fazer login como instrutor.
- Para que o aluno possa consultar seu progresso, ele precisa fazer login como aluno.
- Alunos apenas consultam progresso, instrutores acessam todas as funcionalidades do sistema.
- Progressão é feita através da comparação de lições existentes e lições já realizadas pelo aluno.
- A API estará rodando em http://localhost:3000

Regras:
- Apenas execute o que eu te pedir, não me pergunte nada.
- Crie essa aplicações Web usando o framework express do JavaScript.
- Utilize HTML e CSS para frontend, use o framework Bulma para estilização.
- Faça a aplicação web rodar na porta 4000.
- Configure mensagens de erro para quando a API retornar falhas (fora da faixa de status code 200).