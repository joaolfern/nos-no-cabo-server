from pydantic import BaseModel

class KeywordSchema(BaseModel):
    """Keyword representation with id, name, and url."""
    id: int
    name: str
    createdAt: str
    updatedAt: str

    class Config:
        orm_mode = True
