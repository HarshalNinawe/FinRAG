import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, DeclarativeBase
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
sqlite_fallback_path = os.path.join(BASE_DIR, "finrag.db").replace("\\", "/")
DATABASE_URL = os.getenv("DATABASE_URL", f"sqlite:///{sqlite_fallback_path}")

# For SQLite, we need check_same_thread: False to allow multi-threaded access in FastAPI
# Database-specific connection arguments
connect_args = {}

if DATABASE_URL.startswith("sqlite"):
    # SQLite local development
    connect_args = {"check_same_thread": False}

elif DATABASE_URL.startswith("postgresql"):
    # Render PostgreSQL requires SSL, but local Postgres usually does not
    if "localhost" not in DATABASE_URL and "127.0.0.1" not in DATABASE_URL:
        connect_args = {"sslmode": "require"}

# Create engine
engine = create_engine(
    DATABASE_URL,
    connect_args=connect_args,
    echo=True if os.getenv("ENV") == "development" else False
)

print("ACTIVE DATABASE:", DATABASE_URL)

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

# Helper to create tables and dynamically update columns if they are missing
def init_db():
    # Importing here to ensure models are loaded and registered before table creation
    import models
    from sqlalchemy import inspect, text
    
    # Create all tables if they don't exist
    models.Base.metadata.create_all(bind=engine)
    
    # Dynamically check for missing columns and alter the table if needed
    inspector = inspect(engine)
    if "transactions" in inspector.get_table_names():
        existing_columns = [col['name'] for col in inspector.get_columns('transactions')]
        
        # Define the new columns and their SQL DDL types
        new_columns = {
            "event_type": "VARCHAR(50)",
            "customer_id": "VARCHAR(100)",
            "merchant": "VARCHAR(100)"
        }
        
        with engine.begin() as conn:
            for col_name, col_type in new_columns.items():
                if col_name not in existing_columns:
                    try:
                        # SQLite and PostgreSQL both support standard ALTER TABLE ADD COLUMN syntax
                        conn.execute(text(f"ALTER TABLE transactions ADD COLUMN {col_name} {col_type}"))
                        print(f"Successfully migrated: Added column '{col_name}' ({col_type}) to 'transactions' table.")
                    except Exception as e:
                        print(f"Warning: Could not dynamically add column '{col_name}': {e}")

