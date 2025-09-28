from pydantic import BaseModel

class MessageSchema(BaseModel):
    message: str

    class Config:
        schema_extra = {
            "example": {
                "message": "Operação realizada com sucesso."
            }
        }