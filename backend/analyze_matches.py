import pandas as pd
import sqlite3
from difflib import SequenceMatcher

# Load reference data
input_df = pd.read_csv("../input_data/input.csv")

# Load statement transactions from database
conn = sqlite3.connect("finance_tracker.db")
cur = conn.cursor()
cur.execute("SELECT amount, clean_title FROM merchant_mappings WHERE mapped_title = statement_title LIMIT 20")
rows = cur.fetchall()

print("Statement transactions that didn't match input.csv:")
print("=" * 80)

for stmt_amount, clean_title in rows:
    print(f"\nStatement: {clean_title} (Amount: {stmt_amount})")
    
    # Try to find matches in input.csv
    matches = input_df[input_df['amount'] == stmt_amount]
    if len(matches) > 0:
        print(f"   FOUND {len(matches)} transactions with EXACT amount match:")
        for _, row in matches.head(3).iterrows():
            print(f"     - {row['title']} (Account: {row['account']})")
    
    # Try partial amount match (within 10%)
    lower = stmt_amount * 0.9
    upper = stmt_amount * 1.1
    partial_matches = input_df[(input_df['amount'] >= lower) & (input_df['amount'] <= upper)]
    if len(partial_matches) > 0 and len(matches) == 0:
        print(f"   Found {len(partial_matches)} transactions with PARTIAL amount match (10%):")
        for _, row in partial_matches.head(3).iterrows():
            title_str = str(row['title']).lower() if pd.notna(row['title']) else ''
            sim = SequenceMatcher(None, clean_title.lower(), title_str).ratio()
            print(f"     - {row['title']} ({row['amount']}) - Similarity: {sim:.2%}")
    
    # Try similarity match
    if len(matches) == 0 and len(partial_matches) == 0:
        similarities = []
        for _, row in input_df.iterrows():
            title_str = str(row['title']).lower() if pd.notna(row['title']) else ''
            sim = SequenceMatcher(None, clean_title.lower(), title_str).ratio()
            if sim > 0.3:
                similarities.append((sim, row['amount'], row['title']))
        
        if similarities:
            similarities.sort(reverse=True)
            print(f"   Top similarities:")
            for sim, amt, title in similarities[:3]:
                print(f"     - {title} ({amt}) - Similarity: {sim:.2%}")

conn.close()
