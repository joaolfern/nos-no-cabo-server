from flask_sqlalchemy import SQLAlchemy
from sqlalchemy_utils import database_exists, create_database
from sqlalchemy import create_engine
import os

db = SQLAlchemy()

basedir = os.path.abspath(os.path.dirname(__file__))

DB_USER = os.getenv("POSTGRES_USER", "postgres")
DB_PASS = os.getenv("POSTGRES_PASSWORD", "postgres")
DB_HOST = os.getenv("POSTGRES_HOST", "localhost")
DB_PORT = os.getenv("POSTGRES_PORT", "5432")
DB_NAME = os.getenv("POSTGRES_DB", "webring")
DATABASE_URL = f"postgresql://{DB_USER}:{DB_PASS}@{DB_HOST}:{DB_PORT}/{DB_NAME}"

def init_db(app):
    """
    Initializes the database connection for the Flask app.
    Also loads initial data from initial_websites.json if the table is empty.
    """
    app.config["SQLALCHEMY_DATABASE_URI"] = DATABASE_URL
    app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False
    db.init_app(app)

    engine = create_engine(DATABASE_URL)
    if not database_exists(engine.url):
        create_database(engine.url)
        print("Database 'database.db' created.")
    else:
        print("Database loaded.")

    with app.app_context():
        db.create_all()
        from models.website import Website
        if Website.query.count() == 0:
            import json
            initial_path = os.path.join(os.path.dirname(__file__), '..', 'initial_websites.json')
            with open(initial_path, encoding='utf-8') as f:
                Websites = json.load(f)
                from datetime import datetime
                for proj in Websites:
                    p = Website(
                        name=proj['name'],
                        url=proj['url'],
                        description=proj['description'],
                        color=proj['color'],
                        createdAt=datetime.utcnow(),
                        updatedAt=datetime.utcnow(),
                        faviconUrl=proj['faviconUrl'],
                    )
                    db.session.add(p)
                db.session.commit()
            print("Initial Websites loaded into the database.")