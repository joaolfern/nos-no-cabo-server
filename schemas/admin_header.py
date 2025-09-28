from typing import Optional
from pydantic import BaseModel, Field

class AdminHeaderSchema(BaseModel):
    x_admin_password: Optional[str] = Field(None, alias="x-admin-password", description="Admin password for authorization")
