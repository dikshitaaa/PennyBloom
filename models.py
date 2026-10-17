from sqlalchemy import Column, Integer, String, Float, ForeignKey, Text, DateTime
from sqlalchemy.orm import relationship
from datetime import datetime

from database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100))
    email = Column(String(100), unique=True)
    password = Column(String(255))

    expenses = relationship("Expense", back_populates="user", cascade="all, delete-orphan")
    goals = relationship("Goal", back_populates="user", cascade="all, delete-orphan")
    wins = relationship("Win", back_populates="user", cascade="all, delete-orphan")
    journals = relationship("JournalEntry", back_populates="user", cascade="all, delete-orphan")
    blooms = relationship("BloomDay", back_populates="user", cascade="all, delete-orphan")
    piggy = relationship("Piggy", back_populates="user", uselist=False, cascade="all, delete-orphan")


class Expense(Base):
    __tablename__ = "expenses"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(100))
    amount = Column(Float)
    category = Column(String(50))
    date = Column(String(20))
    note = Column(String(255), nullable=True)
    mood = Column(String(50), nullable=True)
    payment_method = Column(String(50), nullable=True)

    user_id = Column(Integer, ForeignKey("users.id"))
    user = relationship("User", back_populates="expenses")


class Goal(Base):
    __tablename__ = "goals"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100))
    target = Column(Float)
    saved = Column(Float, default=0)
    deadline = Column(String(20), nullable=True)
    why = Column(String(255), nullable=True)
    icon = Column(String(10), default="🎯")
    created_at = Column(DateTime, default=datetime.utcnow)

    user_id = Column(Integer, ForeignKey("users.id"))
    user = relationship("User", back_populates="goals")


class Win(Base):
    __tablename__ = "wins"

    id = Column(Integer, primary_key=True, index=True)
    text = Column(String(255))
    date = Column(String(40))

    user_id = Column(Integer, ForeignKey("users.id"))
    user = relationship("User", back_populates="wins")


class JournalEntry(Base):
    __tablename__ = "journal"

    id = Column(Integer, primary_key=True, index=True)
    mood = Column(String(50))
    entry = Column(Text)
    date = Column(String(40))

    user_id = Column(Integer, ForeignKey("users.id"))
    user = relationship("User", back_populates="journals")


class BloomDay(Base):
    __tablename__ = "bloom_days"

    id = Column(Integer, primary_key=True, index=True)
    day_index = Column(Integer)         # 0 to 6
    day_letter = Column(String(2))      # M, T, W...
    icon = Column(String(10))           # 🌱 🌿 etc
    filled = Column(Integer, default=0) # 0 or 1 (SQLite-friendly)

    user_id = Column(Integer, ForeignKey("users.id"))
    user = relationship("User", back_populates="blooms")


class Piggy(Base):
    __tablename__ = "piggy"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(50), nullable=True)
    mood = Column(Integer, default=0)       # 0-100
    total_saved = Column(Float, default=0)
    history = Column(Text, default="[]")    # JSON string of [{id, amount, date}]

    user_id = Column(Integer, ForeignKey("users.id"), unique=True)
    user = relationship("User", back_populates="piggy")