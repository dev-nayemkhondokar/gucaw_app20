import React, { useState } from 'react';
import { DebtRecord, DebtPaymentHistory, Account } from '../types';
import { parseInputToPoisha } from '../utils/formatters';
import { HandCoins, CheckCircle2, Phone, Calendar, ArrowDownRight, ArrowUpRight, PlusCircle } from 'lucide-react';
import { AnimatedProgressBar } from './AnimatedProgressBar';
import { useLanguage } from '../contexts/LanguageContext';

interface DebtsViewProps {
  debts: DebtRecord[];
  debtPayments: DebtPaymentHistory[];
  accounts: Account[];
  onAddPayment: (data: {
    debt_id: string;
    amount_poisha: number;
    account_id: string;
    payment_date: string;
    note?: string;
  }) => void;
}

export const DebtsView: React.FC<DebtsViewProps> = ({
  debts,
  debtPayments,
  accounts,
  onAddPayment,
}) => {
  const { t, language, formatTaka, formatDate, getAccountName } = useLanguage();
  const [activeTab, setActiveTab] = useState<'LENT' | 'BORROWED'>('LENT');
  const [selectedDebtForPayment, setSelectedDebtForPayment] = useState<DebtRecord | null>(null);
  const [paymentAmountInput, setPaymentAmountInput] = useState('');
  const [paymentAccountId, setPaymentAccountId] = useState(accounts[0]?.id || '');
  const [paymentNote, setPaymentNote] = useState('');

  // Map payments by debt id
  const paymentsByDebt = new Map<string, DebtPaymentHistory[]>();
  const totalPaidByDebt = new Map<string, number>();

  for (const p of debtPayments) {
    const list = paymentsByDebt.get(p.debt_id) || [];
    list.push(p);
    paymentsByDebt.set(p.debt_id, list);

    const sum = totalPaidByDebt.get(p.debt_id) || 0;
    totalPaidByDebt.set(p.debt_id, sum + p.amount_poisha);
  }

  const filteredDebts = debts.filter((d) => d.type === activeTab);

  const handlePaymentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDebtForPayment) return;

    const amountPoisha = parseInputToPoisha(paymentAmountInput);
    if (amountPoisha <= 0) {
      alert(language === 'bn' ? 'সঠিক টাকার পরিমাণ দিন' : 'Please enter a valid amount');
      return;
    }

    onAddPayment({
      debt_id: selectedDebtForPayment.id,
      amount_poisha: amountPoisha,
      account_id: paymentAccountId,
      payment_date: new Date().toISOString().split('T')[0],
      note: paymentNote.trim() || undefined,
    });

    setSelectedDebtForPayment(null);
    setPaymentAmountInput('');
    setPaymentNote('');
  };

  return (
    <div className="space-y-4 pb-20">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">{t.debts.title}</h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
          {t.debts.subtitle}
        </p>
      </div>

      {/* Tab Switcher */}
      <div className="flex bg-slate-100 dark:bg-slate-800/80 p-1 rounded-xl gap-1">
        <button
          id="debt-tab-lent-btn"
          onClick={() => setActiveTab('LENT')}
          className={`flex-1 py-2.5 text-xs font-bold rounded-lg flex items-center justify-center gap-1.5 transition-all ${
            activeTab === 'LENT'
              ? 'bg-amber-600 text-white shadow-2xs font-bold'
              : 'text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-100'
          }`}
        >
          <ArrowUpRight className="w-4 h-4" />
          {t.debts.receivablesTab}
        </button>
        <button
          id="debt-tab-borrowed-btn"
          onClick={() => setActiveTab('BORROWED')}
          className={`flex-1 py-2.5 text-xs font-bold rounded-lg flex items-center justify-center gap-1.5 transition-all ${
            activeTab === 'BORROWED'
              ? 'bg-indigo-600 text-white shadow-2xs font-bold'
              : 'text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-100'
          }`}
        >
          <ArrowDownRight className="w-4 h-4" />
          {t.debts.payablesTab}
        </button>
      </div>

      {/* List */}
      {filteredDebts.length === 0 ? (
        <div className="text-center py-12 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-6 flex flex-col items-center justify-center">
          <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 flex items-center justify-center mb-3">
            <HandCoins className="w-6 h-6 stroke-[1.75]" />
          </div>
          <p className="text-sm font-bold text-slate-800 dark:text-slate-200">{t.debts.noDebts}</p>
          <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-1 max-w-xs">
            {t.debts.addDebtPrompt}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredDebts.map((debt) => {
            const rawDebtAmount = (debt as any).initial_amount_poisha ?? (debt as any).amount_poisha ?? (debt as any).amount ?? 0;
            const initialAmount = typeof rawDebtAmount === 'number' && !isNaN(rawDebtAmount) ? rawDebtAmount : (parseFloat(rawDebtAmount) || 0);
            const remaining = Math.max(0, initialAmount - (totalPaidByDebt.get(debt.id) || 0));
            const totalPaid = Number(totalPaidByDebt.get(debt.id)) || 0;
            const isSettled = remaining === 0;
            const history = paymentsByDebt.get(debt.id) || [];
            const progressPercent = initialAmount > 0 ? Math.min(100, (totalPaid / initialAmount) * 100) : 0;

            return (
              <div
                key={debt.id}
                id={`debt-card-${debt.id}`}
                className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4 shadow-2xs space-y-3 hover:border-slate-300 dark:hover:border-slate-700 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">{debt.person_name}</h3>
                      {isSettled ? (
                        <span className="flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-200 border border-emerald-200/60 dark:border-emerald-800">
                          <CheckCircle2 className="w-3.5 h-3.5" /> {t.debts.statusSettled}
                        </span>
                      ) : (
                        <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950/70 text-amber-900 dark:text-amber-200 border border-amber-200/60 dark:border-amber-800">
                          {t.debts.statusActive}
                        </span>
                      )}
                    </div>
                    {debt.phone && (
                      <p className="text-xs text-slate-500 dark:text-slate-400 font-medium flex items-center gap-1 mt-0.5">
                        <Phone className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" /> {debt.phone}
                      </p>
                    )}
                  </div>
                  <div className="text-right">
                    <span className="text-xs text-slate-500 dark:text-slate-400 font-medium block">{t.debts.remainingAmount}</span>
                    <span className="text-lg font-extrabold text-slate-900 dark:text-slate-100">
                      {formatTaka(remaining)}
                    </span>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="space-y-1">
                  <div className="flex justify-between text-xs font-medium text-slate-600 dark:text-slate-300">
                    <span>{t.debts.initialAmount}: <strong className="font-bold text-slate-900 dark:text-slate-100">{formatTaka(initialAmount)}</strong></span>
                    <span>{language === 'bn' ? 'শোধ হয়েছে:' : 'Paid:'} <strong className="font-bold text-emerald-700 dark:text-emerald-400">{formatTaka(totalPaid)}</strong></span>
                  </div>
                  <AnimatedProgressBar
                    percentage={progressPercent}
                    color="#10B981"
                    heightClass="h-2"
                    bgClass="bg-slate-100 dark:bg-slate-800"
                    duration={0.35}
                  />
                </div>

                {/* Dates and action */}
                <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
                  <span className="text-slate-500 dark:text-slate-400 font-medium flex items-center gap-1 text-xs">
                    <Calendar className="w-3.5 h-3.5" /> {formatDate(debt.date)}
                  </span>

                  {!isSettled && (
                    <button
                      id={`settle-payment-btn-${debt.id}`}
                      onClick={() => {
                        setSelectedDebtForPayment(debt);
                        setPaymentAmountInput((remaining / 100).toString());
                      }}
                      className="flex items-center gap-1 px-3 py-1.5 bg-slate-900 dark:bg-slate-100 hover:bg-slate-800 dark:hover:bg-white text-white dark:text-slate-900 text-xs font-bold rounded-xl shadow-xs active:scale-[0.98] transition-colors"
                    >
                      <PlusCircle className="w-3.5 h-3.5" />
                      {t.debts.recordPaymentBtn}
                    </button>
                  )}
                </div>

                {/* Payment History Sub-list */}
                {history.length > 0 && (
                  <div className="mt-2 pt-2 border-t border-dashed border-slate-200 dark:border-slate-800">
                    <p className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                      {t.debts.paymentHistory}:
                    </p>
                    <div className="space-y-1.5">
                      {history.map((h) => (
                        <div
                          key={h.id}
                          className="flex justify-between text-xs bg-slate-50 dark:bg-slate-800/60 px-2.5 py-1.5 rounded-lg border border-slate-200/60 dark:border-slate-800"
                        >
                          <span className="text-slate-700 dark:text-slate-300 font-medium">
                            {formatDate(h.payment_date)} {h.note ? `• ${h.note}` : ''}
                          </span>
                          <span className="font-bold text-emerald-700 dark:text-emerald-400">
                            +{formatTaka(h.amount_poisha)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Partial / Full Payment Modal */}
      {selectedDebtForPayment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl p-5 shadow-2xl space-y-4 border border-slate-200/90 dark:border-slate-800 animate-in fade-in zoom-in-95 duration-150">
            <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">
              {selectedDebtForPayment.type === 'LENT'
                ? (language === 'bn' ? `${selectedDebtForPayment.person_name} টাকা ফেরত দিয়েছেন?` : `Did ${selectedDebtForPayment.person_name} repay?`)
                : (language === 'bn' ? `${selectedDebtForPayment.person_name}-কে টাকা শোধ করলেন?` : `Did you repay ${selectedDebtForPayment.person_name}?`)}
            </h3>

            <p className="text-xs text-amber-950 dark:text-amber-200 bg-amber-50 dark:bg-amber-950/60 p-2.5 rounded-xl border border-amber-200 dark:border-amber-800 font-medium">
              💡 {language === 'bn'
                ? 'এটি আপনার অ্যাকাউন্টের ব্যালেন্সে যোগ বা বিয়োগ হবে, কিন্তু মাসিক আয় বা ব্যয়ের হিসাবে পড়বে না।'
                : 'This updates your account balance, but will not be counted towards monthly income or expense.'}
            </p>

            <form onSubmit={handlePaymentSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  {t.debts.paymentAmountLabel}
                </label>
                <input
                  id="debt-payment-amount-input"
                  type="number"
                  step="any"
                  value={paymentAmountInput}
                  onChange={(e) => setPaymentAmountInput(e.target.value)}
                  className="w-full px-3 py-2 text-base font-bold bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  {selectedDebtForPayment.type === 'LENT'
                    ? (language === 'bn' ? 'যে অ্যাকাউন্টে টাকা ঢুকলো' : 'Account receiving funds')
                    : (language === 'bn' ? 'যে অ্যাকাউন্ট থেকে টাকা দিলেন' : 'Account paying funds')}
                </label>
                <select
                  id="debt-payment-account-select"
                  value={paymentAccountId}
                  onChange={(e) => setPaymentAccountId(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-xl focus:ring-2 focus:ring-emerald-500 font-medium focus:outline-hidden"
                >
                  {accounts.map((acc) => (
                    <option key={acc.id} value={acc.id}>
                      {getAccountName(acc)}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">{t.debts.paymentNoteLabel}</label>
                <input
                  id="debt-payment-note-input"
                  type="text"
                  value={paymentNote}
                  onChange={(e) => setPaymentNote(e.target.value)}
                  placeholder={language === 'bn' ? 'যেমন: ১ম কিস্তি' : 'e.g. 1st installment'}
                  className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-xl focus:ring-2 focus:ring-emerald-500 font-medium focus:outline-hidden"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedDebtForPayment(null)}
                  className="flex-1 py-2.5 bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-semibold text-xs rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                >
                  {t.common.cancel}
                </button>
                <button
                  id="confirm-debt-payment-btn"
                  type="submit"
                  className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] text-white font-semibold text-xs rounded-xl shadow-xs transition-colors"
                >
                  {t.debts.savePaymentBtn}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
