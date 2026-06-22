from flask import jsonify
from flask_openapi3 import APIBlueprint

from schemas.keyword import KeywordSchema
from schemas.error import ErrorSchema
from models.keyword import Keyword
from utils.tags import keyword_tag

keywords_bp = APIBlueprint('keywords', __name__, url_prefix = '/keywords')

@keywords_bp.get('/', tags=[keyword_tag], responses={"200": KeywordSchema, "500": ErrorSchema})
def get_keywords():
  """Lista as keywords cadastradas.

  Retorna uma lista de keywords.
  """
  try:
    keywords = Keyword.query.all()
    return jsonify([KeywordSchema.from_orm(keyword).dict() for keyword in keywords])
  except Exception as e:
    return {"error": str(e)}, 500
