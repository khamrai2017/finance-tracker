#!/usr/bin/env python
"""Initialize merchant mappings from input.csv"""
import pandas as pd
import sqlite3
from datetime import datetime

def load_merchant_mappings():
    """Load merchant mappings from input.csv into the database"""
    try:
        # Read input.csv
        csv_path = "../input_data/input.csv"
        df = pd.read_csv(csv_path)
        
        print(f"✓ Loaded input.csv with {len(df)} rows")
        
        # Connect to database
        conn = sqlite3.connect('./finance_tracker.db')
        cursor = conn.cursor()
        
        # Insert mappings
        count = 0
        for _, row in df.iterrows():
            amount = float(row['amount']) if pd.notna(row['amount']) else 0
            statement_title = str(row['title']).strip() if pd.notna(row['title']) else ''
            mapped_title = str(row['title']).strip() if pd.notna(row['title']) else ''
            
            if amount > 0 and statement_title:
                cursor.execute("""
                    INSERT INTO merchant_mappings 
                    (user_id, amount, statement_title, clean_title, mapped_title, created_at)
                    VALUES (?, ?, ?, ?, ?, ?)
                """, (1, amount, statement_title, statement_title, mapped_title, datetime.utcnow().isoformat()))
                count += 1
        
        conn.commit()
        conn.close()
        
        print(f"✓ Successfully loaded {count} merchant mappings into the database!")
        return True
        
    except Exception as e:
        print(f"✗ Error loading merchant mappings: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    load_merchant_mappings()
