from models.database import db

class Project(db.Model):
  __tablename__ = 'project'

  id: int = db.Column(db.Integer, primary_key=True, autoincrement=True)
  name: str = db.Column(db.String(300), nullable=False)
  url: str = db.Column(db.String(600), nullable=False, unique=True)

  def __repr__(self):
    return f'<Project {self.name}>'