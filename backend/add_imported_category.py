"""
Script to add the 'Imported' category to the database
Run this script to add the category if it doesn't exist
"""

import sqlite3

# Connect to the database
conn = sqlite3.connect('finance_tracker.db')
cursor = conn.cursor()

# Check if 'Imported' category already exists
cursor.execute(
    "SELECT * FROM categories WHERE name = 'Imported' AND user_id = 1")
existing = cursor.fetchone()

if existing:
    print("✅ 'Imported' category already exists!")
    print(
        f"   ID: {existing[0]}, Name: {existing[2]}, Type: {existing[3]}, Color: {existing[4]}, Icon: {existing[5]}")
else:
    # Add the 'Imported' category
    cursor.execute("""
        INSERT INTO categories (user_id, name, type, color, icon)
        VALUES (1, 'Imported', 'expense', '#9ca3af', '📥')
    """)
    conn.commit()
    print("✅ 'Imported' category added successfully!")

    # Verify it was added
    cursor.execute(
        "SELECT * FROM categories WHERE name = 'Imported' AND user_id = 1")
    new_category = cursor.fetchone()
    print(
        f"   ID: {new_category[0]}, Name: {new_category[2]}, Type: {new_category[3]}, Color: {new_category[4]}, Icon: {new_category[5]}")

# Show all categories
print("\n📋 All categories:")
cursor.execute(
    "SELECT id, name, type, color, icon FROM categories WHERE user_id = 1 ORDER BY name")
categories = cursor.fetchall()
for cat in categories:
    print(f"   {cat[0]:2d}. {cat[4]} {cat[1]:20s} ({cat[2]:7s}) - {cat[3]}")

conn.close()
