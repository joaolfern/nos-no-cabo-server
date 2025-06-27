# Nós no Cabo Server
API para o Webring Nós no Cabo.

## Requisitos
- Python 3.10+
- pip

## Instalação

1. **Crie um ambiente virtual (recomendado):**
   ```bash
   pyenv virtualenv 3.10 nos-no-cabo
   pyenv local nos-no-cabo
   ```

2. **Instale as dependências:**
   ```bash
   pip install -r requirements.txt
   ```

3. **Execute a aplicação:**
   ```bash
   python app.py
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

## Banco de Dados
- Utiliza SQLite por padrão (o arquivo `database.db` será criado automaticamente).

## Endpoints
- `GET /project` — Lista todos os projetos
- `GET /project/<project_id>` — Obtém um projeto pelo ID
- `POST /project` — Cria um novo projeto
- `PATCH /project/<project_id>` — Atualiza um projeto
- `DELETE /project/<project_id>` — Remove um projeto

## CORS
CORS está habilitado para todas as origens por padrão.

## Testes

Para rodar os testes automatizados:

```bash
python test_app.py
```

Os testes cobrem as operações básicas de criação, listagem, atualização, remoção e validação de projetos.

## Observações
- Na primeira execução, as tabelas do banco de dados são criadas automaticamente.
- Em desenvolvimento, o servidor roda com `debug=True`.

---

Sinta-se à vontade para abrir issues ou contribuir!
