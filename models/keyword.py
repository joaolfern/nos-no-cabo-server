from models.database import db

class Keyword(db.Model):
  __tablename__ = 'keyword'

  id: int = db.Column(db.Integer, primary_key=True, autoincrement=True)
  createdAt: str = db.Column(db.String(50), nullable=False)
  updatedAt: str = db.Column(db.String(50), nullable=False)
  name: str = db.Column(db.String(100), nullable=False, unique=True)

  def __repr__(self):
    return f'<Keyword {self.name}>'