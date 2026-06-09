/**
 * Script to load product knowledge into the database
 * 
 * Run this once to populate the knowledge base with product specs
 * from fabric report.xlsx
 * 
 * Usage: npx tsx scripts/load-product-knowledge.ts
 */

import { loadProductKnowledge } from "../lib/server/product-knowledge";

async function main() {
  console.log("🔄 Loading product knowledge from fabric report data...\n");
  
  try {
    await loadProductKnowledge();
    console.log("\n✅ Product knowledge loaded successfully!");
    console.log("📊 The knowledge base now contains detailed product specifications.");
    console.log("🤖 Ravi AI can now answer customer questions about:");
    console.log("   - Available sizes");
    console.log("   - Quality grades");
    console.log("   - GSM specifications");
    console.log("   - Meter weight data");
    process.exit(0);
  } catch (error) {
    console.error("\n❌ Failed to load product knowledge:");
    console.error(error);
    process.exit(1);
  }
}

main();
