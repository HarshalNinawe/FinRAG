import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, DeclarativeBase
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./finrag.db")

# For SQLite, we need check_same_thread: False to allow multi-threaded access in FastAPI
# Database-specific connection arguments
connect_args = {}

if DATABASE_URL.startswith("sqlite"):
    # SQLite local development
    connect_args = {"check_same_thread": False}

elif DATABASE_URL.startswith("postgresql"):
    # Render PostgreSQL requires SSL
    connect_args = {"sslmode": "require"}

# Create engine
engine = create_engine(
    DATABASE_URL,
    connect_args=connect_args,
    echo=True if os.getenv("ENV") == "development" else False
)

# Session factory
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Base class for DB models
class Base(DeclarativeBase):
    pass

# Dependency to get db session in API endpoints
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# Helper to create tables
def init_db():
    # Importing here to ensure models are loaded and registered before table creation
    import models
    models.Base.metadata.create_all(bind=engine)
