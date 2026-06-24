import traceback

from flask import jsonify
from flask_openapi3 import APIBlueprint
from sqlalchemy.exc import IntegrityError
from werkzeug.exceptions import HTTPException

from app.lib.tags import websites_tag
from app.lib.validate_admin_password import get_admin_password, validate_admin_password
from app.models.database import db
from app.schemas.admin_header import AdminHeaderSchema
from app.schemas.error import ErrorSchema
from app.schemas.message import MessageSchema
from app.schemas.pre_website import (
    PreWebsiteResponseSchema,
    PreWebsiteSchema,
    PreWebsiteUpdateBodySchema,
)
from app.schemas.website import WebsitePathSchema, WebsiteSchema
from app.services.shortener import URLShortenerService
from app.services.website import (
    DuplicateWebsiteError,
    NotFoundError,
    WebringValidationError,
    WebsiteService,
)

websites_bp = APIBlueprint("websites", __name__, url_prefix="/")
shorten_service = URLShortenerService()
website_service = WebsiteService(shorten_service)


@websites_bp.get(
    "/websites",
    tags=[websites_tag],
    responses={"200": WebsiteSchema, "500": ErrorSchema},
)
def get_websites():
    """Lista os sites cadastrados.

    Retorna uma lista de websites.
    """
    try:
        websites = website_service.get_all_websites()

        return jsonify([WebsiteSchema.from_orm(website).dict() for website in websites])
    except Exception as e:
        return {"error": str(e)}, 500


@websites_bp.get(
    "/website/<string:website_id>",
    tags=[websites_tag],
    responses={"200": WebsiteSchema, "404": ErrorSchema, "500": ErrorSchema},
)
def get_website(path: WebsitePathSchema):
    """Busca um site específico pelo ID."""
    try:
        website = website_service.get_website(path.website_id)

        return WebsiteSchema.from_orm(website).dict()

    except HTTPException as http_err:
        return {"error": http_err.description}, http_err.code

    except Exception as e:
        return {"error": str(e)}, 500


@websites_bp.post(
    "/website",
    tags=[websites_tag],
    responses={"200": PreWebsiteResponseSchema, "400": ErrorSchema, "500": ErrorSchema},
)
def pre_register_website(body: PreWebsiteSchema):
    """Registra um site para validação e possível inclusão no webring.
    Se já existe um PreWebsite com a mesma URL, atualiza os dados.
    """
    try:
        url = body.url
        pre_website = website_service.pre_register_website(url)

        return PreWebsiteResponseSchema.from_orm(pre_website).dict()

    except (WebringValidationError, DuplicateWebsiteError) as error:
        db.session.rollback()
        return {"error": str(error)}, 400

    except IntegrityError:
        db.session.rollback()
        return {
            "error": "Esse site já existe no sistema, realize a deleção antes de fazer um novo pré-cadastro"
        }, 400
    except Exception as e:
        db.session.rollback()
        # Print the absolute error log directly to your web-1 docker container output
        traceback.print_exc()
        return {"error": f"Database Crash: {type(e).__name__} - {str(e)}"}, 500
    except Exception as e:
        db.session.rollback()
        return {"error": str(e)}, 500


@websites_bp.patch(
    "/website",
    tags=[websites_tag],
    responses={"200": MessageSchema, "400": ErrorSchema, "500": ErrorSchema},
)
def update_website(body: PreWebsiteUpdateBodySchema):
    try:
        return MessageSchema(
            message="Novo site adicionado ao Webring com sucesso"
        ).dict(), 200
    except NotFoundError as e:
        return {"error": str(e)}, 404

    except Exception as e:
        db.session.rollback()

        print("=== FATAL SERVER ERROR ===")
        import traceback

        traceback.print_exc()
        print("==========================")

        error_type = type(e).__name__
        return {"error": f"Server Error: {error_type} - Check terminal logs."}, 500


@websites_bp.delete(
    "/website/<int:website_id>",
    tags=[websites_tag],
    responses={"200": MessageSchema, "404": ErrorSchema, "500": ErrorSchema},
)
def delete_website(path: WebsitePathSchema, header: AdminHeaderSchema):
    try:
        admin_password = get_admin_password(header)
        validate_admin_password(admin_password)

        website_service.delete_website_by_id(path.website_id)
        return MessageSchema(message="Website deleted successfully").dict(), 200
    except NotFoundError as e:
        return {"error": str(e)}, 404
    except Exception as e:
        db.session.rollback()
        return {"error": str(e)}, 500
