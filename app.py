from flask import Flask, request, jsonify, abort
from flask_openapi3 import OpenAPI, Info, Tag
from flask_cors import CORS
from models.database import init_db, db
from models.project import Project
from sqlalchemy.exc import IntegrityError
from flask import redirect
from schemas.message  import MessageSchema
from schemas.project import ProjectSchema, ProjectCreateSchema, ProjectPathSchema
from schemas.error import ErrorSchema

info = Info(title="Nós no Cabo", description="API para O Webring brasileiro para divulgação projetos independentes em tecnologia.", version="1.0.0")
app = OpenAPI(__name__, info=info)
CORS(app)

init_db(app)

user_tag = Tag(name="User", description="User management endpoints")
project_tag = Tag(name="Project", description="Project management endpoints")

home_tag = Tag(name="Documentação", description="Seleção de documentação: Swagger, Redoc ou RapiDoc")
@app.get('/', tags=[home_tag])
def home():
    """Redireciona para /openapi, tela que permite a escolha do estilo de documentação.
    """
    return redirect('/openapi')


@app.get('/project', tags=[project_tag],
         responses={"200": ProjectSchema, "500": ErrorSchema})
def get_projects():
    """Lista todos os projetos cadastrados.

    Retorna uma lista de projetos.
    """
    try:
        projects = Project.query.all()
        return jsonify([ProjectSchema.from_orm(project).dict() for project in projects])
    except Exception as e:
        return {"error": str(e)}, 500

@app.get('/project/<int:project_id>', tags=[project_tag],
         responses={"200": ProjectSchema, "404": ErrorSchema, "500": ErrorSchema})
def get_project(path: ProjectPathSchema):
    """Busca um projeto específico pelo ID.

    Parâmetros:
      - project_id (int): ID do projeto.
    """
    try:
        project = Project.query.get_or_404(path.project_id)
        return ProjectSchema.from_orm(project).dict()
    except Exception as e:
        return {"error": str(e)}, 500

@app.post('/project', tags=[project_tag],
          responses={"200": MessageSchema, "400": ErrorSchema, "500": ErrorSchema})
def create_project(body: ProjectCreateSchema):
    """Cria um novo projeto.

    Corpo da requisição:
      - name (str): Nome do projeto (mínimo 3 caracteres, obrigatório)
      - url (str): URL do projeto (deve começar com http, obrigatório)
    """
    try:
        new_project = Project(name=body.name, url=body.url)
        db.session.add(new_project)
        db.session.commit()
        return MessageSchema(message="Project created successfully").dict()
    except IntegrityError:
        db.session.rollback()
        return {"error": "Project with this URL already exists."}, 400
    except Exception as e:
        db.session.rollback()
        return {"error": str(e)}, 500

@app.patch('/project/<int:project_id>', tags=[project_tag],
           responses={"200": MessageSchema, "400": ErrorSchema, "404": ErrorSchema, "500": ErrorSchema})
def update_project(path: ProjectPathSchema, body: ProjectCreateSchema):
    """Atualiza o nome e a URL de um projeto pelo ID.

    Parâmetros:
      - project_id (int): ID do projeto.
    Corpo da requisição:
      - name (str): Novo nome do projeto (mínimo 3 caracteres, obrigatório)
      - url (str): Nova URL do projeto (deve começar com http, obrigatório)
    """
    try:
        project = Project.query.get_or_404(path.project_id)
        project.name = body.name
        project.url = body.url
        db.session.commit()
        return MessageSchema(message="Project updated successfully").dict()
    except IntegrityError:
        db.session.rollback()
        return {"error": "Project with this URL already exists."}, 400
    except Exception as e:
        db.session.rollback()
        return {"error": str(e)}, 500

@app.delete('/project/<int:project_id>', tags=[project_tag],
            responses={"200": MessageSchema, "404": ErrorSchema, "500": ErrorSchema})
def delete_project(path: ProjectPathSchema):
    """Remove um projeto pelo ID.

    Parâmetros:
      - project_id (int): ID do projeto.
    """
    try:
        project = Project.query.get_or_404(path.project_id)
        db.session.delete(project)
        db.session.commit()
        return MessageSchema(message="Project deleted successfully").dict()
    except Exception as e:
        db.session.rollback()
        return {"error": str(e)}, 500

if __name__ == "__main__":
    with app.app_context():
        db.create_all()

    app.run(host="0.0.0.0", port=3000)
