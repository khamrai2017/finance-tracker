#!/usr/bin/env python
"""
Create intelligent merchant mappings by matching statement files with input.csv
"""
import pandas as pd
import sqlite3
import re
from datetime import datetime
from pathlib import Path
import os


def clean_upi_title(title):
    """
    Extract merchant name from UPI title like 'UPI/CHANDAN SARKAR/bharatpe...'
    Returns the cleaned merchant name
    """
    if not title:
        return title

    title_str = str(title).strip()
    title_upper = title_str.upper()

    # Check if it's a UPI transaction
    if title_upper.startswith('UPI/') or title_upper.startswith('UPICC/'):
        parts = title_str.split('/')
        if len(parts) >= 2:
            merchant_name = parts[1].strip()
            if merchant_name:
                return merchant_name

    return title_str


def load_reference_data():
    """Load the reference data from input.csv"""
    try:
        csv_path = "../input_data/input.csv"
        df = pd.read_csv(csv_path)
        print(f"✓ Loaded reference data (input.csv): {len(df)} rows")
        return df
    except Exception as e:
        print(f"✗ Error loading input.csv: {e}")
        return None


def load_all_statements():
    """Load all statement Excel files from input_data folder"""
    input_dir = "../input_data"
    all_transactions = []

    # Find all Excel files
    excel_files = []
    for file in os.listdir(input_dir):
        if file.endswith(('.xls', '.xlsx')) and not file.startswith('~'):
            excel_files.append(os.path.join(input_dir, file))

    print(f"\nFound {len(excel_files)} statement files:")

    for file_path in sorted(excel_files):
        try:
            file_name = os.path.basename(file_path)
            print(f"  - Reading {file_name}...", end=" ")

            # Read Excel file
            df = pd.read_excel(file_path, sheet_name=0)

            # Skip if too few rows
            if len(df) < 3:
                print(f"✗ File too small")
                continue

            transaction_count = 0

            # Determine file type and parse accordingly
            if 'Acct_Statement' in file_name:  # HDFC Account Statements
                # These have bank header in first column name
                # Find the row with actual headers
                for start_idx in range(len(df)):
                    row_str = str(df.iloc[start_idx].values).lower()
                    if any(x in row_str for x in ['date', 'description', 'withdrawal', 'deposit']):
                        df = pd.read_excel(
                            file_path, sheet_name=0, header=start_idx)
                        break

                # Extract transactions from HDFC format
                for _, row in df.iterrows():
                    # Try to find amount in debit/credit columns
                    title = None
                    amount = 0

                    for i, val in enumerate(row):
                        val_str = str(val).lower()
                        # Look for description column
                        if pd.notna(val) and len(str(val)) > 10 and any(x not in val_str for x in ['date', 'balance', 'opening', 'closing']):
                            title = str(val).strip()
                            break

                    # Find numeric amount
                    for val in row:
                        if pd.notna(val):
                            try:
                                amount = float(str(val).replace(
                                    ',', '').replace('₹', '').strip())
                                if 0 < amount < 1000000:  # Reasonable transaction amount
                                    break
                            except:
                                pass

                    if title and amount > 0 and len(title) > 3:
                        clean_title = clean_upi_title(title)
                        all_transactions.append({
                            'file': file_name,
                            'statement_title': title,
                            'clean_title': clean_title,
                            'amount': amount
                        })
                        transaction_count += 1

            # Recent CC Statement (Well-formatted)
            elif 'CC_Statement_2026' in file_name:
                # This one has proper headers
                for _, row in df.iterrows():
                    title = str(row['Transaction Details']).strip() if pd.notna(
                        row['Transaction Details']) else ''
                    try:
                        amount_val = str(row['Amount (INR)']).replace(
                            ',', '').replace('₹', '').strip()
                        amount = float(amount_val) if amount_val else 0
                    except:
                        amount = 0

                    if title and amount > 0 and len(title) > 3:
                        clean_title = clean_upi_title(title)
                        all_transactions.append({
                            'file': file_name,
                            'statement_title': title,
                            'clean_title': clean_title,
                            'amount': amount
                        })
                        transaction_count += 1

            elif 'CC_Statement_2025' in file_name:  # Old CC Statements
                # Find transaction start row - look for "Date" keyword
                data_start = 0
                for idx in range(len(df)):
                    row_str = str(df.iloc[idx].values).lower()
                    if 'date' in row_str and 'transaction' in row_str:
                        data_start = idx + 1
                        break

                if data_start > 0:
                    df_data = df.iloc[data_start:].reset_index(drop=True)

                    for _, row in df_data.iterrows():
                        title = None
                        amount = 0

                        # Extract from columns
                        for i in range(len(row)):
                            val = row.iloc[i]
                            if pd.notna(val):
                                val_str = str(val).strip()
                                # Look for transaction detail (longer text)
                                if len(val_str) > 10 and not any(x in val_str.lower() for x in ['date', 'total', 'page']):
                                    title = val_str
                                    break

                        # Find amount
                        for i in range(len(row)-1, 0, -1):
                            val = row.iloc[i]
                            if pd.notna(val):
                                try:
                                    amount = float(str(val).replace(
                                        ',', '').replace('₹', '').strip())
                                    if 0 < amount < 1000000:
                                        break
                                except:
                                    pass

                        if title and amount > 0 and len(title) > 3:
                            clean_title = clean_upi_title(title)
                            all_transactions.append({
                                'file': file_name,
                                'statement_title': title,
                                'clean_title': clean_title,
                                'amount': amount
                            })
                            transaction_count += 1

            elif 'CCStatement_Past' in file_name:  # Old Past CC Statement
                # Find transactions - look for row with data
                for start_idx in range(len(df)):
                    row = df.iloc[start_idx]
                    row_str = ' '.join([str(x) for x in row if pd.notna(x)])
                    if any(x in row_str.lower() for x in ['date', 'amount', 'transaction']):
                        df = pd.read_excel(
                            file_path, sheet_name=0, header=start_idx)
                        break

                for _, row in df.iterrows():
                    title = None
                    amount = 0

                    # Get transaction details and amount
                    for col in df.columns:
                        if 'transaction' in str(col).lower() or 'narration' in str(col).lower():
                            title = str(row[col]).strip() if pd.notna(
                                row[col]) else None
                        elif 'amount' in str(col).lower():
                            try:
                                amount = float(str(row[col]).replace(
                                    ',', '').replace('₹', '').strip())
                            except:
                                pass

                    if title and amount > 0 and len(title) > 3:
                        clean_title = clean_upi_title(title)
                        all_transactions.append({
                            'file': file_name,
                            'statement_title': title,
                            'clean_title': clean_title,
                            'amount': amount
                        })
                        transaction_count += 1

            if transaction_count > 0:
                print(f"✓ {transaction_count} transactions")
            else:
                print(f"⚠ No transactions found")

        except Exception as e:
            print(f"✗ Error: {str(e)[:50]}")
            continue

    print(
        f"\n✓ Total transactions from all statements: {len(all_transactions)}")
    return all_transactions


def find_best_match(statement_title, clean_title, amount, reference_df):
    """
    Find the best matching title from input.csv based on amount and title similarity
    Priority:
    1. Exact amount match + title match
    2. Exact amount match (use first valid title)
    3. String similarity match (for UPI/cleaned titles)
    4. Return None if no match found (will use statement title as fallback)
    """
    from difflib import SequenceMatcher

    # Filter out rows with null titles
    valid_ref_df = reference_df[reference_df['title'].notna()]

    if len(valid_ref_df) == 0:
        return None

    # Strategy 1: Exact amount match
    exact_matches = valid_ref_df[valid_ref_df['amount'] == amount]

    if len(exact_matches) > 0:
        # Check if any title matches the clean statement title
        for _, ref_row in exact_matches.iterrows():
            ref_title = str(ref_row['title']).strip(
            ).lower() if pd.notna(ref_row['title']) else ''
            if ref_title == clean_title.lower():
                return ref_row['title'], ref_row.get('category name')

        # Check for word overlap
        best_match = None
        best_category = None
        best_overlap = 0

        for _, ref_row in exact_matches.iterrows():
            ref_title = str(ref_row['title']).strip(
            ).lower() if pd.notna(ref_row['title']) else ''

            # Count word matches
            statement_words = set(clean_title.lower().split())
            ref_words = set(ref_title.split())

            # Remove common words
            common_words = {'the', 'and', 'or', 'a', 'an', 'in', 'on', 'at', 'to',
                            'for', 'of', 'by', 'transfer', 'dr', 'cr', 'payment', 'funds', 'account'}
            statement_words -= common_words
            ref_words -= common_words

            word_overlap = len(statement_words & ref_words)

            if word_overlap > best_overlap:
                best_overlap = word_overlap
                best_match = ref_row['title']
                best_category = ref_row.get('category name')

        # If we found an exact amount match, use it
        if best_match is not None:
            return best_match, best_category

        # Otherwise, just use the first exact match
        first_match = exact_matches.iloc[0]
        return first_match['title'], first_match.get('category name')

    # Strategy 2: String similarity match (for UPI transactions and cleaned titles)
    if clean_title and clean_title != statement_title:
        # Try to find similar titles
        best_match = None
        best_category = None
        best_similarity = 0.4  # Minimum similarity threshold

        for _, ref_row in valid_ref_df.iterrows():
            ref_title = str(ref_row['title']).strip(
            ).lower() if pd.notna(ref_row['title']) else ''

            similarity = SequenceMatcher(
                None, clean_title.lower(), ref_title).ratio()

            if similarity > best_similarity:
                best_similarity = similarity
                best_match = ref_row['title']
                best_category = ref_row.get('category name')

        if best_match is not None:
            return best_match, best_category

    # No good match found
    return None, None


def create_merchant_mappings():
    """Create merchant mappings from statement files matched with input.csv"""

    # Load reference data
    reference_df = load_reference_data()
    if reference_df is None:
        return False

    # Load all statements
    statements = load_all_statements()
    if not statements:
        print("✗ No statement data found")
        return False

        # Connect to database
    try:
        conn = sqlite3.connect('./finance_tracker.db')
        cursor = conn.cursor()

        # Load categories for ID lookup
        cursor.execute("SELECT id, name FROM categories")
        category_map = {name.lower(): id for id, name in cursor.fetchall()}
        print(f"✓ Loaded {len(category_map)} categories for mapping")

        # Truncate merchant_mappings table
        print("\nTruncating merchant_mappings table...")
        cursor.execute("DELETE FROM merchant_mappings")
        conn.commit()

        # Create mappings
        print(f"\nCreating merchant mappings...")
        matched_count = 0
        unmatched_count = 0

        # Use a set to avoid duplicates
        processed = set()

        for stmt in statements:
            # Create a unique key
            key = f"{stmt['amount']}_{stmt['statement_title']}"
            if key in processed:
                continue
            processed.add(key)

            statement_title = stmt['statement_title']
            clean_title = stmt['clean_title']
            amount = stmt['amount']

            # Find best match in input.csv
            mapped_result = find_best_match(
                statement_title, clean_title, amount, reference_df)
            mapped_title, category_name = mapped_result if mapped_result else (
                None, None)

            category_id = None
            if category_name and str(category_name).lower() in category_map:
                category_id = category_map[str(category_name).lower()]

            if mapped_title:
                matched_count += 1
                mapped_title_display = mapped_title
            else:
                unmatched_count += 1
                # Use clean title if no match found
                mapped_title_display = clean_title

            # Insert into database
            cursor.execute("""
                INSERT INTO merchant_mappings 
                (user_id, amount, statement_title, clean_title, mapped_title, category_id, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            """, (1, amount, statement_title, clean_title, mapped_title_display, category_id, datetime.utcnow().isoformat()))

        conn.commit()

        # Show statistics
        cursor.execute("SELECT COUNT(*) FROM merchant_mappings")
        total = cursor.fetchone()[0]

        print(f"\n✓ Merchant mappings created:")
        print(f"  - Total: {total}")
        print(f"  - Matched with input.csv: {matched_count}")
        print(f"  - Using fallback (clean) titles: {unmatched_count}")

        # Show sample mappings
        cursor.execute("""
            SELECT amount, statement_title, mapped_title 
            FROM merchant_mappings 
            LIMIT 10
        """)

        print(f"\nSample mappings:")
        for row in cursor.fetchall():
            print(f"  Amount: {row[0]}, Statement: '{row[1]}' → '{row[2]}'")

        conn.close()
        return True

    except Exception as e:
        print(f"✗ Error creating mappings: {e}")
        import traceback
        traceback.print_exc()
        return False


if __name__ == "__main__":
    print("=" * 60)
    print("Intelligent Merchant Mapping Generator")
    print("=" * 60)

    success = create_merchant_mappings()

    if success:
        print("\n" + "=" * 60)
        print("✓ Merchant mappings regenerated successfully!")
        print("=" * 60)
    else:
        print("\n✗ Failed to create merchant mappings")
        exit(1)
