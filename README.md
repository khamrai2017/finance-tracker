# FinanceFlow - Personal Finance Tracker

A beautiful, full-stack personal finance tracker with rich analytics, built with **React** (frontend) and **FastAPI** (backend).

## ✨ Features

### 🎯 Core Features
- ✅ **Transaction Management** - Add, view, edit, and delete transactions
- ✅ **Multi-Account Support** - Track 8+ different accounts (bank, credit cards, wallets)
- ✅ **Category Tracking** - 14+ expense categories with custom icons and colors
- ✅ **Budget Management** - Set monthly budgets and track spending
- ✅ **CSV Import** - Import your existing spending data instantly

### 📊 Rich Analytics
- **Dashboard Overview** - Total balance, expenses, income at a glance
- **Category Breakdown** - Beautiful pie charts showing spending distribution
- **Monthly Trends** - Line charts tracking spending over time
- **Account Distribution** - Bar charts showing which accounts you use most
- **Top Merchants** - Analyze where you spend the most money
- **Budget Progress** - Visual progress bars with alerts at 80% and 100%

### 🎨 Beautiful UI
- Modern, classy design with gradient backgrounds
- Dark theme optimized for readability
- Smooth animations and transitions
- Responsive layout for mobile and desktop
- Custom fonts (Syne + DM Sans) for a premium look
- Glassmorphism effects and backdrop blur

## 🛠️ Technology Stack

### Backend
- **FastAPI** - Modern Python web framework
- **SQLAlchemy** - Database ORM
- **SQLite** - Database (easily switchable to PostgreSQL)
- **Pandas** - CSV import and data processing
- **Uvicorn** - ASGI server

### Frontend
- **React 18** - UI framework
- **Vite** - Build tool and dev server
- **Recharts** - Beautiful, composable charts
- **Lucide React** - Icon library
- **CSS-in-JS** - Scoped styling

## 📦 Installation

### Prerequisites
- Python 3.9+
- Node.js 18+
- npm or yarn

### Backend Setup

1. Navigate to the backend directory:
```bash
cd backend
```

2. Create a virtual environment (recommended):
```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

3. Install dependencies:
```bash
pip install -r requirements.txt
```

4. Run the backend server:
```bash
python main.py
```

The API will be available at `http://localhost:8000`

You can view the interactive API documentation at `http://localhost:8000/docs`

### Frontend Setup

1. Navigate to the frontend directory:
```bash
cd frontend
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm run dev
```

The app will open automatically at `http://localhost:3000`

## 📂 Project Structure

```
finance-tracker/
├── backend/
│   ├── main.py              # FastAPI application
│   ├── requirements.txt      # Python dependencies
│   └── finance_tracker.db   # SQLite database (auto-created)
│
└── frontend/
    ├── src/
    │   ├── App.jsx          # Main React application
    │   └── main.jsx         # Entry point
    ├── index.html           # HTML template
    ├── vite.config.js       # Vite configuration
    └── package.json         # npm dependencies
```

## 🚀 Usage

### Importing Your Data

1. Click **"Import CSV"** button in the Transactions tab
2. Select your CSV file (use the format from your uploaded data)
3. Your data will be automatically imported with accounts and categories created

**CSV Format:**
```csv
account,amount,currency,title,note,date,income,category name
Supermoney,116,INR,Reverse,332+349,12-01-2026 08:21,TRUE,Bills & Fees
```

### Adding Transactions

1. Click **"Add Transaction"** button
2. Fill in the form:
   - Type (Expense or Income)
   - Title (e.g., "Groceries", "Salary")
   - Amount
   - Category
   - Account
   - Date & Time
   - Optional note
3. Click **"Add Transaction"**

### Setting Budgets

1. Go to the **Budgets** tab
2. Click **"Add Budget"**
3. Select category and set amount
4. Monitor progress with visual indicators
5. Get alerts when you reach 80% or exceed 100%

### Viewing Analytics

Navigate to the **Analytics** tab to see:
- Top merchants by spending
- Category-wise breakdowns
- Monthly trends
- Account distributions

## 🎨 Customization

### Adding New Categories

Categories are automatically created when importing, or you can add them via the API:

```python
POST /api/categories
{
  "name": "Entertainment",
  "type": "expense",
  "color": "#a78bfa",
  "icon": "🎮"
}
```

### Adding New Accounts

```python
POST /api/accounts
{
  "name": "HDFC Savings",
  "account_type": "bank",
  "color": "#3b82f6"
}
```

## 🔌 API Endpoints

### Transactions
- `GET /api/transactions` - List all transactions (with filters)
- `POST /api/transactions` - Create new transaction
- `DELETE /api/transactions/{id}` - Delete transaction

### Analytics
- `GET /api/analytics/overview` - Financial overview
- `GET /api/analytics/category-breakdown` - Spending by category
- `GET /api/analytics/monthly-trend` - Monthly spending trend
- `GET /api/analytics/account-distribution` - Spending by account
- `GET /api/analytics/top-merchants` - Top spending merchants

### Budgets
- `GET /api/budgets` - List all budgets with progress
- `POST /api/budgets` - Create new budget

### Import
- `POST /api/import/csv` - Import transactions from CSV

### Accounts & Categories
- `GET /api/accounts` - List all accounts
- `POST /api/accounts` - Create new account
- `GET /api/categories` - List all categories
- `POST /api/categories` - Create new category

Full API documentation: `http://localhost:8000/docs`

## 📊 Database Schema

The application uses the following database structure:

- **users** - User accounts
- **accounts** - Bank accounts, credit cards, wallets
- **categories** - Expense and income categories
- **transactions** - All financial transactions
- **budgets** - Budget limits per category

## 🔐 Security Notes

This is a demo application. For production use:
- Add proper authentication (JWT tokens)
- Use environment variables for configuration
- Switch to PostgreSQL for better performance
- Add input validation and sanitization
- Implement rate limiting
- Add HTTPS/SSL

## 🎯 Future Enhancements

Potential features to add:
- [ ] User authentication and multi-user support
- [ ] Receipt upload and OCR
- [ ] Recurring transactions
- [ ] Goals and savings tracking
- [ ] Export to PDF reports
- [ ] Machine learning for expense prediction
- [ ] Mobile app (React Native)
- [ ] Bank integration APIs
- [ ] Split expenses with friends
- [ ] Tax reporting

## 📝 License

This project is for personal use and learning purposes.

## 🙏 Acknowledgments

- **Recharts** for beautiful charts
- **Lucide** for clean icons
- **FastAPI** for an amazing Python framework
- **React** for the UI framework

---

**Enjoy tracking your finances!** 💰📊
# finance-tracker
