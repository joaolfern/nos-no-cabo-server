from models.database import db

class WebsiteBase():
    url = db.Column(db.String(600), nullable=False, unique=True)
    createdAt = db.Column(db.String(50), nullable=False)
    color = db.Column(db.String(7), nullable=True)
    faviconUrl = db.Column(db.String(600), nullable=True)