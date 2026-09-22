/**
 * Financial Calculation Engine
 * Strictly obeys accounting ledger rules and user PRD requirements:
 * 1. Income increases balance.
 * 2. Expense decreases balance.
 * 3. Money Lent decreases available balance, does NOT count as Expense.
 * 4. Money Borrowed increases available balance, does NOT count as Income.
 * 5. Receivable repayment increases balance, does NOT count as Income.
 * 6. Payable repayment decreases balance, does NOT count as Expense.
 * 7. Monthly Savings = Monthly Income - Monthly Expense.
 */

import { Account, Transaction, DebtRecord, DebtPaymentHistory, FinancialSummary } from '../types';

/**
 * Computes exact balance of an individual account by summing all factors:
 * - Opening balance
 * + Incomes into this account
 * - Expenses out of this account
 * + Borrowed funds received into this account
 * - Lent funds given out from this account
 * + Receivable repayments received into this account (people returning money lent)
 * - Payable repayments paid out of this account (repaying borrowed money)
 * + Transfers in
 * - Transfers out
 * - Transfer fees
 */
export function calculateAccountBalance(
  account: Account,
  transactions: Transaction[],
  debts: DebtRecord[],
  debtPayments: DebtPaymentHistory[]
): number {
  if (!account) return 0;
  const accountId = account.id;
  const rawOpening = (account as any).opening_balance_poisha ?? (account as any).balance ?? 0;
  let balance = typeof rawOpening === 'number' && !isNaN(rawOpening) ? rawOpening : (parseFloat(rawOpening) || 0);

  // 1. Transactions (Income, Expense, Transfer)
  for (const tx of transactions) {
    const rawTxAmount = (tx as any).amount_poisha ?? (tx as any).amount ?? 0;
    const txAmount = typeof rawTxAmount === 'number' && !isNaN(rawTxAmount) ? rawTxAmount : (parseFloat(rawTxAmount) || 0);
    const rawFee = (tx as any).transfer_fee_poisha ?? (tx as any).fee ?? 0;
    const txFee = typeof rawFee === 'number' && !isNaN(rawFee) ? rawFee : (parseFloat(rawFee) || 0);

    // Fallback: If account_id was omitted or empty, attribute to acc-cash
    const effectiveTxAccountId = tx.account_id && tx.account_id !== 'default' ? tx.account_id : 'acc-cash';

    if (tx.type === 'INCOME' && effectiveTxAccountId === accountId) {
      balance += txAmount;
    } else if (tx.type === 'EXPENSE' && effectiveTxAccountId === accountId) {
      balance -= txAmount;
    } else if (tx.type === 'TRANSFER') {
      if (effectiveTxAccountId === accountId) {
        // Transferred OUT + fee deducted from source
        balance -= (txAmount + txFee);
      }
      if (tx.to_account_id === accountId) {
        // Transferred IN
        balance += txAmount;
      }
    }
  }

  // 2. Initial Debt Disbursals / Receipts
  for (const debt of debts) {
    const effectiveDebtAccountId = debt.account_id && debt.account_id !== 'default' ? debt.account_id : 'acc-cash';
    if (effectiveDebtAccountId === accountId) {
      const rawDebtAmount = (debt as any).initial_amount_poisha ?? (debt as any).amount_poisha ?? (debt as any).amount ?? 0;
      const debtAmount = typeof rawDebtAmount === 'number' && !isNaN(rawDebtAmount) ? rawDebtAmount : (parseFloat(rawDebtAmount) || 0);

      if (debt.type === 'LENT') {
        // Money lent out to someone: Cash physically decreased
        balance -= debtAmount;
      } else if (debt.type === 'BORROWED') {
        // Money borrowed from someone: Cash physically increased
        balance += debtAmount;
      }
    }
  }

  // 3. Debt Repayments (Partial or Full)
  // Create quick lookup for debt type
  const debtTypeMap = new Map<string, 'LENT' | 'BORROWED'>();
  for (const d of debts) {
    debtTypeMap.set(d.id, d.type);
  }

  for (const payment of debtPayments) {
    const effectivePayAccountId = payment.account_id && payment.account_id !== 'default' ? payment.account_id : 'acc-cash';
    if (effectivePayAccountId === accountId) {
      const rawPayAmount = (payment as any).amount_poisha ?? (payment as any).amount ?? 0;
      const paymentAmount = typeof rawPayAmount === 'number' && !isNaN(rawPayAmount) ? rawPayAmount : (parseFloat(rawPayAmount) || 0);
      const parentType = debtTypeMap.get(payment.debt_id);
      if (parentType === 'LENT') {
        // Money was lent out previously, now borrower is returning it -> Cash increases
        balance += paymentAmount;
      } else if (parentType === 'BORROWED') {
        // Money was borrowed previously, now user is paying it back -> Cash decreases
        balance -= paymentAmount;
      }
    }
  }

  return isNaN(balance) || !isFinite(balance) ? 0 : balance;
}

/**
 * Computes period summary & overall financial position
 * @param selectedMonth format YYYY-MM OR date range { start?: string, end?: string }
 */
export function calculateFinancialSummary(
  accounts: Account[],
  transactions: Transaction[],
  debts: DebtRecord[],
  debtPayments: DebtPaymentHistory[],
  period: string | { start?: string; end?: string; label?: string }
): FinancialSummary {
  // 1. Total Liquid Balance across active accounts
  let totalLiquidBalancePoisha = 0;
  for (const acc of accounts) {
    if (acc.is_active !== false) {
      const accBal = calculateAccountBalance(acc, transactions, debts, debtPayments);
      totalLiquidBalancePoisha += (isNaN(accBal) || !isFinite(accBal) ? 0 : accBal);
    }
  }

  // 2. Period Income, Expense and Savings
  let monthlyIncomePoisha = 0;
  let monthlyExpensePoisha = 0;

  const isMatchingPeriod = (txDate: string): boolean => {
    if (typeof period === 'string') {
      return txDate.startsWith(period);
    }
    if (period.start && txDate < period.start) return false;
    if (period.end && txDate > period.end) return false;
    return true;
  };

  for (const tx of transactions) {
    if (isMatchingPeriod(tx.date)) {
      const rawTxAmount = (tx as any).amount_poisha ?? (tx as any).amount ?? 0;
      const txAmount = typeof rawTxAmount === 'number' && !isNaN(rawTxAmount) ? rawTxAmount : (parseFloat(rawTxAmount) || 0);
      const rawFee = (tx as any).transfer_fee_poisha ?? (tx as any).fee ?? 0;
      const txFee = typeof rawFee === 'number' && !isNaN(rawFee) ? rawFee : (parseFloat(rawFee) || 0);

      if (tx.type === 'INCOME') {
        monthlyIncomePoisha += txAmount;
      } else if (tx.type === 'EXPENSE') {
        monthlyExpensePoisha += txAmount;
      } else if (tx.type === 'TRANSFER' && txFee > 0) {
        // Transfer fees count toward expenses
        monthlyExpensePoisha += txFee;
      }
    }
  }

  // Strict Rule: Period Savings = Period Income - Period Expense
  const monthlySavingsPoisha = monthlyIncomePoisha - monthlyExpensePoisha;

  // 3. Outstanding Receivables & Payables
  // Map payments by debt_id
  const totalPaidByDebt = new Map<string, number>();
  for (const p of debtPayments) {
    const rawPayAmount = (p as any).amount_poisha ?? (p as any).amount ?? 0;
    const paymentAmount = typeof rawPayAmount === 'number' && !isNaN(rawPayAmount) ? rawPayAmount : (parseFloat(rawPayAmount) || 0);
    const current = totalPaidByDebt.get(p.debt_id) || 0;
    totalPaidByDebt.set(p.debt_id, current + paymentAmount);
  }

  let totalReceivablesPoisha = 0; // মোট পাওনা (Lent)
  let totalPayablesPoisha = 0; // মোট দেনা (Borrowed)

  for (const debt of debts) {
    const paid = totalPaidByDebt.get(debt.id) || 0;
    const rawDebtAmount = (debt as any).initial_amount_poisha ?? (debt as any).amount_poisha ?? (debt as any).amount ?? 0;
    const debtAmount = typeof rawDebtAmount === 'number' && !isNaN(rawDebtAmount) ? rawDebtAmount : (parseFloat(rawDebtAmount) || 0);
    const remaining = Math.max(0, debtAmount - paid);

    if (debt.type === 'LENT') {
      totalReceivablesPoisha += remaining;
    } else if (debt.type === 'BORROWED') {
      totalPayablesPoisha += remaining;
    }
  }

  // True Net Worth = Total Liquid Cash + Total Receivables - Total Payables
  const safeLiquid = isNaN(totalLiquidBalancePoisha) || !isFinite(totalLiquidBalancePoisha) ? 0 : totalLiquidBalancePoisha;
  const safeReceivables = isNaN(totalReceivablesPoisha) || !isFinite(totalReceivablesPoisha) ? 0 : totalReceivablesPoisha;
  const safePayables = isNaN(totalPayablesPoisha) || !isFinite(totalPayablesPoisha) ? 0 : totalPayablesPoisha;
  const trueNetWorthPoisha = safeLiquid + safeReceivables - safePayables;

  return {
    totalLiquidBalancePoisha: safeLiquid,
    monthlyIncomePoisha: isNaN(monthlyIncomePoisha) || !isFinite(monthlyIncomePoisha) ? 0 : monthlyIncomePoisha,
    monthlyExpensePoisha: isNaN(monthlyExpensePoisha) || !isFinite(monthlyExpensePoisha) ? 0 : monthlyExpensePoisha,
    monthlySavingsPoisha: isNaN(monthlySavingsPoisha) || !isFinite(monthlySavingsPoisha) ? 0 : monthlySavingsPoisha,
    totalReceivablesPoisha: safeReceivables,
    totalPayablesPoisha: safePayables,
    trueNetWorthPoisha: isNaN(trueNetWorthPoisha) || !isFinite(trueNetWorthPoisha) ? 0 : trueNetWorthPoisha,
    periodLabel: typeof period === 'object' ? period.label : undefined,
  };
}

