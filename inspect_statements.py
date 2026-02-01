import pandas as pd
import os

input_dir = "input_data"

for file in os.listdir(input_dir):
    if file.endswith(('.xls', '.xlsx')) and not file.startswith('~'):
        filepath = os.path.join(input_dir, file)
        print(f"\n{'='*60}")
        print(f"File: {file}")
        print(f"{'='*60}")
        
        try:
            df = pd.read_excel(filepath)
            print(f"Columns: {list(df.columns)}")
            print(f"\nFirst 2 rows:")
            print(df.head(2))
        except Exception as e:
            print(f"Error: {e}")
