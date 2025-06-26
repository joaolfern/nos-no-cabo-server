from flask import Flask, request, jsonify
from flask_openapi3 import OpenAPI, Info, Tag
from flask_cors import CORS
from models.database import init_db, db
from models.project import Project
from sqlalchemy.exc import IntegrityError
from flask import redirect
from schemas.message  import MessageSchema
from schemas.project import ProjectSchema, ProjectCreateSchema, ProjectPathSchema

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


@app.get('/project', tags=[project_tag])
def get_projects():
    """Retrieve all projects."""
    try:
        projects = Project.query.all()
        return jsonify([ProjectSchema.from_orm(project).dict() for project in projects])
    except Exception as e:
        return {"error": str(e)}, 500

@app.get('/project/<int:project_id>', tags=[project_tag])
def get_project(path: ProjectPathSchema):
    """Retrieve a specific project by ID"""
    try:
        project = Project.query.get_or_404(path.project_id)
        return ProjectSchema.from_orm(project).dict()
    except Exception as e:
        return {"error": str(e)}, 500

@app.post('/project',
    tags=[project_tag]
)
def create_project(body: ProjectCreateSchema):
    """Create a new project."""
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

@app.patch('/project/<int:project_id>', tags=[project_tag])
def update_project(path: ProjectPathSchema, body: ProjectCreateSchema):
    """Update a project's name and url by ID."""
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

@app.delete('/project/<int:project_id>', tags=[project_tag])
def delete_project(path: ProjectPathSchema):
    """Delete a project by ID."""
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
