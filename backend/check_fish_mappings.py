import sqlite3

conn = sqlite3.connect("finance_tracker.db")
cur = conn.cursor()

# Check Fish mappings
cur.execute("SELECT amount, statement_title, mapped_title FROM merchant_mappings WHERE mapped_title = 'Fish' LIMIT 5")
rows = cur.fetchall()
print(f"Found {len(rows)} Fish mappings")
for r in rows:
    print(f"{r[0]:>10.1f}: {r[1][:50]:50s} -> {r[2]}")

# Check some more successful mappings
print("\n\nOther successful mappings:")
cur.execute("SELECT COUNT(*) FROM merchant_mappings WHERE mapped_title != statement_title")
count = cur.fetchone()[0]
print(f"Total successful mappings: {count}")

# Show some examples
cur.execute("SELECT amount, statement_title, mapped_title FROM merchant_mappings WHERE mapped_title != statement_title LIMIT 10 OFFSET 100")
rows = cur.fetchall()
for r in rows:
    print(f"{r[0]:>10.1f}: {r[1][:40]:40s} -> {r[2]}")

conn.close()
