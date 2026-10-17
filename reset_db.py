from sqlalchemy import create_engine, text

SERVER_URL = "mysql+pymysql://root:root123@localhost:3306/"

print("Dropping old database...")
engine = create_engine(SERVER_URL)

with engine.connect() as conn:
    conn.execute(text("DROP DATABASE IF EXISTS expense_tracker"))
    conn.commit()

    print("Creating fresh database...")
    conn.execute(text("CREATE DATABASE expense_tracker"))
    conn.commit()

print("Done! Now restart backend: uvicorn main:app --reload")