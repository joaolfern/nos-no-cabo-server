from pydantic import BaseModel, validator
from flask import abort, make_response, jsonify
from schemas.error import ErrorSchema
from schemas.keyword import KeywordSchema
class WebsiteSchema(BaseModel):
    """Website representation with id, name, and url."""
    id: int
    name: str = ''
    description: str = ''
    url: str
    color: str = ''
    createdAt: str
    updatedAt: str
    faviconUrl: str = ''
    keywords: list[KeywordSchema] = []
    repo: str | None = None

    @validator('url')
    def url_must_be_valid(cls, v):
        if not v or not v.strip():
            abort(make_response(jsonify(ErrorSchema(message="URL é obrigatória.").dict()), 400))
        if not v.startswith("http"):
            abort(make_response(jsonify(ErrorSchema(message="A URL deve começar com http.").dict()), 400))
        return v

    class Config:
        orm_mode = True


class WebsiteCreateSchema(BaseModel):
    name: str= ''
    url: str
    description: str = ''
    color: str = ''
    createdAt: str
    updatedAt: str
    faviconUrl: str = ''
    repo: str | None = None

    @validator('name')
    def name_must_be_valid(cls, v):
        if not v or not v.strip():
            raise ValueError('Nome é obrigatório.')
        if len(v.strip()) < 3:
            raise ValueError('O nome do projeto deve ter pelo menos 3 caracteres.')
        return v

    @validator('url')
    def url_must_be_valid(cls, v):
        if not v or not v.strip():
            abort(make_response(jsonify(ErrorSchema(message="URL é obrigatória.").dict()), 400))
        if not v.startswith("http"):
            abort(make_response(jsonify(ErrorSchema(message="A URL deve começar com http.").dict()), 400))
        return v

    class Config:
        schema_extra = {
            "example": {
                "name": "My Cool Website",
                "url": "https://example.com/my-website",
                "description": "Uma descrição do meu projeto legal.",
                "color": "#FF5733",
                "createdAt": "2024-01-01T00:00:00Z",
                "updatedAt": "2024-01-01T00:00:00Z",
                "faviconUrl": "https://example.com/my-website/favicon.ico"
            }
        }

class WebsitePathSchema(BaseModel):
    website_id: int