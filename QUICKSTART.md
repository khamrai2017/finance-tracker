# 🚀 Quick Start Guide - FinanceFlow

Get your personal finance tracker up and running in 5 minutes!

## Prerequisites

Make sure you have installed:
- **Python 3.9+** - [Download](https://www.python.org/downloads/)
- **Node.js 18+** - [Download](https://nodejs.org/)

## Option 1: Automated Startup (Easiest)

### On Linux/Mac:
```bash
chmod +x start.sh
./start.sh
```

### On Windows:
```bash
start.bat
```

This will:
1. Check prerequisites
2. Create virtual environments
3. Install all dependencies
4. Start both backend and frontend servers
5. Open your browser automatically

## Option 2: Manual Setup

### Step 1: Backend Setup

```bash
# Navigate to backend folder
cd backend

# Create virtual environment (first time only)
python -m venv venv

# Activate virtual environment
# On Linux/Mac:
source venv/bin/activate
# On Windows:
venv\Scripts\activate

# Install dependencies (first time only)
pip install -r requirements.txt

# Start the backend server
python main.py
```

Backend will run on: **http://localhost:8000**

### Step 2: Frontend Setup

Open a **new terminal** window:

```bash
# Navigate to frontend folder
cd frontend

# Install dependencies (first time only)
npm install

# Start the development server
npm run dev
```

Frontend will run on: **http://localhost:3000**

## 🎉 You're Ready!

1. **Open your browser** to http://localhost:3000
2. **Import your data**: Click "Import CSV" and upload your spending CSV file
3. **Explore**: Navigate through Dashboard, Transactions, Budgets, and Analytics

## 📊 First Steps

### Import Your Existing Data
1. Click the **"Import CSV"** button in the Transactions tab
2. Select your CSV file (example format already in the system)
3. Wait for import to complete - you'll see a success message

### Add a New Transaction
1. Click **"Add Transaction"** button
2. Fill in:
   - Type: Expense or Income
   - Title: e.g., "Grocery Shopping"
   - Amount: e.g., 1500
   - Category: e.g., "Groceries"
   - Account: e.g., "DebitCard"
   - Date & Time
   - Optional note
3. Click **"Add Transaction"**

### Set a Budget
1. Go to **Budgets** tab
2. Click **"Add Budget"**
3. Choose a category (e.g., "Shopping")
4. Set amount (e.g., 50000 per month)
5. Click **"Set Budget"**

## 🔍 Explore Features

### Dashboard Tab
- View overall financial summary
- See beautiful charts of spending by category
- Track monthly spending trends
- Analyze account distribution

### Transactions Tab
- Browse all your transactions
- Filter by category, account, or search
- Add new transactions manually
- Import bulk data from CSV

### Budgets Tab
- Set monthly spending limits
- Visual progress bars
- Get alerts at 80% and 100%
- Track remaining budget

### Analytics Tab
- Top merchants analysis
- Detailed spending breakdowns
- Identify spending patterns

## 🛠️ Troubleshooting

### Backend won't start?
- Make sure port 8000 is not in use
- Check Python version: `python --version` (needs 3.9+)
- Try: `pip install --upgrade fastapi uvicorn sqlalchemy pandas`

### Frontend won't start?
- Make sure port 3000 is not in use
- Check Node version: `node --version` (needs 18+)
- Try: `rm -rf node_modules && npm install`

### Can't import CSV?
- Check CSV format matches the example
- Make sure file encoding is UTF-8
- Verify date format: DD-MM-YYYY HH:MM

### Charts not showing?
- Wait for data to load
- Check browser console for errors
- Refresh the page

## 📚 Need More Help?

- **API Documentation**: http://localhost:8000/docs
- **README**: Check the main README.md file
- **Sample Data**: Use your uploaded CSV as reference

## 🎨 Customization

### Change Colors
Edit the CSS variables in `frontend/App.jsx`

### Add Categories
POST to `/api/categories` with your custom category

### Modify Database
Check `backend/main.py` for database models

---

**Happy Finance Tracking! 💰📊**
