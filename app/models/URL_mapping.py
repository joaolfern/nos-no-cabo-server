from datetime import datetime

from app.models.database import db


class URLMapping(db.Model):
  __tablename__ = 'url_mappings'

  id: int = db.Column(db.Integer, primary_key=True, autoincrement=True)
  short_url: str = db.Column(db.String(11), unique=True, nullable=False )
  original_url: str = db.Column(db.Text, nullable=False)
  created_at: datetime = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)

  def __repr__(self):
    return f'<URLMapping {self.short_url}>'
