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