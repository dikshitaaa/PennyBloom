import os
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker

# Agar cloud (Render) par DATABASE_URL set hai toh woh use karega, warna local MySQL use karega
DATABASE_URL = os.getenv("DATABASE_URL", "mysql+pymysql://root:root123@localhost:3306/expense_tracker")

# SQLAlchemy mein postgres ka URL 'postgres://' hota hai, use 'postgresql://' mein badalna padta hai
if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

# SQLite ke liye special connect_args chahiye hota hai
connect_args = {"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {}

engine = create_engine(DATABASE_URL, connect_args=connect_args)

SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine
)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

Base = declarative_base()