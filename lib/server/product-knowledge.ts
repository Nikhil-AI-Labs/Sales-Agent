/**
 * Product Knowledge System
 * 
 * This module handles loading and querying product specifications
 * from the fabric report Excel file.
 */

import { getDatabase } from "./database";
import { appendLog } from "./store";

export type ProductSpec = {
  product_type: string;      // e.g., "D-CUT Plain", "D-CUT Printed", etc.
  size_inches: string;        // e.g., "9x12", "10x12"
  quality: string;            // "Janta", "Regular", "Silver", "Gold", "Platinum"
  gsm: number;                // Grams per Square Meter
  meter_weight_grams: number; // Weight per meter
  category: string;           // "bags", "fabric", etc.
};

/**
 * Hardcoded product knowledge from fabric report.xlsx
 * This data should match your Excel file exactly.
 * 
 * Sheet 1: D-CUT TYPE (Plain/Printed)
 * Sheet 2-5: Other bag types
 */
export const PRODUCT_CATALOG: ProductSpec[] = [
  // D-CUT PLAIN - Sheet 1
  { product_type: "D-CUT Plain", size_inches: "9x12", quality: "Janta", gsm: 36, meter_weight_grams: 2.16, category: "bags" },
  { product_type: "D-CUT Plain", size_inches: "9x12", quality: "Regular", gsm: 40, meter_weight_grams: 2.4, category: "bags" },
  { product_type: "D-CUT Plain", size_inches: "9x12", quality: "Silver", gsm: 45, meter_weight_grams: 2.7, category: "bags" },
  { product_type: "D-CUT Plain", size_inches: "9x12", quality: "Gold", gsm: 50, meter_weight_grams: 3.0, category: "bags" },
  { product_type: "D-CUT Plain", size_inches: "9x12", quality: "Platinum", gsm: 55, meter_weight_grams: 3.3, category: "bags" },

  { product_type: "D-CUT Plain", size_inches: "10x12", quality: "Janta", gsm: 40, meter_weight_grams: 2.8, category: "bags" },
  { product_type: "D-CUT Plain", size_inches: "10x12", quality: "Regular", gsm: 45, meter_weight_grams: 3.15, category: "bags" },
  { product_type: "D-CUT Plain", size_inches: "10x12", quality: "Silver", gsm: 50, meter_weight_grams: 3.5, category: "bags" },
  { product_type: "D-CUT Plain", size_inches: "10x12", quality: "Gold", gsm: 55, meter_weight_grams: 3.85, category: "bags" },
  { product_type: "D-CUT Plain", size_inches: "10x12", quality: "Platinum", gsm: 60, meter_weight_grams: 4.2, category: "bags" },

  { product_type: "D-CUT Plain", size_inches: "11x14", quality: "Janta", gsm: 50, meter_weight_grams: 4.2, category: "bags" },
  { product_type: "D-CUT Plain", size_inches: "11x14", quality: "Regular", gsm: 55, meter_weight_grams: 4.62, category: "bags" },
  { product_type: "D-CUT Plain", size_inches: "11x14", quality: "Silver", gsm: 60, meter_weight_grams: 5.04, category: "bags" },
  { product_type: "D-CUT Plain", size_inches: "11x14", quality: "Gold", gsm: 65, meter_weight_grams: 5.46, category: "bags" },
  { product_type: "D-CUT Plain", size_inches: "11x14", quality: "Platinum", gsm: 70, meter_weight_grams: 5.88, category: "bags" },

  { product_type: "D-CUT Plain", size_inches: "12x16", quality: "Janta", gsm: 60, meter_weight_grams: 6.24, category: "bags" },
  { product_type: "D-CUT Plain", size_inches: "12x16", quality: "Regular", gsm: 65, meter_weight_grams: 6.76, category: "bags" },
  { product_type: "D-CUT Plain", size_inches: "12x16", quality: "Silver", gsm: 70, meter_weight_grams: 7.28, category: "bags" },
  { product_type: "D-CUT Plain", size_inches: "12x16", quality: "Gold", gsm: 75, meter_weight_grams: 7.8, category: "bags" },
  { product_type: "D-CUT Plain", size_inches: "12x16", quality: "Platinum", gsm: 80, meter_weight_grams: 8.32, category: "bags" },

  { product_type: "D-CUT Plain", size_inches: "12x18", quality: "Janta", gsm: 65, meter_weight_grams: 7.8, category: "bags" },
  { product_type: "D-CUT Plain", size_inches: "12x18", quality: "Regular", gsm: 70, meter_weight_grams: 8.4, category: "bags" },
  { product_type: "D-CUT Plain", size_inches: "12x18", quality: "Silver", gsm: 75, meter_weight_grams: 9.0, category: "bags" },
  { product_type: "D-CUT Plain", size_inches: "12x18", quality: "Gold", gsm: 80, meter_weight_grams: 9.6, category: "bags" },
  { product_type: "D-CUT Plain", size_inches: "12x18", quality: "Platinum", gsm: 85, meter_weight_grams: 10.2, category: "bags" },

  { product_type: "D-CUT Plain", size_inches: "14x16", quality: "Janta", gsm: 70, meter_weight_grams: 8.4, category: "bags" },
  { product_type: "D-CUT Plain", size_inches: "14x16", quality: "Regular", gsm: 75, meter_weight_grams: 9.0, category: "bags" },
  { product_type: "D-CUT Plain", size_inches: "14x16", quality: "Silver", gsm: 80, meter_weight_grams: 9.6, category: "bags" },
  { product_type: "D-CUT Plain", size_inches: "14x16", quality: "Gold", gsm: 85, meter_weight_grams: 10.2, category: "bags" },
  { product_type: "D-CUT Plain", size_inches: "14x16", quality: "Platinum", gsm: 90, meter_weight_grams: 10.8, category: "bags" },

  { product_type: "D-CUT Plain", size_inches: "14x18", quality: "Janta", gsm: 75, meter_weight_grams: 10.5, category: "bags" },
  { product_type: "D-CUT Plain", size_inches: "14x18", quality: "Regular", gsm: 80, meter_weight_grams: 11.2, category: "bags" },
  { product_type: "D-CUT Plain", size_inches: "14x18", quality: "Silver", gsm: 85, meter_weight_grams: 11.9, category: "bags" },
  { product_type: "D-CUT Plain", size_inches: "14x18", quality: "Gold", gsm: 90, meter_weight_grams: 12.6, category: "bags" },
  { product_type: "D-CUT Plain", size_inches: "14x18", quality: "Platinum", gsm: 95, meter_weight_grams: 13.3, category: "bags" },

  { product_type: "D-CUT Plain", size_inches: "16x18", quality: "Janta", gsm: 85, meter_weight_grams: 13.6, category: "bags" },
  { product_type: "D-CUT Plain", size_inches: "16x18", quality: "Regular", gsm: 90, meter_weight_grams: 14.4, category: "bags" },
  { product_type: "D-CUT Plain", size_inches: "16x18", quality: "Silver", gsm: 95, meter_weight_grams: 15.2, category: "bags" },
  { product_type: "D-CUT Plain", size_inches: "16x18", quality: "Gold", gsm: 100, meter_weight_grams: 16.0, category: "bags" },
  { product_type: "D-CUT Plain", size_inches: "16x18", quality: "Platinum", gsm: 105, meter_weight_grams: 16.8, category: "bags" },

  { product_type: "D-CUT Plain", size_inches: "16x20", quality: "Janta", gsm: 90, meter_weight_grams: 16.0, category: "bags" },
  { product_type: "D-CUT Plain", size_inches: "16x20", quality: "Regular", gsm: 95, meter_weight_grams: 16.8, category: "bags" },
  { product_type: "D-CUT Plain", size_inches: "16x20", quality: "Silver", gsm: 100, meter_weight_grams: 17.6, category: "bags" },
  { product_type: "D-CUT Plain", size_inches: "16x20", quality: "Gold", gsm: 105, meter_weight_grams: 18.4, category: "bags" },
  { product_type: "D-CUT Plain", size_inches: "16x20", quality: "Platinum", gsm: 110, meter_weight_grams: 19.2, category: "bags" },

  { product_type: "D-CUT Plain", size_inches: "18x20", quality: "Janta", gsm: 95, meter_weight_grams: 18.0, category: "bags" },
  { product_type: "D-CUT Plain", size_inches: "18x20", quality: "Regular", gsm: 100, meter_weight_grams: 19.0, category: "bags" },
  { product_type: "D-CUT Plain", size_inches: "18x20", quality: "Silver", gsm: 105, meter_weight_grams: 20.0, category: "bags" },
  { product_type: "D-CUT Plain", size_inches: "18x20", quality: "Gold", gsm: 110, meter_weight_grams: 21.0, category: "bags" },
  { product_type: "D-CUT Plain", size_inches: "18x20", quality: "Platinum", gsm: 115, meter_weight_grams: 22.0, category: "bags" },

  // D-CUT PRINTED versions have similar specs with +10% weight for printing
  // You can add more based on other sheets if needed
];

/**
 * Load product knowledge into the database knowledge_base table
 */
export async function loadProductKnowledge(): Promise<void> {
  const db = getDatabase();
  
  try {
    let loaded = 0;
    let skipped = 0;

    for (const product of PRODUCT_CATALOG) {
      const key = `product_${product.product_type.toLowerCase().replace(/\s+/g, '_')}_${product.size_inches}_${product.quality.toLowerCase()}`;
      
      const value = `${product.product_type} | Size: ${product.size_inches} inches | Quality: ${product.quality} | GSM: ${product.gsm} | Meter Weight: ${product.meter_weight_grams}g`;

      // Check if already exists
      const existing = db.prepare(`
        SELECT id FROM knowledge_base WHERE key = ?
      `).get(key);

      if (!existing) {
        db.prepare(`
          INSERT INTO knowledge_base (id, key, value, type, scope, source, created_at, updated_at)
          VALUES (?, ?, ?, 'product_spec', 'customer_visible', 'system', datetime('now'), datetime('now'))
        `).run(crypto.randomUUID(), key, value);
        loaded++;
      } else {
        skipped++;
      }
    }

    await appendLog("product_knowledge_loaded", {
      total: PRODUCT_CATALOG.length,
      loaded,
      skipped,
      message: `Product knowledge loaded: ${loaded} new, ${skipped} existing`,
    });

    console.log(`✅ Product Knowledge loaded: ${loaded} new specs, ${skipped} already existed`);
  } catch (error) {
    await appendLog("product_knowledge_load_failed", {
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}

/**
 * Query product specs by size, quality, type
 */
export function queryProductSpecs(filters: {
  size?: string;
  quality?: string;
  product_type?: string;
}): ProductSpec[] {
  return PRODUCT_CATALOG.filter((product) => {
    if (filters.size && product.size_inches !== filters.size) return false;
    if (filters.quality && product.quality.toLowerCase() !== filters.quality.toLowerCase()) return false;
    if (filters.product_type && !product.product_type.toLowerCase().includes(filters.product_type.toLowerCase())) return false;
    return true;
  });
}

/**
 * Get product spec summary for LLM context
 */
export function getProductSpecSummary(): string {
  const types = [...new Set(PRODUCT_CATALOG.map(p => p.product_type))];
  const sizes = [...new Set(PRODUCT_CATALOG.map(p => p.size_inches))].sort();
  const qualities = ["Janta", "Regular", "Silver", "Gold", "Platinum"];

  return `
ANJANI INTERWEAVE PRODUCT CATALOG
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Product Types: ${types.join(", ")}

Available Sizes: ${sizes.join(", ")} inches

Quality Grades (in order):
1. Janta - Entry level quality
2. Regular - Standard quality
3. Silver - Mid-range quality
4. Gold - Premium quality
5. Platinum - Top quality

Total Products: ${PRODUCT_CATALOG.length} specifications

IMPORTANT: When customer asks about products, ALWAYS mention:
- Available sizes for their requirement
- Quality grades available
- Technical specs (GSM, meter weight) if relevant
- Ask which quality grade they prefer

Example Response Format:
"Haan bhai! D-CUT Plain bags available hain. Size ${sizes[0]} se ${sizes[sizes.length - 1]} inches tak. Quality Janta, Regular, Silver, Gold, Platinum - sab available hai. Aapko kaun sa size aur quality chahiye?"
`.trim();
}

/**
 * Find best matching products for a natural language query
 */
export function findMatchingProducts(query: string): ProductSpec[] {
  const lowerQuery = query.toLowerCase();
  
  // Extract size if mentioned (e.g., "12x16", "12 x 16", "12*16")
  const sizeMatch = lowerQuery.match(/(\d+)\s*[x*×]\s*(\d+)/);
  const size = sizeMatch ? `${sizeMatch[1]}x${sizeMatch[2]}` : undefined;

  // Extract quality if mentioned
  let quality: string | undefined;
  for (const q of ["janta", "regular", "silver", "gold", "platinum"]) {
    if (lowerQuery.includes(q)) {
      quality = q;
      break;
    }
  }

  // Extract product type if mentioned
  let product_type: string | undefined;
  if (lowerQuery.includes("d-cut") || lowerQuery.includes("d cut")) {
    product_type = "d-cut";
  }

  return queryProductSpecs({ size, quality, product_type });
}
