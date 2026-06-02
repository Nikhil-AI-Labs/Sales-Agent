import { getDatabase } from "./database";

export type PricingInput = {
  sizeInches: number;
  grammage: number;
  quality: string;
  color: string;
  lamination: string;
  quantityKg: number;
};

export type PricingResult = {
  basePrice: number;
  sizePremium: number;
  grammageAdjustment: number;
  colorPremium: number;
  laminationPremium: number;
  unitPrice: number;
  totalAmount: number;
};

export function calculatePrice(input: PricingInput): PricingResult {
  const db = getDatabase();
  
  // Get current base price for 3.0g
  const priceConfig = db
    .prepare("SELECT base_price_3g FROM price_config ORDER BY effective_date DESC LIMIT 1")
    .get() as { base_price_3g: number } | undefined;
  
  if (!priceConfig) {
    throw new Error("No base price configured");
  }
  
  const basePrice = priceConfig.base_price_3g;
  
  // Calculate size premium
  let sizePremium = 0;
  if (input.sizeInches === 19) {
    sizePremium = 1;
  } else if (input.sizeInches === 16 || input.sizeInches === 17) {
    sizePremium = 10;
  } else if (input.sizeInches >= 12 && input.sizeInches <= 15) {
    sizePremium = 15;
  }
  
  // Calculate grammage adjustment
  let grammageAdjustment = 0;
  if (input.grammage >= 3.0 && input.grammage < 4.0) {
    grammageAdjustment = 0; // 3.0-3.75g: base price
  } else if (input.grammage >= 4.0 && input.grammage < 5.0) {
    grammageAdjustment = -1; // 4.0-4.75g: base - 1
  } else if (input.grammage >= 5.0 && input.grammage < 6.0) {
    grammageAdjustment = -2; // 5.0-5.75g: base - 2
  }
  
  // Calculate color premium
  let colorPremium = 0;
  const colorLower = input.color.toLowerCase().replace(/_/g, ' ');
  if (colorLower.includes("half") || colorLower.includes("checkered") || colorLower.includes("colour") || colorLower.includes("color")) {
    if (colorLower.includes("full")) {
      colorPremium = 7; // Full colored
    } else {
      colorPremium = 5; // Half-white/half-colored/checkered
    }
  }
  
  // Calculate lamination premium
  let laminationPremium = 0;
  const laminationLower = input.lamination.toLowerCase();
  if (laminationLower.includes("natural")) {
    laminationPremium = 5;
  } else if (laminationLower.includes("regular") || laminationLower === "laminated") {
    laminationPremium = 2;
  }
  
  // Calculate final prices
  const unitPrice = basePrice + sizePremium + grammageAdjustment + colorPremium + laminationPremium;
  const totalAmount = unitPrice * input.quantityKg;
  
  return {
    basePrice,
    sizePremium,
    grammageAdjustment,
    colorPremium,
    laminationPremium,
    unitPrice,
    totalAmount,
  };
}

export function saveQuote(enquiryId: string, customerId: string, pricing: PricingResult): string {
  const db = getDatabase();
  const quoteId = crypto.randomUUID();
  
  db.prepare(`
    INSERT INTO quotes (
      id, enquiry_id, customer_id, base_price, size_premium, 
      color_premium, lamination_premium, grammage_adjustment,
      unit_price, total_amount
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    quoteId,
    enquiryId,
    customerId,
    pricing.basePrice,
    pricing.sizePremium,
    pricing.colorPremium,
    pricing.laminationPremium,
    pricing.grammageAdjustment,
    pricing.unitPrice,
    pricing.totalAmount
  );
  
  return quoteId;
}
