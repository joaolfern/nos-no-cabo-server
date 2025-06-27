from pydantic import BaseModel

class ProjectSchema(BaseModel):
  """Project representation with id, name, and url."""
  id: int
  name: str
  url: str

  class Config:
    orm_mode = True

class ProjectCreateSchema(BaseModel):
  name: str
  url: str

  """Schema for creating a new Project."""

  class Config:
      schema_extra = {
          "example": {
              "name": "My Cool Project",
              "url": "https://example.com/my-project"
          }
      }

class ProjectPathSchema(BaseModel):
    project_id: int