from flask_sqlalchemy import SQLAlchemy
from sqlalchemy_utils import database_exists, create_database
from sqlalchemy import create_engine
import os

db = SQLAlchemy()

basedir = os.path.abspath(os.path.dirname(__file__))

DATABASE_URL = "sqlite:///" + os.path.join(basedir, "..", "database.db")

def init_db(app):
    """
    Initializes the database connection for the Flask app.
    Also loads initial data from initial_projects.json if the table is empty.
    """
    app.config["SQLALCHEMY_DATABASE_URI"] = DATABASE_URL
    app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False
    db.init_app(app)

    engine = create_engine(DATABASE_URL)
    if not database_exists(engine.url):
        create_database(engine.url)
        print("Database 'database.db' created.")
    else:
        print("Database 'database.db' already exists.")

    with app.app_context():
        db.create_all()
        from models.project import Project
        if Project.query.count() == 0:
            import json
            initial_path = os.path.join(os.path.dirname(__file__), '..', 'initial_projects.json')
            with open(initial_path, encoding='utf-8') as f:
                projects = json.load(f)
                for proj in projects:
                    p = Project(name=proj['name'], url=proj['url'])
                    db.session.add(p)
                db.session.commit()
            print("Initial projects loaded into the database.")