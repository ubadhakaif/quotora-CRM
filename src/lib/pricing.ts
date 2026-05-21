/**
 * Quotora Core Vehicle Pricing Utility
 * Standardizes ex-showroom base price calculations, statutory taxes (GST, RTO, Insurance, TCS),
 * and discount threshold validation against dealer policy configurations.
 */

export interface PricingBreakdown {
  exShowroom: number;
  gst: number;         // 28% GST
  rto: number;         // 10% RTO Road Tax
  insurance: number;   // 3% Comprehensive Insurance
  tcs: number;         // 1% TCS (if base price > 10,000,000 INR or 1,000,000 INR)
  accessoriesTotal: number;
  subtotal: number;    // Base + Taxes + Accessories
  discountAmount: number;
  discountPercent: number;
  finalOnRoad: number; // Subtotal - Discount
}

/**
 * Calculates a complete on-road price breakdown for a vehicle
 */
export function calculateOnRoadPrice(
  exShowroomPrice: number,
  accessoriesPrice: number = 0,
  discountAmt: number = 0,
  discountPct: number = 0
): PricingBreakdown {
  const base = Math.max(0, exShowroomPrice);
  const accs = Math.max(0, accessoriesPrice);

  // Statutory Calculations
  const gst = Math.round(base * 0.28);
  const rto = Math.round(base * 0.10);
  const insurance = Math.round(base * 0.03);
  
  // 1% TCS applicable on ex-showroom values exceeding 1,000,000 INR
  const tcs = base > 1000000 ? Math.round(base * 0.01) : 0;

  const subtotal = base + gst + rto + insurance + tcs + accs;

  // Compute discounts
  let computedDiscountAmt = Math.round(discountAmt);
  let computedDiscountPct = discountPct;

  if (discountPct > 0) {
    computedDiscountAmt = Math.round((subtotal * discountPct) / 100);
  } else if (discountAmt > 0 && subtotal > 0) {
    computedDiscountPct = parseFloat(((discountAmt / subtotal) * 100).toFixed(2));
  }

  // Ensure discount doesn't exceed total cost
  computedDiscountAmt = Math.min(subtotal, computedDiscountAmt);

  const finalOnRoad = Math.max(0, subtotal - computedDiscountAmt);

  return {
    exShowroom: base,
    gst,
    rto,
    insurance,
    tcs,
    accessoriesTotal: accs,
    subtotal,
    discountAmount: computedDiscountAmt,
    discountPercent: computedDiscountPct,
    finalOnRoad,
  };
}

/**
 * Checks if a discount rate or amount violates the dealership's configured approval threshold
 * Returns true if a manager approval workflow is required.
 */
export function requiresManagerApproval(
  discountPercent: number,
  thresholdLimitPercent: number = 5
): boolean {
  return discountPercent > thresholdLimitPercent;
}

/**
 * Formats a numeric value into the Indian Rupee (INR) currency format
 */
export function formatINR(value: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0
  }).format(value);
}
