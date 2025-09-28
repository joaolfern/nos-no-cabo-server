from datetime import datetime
from flask import Flask, request, jsonify, abort
from flask_openapi3 import OpenAPI, Info, Tag
from flask_cors import CORS
from sqlalchemy.exc import IntegrityError
from flask import redirect
import os
from werkzeug.exceptions import HTTPException
import requests
from bs4 import BeautifulSoup
from models.database import init_db, db
from models.website import Website
from models.keyword import Keyword
from models.pre_website import PreWebsite
from schemas.message  import MessageSchema
from schemas.website import WebsiteSchema, WebsitePathSchema
from schemas.pre_website import PreWebsiteSchema, PreWebsiteResponseSchema, PreWebsiteUpdateSchema
from schemas.error import ErrorSchema
from schemas.keyword import KeywordSchema
from schemas.admin_header import AdminHeaderSchema
from utils.validate_admin_password import validate_admin_password, get_admin_password

info = Info(title="Nós no Cabo", description="API para O Webring brasileiro para divulgação projetos independentes em tecnologia.", version="1.0.0")
app = OpenAPI(__name__, info=info)
CORS(app)

init_db(app)

website_tag = Tag(name="Website", description="Website related endpoints")

home_tag = Tag(name="Documentação", description="Seleção de documentação: Swagger, Redoc ou RapiDoc")
@app.get('/', tags=[home_tag])
def home():
    """Redireciona para /openapi, tela que permite a escolha do estilo de documentação.
    """
    return redirect('/openapi')

@app.get('/websites', tags=[website_tag],
         responses={"200": WebsiteSchema, "500": ErrorSchema})
def get_websites():
    """Lista os sites cadastrados.

    Retorna uma lista de websites.
    """
    try:
        websites = Website.query.all()
        return jsonify([WebsiteSchema.from_orm(website).dict() for website in websites])
    except Exception as e:
        return {"error": str(e)}, 500

@app.get('/website/<int:website_id>', tags=[website_tag],
         responses={"200": WebsiteSchema, "404": ErrorSchema, "500": ErrorSchema})
def get_website(path: WebsitePathSchema):
    """Busca um site específico pelo ID.
    """
    try:
        website = Website.query.get_or_404(path.website_id)
        return WebsiteSchema.from_orm(website).dict()
    except Exception as e:
        return {"error": str(e)}, 500

@app.get('/keywords', tags=[website_tag],
         responses={"200": KeywordSchema, "500": ErrorSchema})
def get_keywords():
    """Lista as keywords cadastradas.

    Retorna uma lista de keywords.
    """
    try:
        keywords = Keyword.query.all()
        return jsonify([KeywordSchema.from_orm(keyword).dict() for keyword in keywords])
    except Exception as e:
        return {"error": str(e)}, 500

@app.post('/website', tags=[website_tag],
          responses={"200": PreWebsiteResponseSchema, "400": ErrorSchema, "500": ErrorSchema})
def pre_register_website(body: PreWebsiteSchema):
    """Registra um site para validação e possível inclusão no webring.
    Se já existe um PreWebsite com a mesma URL, atualiza os dados.
    """
    try:
        url = body.url

        try:
            resp = requests.get(url, timeout=10)
            resp.raise_for_status()
        except Exception as e:
            return {"error": f"Failed to fetch URL: {e}"}, 400

        soup = BeautifulSoup(resp.text, 'html.parser')
        isBeta = os.environ.get("IS_BETA") != "false"

        if not isBeta:
            webring_url = os.environ.get("WEBRING_URL")
            found_webring = False
            for a in soup.find_all('a', href=True):
                if webring_url in a['href']:
                    found_webring = True
                    break
            if not found_webring:
                return {"error": "Website does not contain a valid link to the webring."}, 400

        title = soup.title.string.strip() if soup.title and soup.title.string else None

        description = None
        desc_tag = soup.find('meta', attrs={'name': 'description'})
        if not desc_tag or not desc_tag.get('content'):
            desc_tag = soup.find('meta', attrs={'property': 'og:description'})
        if not desc_tag or not desc_tag.get('content'):
            desc_tag = soup.find('meta', attrs={'name': 'twitter:description'})
        if desc_tag and desc_tag.get('content'):
            description = desc_tag['content'].strip()

        favicon_url = None
        meta_icon = soup.find('meta', attrs={'property': 'og:image'})
        if not meta_icon or not meta_icon.get('content'):
            meta_icon = soup.find('meta', attrs={'name': 'twitter:image'})
        if meta_icon and meta_icon.get('content'):
            favicon_url = meta_icon['content']
            if favicon_url and not favicon_url.startswith('http'):
                from urllib.parse import urljoin
                favicon_url = urljoin(url, favicon_url)

        if not favicon_url:
            for icon_tag in soup.find_all('link', rel=True):
                rel = icon_tag.get('rel')
                if rel and any('icon' in r for r in rel):
                    favicon_url = icon_tag.get('href')
                    if favicon_url and not favicon_url.startswith('http'):
                        from urllib.parse import urljoin
                        favicon_url = urljoin(url, favicon_url)
                    break

        color = None
        if not color:
            manifest_tag = soup.find('link', rel='manifest')
            if manifest_tag and manifest_tag.get('href'):
                manifest_url = manifest_tag['href']
                if not manifest_url.startswith('http'):
                    from urllib.parse import urljoin
                    manifest_url = urljoin(url, manifest_url)
                try:
                    manifest_resp = requests.get(manifest_url, timeout=5)
                    manifest_resp.raise_for_status()
                    import json
                    manifest_data = json.loads(manifest_resp.text)
                    color = manifest_data.get('theme_color')
                except Exception:
                    pass
        if not color:
            custom_meta_names = ['primary-color', 'theme_color', 'color', 'og:theme-color']
            for meta_name in custom_meta_names:
                custom_tag = soup.find('meta', attrs={'name': meta_name})
                if custom_tag and custom_tag.get('content'):
                    color = custom_tag['content'].strip()
                    break
                custom_tag = soup.find('meta', attrs={'property': meta_name})
                if custom_tag and custom_tag.get('content'):
                    color = custom_tag['content'].strip()
                    break
        if not color:
            for style_tag in soup.find_all('style'):
                css = style_tag.string
                if css:
                    import re
                    match = re.search(r'--primary-color\s*:\s*([^;]+);', css)
                    if match:
                        color = match.group(1).strip()
                        break
        if not color:
            for tag in soup.head.find_all(True):
                style = tag.get('style')
                if style:
                    import re
                    match = re.search(r'color\s*:\s*([^;]+);', style)
                    if match:
                        color = match.group(1).strip()
                        break

        if not color:
            color_tag = soup.find('meta', attrs={'name': 'theme-color'})

            if color_tag and color_tag.get('content'):
                color = color_tag['content'].strip()

        created_at = datetime.utcnow().isoformat()

        print(f"Extracted metadata - Title: {title}, Description: {description}, Favicon: {favicon_url}, Color: {color}")

        website = Website.query.filter_by(url=url).first()

        if website is not None:
            return {"error": "Website with this URL already exists."}, 400

        pre_website = PreWebsite.query.filter_by(url=url).first()

        if pre_website is not None:
            pre_website.name = title
            pre_website.description = description
            pre_website.color = color
            pre_website.faviconUrl = favicon_url
            pre_website.createdAt = created_at
            db.session.commit()
            return PreWebsiteResponseSchema.from_orm(pre_website).dict()
        else:
            pre_website = PreWebsite(
                url=url,
                name=title,
                description=description,
                color=color,
                faviconUrl=favicon_url,
                createdAt=created_at,
            )
            db.session.add(pre_website)
            db.session.commit()

            return PreWebsiteResponseSchema.from_orm(pre_website).dict()
    except IntegrityError:
        db.session.rollback()
        return {"error": "Website with this URL already exists."}, 400
    except Exception as e:
        db.session.rollback()
        return {"error": str(e)}, 500

@app.patch('/website', tags=[website_tag],
    responses={"200": MessageSchema, "400": ErrorSchema, "500": ErrorSchema})
def update_website(body: PreWebsiteUpdateSchema, header: AdminHeaderSchema):
    """Registra website ou atualiza seus dados.
    """
    try:
        website = Website.query.filter_by(url=body.url).first()

        if website is not None:
            admin_password = get_admin_password(header)

            if admin_password is None:
                return ErrorSchema(error="Admin password is required to update an existing website").dict(), 400

            validate_admin_password(admin_password)

            if body.name is not None:
                website.name = body.name
            if body.description is not None:
                website.description = body.description
            if body.color is not None:
                website.color = body.color
            if body.faviconUrl is not None:
                website.faviconUrl = body.faviconUrl
            db.session.commit()
            return MessageSchema(message="Site existente atualizado com sucesso").dict()

        pre_website = PreWebsite.query.filter_by(url=body.url).first()

        if pre_website is None:
            return {"error": "PreWebsite with this URL not found."}, 404

        if body.name:
            pre_website.name = body.name
        if body.description:
            pre_website.description = body.description
        if body.color:
            pre_website.color = body.color
        if body.faviconUrl:
            pre_website.faviconUrl = body.faviconUrl

        pre_website.createdAt = datetime.utcnow().isoformat()

        website = Website.from_prewebsite(pre_website)

        existing_keywords = {k.name: k for k in Keyword.query.all()}
        keywords_to_add = []

        for kw_name in body.keywords:
            keyword_obj = existing_keywords.get(kw_name)
            if keyword_obj:
                if keyword_obj not in website.keywords:
                    website.keywords.append(keyword_obj)
            else:
                now = datetime.utcnow().isoformat()
                new_keyword = Keyword(name=kw_name, createdAt=now, updatedAt=now)
                db.session.add(new_keyword)
                keywords_to_add.append(new_keyword)
                website.keywords.append(new_keyword)

        db.session.add(website)
        db.session.delete(pre_website)
        db.session.commit()

        return MessageSchema(message="Novo site adicionado ao Webring com sucesso").dict()
    except Exception as e:
        db.session.rollback()
        return {"error": str(e)}, 500

@app.delete('/website/<int:website_id>', tags=[website_tag],
            responses={"200": MessageSchema, "404": ErrorSchema, "500": ErrorSchema})
def delete_website(path: WebsitePathSchema, header: AdminHeaderSchema):
    """Remove o site ou registra uma denuncia contra o site pelo ID.
    """
    try:
        admin_password = get_admin_password(header)
        validate_admin_password(admin_password)

        website = Website.query.get(path.website_id)
        if website is None:
            return {"error": "Website not found"}, 404

        print(f"Deleting website: {website.name} with keywords {[kw.name for kw in website.keywords]}")
        for keyword in website.keywords:
            connected_websites = keyword.websites
            should_drop = len(connected_websites) == 1 and connected_websites[0].id == website.id
            print(keyword.name, should_drop)

            if should_drop:
                db.session.delete(keyword)

        db.session.delete(website)
        db.session.commit()

        return MessageSchema(message="Website deleted successfully").dict()
    except HTTPException as http_exc:
        raise http_exc
    except Exception as e:
        db.session.rollback()
        return {"error": str(e)}, 500

if __name__ == "__main__":
    with app.app_context():
        db.create_all()

    app.run(host="0.0.0.0", port=3000)

