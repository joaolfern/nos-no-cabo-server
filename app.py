from flask import Flask, request, jsonify, abort, make_response
from flask_openapi3 import OpenAPI, Info, Tag
from flask_cors import CORS
from models.database import init_db, db
from models.project import Project
from sqlalchemy.exc import IntegrityError
from flask import redirect
from schemas.message  import MessageSchema
from schemas.project import ProjectSchema, ProjectCreateSchema, ProjectPathSchema
from schemas.error import ErrorSchema
import os   
from functools import wraps
from dotenv import load_dotenv
load_dotenv()

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


def check_auth(username, password):
    return username == os.environ.get('API_USER') and password == os.environ.get('API_PASS')

def require_auth(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        auth_cookie = request.cookies.get('auth')
        if not auth_cookie:
            return jsonify({'error': 'Unauthorized'}), 401
        import base64
        try:
            decoded = base64.b64decode(auth_cookie).decode()
            username, password = decoded.split(':', 1)
        except Exception:
            return jsonify({'error': 'Unauthorized'}), 401
        if not check_auth(username, password):
            return jsonify({'error': 'Unauthorized'}), 401
        return f(*args, **kwargs)
    return decorated

@app.post('/login')
def login():
    data = request.get_json()
    username = data.get('username')
    password = data.get('password')
    if check_auth(username, password):
        import base64
        cookie_val = base64.b64encode(f"{username}:{password}".encode()).decode()
        resp = make_response({'message': 'Login successful'}, 200)
        resp.set_cookie('auth', cookie_val, httponly=True, samesite='Strict')
        return resp
    return {'error': 'Unauthorized'}, 401

@app.post('/logout')
def logout():
    resp = make_response({'message': 'Logout successful'}, 200)
    resp.set_cookie('auth', '', expires=0, httponly=True, samesite='Strict')
    return resp

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
@require_auth
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
