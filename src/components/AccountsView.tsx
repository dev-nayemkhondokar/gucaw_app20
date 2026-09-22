import React, { useState } from 'react';
import { Plus, Check, Wallet, Building2, Smartphone } from 'lucide-react';
import { Account, AccountType } from '../types';
import { parseInputToPoisha } from '../utils/formatters';
import { useLanguage } from '../contexts/LanguageContext';

interface AccountsViewProps {
  accounts: Account[];
  accountBalances: { [id: string]: number };
  onAddAccount: (data: {
    name: string;
    type: AccountType;
    opening_balance_poisha: number;
    account_number_suffix?: string;
    color: string;
  }) => void;
}

export const AccountsView: React.FC<AccountsViewProps> = ({
  accounts,
  accountBalances,
  onAddAccount,
}) => {
  const { t, language, formatTaka, getAccountName } = useLanguage();
  const [showAddModal, setShowAddModal] = useState(false);
  const [name, setName] = useState('');
  const [type, setType] = useState<AccountType>('BANK');
  const [openingBalanceInput, setOpeningBalanceInput] = useState('');
  const [suffix, setSuffix] = useState('');

  const accountColors: { [key in AccountType]: string } = {
    CASH: '#10B981',
    BKASH: '#E2136E',
    NAGAD: '#F7941D',
    ROCKET: '#8C3494',
    BANK: '#1E40AF',
    SAVINGS: '#059669',
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    onAddAccount({
      name: name.trim(),
      type,
      opening_balance_poisha: parseInputToPoisha(openingBalanceInput),
      account_number_suffix: suffix.trim() || undefined,
      color: accountColors[type] || '#4B5563',
    });

    setShowAddModal(false);
    setName('');
    setOpeningBalanceInput('');
    setSuffix('');
  };

  const getAccountIcon = (accType: AccountType) => {
    switch (accType) {
      case 'CASH':
        return <Wallet className="w-5 h-5" />;
      case 'BANK':
      case 'SAVINGS':
        return <Building2 className="w-5 h-5" />;
      default:
        return <Smartphone className="w-5 h-5" />;
    }
  };

  return (
    <div className="space-y-4 pb-20">
      {/* Top Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">{t.accounts.title}</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">{t.accounts.subtitle}</p>
        </div>
        <button
          id="add-account-btn"
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] text-white rounded-xl text-xs font-bold shadow-xs transition-colors"
        >
          <Plus className="w-4 h-4" />
          {t.accounts.newAccount}
        </button>
      </div>

      {/* Account Cards Grid */}
      {accounts.length === 0 ? (
        <div className="text-center py-12 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-6 flex flex-col items-center justify-center">
          <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 flex items-center justify-center mb-3">
            <Wallet className="w-6 h-6 stroke-[1.75]" />
          </div>
          <p className="text-sm font-bold text-slate-800 dark:text-slate-200">{t.accounts.emptyTitle}</p>
          <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-1 max-w-xs">
            {t.accounts.emptySubtitle}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {accounts.map((acc) => {
            const balance = accountBalances[acc.id] ?? acc.opening_balance_poisha;
            return (
              <div
                key={acc.id}
                id={`account-card-${acc.id}`}
                className="p-4 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-xs flex flex-col justify-between hover:border-slate-300 dark:hover:border-slate-700 transition-all"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center text-white shrink-0 shadow-2xs"
                      style={{ backgroundColor: acc.color }}
                    >
                      {getAccountIcon(acc.type)}
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 leading-snug">{getAccountName(acc.name)}</h3>
                      {acc.account_number_suffix && (
                        <span className="text-xs text-slate-500 dark:text-slate-400 font-mono font-medium block">
                          {t.accounts.last4}: •••• {acc.account_number_suffix}
                        </span>
                      )}
                    </div>
                  </div>
                  <span className="text-[11px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200/60 dark:border-slate-700/60">
                    {acc.type}
                  </span>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-baseline justify-between">
                  <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">{t.accounts.currentBalance}:</span>
                  <span
                    className={`text-xl font-extrabold tracking-tight ${
                      balance < 0 ? 'text-rose-600 dark:text-rose-400' : 'text-slate-900 dark:text-slate-100'
                    }`}
                  >
                    {formatTaka(balance)}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add Account Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl p-5 shadow-2xl space-y-4 border border-slate-200/90 dark:border-slate-800 animate-in fade-in zoom-in-95 duration-150">
            <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">{t.accounts.createAccountTitle}</h3>
            <form onSubmit={handleSubmit} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">{t.accounts.accountName} *</label>
                <input
                  id="new-account-name-input"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={language === 'bn' ? 'যেমন: ডাচ-বাংলা সেভিংস' : 'e.g. Dutch-Bangla Savings'}
                  className="w-full px-3.5 py-2.5 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-xl focus:ring-2 focus:ring-emerald-500 font-medium focus:outline-hidden"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">{t.accounts.accountType}</label>
                <select
                  id="new-account-type-select"
                  value={type}
                  onChange={(e) => setType(e.target.value as AccountType)}
                  className="w-full px-3.5 py-2.5 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-xl focus:ring-2 focus:ring-emerald-500 font-medium focus:outline-hidden"
                >
                  <option value="BANK">{language === 'bn' ? 'ব্যাংক অ্যাকাউন্ট (Bank)' : 'Bank Account'}</option>
                  <option value="BKASH">{language === 'bn' ? 'বিকাশ (bKash)' : 'bKash'}</option>
                  <option value="NAGAD">{language === 'bn' ? 'নগদ (Nagad)' : 'Nagad'}</option>
                  <option value="ROCKET">{language === 'bn' ? 'রকেট (Rocket)' : 'Rocket'}</option>
                  <option value="CASH">{language === 'bn' ? 'ক্যাশ / ওয়ালেট (Cash)' : 'Cash / Wallet'}</option>
                  <option value="SAVINGS">{language === 'bn' ? 'সঞ্চয়পত্র / ডিপিএস (Savings)' : 'Savings / DPS'}</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  {t.accounts.openingBalance} (৳)
                </label>
                <input
                  id="new-account-balance-input"
                  type="number"
                  step="any"
                  value={openingBalanceInput}
                  onChange={(e) => setOpeningBalanceInput(e.target.value)}
                  placeholder="0"
                  className="w-full px-3.5 py-2.5 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-xl focus:ring-2 focus:ring-emerald-500 font-bold focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  {t.accounts.last4Digits}
                </label>
                <input
                  id="new-account-suffix-input"
                  type="text"
                  maxLength={4}
                  value={suffix}
                  onChange={(e) => setSuffix(e.target.value)}
                  placeholder={language === 'bn' ? 'যেমন: ১২৩৪' : 'e.g. 1234'}
                  className="w-full px-3.5 py-2.5 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-xl focus:ring-2 focus:ring-emerald-500 font-mono font-bold focus:outline-hidden"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-semibold text-xs rounded-xl transition-colors"
                >
                  {t.accounts.cancelBtn}
                </button>
                <button
                  id="save-new-account-btn"
                  type="submit"
                  className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] text-white font-semibold text-xs rounded-xl shadow-xs transition-colors"
                >
                  {t.accounts.saveBtn}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
