from datetime import datetime

from app.models.database import db


class URLAnalytics(db.Model):
  __tablename__ = 'url_analytics'

  short_url: str = db.Column(db.String(11), db.ForeignKey('url_mappings.short_url'), unique=True, primary_key=True)
  click_count: int = db.Column(db.Integer, default = 0, nullable = False)
  last_accessed: datetime = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)

  def __repr__(self):
    return f'<URLAnalytics {self.short_url}>'
