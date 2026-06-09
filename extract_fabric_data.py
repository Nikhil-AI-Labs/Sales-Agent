import pandas as pd
import json

# Read all sheets from the Excel file
excel_file = 'fabric report.xlsx'
xls = pd.ExcelFile(excel_file)

print("Sheet names:", xls.sheet_names)
print("\n" + "="*80 + "\n")

# Store all data
all_fabric_data = []

for sheet_name in xls.sheet_names:
    print(f"Reading sheet: {sheet_name}")
    df = pd.read_excel(excel_file, sheet_name=sheet_name)
    print(f"Shape: {df.shape}")
    print(f"Columns: {list(df.columns)}")
    print(f"\nFirst few rows:")
    print(df.head(10))
    print("\n" + "="*80 + "\n")
    
    # Convert to JSON for inspection
    sheet_data = df.to_dict('records')
    all_fabric_data.append({
        'sheet_name': sheet_name,
        'data': sheet_data
    })

# Save to JSON for easy inspection
with open('fabric_data_extracted.json', 'w', encoding='utf-8') as f:
    json.dump(all_fabric_data, f, indent=2, ensure_ascii=False, default=str)

print("Data extracted to fabric_data_extracted.json")
