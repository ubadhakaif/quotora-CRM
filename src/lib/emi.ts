/**
 * Quotora EMI Financial Calculation Utility
 * Standardizes Equated Monthly Installment (EMI) algorithms, total payable interest,
 * down payment limits, processing fee computations, and comparison schedules.
 */

export interface EMIMetrics {
  loanAmount: number;
  monthlyRate: number;
  monthlyEMI: number;
  processingFee: number;
  totalInterest: number;
  totalPayable: number; // loanAmount + totalInterest + processingFee
}

export interface AmortizationRow {
  month: number;
  emi: number;
  principalPaid: number;
  interestPaid: number;
  remainingBalance: number;
}

/**
 * Calculates monthly EMI and financial breakdown metrics for a specific loan configuration
 */
export function calculateEMI(
  vehiclePrice: number,
  downPayment: number,
  interestRateAnnual: number,
  tenureMonths: number,
  processingFeePercent: number = 0
): EMIMetrics {
  const price = Math.max(0, vehiclePrice);
  const downPay = Math.min(price, Math.max(0, downPayment));
  const loanAmount = Math.max(0, price - downPay);
  
  const annualRate = Math.max(0, interestRateAnnual);
  const monthlyRate = annualRate / 12 / 100;
  
  const feePercent = Math.max(0, processingFeePercent);
  const processingFee = Math.round((loanAmount * feePercent) / 100);

  let monthlyEMI = 0;
  if (loanAmount > 0) {
    if (monthlyRate > 0) {
      monthlyEMI = Math.round(
        (loanAmount * monthlyRate * Math.pow(1 + monthlyRate, tenureMonths)) /
        (Math.pow(1 + monthlyRate, tenureMonths) - 1)
      );
    } else {
      monthlyEMI = Math.round(loanAmount / tenureMonths);
    }
  }

  const totalRepayment = monthlyEMI * tenureMonths;
  const totalInterest = Math.max(0, totalRepayment - loanAmount);
  const totalPayable = totalRepayment + processingFee;

  return {
    loanAmount,
    monthlyRate,
    monthlyEMI,
    processingFee,
    totalInterest,
    totalPayable,
  };
}

/**
 * Generates a full month-by-month loan amortization schedule
 */
export function generateAmortizationSchedule(
  loanAmount: number,
  interestRateAnnual: number,
  tenureMonths: number,
  monthlyEMI: number
): AmortizationRow[] {
  const schedule: AmortizationRow[] = [];
  const annualRate = Math.max(0, interestRateAnnual);
  const monthlyRate = annualRate / 12 / 100;
  
  let balance = loanAmount;

  for (let month = 1; month <= tenureMonths; month++) {
    if (balance <= 0) break;

    const interestPaid = Math.round(balance * monthlyRate);
    const principalPaid = Math.min(balance, Math.max(0, monthlyEMI - interestPaid));
    balance = Math.max(0, balance - principalPaid);

    schedule.push({
      month,
      emi: monthlyEMI,
      principalPaid,
      interestPaid,
      remainingBalance: balance,
    });
  }

  return schedule;
}

/**
 * Checks if the down payment meets the plan's minimum threshold requirement
 */
export function isDownPaymentSufficient(
  vehiclePrice: number,
  downPayment: number,
  minDownPaymentPercent: number
): { sufficient: boolean; minRequired: number } {
  const minRequired = Math.round((vehiclePrice * minDownPaymentPercent) / 100);
  return {
    sufficient: downPayment >= minRequired,
    minRequired,
  };
}
