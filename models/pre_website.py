from models.database import db
from models.website import WebsiteBase

class PreWebsite(db.Model, WebsiteBase):
    __tablename__ = 'preWebsite'
    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    name = db.Column(db.String(300), nullable=True)
    description = db.Column(db.String(1000), nullable=True)

    def __repr__(self):
        return f'<PreWebsite {self.name}>'