from pydantic import BaseModel, EmailStr
from typing import Optional


# ---------- User ----------
class UserCreate(BaseModel):
    full_name: str
    email: EmailStr
    password: str


class UserResponse(BaseModel):
    id: int
    name: str
    email: str

    class Config:
        from_attributes = True


# ---------- Expense ----------
class ExpenseCreate(BaseModel):
    title: str
    amount: float
    category: str
    date: str
    note: Optional[str] = None
    mood: Optional[str] = None
    payment_method: Optional[str] = None


class ExpenseResponse(BaseModel):
    id: int
    title: str
    amount: float
    category: str
    date: str
    note: Optional[str] = None
    mood: Optional[str] = None
    payment_method: Optional[str] = None

    class Config:
        from_attributes = True


# ---------- Goal ----------
class GoalCreate(BaseModel):
    name: str
    target: float
    saved: float = 0
    deadline: Optional[str] = None
    why: Optional[str] = None
    icon: str = "🎯"


class GoalResponse(BaseModel):
    id: int
    name: str
    target: float
    saved: float
    deadline: Optional[str] = None
    why: Optional[str] = None
    icon: str

    class Config:
        from_attributes = True


# ---------- Win ----------
class WinCreate(BaseModel):
    text: str
    date: str


class WinResponse(BaseModel):
    id: int
    text: str
    date: str

    class Config:
        from_attributes = True


# ---------- Journal ----------
class JournalCreate(BaseModel):
    mood: str
    entry: str
    date: str


class JournalResponse(BaseModel):
    id: int
    mood: str
    entry: str
    date: str

    class Config:
        from_attributes = True


# ---------- Bloom ----------
class BloomDaySchema(BaseModel):
    day_index: int
    day_letter: str
    icon: str
    filled: bool


# ---------- Piggy ----------
class PiggyUpdate(BaseModel):
    name: Optional[str] = None
    mood: Optional[int] = None
    total_saved: Optional[float] = None
    history: Optional[str] = None       # JSON string

class PiggyResponse(BaseModel):
    id: int
    name: Optional[str] = None
    mood: int
    total_saved: float
    history: str

    class Config:
        from_attributes = True