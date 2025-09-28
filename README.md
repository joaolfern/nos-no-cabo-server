# Nós no Cabo Server
API para o Webring Nós no Cabo.

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