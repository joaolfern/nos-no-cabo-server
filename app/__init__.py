from flask_openapi3 import OpenAPI, Info, Tag
from flask_cors import CORS
from flask import redirect

from models.database import init_db

def create_app():
  info = Info(title="Nós no Cabo", description="API para o Webring brasileiro para divulgação projetos independentes em tecnologia.", version="2.0.0")
  app = OpenAPI(__name__, info=info)

  from models.website import Website
  from models.keyword import Keyword
  from models.pre_website import PreWebsite

  CORS(app)
  init_db(app)

  home_tag = Tag(name="Documentação", description="Seleção de documentação: Swagger, Redoc ou RapiDoc")

  @app.get('/', tags=[home_tag])
  def home():
    """Redireciona para /openapi, tela que permite a escolha do estilo de documentação.
    """
    return redirect('/openapi')

  from app.routes.keywords import keywords_bp
  app.register_api(keywords_bp)
  
  from app.routes.websites import websites_bp
  app.register_api(websites_bp)

  return app


