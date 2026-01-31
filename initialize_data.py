"""
Initialize the database with sample data from your CSV file
Run this after starting the backend for the first time
"""
import requests
import pandas as pd

API_BASE = "http://localhost:8000/api"

def import_csv_data(csv_path):
    """Import the CSV data into the database"""
    print("📊 Importing your spending data...")
    
    with open(csv_path, 'rb') as f:
        files = {'file': ('spending.csv', f, 'text/csv')}
        response = requests.post(f"{API_BASE}/import/csv", files=files)
        
        if response.status_code == 200:
            result = response.json()
            print(f"✅ {result['message']}")
            return True
        else:
            print(f"❌ Import failed: {response.text}")
            return False

def create_sample_budgets():
    """Create sample budgets based on spending patterns"""
    print("\n💰 Creating sample budgets...")
    
    budgets = [
        {"category_id": 1, "amount": 100000, "period": "monthly"},  # Shopping
        {"category_id": 3, "amount": 20000, "period": "monthly"},   # Education
        {"category_id": 4, "amount": 15000, "period": "monthly"},   # Groceries
        {"category_id": 5, "amount": 10000, "period": "monthly"},   # Healthcare
        {"category_id": 6, "amount": 8000, "period": "monthly"},    # Food
    ]
    
    for budget in budgets:
        try:
            response = requests.post(f"{API_BASE}/budgets", json=budget)
            if response.status_code == 200:
                print(f"✅ Budget created for category {budget['category_id']}")
            else:
                print(f"⚠️  Budget creation skipped for category {budget['category_id']}")
        except Exception as e:
            print(f"⚠️  Error creating budget: {e}")

def show_overview():
    """Display financial overview"""
    print("\n📈 Your Financial Overview:")
    print("=" * 60)
    
    try:
        response = requests.get(f"{API_BASE}/analytics/overview")
        if response.status_code == 200:
            data = response.json()
            
            print(f"Total Income:     ₹{data['total_income']:,.2f}")
            print(f"Total Expenses:   ₹{data['total_expenses']:,.2f}")
            print(f"Net Savings:      ₹{data['net_savings']:,.2f}")
            print(f"Transactions:     {data['total_transactions']}")
            print("=" * 60)
            
            if data['net_savings'] < 0:
                print("⚠️  You're spending more than you're earning!")
            else:
                print("✅ Great! You're saving money!")
        else:
            print("Could not fetch overview")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    print("🚀 FinanceFlow Data Initialization")
    print("=" * 60)
    
    # Check if backend is running
    try:
        response = requests.get(f"{API_BASE}/accounts")
        print("✅ Backend server is running\n")
    except:
        print("❌ Backend server is not running!")
        print("Please start the backend first with: python backend/main.py")
        exit(1)
    
    # Import CSV
    csv_path = input("\nEnter path to your CSV file (or press Enter to skip): ").strip()
    
    if csv_path and csv_path != "":
        success = import_csv_data(csv_path)
        
        if success:
            # Create sample budgets
            create_sample_budgets()
            
            # Show overview
            show_overview()
            
            print("\n✅ Initialization complete!")
            print("🎉 Open http://localhost:3000 to view your dashboard")
    else:
        print("\n⚠️  No CSV file provided. You can import later from the UI.")
        print("🎉 Open http://localhost:3000 to get started")
