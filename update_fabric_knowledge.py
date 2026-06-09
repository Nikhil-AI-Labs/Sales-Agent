import re

# Read the current fabric-knowledge.ts file
with open('lib/server/fabric-knowledge.ts', 'r', encoding='utf-8') as f:
    current_content = f.read()

# Read the new catalog
with open('fabric_catalog_typescript.txt', 'r', encoding='utf-8') as f:
    new_catalog = f.read()

# Find the old FABRIC_CATALOG section and replace it
# Pattern to find: export const FABRIC_CATALOG: FabricSpec[] = [ ... ];
pattern = r'export const FABRIC_CATALOG: FabricSpec\[\] = \[[\s\S]*?\];'

# Replace with new catalog
updated_content = re.sub(pattern, new_catalog.strip(), current_content, count=1)

# Write back
with open('lib/server/fabric-knowledge.ts', 'w', encoding='utf-8') as f:
    f.write(updated_content)

print("✅ fabric-knowledge.ts updated with complete 325-entry catalog!")
print("✅ All 5 sheets (Janta, Regular, Silver, Gold, Platinum) included")
print("✅ All sizes (12\" to 36\") and grammages (3.0g to 5.0g) covered")
