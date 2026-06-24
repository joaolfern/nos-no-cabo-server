from datetime import datetime

from pydantic import BaseModel, validator

from app.lib.validate_URL import validate_URL


class URLMappingSchema(BaseModel):
  """URLMapping representation with short_url, original_url, and created_at."""
  short_url: str
  original_url: str
  created_at: datetime

  class Config:
    orm_mode = True

class URLCreateSchema(BaseModel):
  url: str

  @validator('url')
  def check_url_format(cls, v):
    if not validate_URL(v):
      raise ValueError('URL inválida.')
    return v

class RedirectPathSchema(BaseModel):
  short_url: str
