
from models.database import db
from models.WebsiteBase import WebsiteBase
from datetime import datetime

website_keyword = db.Table(
    'website_keyword',
    db.Column('website_id', db.Integer, db.ForeignKey('website.id'), primary_key=True),
    db.Column('keyword_id', db.Integer, db.ForeignKey('keyword.id'), primary_key=True)
)

class Website(db.Model, WebsiteBase):
    __tablename__ = 'website'
    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    name = db.Column(db.String(300), nullable=False)
    description = db.Column(db.String(1000), nullable=False)
    updatedAt = db.Column(db.String(50), nullable=False)
    repo = db.Column(db.String(400), nullable=True)
    keywords = db.relationship('Keyword', secondary=website_keyword, backref='websites')

    @classmethod
    def from_prewebsite(cls, prewebsite):
        if not prewebsite.name:
            raise ValueError("Nome é obrigatório")
        if not prewebsite.url:
            raise ValueError("URL é obrigatória")
        if not prewebsite.createdAt:
            raise ValueError("Data de criação é obrigatória")
        return cls(
            name=prewebsite.name,
            url=prewebsite.url,
            description=prewebsite.description or '',
            color=prewebsite.color or '',
            createdAt=prewebsite.createdAt,
            updatedAt=datetime.utcnow().isoformat(),
            faviconUrl=prewebsite.faviconUrl or ''
        )

    def __repr__(self):
        return f'<Website {self.name}>'

