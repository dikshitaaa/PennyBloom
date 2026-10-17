from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
import json

from security import (
    hash_password,
    verify_password,
    create_access_token,
    decode_access_token,
)

from database import engine, Base, get_db
from schemas import (
    ExpenseCreate, UserCreate,
    GoalCreate, WinCreate, JournalCreate,
    PiggyUpdate, BloomDaySchema,
)
from models import (
    Expense, User, Goal, Win, JournalEntry, BloomDay, Piggy,
)


# ---------------- DATABASE ----------------
Base.metadata.create_all(bind=engine)

app = FastAPI()

# ---------------- CORS ----------------
# ---------------- CORS ----------------
# ---------------- CORS ----------------
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",             # Local testing ke liye
        "https://penny-bloom-six.vercel.app" # Aapki live website ka URL
    ], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------- AUTH ----------------
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")


def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db),
):
    email = decode_access_token(token)
    if email is None:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    user = db.query(User).filter(User.email == email).first()
    if user is None:
        raise HTTPException(status_code=401, detail="User not found")
    return user


@app.get("/")
def home():
    return {"message": "Expense Tracker API is running!"}


# ---------------- AUTH ----------------
@app.post("/auth/register", status_code=201)
def register(user: UserCreate, db: Session = Depends(get_db)):
    existing = db.query(User).filter(User.email == user.email).first()
    if existing:
        raise HTTPException(status_code=409, detail="An account with this email already exists.")

    new_user = User(
        name=user.full_name,
        email=user.email,
        password=hash_password(user.password),
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    token = create_access_token(data={"sub": new_user.email})
    return {
        "message": "Account created successfully",
        "access_token": token,
        "token_type": "bearer",
        "user": {"id": new_user.id, "name": new_user.name, "email": new_user.email},
    }


@app.post("/auth/login")
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == form_data.username).first()
    if user is None or not verify_password(form_data.password, user.password):
        raise HTTPException(status_code=401, detail="Incorrect email or password.")

    token = create_access_token(data={"sub": user.email})
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": {"id": user.id, "name": user.name, "email": user.email},
    }


@app.get("/auth/me")
def get_me(current_user: User = Depends(get_current_user)):
    return {"id": current_user.id, "name": current_user.name, "email": current_user.email}


# ---------------- EXPENSES ----------------
@app.post("/expenses")
def create_expense(
    expense: ExpenseCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    new_expense = Expense(
        title=expense.title,
        amount=expense.amount,
        category=expense.category,
        date=expense.date,
        note=expense.note,
        mood=expense.mood,
        payment_method=expense.payment_method,
        user_id=current_user.id,
    )
    db.add(new_expense)
    db.commit()
    db.refresh(new_expense)
    return new_expense


@app.get("/expenses")
def get_expenses(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return db.query(Expense).filter(Expense.user_id == current_user.id).order_by(Expense.id.desc()).all()


@app.delete("/expenses/{expense_id}")
def delete_expense(
    expense_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    expense = db.query(Expense).filter(
        Expense.id == expense_id, Expense.user_id == current_user.id
    ).first()
    if not expense:
        raise HTTPException(status_code=404, detail="Expense not found")
    db.delete(expense)
    db.commit()
    return {"message": "Expense deleted successfully"}


# ---------------- GOALS ----------------
@app.get("/goals")
def get_goals(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return db.query(Goal).filter(Goal.user_id == current_user.id).order_by(Goal.id.desc()).all()


@app.post("/goals")
def create_goal(
    goal: GoalCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    new_goal = Goal(
        name=goal.name,
        target=goal.target,
        saved=goal.saved,
        deadline=goal.deadline,
        why=goal.why,
        icon=goal.icon,
        user_id=current_user.id,
    )
    db.add(new_goal)
    db.commit()
    db.refresh(new_goal)
    return new_goal


@app.put("/goals/{goal_id}")
def update_goal(
    goal_id: int,
    goal: GoalCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    existing = db.query(Goal).filter(
        Goal.id == goal_id, Goal.user_id == current_user.id
    ).first()
    if not existing:
        raise HTTPException(status_code=404, detail="Goal not found")

    existing.name = goal.name
    existing.target = goal.target
    existing.saved = goal.saved
    existing.deadline = goal.deadline
    existing.why = goal.why
    existing.icon = goal.icon
    db.commit()
    db.refresh(existing)
    return existing


@app.patch("/goals/{goal_id}/add-money")
def add_money_to_goal(
    goal_id: int,
    amount: float,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    goal = db.query(Goal).filter(
        Goal.id == goal_id, Goal.user_id == current_user.id
    ).first()
    if not goal:
        raise HTTPException(status_code=404, detail="Goal not found")
    goal.saved += amount
    db.commit()
    db.refresh(goal)
    return goal


@app.delete("/goals/{goal_id}")
def delete_goal(
    goal_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    goal = db.query(Goal).filter(
        Goal.id == goal_id, Goal.user_id == current_user.id
    ).first()
    if not goal:
        raise HTTPException(status_code=404, detail="Goal not found")
    db.delete(goal)
    db.commit()
    return {"message": "Goal deleted"}


# ---------------- WINS ----------------
@app.get("/wins")
def get_wins(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return db.query(Win).filter(Win.user_id == current_user.id).order_by(Win.id.desc()).all()


@app.post("/wins")
def create_win(
    win: WinCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    new_win = Win(text=win.text, date=win.date, user_id=current_user.id)
    db.add(new_win)
    db.commit()
    db.refresh(new_win)
    return new_win


@app.delete("/wins/{win_id}")
def delete_win(
    win_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    win = db.query(Win).filter(Win.id == win_id, Win.user_id == current_user.id).first()
    if not win:
        raise HTTPException(status_code=404, detail="Win not found")
    db.delete(win)
    db.commit()
    return {"message": "Win deleted"}


# ---------------- JOURNAL ----------------
@app.get("/journal")
def get_journal(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return db.query(JournalEntry).filter(
        JournalEntry.user_id == current_user.id
    ).order_by(JournalEntry.id.desc()).all()


@app.post("/journal")
def create_journal(
    entry: JournalCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    new_entry = JournalEntry(
        mood=entry.mood, entry=entry.entry, date=entry.date, user_id=current_user.id
    )
    db.add(new_entry)
    db.commit()
    db.refresh(new_entry)
    return new_entry


# ---------------- BLOOM ----------------
@app.get("/bloom")
def get_bloom(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    days = db.query(BloomDay).filter(BloomDay.user_id == current_user.id).order_by(BloomDay.day_index).all()
    if not days:
        # Auto-create default 7 days for new user
        default_icons = ["🌱", "🌿", "🍀", "🌸", "🌼", "🌻", "🌷"]
        default_letters = ["M", "T", "W", "T", "F", "S", "S"]
        for i in range(7):
            db.add(BloomDay(
                day_index=i,
                day_letter=default_letters[i],
                icon=default_icons[i],
                filled=0,
                user_id=current_user.id,
            ))
        db.commit()
        days = db.query(BloomDay).filter(BloomDay.user_id == current_user.id).order_by(BloomDay.day_index).all()
    return days


@app.put("/bloom/{day_index}")
def toggle_bloom(
    day_index: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    day = db.query(BloomDay).filter(
        BloomDay.user_id == current_user.id, BloomDay.day_index == day_index
    ).first()
    if not day:
        raise HTTPException(status_code=404, detail="Bloom day not found")
    day.filled = 0 if day.filled else 1
    db.commit()
    db.refresh(day)
    return day


# ---------------- PIGGY ----------------
@app.get("/piggy")
def get_piggy(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    piggy = db.query(Piggy).filter(Piggy.user_id == current_user.id).first()
    if not piggy:
        piggy = Piggy(
            name=None, mood=0, total_saved=0, history="[]", user_id=current_user.id
        )
        db.add(piggy)
        db.commit()
        db.refresh(piggy)
    return piggy


@app.put("/piggy")
def update_piggy(
    update: PiggyUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    piggy = db.query(Piggy).filter(Piggy.user_id == current_user.id).first()
    if not piggy:
        piggy = Piggy(user_id=current_user.id, history="[]")
        db.add(piggy)
        db.commit()
        db.refresh(piggy)

    if update.name is not None:
        piggy.name = update.name
    if update.mood is not None:
        piggy.mood = update.mood
    if update.total_saved is not None:
        piggy.total_saved = update.total_saved
    if update.history is not None:
        piggy.history = update.history

    db.commit()
    db.refresh(piggy)
    return piggy