import pandas as pd
import os

input_dir = "../input_data"
excel_files = [f for f in os.listdir(input_dir) if f.endswith(('.xls', '.xlsx')) and not f.startswith('~')]

print(f"Analyzing {len(excel_files)} statement files:\n")

for file in sorted(excel_files):
    file_path = os.path.join(input_dir, file)
    try:
        df = pd.read_excel(file_path, sheet_name=0)
        print(f"📄 {file}")
        print(f"   Shape: {df.shape}")
        print(f"   Columns: {list(df.columns)[:6]}")
        
        # Find first non-empty row
        for idx, row in df.iterrows():
            if row.notna().any():
                print(f"   First data row {idx}: {row.iloc[:3].values}")
                break
        print()
    except Exception as e:
        print(f"❌ {file}: {str(e)[:50]}\n")
