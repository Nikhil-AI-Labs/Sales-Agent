import pandas as pd
import json

# Read all sheets from the Excel file
excel_file = 'fabric report.xlsx'
xls = pd.ExcelFile(excel_file)

# Store all fabric specifications
fabric_catalog = []

# Quality grades with their strength ranges
quality_info = {
    'JANTA': {'strength': '28-25', 'pp_percent': 45, 'filler_percent': 55},
    'REGULAR': {'strength': '30-35', 'pp_percent': 50, 'filler_percent': 50},
    'SILVER': {'strength': '38-40', 'pp_percent': 55, 'filler_percent': 45},
    'GOLD': {'strength': '50-55', 'pp_percent': 65, 'filler_percent': 35},
    'PLATINUM': {'strength': '57-61', 'pp_percent': 75, 'filler_percent': 25}
}

# Grammage to denier mapping
grammage_to_denier = {
    3.0: 640,
    3.5: 747,
    4.0: 854,
    4.5: 960,
    5.0: 1067
}

for sheet_name in xls.sheet_names:
    print(f"\nProcessing {sheet_name}...")
    df = pd.read_excel(excel_file, sheet_name=sheet_name)
    
    # Skip first 2 rows (headers)
    data_rows = df.iloc[2:]
    
    for _, row in data_rows.iterrows():
        # Extract data from columns
        size = row['Unnamed: 0']
        grammage_str = row['Unnamed: 1']
        strength = row['Unnamed: 2']
        elongation = row['Unnamed: 3']
        meter_weight_ul = row['Unnamed: 4']  # Unlaminated
        meter_weight_lam = row['Unnamed: 5']  # Laminated
        # Some sheets don't have 'Unnamed: 6' column
        denier_str = row.get('Unnamed: 6', '')
        
        # Skip if size is NaN or not a number
        if pd.isna(size) or not isinstance(size, (int, float)):
            continue
        
        # Parse grammage
        if pd.isna(grammage_str):
            continue
        
        grammage = None
        if isinstance(grammage_str, str):
            if 'gram' in grammage_str.lower():
                try:
                    grammage = float(grammage_str.lower().replace('gram', '').strip())
                except:
                    continue
        
        if grammage is None:
            continue
        
        # Get denier
        denier = grammage_to_denier.get(grammage, 0)
        
        # Skip if meter weights are missing
        if pd.isna(meter_weight_ul) or pd.isna(meter_weight_lam):
            continue
        
        # Create fabric entry
        fabric_entry = {
            'size_inches': str(int(size)),
            'grammage_gpm': grammage,
            'denier': denier,
            'quality': sheet_name.capitalize(),
            'strength': str(strength) if not pd.isna(strength) else '',
            'elongation': str(elongation) if not pd.isna(elongation) else '',
            'meter_weight_unlaminated': float(meter_weight_ul),
            'meter_weight_laminated': float(meter_weight_lam),
            'pp_percent': quality_info[sheet_name]['pp_percent'],
            'filler_percent': quality_info[sheet_name]['filler_percent']
        }
        
        fabric_catalog.append(fabric_entry)
        print(f"  Added: {fabric_entry['size_inches']}\" {fabric_entry['grammage_gpm']}g {fabric_entry['quality']}")

# Save to JSON
with open('fabric_catalog_parsed.json', 'w', encoding='utf-8') as f:
    json.dump(fabric_catalog, f, indent=2, ensure_ascii=False)

print(f"\n✅ Total fabric specifications extracted: {len(fabric_catalog)}")
print(f"✅ Data saved to fabric_catalog_parsed.json")

# Generate TypeScript array
print("\n" + "="*80)
print("Generating TypeScript code...")
print("="*80 + "\n")

ts_code = "export const FABRIC_CATALOG: FabricSpec[] = [\n"
for entry in fabric_catalog:
    ts_code += "  {\n"
    ts_code += f"    size_inches: \"{entry['size_inches']}\",\n"
    ts_code += f"    grammage_gpm: {entry['grammage_gpm']},\n"
    ts_code += f"    denier: {entry['denier']},\n"
    ts_code += f"    quality: \"{entry['quality']}\",\n"
    ts_code += f"    strength: \"{entry['strength']}\",\n"
    ts_code += f"    elongation: \"{entry['elongation']}\",\n"
    ts_code += f"    meter_weight_unlaminated: {entry['meter_weight_unlaminated']},\n"
    ts_code += f"    meter_weight_laminated: {entry['meter_weight_laminated']},\n"
    ts_code += f"    pp_percent: {entry['pp_percent']},\n"
    ts_code += f"    filler_percent: {entry['filler_percent']},\n"
    ts_code += "    category: \"fabric_roll\",\n"
    ts_code += "  },\n"
ts_code += "];\n"

with open('fabric_catalog_typescript.txt', 'w', encoding='utf-8') as f:
    f.write(ts_code)

print("✅ TypeScript code saved to fabric_catalog_typescript.txt")
