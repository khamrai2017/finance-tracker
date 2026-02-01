"""
Migration script to add category_name and category_id columns to merchant_mappings table
"""
import sqlite3
import os

# Get the database path
db_path = os.path.join(os.path.dirname(__file__), 'finance_tracker.db')

print(f"Connecting to database: {db_path}")

# Connect to the database
conn = sqlite3.connect(db_path)
cursor = conn.cursor()

try:
    # Check current columns
    cursor.execute("PRAGMA table_info(merchant_mappings)")
    columns = [column[1] for column in cursor.fetchall()]
    print(f"Current columns: {columns}")

    # Add category_name if missing
    if 'category_name' not in columns:
        print("Adding 'category_name' column...")
        cursor.execute(
            "ALTER TABLE merchant_mappings ADD COLUMN category_name TEXT")
        conn.commit()
        print("✅ Added 'category_name'")
    else:
        print("✅ 'category_name' already exists")

    # Add category_id if missing
    if 'category_id' not in columns:
        print("Adding 'category_id' column...")
        cursor.execute(
            "ALTER TABLE merchant_mappings ADD COLUMN category_id INTEGER")
        conn.commit()
        print("✅ Added 'category_id'")
    else:
        print("✅ 'category_id' already exists")

    # Verify final structure
    cursor.execute("PRAGMA table_info(merchant_mappings)")
    print("\nFinal table structure:")
    for col in cursor.fetchall():
        print(f"  {col[1]} ({col[2]})")

except Exception as e:
    print(f"❌ Error during migration: {e}")
    conn.rollback()
finally:
    conn.close()
    print("\nMigration finished.")
