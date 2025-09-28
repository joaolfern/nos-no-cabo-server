from pydantic import BaseModel, validator
from flask import abort, make_response, jsonify
from schemas.error import ErrorSchema

class PreWebsiteSchema(BaseModel):
  url: str
  class Config:
    schema_extra = {
        "example": {
            "url": "https://martinfowler.com",
        }
    }

  @validator('url')
  def url_must_be_valid(cls, v):
      if not v or not v.strip():
        abort(make_response(jsonify(ErrorSchema(message="URL é obrigatória.").dict()), 400))
      if not v.startswith("http"):
          abort(make_response(jsonify(ErrorSchema(message="A URL deve começar com http.").dict()), 400))
      return v


class PreWebsiteResponseSchema(PreWebsiteSchema):
    id: int | None = None
    name: str | None = ''
    description: str | None = ''
    color: str | None = ''
    createdAt: str | None = ''
    faviconUrl: str | None = ''

    class Config:
        orm_mode = True

        schema_extra = {
            "example": {
                "name": "Google",
                "url": "https://google.com",
                "description": "A popular search engine.",
                "color": "#2E43FF",
                "createdAt": "2024-01-01T00:00:00Z",
                "faviconUrl": "https://upload.wikimedia.org/wikipedia/commons/thumb/2/2f/Google_2015_logo.svg/1920px-Google_2015_logo.svg.png"
            }
        }


class PreWebsiteUpdateSchema(PreWebsiteResponseSchema):
    keywords: list[str] = []
    class Config:
        schema_extra = {
            "example": {
               "url": "https://martinfowler.com",
               "keywords": ["software engineering", "refactoring"]
            }
        }