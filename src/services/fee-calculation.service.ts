import { SellerFees, FeeCalculation, TransactionType } from '../types';

export class FeeCalculationService {
  static calculateFee(
    amount: number,
    fees: SellerFees,
    transactionType: TransactionType
  ): FeeCalculation {
    const percentageFee =
      transactionType === 'cash_in'
        ? fees.cash_in_fee_percentage
        : fees.cash_out_fee_percentage;

    const fixedFee =
      transactionType === 'cash_in'
        ? fees.cash_in_fee_fixed
        : fees.cash_out_fee_fixed;

    let feeAmount = 0;

    if (fees.fee_type === 'percentage') {
      feeAmount = (amount * percentageFee) / 100;
    } else if (fees.fee_type === 'fixed') {
      feeAmount = fixedFee;
    } else if (fees.fee_type === 'mixed') {
      feeAmount = (amount * percentageFee) / 100 + fixedFee;
    }

    if (fees.min_fee && feeAmount < fees.min_fee) {
      feeAmount = fees.min_fee;
    }

    if (fees.max_fee && feeAmount > fees.max_fee) {
      feeAmount = fees.max_fee;
    }

    feeAmount = Math.round(feeAmount * 100) / 100;

    const netAmount = amount - feeAmount;
    const effectiveFeePercentage = (feeAmount / amount) * 100;

    return {
      amount,
      fee_amount: feeAmount,
      net_amount: Math.max(0, netAmount),
      fee_percentage: Math.round(effectiveFeePercentage * 100) / 100,
    };
  }

  static previewFee(
    amount: number,
    fees: SellerFees,
    transactionType: TransactionType
  ): FeeCalculation {
    return this.calculateFee(amount, fees, transactionType);
  }

  static validateSufficientBalance(
    balance: number,
    amount: number,
    feeAmount: number
  ): boolean {
    return balance >= amount + feeAmount;
  }

  static getTotalDeduction(amount: number, feeAmount: number): number {
    return amount + feeAmount;
  }
}
