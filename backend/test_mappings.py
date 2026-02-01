#!/usr/bin/env python
"""Test script to verify merchant mappings are created"""
import sqlite3
import sys
from datetime import datetime

try:
    # Connect to database
    conn = sqlite3.connect('./finance_tracker.db')
    cursor = conn.cursor()
    
    # Check if merchant_mappings table exists
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='merchant_mappings'")
    result = cursor.fetchone()
    
    if result:
        print("✓ merchant_mappings table created successfully!")
        
        # Count rows in merchant_mappings
        cursor.execute("SELECT COUNT(*) FROM merchant_mappings")
        count = cursor.fetchone()[0]
        print(f"✓ Total merchant mappings: {count}")
        
        # Show first 5 mappings
        if count > 0:
            cursor.execute("SELECT amount, statement_title, mapped_title FROM merchant_mappings LIMIT 5")
            rows = cursor.fetchall()
            print("\nFirst 5 merchant mappings:")
            for row in rows:
                print(f"  - Amount: {row[0]}, Statement: {row[1]}, Mapped: {row[2]}")
    else:
        print("✗ merchant_mappings table NOT found!")
        # List all tables
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table'")
        tables = cursor.fetchall()
        print(f"Available tables: {[t[0] for t in tables]}")
    
    conn.close()
    
except Exception as e:
    print(f"✗ Error: {e}")
    sys.exit(1)
