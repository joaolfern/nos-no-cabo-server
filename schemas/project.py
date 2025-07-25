from pydantic import BaseModel, HttpUrl, validator

class ProjectSchema(BaseModel):
    """Project representation with id, name, and url."""
    id: int = 1
    name: str = "Nome do Projeto"
    url: str = "https://example.com"

    class Config:
        orm_mode = True

class ProjectCreateSchema(BaseModel):
    name: str = "Nome do Projeto"
    url: HttpUrl = "https://example.com"

    @validator('name')
    def name_must_be_valid(cls, v):
        if not v or not v.strip():
            raise ValueError('Nome é obrigatório.')
        if len(v.strip()) < 3:
            raise ValueError('O nome do projeto deve ter pelo menos 3 caracteres.')
        return v

    class Config:
        schema_extra = {
            "example": {
                "name": "My Cool Project",
                "url": "https://example.com/my-project"
            }
        }

class ProjectPathSchema(BaseModel):
    project_id: int