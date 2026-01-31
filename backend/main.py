from fastapi import FastAPI, HTTPException, Depends, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import create_engine, Column, Integer, String, Float, Boolean, DateTime, ForeignKey, func, extract
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, Session, relationship
from pydantic import BaseModel
from datetime import datetime, timedelta
from typing import List, Optional
import pandas as pd
from io import StringIO
import json

# Database setup
DATABASE_URL = "sqlite:///./finance_tracker.db"
engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

# Database Models
class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True)
    name = Column(String)
    created_at = Column(DateTime, default=datetime.utcnow)
    accounts = relationship("Account", back_populates="user")
    categories = relationship("Category", back_populates="user")
    transactions = relationship("Transaction", back_populates="user")
    budgets = relationship("Budget", back_populates="user")

class Account(Base):
    __tablename__ = "accounts"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    name = Column(String, index=True)
    account_type = Column(String)
    balance = Column(Float, default=0.0)
    currency = Column(String, default="INR")
    color = Column(String, default="#6366f1")
    created_at = Column(DateTime, default=datetime.utcnow)
    user = relationship("User", back_populates="accounts")
    transactions = relationship("Transaction", back_populates="account")

class Category(Base):
    __tablename__ = "categories"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    name = Column(String, index=True)
    type = Column(String)  # expense or income
    color = Column(String)
    icon = Column(String)
    user = relationship("User", back_populates="categories")
    transactions = relationship("Transaction", back_populates="category")
    budgets = relationship("Budget", back_populates="category")

class Transaction(Base):
    __tablename__ = "transactions"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    account_id = Column(Integer, ForeignKey("accounts.id"))
    category_id = Column(Integer, ForeignKey("categories.id"))
    amount = Column(Float)
    currency = Column(String, default="INR")
    title = Column(String)
    note = Column(String, nullable=True)
    date = Column(DateTime)
    is_income = Column(Boolean, default=False)
    merchant = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    user = relationship("User", back_populates="transactions")
    account = relationship("Account", back_populates="transactions")
    category = relationship("Category", back_populates="transactions")

class Budget(Base):
    __tablename__ = "budgets"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    category_id = Column(Integer, ForeignKey("categories.id"))
    amount = Column(Float)
    period = Column(String, default="monthly")
    start_date = Column(DateTime)
    end_date = Column(DateTime)
    user = relationship("User", back_populates="budgets")
    category = relationship("Category", back_populates="budgets")

# Create tables
Base.metadata.create_all(bind=engine)

# Pydantic Models
class TransactionCreate(BaseModel):
    account_id: int
    category_id: int
    amount: float
    title: str
    note: Optional[str] = None
    date: datetime
    is_income: bool = False
    merchant: Optional[str] = None

class TransactionResponse(BaseModel):
    id: int
    account_id: int
    category_id: int
    amount: float
    currency: str
    title: str
    note: Optional[str]
    date: datetime
    is_income: bool
    merchant: Optional[str]
    account_name: Optional[str]
    category_name: Optional[str]
    category_color: Optional[str]
    
    class Config:
        from_attributes = True

class AccountCreate(BaseModel):
    name: str
    account_type: str
    balance: float = 0.0
    color: str = "#6366f1"

class CategoryCreate(BaseModel):
    name: str
    type: str
    color: str
    icon: str = "💰"

class BudgetCreate(BaseModel):
    category_id: int
    amount: float
    period: str = "monthly"

# FastAPI app
app = FastAPI(title="Finance Tracker API")

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Dependency
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# Initialize default user and data
@app.on_event("startup")
async def startup_event():
    db = SessionLocal()
    
    # Check if default user exists
    user = db.query(User).filter(User.email == "demo@finance.com").first()
    if not user:
        # Create default user
        user = User(email="demo@finance.com", name="Demo User")
        db.add(user)
        db.commit()
        db.refresh(user)
        
        # Create default accounts
        accounts_data = [
            {"name": "Supermoney", "account_type": "wallet", "color": "#8b5cf6"},
            {"name": "FlipkartAxis", "account_type": "credit_card", "color": "#ec4899"},
            {"name": "DebitCard", "account_type": "bank", "color": "#3b82f6"},
            {"name": "TN HDFC", "account_type": "bank", "color": "#10b981"},
            {"name": "IciciAmazon", "account_type": "credit_card", "color": "#f59e0b"},
            {"name": "Hdfc Pixel", "account_type": "credit_card", "color": "#ef4444"},
            {"name": "IciciSapphiro", "account_type": "credit_card", "color": "#06b6d4"},
            {"name": "Kotak", "account_type": "bank", "color": "#8b5cf6"},
        ]
        
        for acc_data in accounts_data:
            account = Account(user_id=user.id, **acc_data)
            db.add(account)
        
        # Create default categories
        categories_data = [
            {"name": "Shopping", "type": "expense", "color": "#ec4899", "icon": "🛍️"},
            {"name": "Home", "type": "expense", "color": "#8b5cf6", "icon": "🏠"},
            {"name": "Education", "type": "expense", "color": "#3b82f6", "icon": "📚"},
            {"name": "Groceries", "type": "expense", "color": "#10b981", "icon": "🛒"},
            {"name": "Healthcare", "type": "expense", "color": "#ef4444", "icon": "🏥"},
            {"name": "Food", "type": "expense", "color": "#f59e0b", "icon": "🍔"},
            {"name": "Bills & Fees", "type": "expense", "color": "#6366f1", "icon": "📄"},
            {"name": "Travel", "type": "expense", "color": "#06b6d4", "icon": "✈️"},
            {"name": "Investment", "type": "expense", "color": "#14b8a6", "icon": "💹"},
            {"name": "Beauty", "type": "expense", "color": "#f472b6", "icon": "💄"},
            {"name": "Dining", "type": "expense", "color": "#fb923c", "icon": "🍽️"},
            {"name": "Entertainment", "type": "expense", "color": "#a78bfa", "icon": "🎮"},
            {"name": "Gifts", "type": "expense", "color": "#fbbf24", "icon": "🎁"},
            {"name": "Balance Correction", "type": "income", "color": "#22c55e", "icon": "💵"},
        ]
        
        for cat_data in categories_data:
            category = Category(user_id=user.id, **cat_data)
            db.add(category)
        
        db.commit()
    
    db.close()

# API Endpoints

# Transactions
@app.get("/api/transactions", response_model=List[TransactionResponse])
async def get_transactions(
    skip: int = 0, 
    limit: int = 100,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    category_id: Optional[int] = None,
    account_id: Optional[int] = None,
    is_income: Optional[bool] = None,
    db: Session = Depends(get_db)
):
    query = db.query(Transaction).filter(Transaction.user_id == 1)
    
    if start_date:
        query = query.filter(Transaction.date >= datetime.fromisoformat(start_date))
    if end_date:
        query = query.filter(Transaction.date <= datetime.fromisoformat(end_date))
    if category_id:
        query = query.filter(Transaction.category_id == category_id)
    if account_id:
        query = query.filter(Transaction.account_id == account_id)
    if is_income is not None:
        query = query.filter(Transaction.is_income == is_income)
    
    transactions = query.order_by(Transaction.date.desc()).offset(skip).limit(limit).all()
    
    result = []
    for t in transactions:
        result.append(TransactionResponse(
            id=t.id,
            account_id=t.account_id,
            category_id=t.category_id,
            amount=t.amount,
            currency=t.currency,
            title=t.title,
            note=t.note,
            date=t.date,
            is_income=t.is_income,
            merchant=t.merchant,
            account_name=t.account.name if t.account else None,
            category_name=t.category.name if t.category else None,
            category_color=t.category.color if t.category else None
        ))
    
    return result

@app.post("/api/transactions", response_model=TransactionResponse)
async def create_transaction(transaction: TransactionCreate, db: Session = Depends(get_db)):
    db_transaction = Transaction(user_id=1, **transaction.dict())
    db.add(db_transaction)
    db.commit()
    db.refresh(db_transaction)
    
    return TransactionResponse(
        id=db_transaction.id,
        account_id=db_transaction.account_id,
        category_id=db_transaction.category_id,
        amount=db_transaction.amount,
        currency=db_transaction.currency,
        title=db_transaction.title,
        note=db_transaction.note,
        date=db_transaction.date,
        is_income=db_transaction.is_income,
        merchant=db_transaction.merchant,
        account_name=db_transaction.account.name,
        category_name=db_transaction.category.name,
        category_color=db_transaction.category.color
    )

@app.delete("/api/transactions/{transaction_id}")
async def delete_transaction(transaction_id: int, db: Session = Depends(get_db)):
    transaction = db.query(Transaction).filter(Transaction.id == transaction_id).first()
    if not transaction:
        raise HTTPException(status_code=404, detail="Transaction not found")
    db.delete(transaction)
    db.commit()
    return {"message": "Transaction deleted"}

# Accounts
@app.get("/api/accounts")
async def get_accounts(db: Session = Depends(get_db)):
    accounts = db.query(Account).filter(Account.user_id == 1).all()
    result = []
    for account in accounts:
        # Calculate balance from transactions
        total = db.query(func.sum(Transaction.amount)).filter(
            Transaction.account_id == account.id
        ).scalar() or 0
        
        result.append({
            "id": account.id,
            "name": account.name,
            "account_type": account.account_type,
            "balance": total,
            "currency": account.currency,
            "color": account.color
        })
    return result

@app.post("/api/accounts")
async def create_account(account: AccountCreate, db: Session = Depends(get_db)):
    db_account = Account(user_id=1, **account.dict())
    db.add(db_account)
    db.commit()
    db.refresh(db_account)
    return db_account

# Categories
@app.get("/api/categories")
async def get_categories(db: Session = Depends(get_db)):
    categories = db.query(Category).filter(Category.user_id == 1).all()
    return categories

@app.post("/api/categories")
async def create_category(category: CategoryCreate, db: Session = Depends(get_db)):
    db_category = Category(user_id=1, **category.dict())
    db.add(db_category)
    db.commit()
    db.refresh(db_category)
    return db_category

# Analytics
@app.get("/api/analytics/overview")
async def get_overview(db: Session = Depends(get_db)):
    # Get current month
    now = datetime.now()
    start_of_month = datetime(now.year, now.month, 1)
    
    # Total expenses and income
    total_expenses = db.query(func.sum(Transaction.amount)).filter(
        Transaction.user_id == 1,
        Transaction.is_income == False
    ).scalar() or 0
    
    total_income = db.query(func.sum(Transaction.amount)).filter(
        Transaction.user_id == 1,
        Transaction.is_income == True
    ).scalar() or 0
    
    # This month
    month_expenses = db.query(func.sum(Transaction.amount)).filter(
        Transaction.user_id == 1,
        Transaction.is_income == False,
        Transaction.date >= start_of_month
    ).scalar() or 0
    
    month_income = db.query(func.sum(Transaction.amount)).filter(
        Transaction.user_id == 1,
        Transaction.is_income == True,
        Transaction.date >= start_of_month
    ).scalar() or 0
    
    # Transaction count
    total_transactions = db.query(func.count(Transaction.id)).filter(
        Transaction.user_id == 1
    ).scalar() or 0
    
    return {
        "total_expenses": total_expenses,
        "total_income": total_income,
        "net_savings": total_income - total_expenses,
        "month_expenses": month_expenses,
        "month_income": month_income,
        "month_net": month_income - month_expenses,
        "total_transactions": total_transactions
    }

@app.get("/api/analytics/category-breakdown")
async def get_category_breakdown(db: Session = Depends(get_db)):
    results = db.query(
        Category.name,
        Category.color,
        Category.icon,
        func.sum(Transaction.amount).label('total'),
        func.count(Transaction.id).label('count')
    ).join(Transaction).filter(
        Transaction.user_id == 1,
        Transaction.is_income == False
    ).group_by(Category.id).all()
    
    return [
        {
            "name": r.name,
            "color": r.color,
            "icon": r.icon,
            "total": r.total,
            "count": r.count
        }
        for r in results
    ]

@app.get("/api/analytics/monthly-trend")
async def get_monthly_trend(db: Session = Depends(get_db)):
    results = db.query(
        extract('year', Transaction.date).label('year'),
        extract('month', Transaction.date).label('month'),
        func.sum(Transaction.amount).label('total'),
        func.count(Transaction.id).label('count')
    ).filter(
        Transaction.user_id == 1,
        Transaction.is_income == False
    ).group_by('year', 'month').order_by('year', 'month').all()
    
    return [
        {
            "month": f"{int(r.year)}-{int(r.month):02d}",
            "total": r.total,
            "count": r.count
        }
        for r in results
    ]

@app.get("/api/analytics/account-distribution")
async def get_account_distribution(db: Session = Depends(get_db)):
    results = db.query(
        Account.name,
        Account.color,
        func.sum(Transaction.amount).label('total'),
        func.count(Transaction.id).label('count')
    ).join(Transaction).filter(
        Transaction.user_id == 1,
        Transaction.is_income == False
    ).group_by(Account.id).all()
    
    return [
        {
            "name": r.name,
            "color": r.color,
            "total": r.total,
            "count": r.count
        }
        for r in results
    ]

@app.get("/api/analytics/top-merchants")
async def get_top_merchants(limit: int = 15, db: Session = Depends(get_db)):
    results = db.query(
        Transaction.title,
        func.sum(Transaction.amount).label('total'),
        func.count(Transaction.id).label('visits'),
        func.avg(Transaction.amount).label('average')
    ).filter(
        Transaction.user_id == 1,
        Transaction.is_income == False
    ).group_by(Transaction.title).order_by(func.sum(Transaction.amount).desc()).limit(limit).all()
    
    return [
        {
            "merchant": r.title,
            "total": r.total,
            "visits": r.visits,
            "average": r.average
        }
        for r in results
    ]

# Import CSV
@app.post("/api/import/csv")
async def import_csv(file: UploadFile = File(...), db: Session = Depends(get_db)):
    contents = await file.read()
    df = pd.read_csv(StringIO(contents.decode('utf-8')))
    
    # Get or create accounts and categories
    account_map = {}
    category_map = {}
    
    for _, row in df.iterrows():
        # Get or create account
        if row['account'] not in account_map:
            account = db.query(Account).filter(
                Account.user_id == 1,
                Account.name == row['account']
            ).first()
            if not account:
                account = Account(user_id=1, name=row['account'], account_type="imported")
                db.add(account)
                db.commit()
                db.refresh(account)
            account_map[row['account']] = account.id
        
        # Get or create category
        if row['category name'] not in category_map:
            category = db.query(Category).filter(
                Category.user_id == 1,
                Category.name == row['category name']
            ).first()
            if not category:
                cat_type = "income" if row['income'] else "expense"
                category = Category(
                    user_id=1, 
                    name=row['category name'], 
                    type=cat_type,
                    color="#6366f1",
                    icon="💰"
                )
                db.add(category)
                db.commit()
                db.refresh(category)
            category_map[row['category name']] = category.id
        
        # Create transaction
        transaction = Transaction(
            user_id=1,
            account_id=account_map[row['account']],
            category_id=category_map[row['category name']],
            amount=row['amount'],
            currency=row['currency'],
            title=row['title'],
            note=row['note'] if pd.notna(row['note']) else None,
            date=datetime.strptime(row['date'], '%d-%m-%Y %H:%M'),
            is_income=row['income'],
            merchant=row['title']
        )
        db.add(transaction)
    
    db.commit()
    return {"message": f"Imported {len(df)} transactions"}

# Budgets
@app.get("/api/budgets")
async def get_budgets(db: Session = Depends(get_db)):
    budgets = db.query(Budget).filter(Budget.user_id == 1).all()
    result = []
    
    for budget in budgets:
        # Get spending for this category in current period
        spent = db.query(func.sum(Transaction.amount)).filter(
            Transaction.user_id == 1,
            Transaction.category_id == budget.category_id,
            Transaction.is_income == False,
            Transaction.date >= budget.start_date,
            Transaction.date <= budget.end_date
        ).scalar() or 0
        
        result.append({
            "id": budget.id,
            "category_id": budget.category_id,
            "category_name": budget.category.name,
            "category_color": budget.category.color,
            "amount": budget.amount,
            "spent": spent,
            "remaining": budget.amount - spent,
            "percentage": (spent / budget.amount * 100) if budget.amount > 0 else 0,
            "period": budget.period,
            "start_date": budget.start_date,
            "end_date": budget.end_date
        })
    
    return result

@app.post("/api/budgets")
async def create_budget(budget: BudgetCreate, db: Session = Depends(get_db)):
    # Set date range based on period
    now = datetime.now()
    if budget.period == "monthly":
        start_date = datetime(now.year, now.month, 1)
        if now.month == 12:
            end_date = datetime(now.year + 1, 1, 1) - timedelta(days=1)
        else:
            end_date = datetime(now.year, now.month + 1, 1) - timedelta(days=1)
    else:
        start_date = now
        end_date = now + timedelta(days=365)
    
    db_budget = Budget(
        user_id=1,
        category_id=budget.category_id,
        amount=budget.amount,
        period=budget.period,
        start_date=start_date,
        end_date=end_date
    )
    db.add(db_budget)
    db.commit()
    db.refresh(db_budget)
    return db_budget

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
