from flask import redirect
from flask_cors import CORS
from flask_openapi3 import Info, OpenAPI, Tag

from app.lib.validation_error_handler import validation_error_handler
from app.models.database import init_db


def create_app():
  info = Info(
    title="Nós no Cabo",
    description="API para o Webring brasileiro para divulgação projetos independentes em tecnologia.",
    version="2.0.0"
  )

  app = OpenAPI(
    __name__,
    info=info,
    validation_error_status=422,
    validation_error_callback=validation_error_handler
  )

  from app.models.keyword import Keyword
  from app.models.pre_website import PreWebsite
  from app.models.URL_analytics import URLAnalytics
  from app.models.URL_mapping import URLMapping
  from app.models.website import Website

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

  from app.routes.shortener import shorteners_bp
  app.register_api(shorteners_bp)

  return app


