from flask import jsonify
from flask import redirect as flask_redirect
from flask_openapi3 import APIBlueprint, Tag
from sqlalchemy.exc import IntegrityError

from app.models.database import db
from app.schemas.error import ErrorSchema
from app.schemas.URL_analytics import URLAnalyticsSchema
from app.schemas.URL_mapping import (
  RedirectPathSchema,
  URLCreateSchema,
  URLMappingSchema,
)
from app.services.shortener import URLShortenerService

shorteners_bp = APIBlueprint('shorteners', __name__, url_prefix = '/')
shortener_tag = Tag(name="Encurtador", description="Rotas da entidade encurtador")
shorten_service = URLShortenerService()

@shorteners_bp.get('/shorteners', tags=[shortener_tag], responses={"200": URLMappingSchema, "500": ErrorSchema})
def get_shorteners():
  """Lista as URLs encurtadas."""
  try:
    shorteners = shorten_service.get_all_mappings()
    payload = [URLMappingSchema.from_orm(s).dict() for s in shorteners]

    return jsonify(payload), 200
  except Exception as e:
    return {"error": str(e)}, 500

@shorteners_bp.post('/shorten', tags=[shortener_tag], responses={"200": URLMappingSchema, "500": ErrorSchema})
def shorten(body: URLCreateSchema):
  """Encurta URL."""
  try:
    new_url = shorten_service.create_mapping(body.url)
    payload = URLMappingSchema.from_orm(new_url).dict()

    return jsonify(payload), 200

  except IntegrityError:
    db.session.rollback()
    return {"error": "Esse site já existe no sistema, realize a deleção antes de fazer um novo pré-cadastro"}, 400
  except Exception as e:
    db.session.rollback()
    return {"error": str(e)}, 500

@shorteners_bp.get('/nos/<string:short_url>', tags=[shortener_tag], responses={"302": None, "404": ErrorSchema, "500": ErrorSchema})
def handle_url_redirection(path: RedirectPathSchema):
  """Acessa a url original."""
  try:
    url_mapping = shorten_service.get_mapping(path.short_url)

    if not url_mapping:
      return {"error": "URL não encontrada"}, 404

    shorten_service.track_access(path.short_url)

    return flask_redirect(url_mapping.original_url, code=302)

  except ValueError:
    return {"error": "Formato de URL inválido"}, 400
  except Exception as e:
    db.session.rollback()
    return {"error": str(e)}, 500

@shorteners_bp.get('/shorteners/analytics' ,tags=[shortener_tag], responses={"200": URLAnalyticsSchema, "500": ErrorSchema})
def listAnalytics():
  """Lista os registros de analytics."""
  try:
    analytics = shorten_service.get_all_analytics()

    return jsonify([URLAnalyticsSchema.from_orm(item).dict() for item in analytics])
  except Exception as e:
    return {"error": str(e)}, 500
