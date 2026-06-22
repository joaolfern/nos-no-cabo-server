from pydantic import BaseModel

class ErrorSchema(BaseModel):
    """ Formato da mensagem de erro retornada pela API.
    """
    message: str
