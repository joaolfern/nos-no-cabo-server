from datetime import datetime

from pydantic import BaseModel


class URLAnalyticsSchema(BaseModel):
  """URLAnalytics representation with short_url, click_count, and last_accessed."""
  short_url: str
  click_count: int
  last_accessed: datetime

  class Config:
    orm_mode = True
