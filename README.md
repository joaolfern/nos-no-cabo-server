# Nós no Cabo Server
API para o Webring Nós no Cabo.

## Requisitos
- Python 3.10+
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

## Estrutura do Projeto

- `app.py` — Arquivo principal da aplicação
- `models/` — Modelos SQLAlchemy
- `schemas/` — Schemas Pydantic
- `requirements.txt` — Dependências Python

## Testes

Para rodar os testes automatizados:

```bash
python test_app.py
```

Os testes cobrem as operações básicas de criação, listagem, atualização, remoção e validação de projetos.
