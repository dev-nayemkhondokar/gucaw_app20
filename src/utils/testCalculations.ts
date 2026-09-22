import { Account, Transaction, DebtRecord, DebtPaymentHistory } from '../types';
import { calculateAccountBalance, calculateFinancialSummary } from './calculations';

/**
 * Automated Verification Test for Financial Calculations
 * Verifies all rules specified by the user:
 * 1. Income increases balance.
 * 2. Expense decreases balance.
 * 3. Money lent decreases available balance but does not increase expenses.
 * 4. Money borrowed increases available balance but does not increase income.
 * 5. Receivable repayment increases balance but does not count as income.
 * 6. Payable repayment decreases balance but does not count as expense.
 * 7. Monthly savings = income - expense.
 */
export function runFinancialIntegrityTests(): { success: boolean; results: string[] } {
  const results: string[] = [];

  const testAccount: Account = {
    id: 'test-acc-1',
    name: 'ক্যাশ টাকা',
    type: 'CASH',
    opening_balance_poisha: 1000000, // ১০,০০০ ৳
    is_active: true,
    color: '#10B981',
    created_at: Date.now(),
  };

  const initialBalance = calculateAccountBalance(testAccount, [], [], []);
  if (initialBalance === 1000000) {
    results.push('PASS: Opening balance correctly equals 10,000 ৳');
  } else {
    results.push(`FAIL: Opening balance was ${initialBalance}`);
  }

  // 1. Income test
  const incomeTx: Transaction = {
    id: 'tx-inc',
    type: 'INCOME',
    amount_poisha: 500000, // ৫,০০০ ৳
    account_id: testAccount.id,
    transfer_fee_poisha: 0,
    date: '2026-09-01',
    time: '10:00',
    created_at: Date.now(),
  };
  const balAfterIncome = calculateAccountBalance(testAccount, [incomeTx], [], []);
  if (balAfterIncome === 1500000) {
    results.push('PASS: Income increases balance (10,000 + 5,000 = 15,000 ৳)');
  } else {
    results.push(`FAIL: Balance after income was ${balAfterIncome}`);
  }

  // 2. Expense test
  const expenseTx: Transaction = {
    id: 'tx-exp',
    type: 'EXPENSE',
    amount_poisha: 200000, // ২,০০০ ৳
    account_id: testAccount.id,
    transfer_fee_poisha: 0,
    date: '2026-09-02',
    time: '12:00',
    created_at: Date.now(),
  };
  const balAfterExp = calculateAccountBalance(testAccount, [incomeTx, expenseTx], [], []);
  if (balAfterExp === 1300000) {
    results.push('PASS: Expense decreases balance (15,000 - 2,000 = 13,000 ৳)');
  } else {
    results.push(`FAIL: Balance after expense was ${balAfterExp}`);
  }

  // 3. Money Lent test (ধার দিলাম)
  const lentDebt: DebtRecord = {
    id: 'debt-lent',
    person_name: 'করিম',
    type: 'LENT',
    initial_amount_poisha: 300000, // ৩,০০০ ৳ ধার দিলাম
    account_id: testAccount.id,
    status: 'ACTIVE',
    date: '2026-09-03',
    created_at: Date.now(),
  };
  const balAfterLending = calculateAccountBalance(testAccount, [incomeTx, expenseTx], [lentDebt], []);
  if (balAfterLending === 1000000) {
    results.push('PASS: Money lent decreases available balance (13,000 - 3,000 = 10,000 ৳)');
  } else {
    results.push(`FAIL: Balance after lending was ${balAfterLending}`);
  }

  // Verify Money Lent is NOT in expenses
  const summaryLent = calculateFinancialSummary([testAccount], [incomeTx, expenseTx], [lentDebt], [], '2026-09');
  if (summaryLent.monthlyExpensePoisha === 200000) {
    results.push('PASS: Money lent is NOT counted as Expense (Expense remains 2,000 ৳)');
  } else {
    results.push(`FAIL: Monthly expense counted money lent as expense: ${summaryLent.monthlyExpensePoisha}`);
  }

  // 4. Money Borrowed test (ধার নিলাম)
  const borrowedDebt: DebtRecord = {
    id: 'debt-borrowed',
    person_name: 'সালাম',
    type: 'BORROWED',
    initial_amount_poisha: 400000, // ৪,০০০ ৳ ধার নিলাম
    account_id: testAccount.id,
    status: 'ACTIVE',
    date: '2026-09-04',
    created_at: Date.now(),
  };
  const balAfterBorrowing = calculateAccountBalance(testAccount, [incomeTx, expenseTx], [lentDebt, borrowedDebt], []);
  if (balAfterBorrowing === 1400000) {
    results.push('PASS: Money borrowed increases available balance (10,000 + 4,000 = 14,000 ৳)');
  } else {
    results.push(`FAIL: Balance after borrowing was ${balAfterBorrowing}`);
  }

  // Verify Money Borrowed is NOT in income
  const summaryBorrow = calculateFinancialSummary([testAccount], [incomeTx, expenseTx], [lentDebt, borrowedDebt], [], '2026-09');
  if (summaryBorrow.monthlyIncomePoisha === 500000) {
    results.push('PASS: Money borrowed is NOT counted as Income (Income remains 5,000 ৳)');
  } else {
    results.push(`FAIL: Monthly income counted borrowed funds: ${summaryBorrow.monthlyIncomePoisha}`);
  }

  // 5. Receivable repayment received (করিম ধার শোধ করল)
  const receivablePayment: DebtPaymentHistory = {
    id: 'dp-1',
    debt_id: lentDebt.id,
    amount_poisha: 100000, // ১,০০০ ৳ করিম ফেরত দিল
    account_id: testAccount.id,
    payment_date: '2026-09-05',
    created_at: Date.now(),
  };
  const balAfterReceivablePay = calculateAccountBalance(
    testAccount,
    [incomeTx, expenseTx],
    [lentDebt, borrowedDebt],
    [receivablePayment]
  );
  if (balAfterReceivablePay === 1500000) {
    results.push('PASS: Receivable repayment increases balance (14,000 + 1,000 = 15,000 ৳)');
  } else {
    results.push(`FAIL: Balance after receivable repayment was ${balAfterReceivablePay}`);
  }

  const summaryRecPay = calculateFinancialSummary(
    [testAccount],
    [incomeTx, expenseTx],
    [lentDebt, borrowedDebt],
    [receivablePayment],
    '2026-09'
  );
  if (summaryRecPay.monthlyIncomePoisha === 500000) {
    results.push('PASS: Receivable repayment is NOT counted as new Income (Income remains 5,000 ৳)');
  } else {
    results.push(`FAIL: Receivable repayment counted as income: ${summaryRecPay.monthlyIncomePoisha}`);
  }

  // 6. Payable repayment paid (সালামের ধার শোধ করলাম)
  const payablePayment: DebtPaymentHistory = {
    id: 'dp-2',
    debt_id: borrowedDebt.id,
    amount_poisha: 200000, // ২,০০০ ৳ সালামকে ফেরত দিলাম
    account_id: testAccount.id,
    payment_date: '2026-09-06',
    created_at: Date.now(),
  };
  const balAfterPayablePay = calculateAccountBalance(
    testAccount,
    [incomeTx, expenseTx],
    [lentDebt, borrowedDebt],
    [receivablePayment, payablePayment]
  );
  if (balAfterPayablePay === 1300000) {
    results.push('PASS: Payable repayment decreases balance (15,000 - 2,000 = 13,000 ৳)');
  } else {
    results.push(`FAIL: Balance after payable repayment was ${balAfterPayablePay}`);
  }

  const summaryPayPay = calculateFinancialSummary(
    [testAccount],
    [incomeTx, expenseTx],
    [lentDebt, borrowedDebt],
    [receivablePayment, payablePayment],
    '2026-09'
  );
  if (summaryPayPay.monthlyExpensePoisha === 200000) {
    results.push('PASS: Payable repayment is NOT counted as new Expense (Expense remains 2,000 ৳)');
  } else {
    results.push(`FAIL: Payable repayment counted as expense: ${summaryPayPay.monthlyExpensePoisha}`);
  }

  // 7. Monthly Savings = Income - Expense
  // Income = 5,000 ৳ (500000), Expense = 2,000 ৳ (200000), Savings = 3,000 ৳ (300000)
  if (summaryPayPay.monthlySavingsPoisha === 300000) {
    results.push('PASS: Monthly Savings strictly equals Monthly Income - Monthly Expense (5,000 - 2,000 = 3,000 ৳)');
  } else {
    results.push(`FAIL: Monthly savings was ${summaryPayPay.monthlySavingsPoisha}`);
  }

  const allPassed = results.every((r) => r.startsWith('PASS'));
  return { success: allPassed, results };
}
