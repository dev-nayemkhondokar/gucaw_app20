import React, { useState } from 'react';
import {
  CalendarClock,
  Plus,
  Trash2,
  CheckCircle,
  Play,
  X,
  Sparkles,
  AlertCircle,
  Clock,
  ToggleLeft,
  ToggleRight,
} from 'lucide-react';
import { RecurringExpense, Account, Category } from '../types';
import { CategoryIcon } from './CategoryIcon';
import { useLanguage } from '../contexts/LanguageContext';

interface RecurringExpensesCardProps {
  recurringExpenses: RecurringExpense[];
  accounts: Account[];
  categories: Category[];
  isPrivacyMode: boolean;
  selectedMonth: string;
  onAddRecurringExpense: (expense: Omit<RecurringExpense, 'id' | 'created_at'>) => void;
  onToggleRecurringExpense: (id: string, isActive: boolean) => void;
  onDeleteRecurringExpense: (id: string) => void;
  onExecuteRecurringExpense: (expense: RecurringExpense) => void;
  onExecuteAllPending: () => void;
}

export const RecurringExpensesCard: React.FC<RecurringExpensesCardProps> = ({
  recurringExpenses,
  accounts,
  categories,
  isPrivacyMode,
  selectedMonth,
  onAddRecurringExpense,
  onToggleRecurringExpense,
  onDeleteRecurringExpense,
  onExecuteRecurringExpense,
  onExecuteAllPending,
}) => {
  const { language, formatTaka, formatNumber, getCategoryName, getAccountName } = useLanguage();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [amountTaka, setAmountTaka] = useState('');
  const [accountId, setAccountId] = useState(accounts[0]?.id || '');
  const [categoryId, setCategoryId] = useState(
    categories.find((c) => c.type === 'EXPENSE')?.id || ''
  );
  const [dayOfMonth, setDayOfMonth] = useState('1');
  const [note, setNote] = useState('');

  const accountMap = new Map<string, Account>(accounts.map((a) => [a.id, a]));
  const categoryMap = new Map<string, Category>(categories.map((c) => [c.id, c]));

  const renderAmount = (amountPoisha: number) => {
    if (isPrivacyMode) return '•••••• ৳';
    return formatTaka(amountPoisha);
  };

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    const taka = parseFloat(amountTaka);
    const day = parseInt(dayOfMonth, 10);
    if (!title.trim() || isNaN(taka) || taka <= 0 || !accountId || !categoryId) return;

    onAddRecurringExpense({
      title: title.trim(),
      amount_poisha: Math.round(taka * 100),
      account_id: accountId,
      category_id: categoryId,
      day_of_month: Math.min(31, Math.max(1, isNaN(day) ? 1 : day)),
      note: note.trim() || undefined,
      is_active: true,
    });

    setTitle('');
    setAmountTaka('');
    setNote('');
    setDayOfMonth('1');
    setIsModalOpen(false);
  };

  // Pending recurring expenses for this selected month that haven't been added yet
  const pendingThisMonth = recurringExpenses.filter(
    (item) => item.is_active && item.last_processed_month !== selectedMonth
  );

  return (
    <div
      id="recurring-expenses-card"
      className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xs space-y-4"
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-400 flex items-center justify-center shrink-0">
            <CalendarClock className="w-4.5 h-4.5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
              {language === 'bn' ? 'নিয়মিত খরচ (অটো রিকারিং)' : 'Recurring Expenses (Auto)'}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
              {pendingThisMonth.length > 0
                ? (language === 'bn'
                    ? `এই মাসে ${formatNumber(pendingThisMonth.length)}টি নিয়মিত খরচ যোগ বাকি আছে`
                    : `${formatNumber(pendingThisMonth.length)} recurring expense(s) pending this month`)
                : (language === 'bn'
                    ? 'বাসাভাড়া, ইন্টারনেট বা প্রতি মাসের নিয়মিত বিল'
                    : 'Rent, internet, or regular monthly bills')}
            </p>
          </div>
        </div>

        <button
          id="open-add-recurring-modal-btn"
          type="button"
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-1 text-xs font-bold text-indigo-800 dark:text-indigo-200 bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 border border-indigo-200/80 dark:border-indigo-800/80 px-2.5 py-1.5 rounded-lg transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          {language === 'bn' ? 'নতুন যোগ' : 'Add New'}
        </button>
      </div>

      {/* Quick Action: Add all pending for this month */}
      {pendingThisMonth.length > 0 && (
        <div className="p-3 bg-indigo-50/80 dark:bg-indigo-950/60 border border-indigo-100 dark:border-indigo-900/80 rounded-xl flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-indigo-950 dark:text-indigo-200 text-xs font-medium">
            <Clock className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
            <span>
              {language === 'bn' ? (
                <>
                  এই মাসের জন্য <strong className="font-bold text-indigo-900 dark:text-indigo-100">{formatNumber(pendingThisMonth.length)}টি খরচ</strong> অটো যোগ করার বাকি
                </>
              ) : (
                <>
                  <strong className="font-bold text-indigo-900 dark:text-indigo-100">{formatNumber(pendingThisMonth.length)} expense(s)</strong> pending to auto-add this month
                </>
              )}
            </span>
          </div>
          <button
            id="execute-all-pending-recurring-btn"
            type="button"
            onClick={onExecuteAllPending}
            className="px-3 py-1.5 bg-indigo-700 hover:bg-indigo-800 text-white rounded-lg text-xs font-bold shrink-0 shadow-xs flex items-center gap-1 transition-all"
          >
            <Play className="w-3 h-3 fill-current" />
            {language === 'bn' ? 'এখনই সব যোগ করুন' : 'Add All Now'}
          </button>
        </div>
      )}

      {/* Recurring Items List */}
      {recurringExpenses.length === 0 ? (
        <div className="p-5 text-center bg-gray-50 dark:bg-gray-700/40 rounded-2xl border border-dashed border-gray-200 dark:border-gray-600">
          <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">
            {language === 'bn' ? 'এখনো কোনো নিয়মিত খরচের তালিকা তৈরি করেননি।' : 'No recurring expenses added yet.'}
          </p>
          <button
            type="button"
            onClick={() => setIsModalOpen(true)}
            className="mt-2 text-xs font-bold text-indigo-700 dark:text-indigo-400 hover:underline"
          >
            {language === 'bn' ? '+ বাসাভাড়া বা বিল যোগ করুন' : '+ Add rent or recurring bill'}
          </button>
        </div>
      ) : (
        <div className="divide-y divide-gray-100 dark:divide-gray-700/60 pt-1">
          {recurringExpenses.map((item) => {
            const cat = categoryMap.get(item.category_id);
            const acc = accountMap.get(item.account_id);
            const isProcessedForThisMonth = item.last_processed_month === selectedMonth;

            return (
              <div
                key={item.id}
                id={`recurring-item-${item.id}`}
                className="py-3 flex items-center justify-between gap-2 hover:bg-gray-50/70 dark:hover:bg-gray-700/40 rounded-xl px-2 transition-colors"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div
                    className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
                    style={{
                      backgroundColor: cat ? `${cat.color}20` : '#EEF2FF',
                      color: cat ? cat.color : '#4F46E5',
                    }}
                  >
                    <CategoryIcon name={cat?.icon || 'CalendarClock'} className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span
                        className={`text-sm font-bold truncate ${
                          item.is_active
                            ? 'text-gray-900 dark:text-gray-100'
                            : 'text-gray-400 dark:text-gray-500 line-through'
                        }`}
                      >
                        {item.title}
                      </span>
                      {isProcessedForThisMonth ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-bold bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 rounded-md">
                          <CheckCircle className="w-3 h-3" /> {language === 'bn' ? 'এই মাসে যোগ হয়েছে' : 'Added this month'}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-bold bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 rounded-md">
                          {language === 'bn' ? 'বাকি আছে' : 'Pending'}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">
                      {language === 'bn'
                        ? `প্রতি মাসের ${formatNumber(item.day_of_month)} তারিখ • ${acc ? getAccountName(acc.name) : 'অ্যাকাউন্ট'}${item.note ? ` • ${item.note}` : ''}`
                        : `Day ${formatNumber(item.day_of_month)} of month • ${acc ? getAccountName(acc.name) : 'Account'}${item.note ? ` • ${item.note}` : ''}`}
                    </p>
                  </div>
                </div>

                <div className="text-right shrink-0 flex items-center gap-2">
                  <div>
                    <span className="text-sm font-extrabold text-gray-900 dark:text-gray-100 block">
                      {renderAmount(item.amount_poisha)}
                    </span>
                    <span className="text-xs text-gray-400 dark:text-gray-500 font-medium">
                      {language === 'bn' ? 'প্রতি মাসে' : 'per month'}
                    </span>
                  </div>

                  {/* Manual add button if not yet processed */}
                  {!isProcessedForThisMonth && item.is_active && (
                    <button
                      id={`apply-recurring-btn-${item.id}`}
                      type="button"
                      onClick={() => onExecuteRecurringExpense(item)}
                      title={language === 'bn' ? 'এই মাসের লেনদেনে যোগ করুন' : 'Add to this month transactions'}
                      className="px-2.5 py-1 text-xs font-bold bg-indigo-100/80 dark:bg-indigo-950/80 hover:bg-indigo-200 dark:hover:bg-indigo-900 text-indigo-800 dark:text-indigo-200 border border-indigo-200 dark:border-indigo-800 rounded-lg flex items-center gap-1 transition-colors"
                    >
                      <Play className="w-3 h-3 fill-current" />
                      {language === 'bn' ? 'যোগ' : 'Add'}
                    </button>
                  )}

                  {/* Toggle Active status */}
                  <button
                    type="button"
                    onClick={() => onToggleRecurringExpense(item.id, !item.is_active)}
                    title={item.is_active ? (language === 'bn' ? 'বন্ধ করুন' : 'Deactivate') : (language === 'bn' ? 'চালু করুন' : 'Activate')}
                    className="text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 p-1"
                  >
                    {item.is_active ? (
                      <ToggleRight className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                    ) : (
                      <ToggleLeft className="w-5 h-5 text-gray-400 dark:text-gray-600" />
                    )}
                  </button>

                  {/* Delete button */}
                  <button
                    type="button"
                    onClick={() => {
                      const confirmMsg = language === 'bn'
                        ? `"${item.title}" নিয়মিত খরচটি তালিকা থেকে মুছতে চান?`
                        : `Do you want to delete recurring expense "${item.title}"?`;
                      if (confirm(confirmMsg)) {
                        onDeleteRecurringExpense(item.id);
                      }
                    }}
                    title={language === 'bn' ? 'মুছে ফেলুন' : 'Delete'}
                    className="text-gray-400 hover:text-rose-600 dark:hover:text-rose-400 p-1"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal: Create Recurring Expense */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl p-5 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150 border border-slate-200/90 dark:border-slate-800">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2 text-slate-900 dark:text-slate-100 font-bold text-sm">
                <Sparkles className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                {language === 'bn' ? 'নতুন নিয়মিত খরচ যোগ করুন' : 'Add New Recurring Expense'}
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreate} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  {language === 'bn' ? 'খরচের শিরোনাম / বিবরণ *' : 'Expense Title / Description *'}
                </label>
                <input
                  id="recurring-title-input"
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder={language === 'bn' ? 'যেমন: বাসাভাড়া, ইন্টারনেট বিল, পত্রিকা বিল' : 'e.g. House Rent, Internet Bill, Electricity'}
                  className="w-full px-3.5 py-2.5 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-hidden font-medium"
                  required
                  autoFocus
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    {language === 'bn' ? 'টাকার পরিমাণ (৳) *' : 'Amount (৳) *'}
                  </label>
                  <input
                    id="recurring-amount-input"
                    type="number"
                    min="1"
                    step="any"
                    value={amountTaka}
                    onChange={(e) => setAmountTaka(e.target.value)}
                    placeholder="12,000"
                    className="w-full px-3.5 py-2.5 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-hidden font-bold"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    {language === 'bn' ? 'মাসের কোন তারিখ? *' : 'Day of Month *'}
                  </label>
                  <input
                    id="recurring-day-input"
                    type="number"
                    min="1"
                    max="31"
                    value={dayOfMonth}
                    onChange={(e) => setDayOfMonth(e.target.value)}
                    placeholder={language === 'bn' ? '১ থেকে ৩১' : '1 to 31'}
                    className="w-full px-3.5 py-2.5 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-hidden font-bold"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    {language === 'bn' ? 'ক্যাটাগরি *' : 'Category *'}
                  </label>
                  <select
                    id="recurring-category-select"
                    value={categoryId}
                    onChange={(e) => setCategoryId(e.target.value)}
                    className="w-full px-3 py-2.5 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-hidden font-medium"
                  >
                    {categories
                      .filter((c) => c.type === 'EXPENSE')
                      .map((c) => (
                        <option key={c.id} value={c.id}>
                          {getCategoryName(c)}
                        </option>
                      ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    {language === 'bn' ? 'কোন অ্যাকাউন্ট থেকে কাটবে? *' : 'Deduct from Account *'}
                  </label>
                  <select
                    id="recurring-account-select"
                    value={accountId}
                    onChange={(e) => setAccountId(e.target.value)}
                    className="w-full px-3 py-2.5 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-hidden font-medium"
                  >
                    {accounts.map((a) => (
                      <option key={a.id} value={a.id}>
                        {getAccountName(a)}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  {language === 'bn' ? 'সংক্ষিপ্ত নোট (ঐচ্ছিক)' : 'Short Note (Optional)'}
                </label>
                <input
                  type="text"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder={language === 'bn' ? 'যেমন: বাড়িওয়ালার বিকাশ নম্বর' : 'e.g. Landlord phone/bKash'}
                  className="w-full px-3.5 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-semibold text-xs rounded-xl transition-colors"
                >
                  {language === 'bn' ? 'বাদ দিন' : 'Cancel'}
                </button>
                <button
                  id="save-recurring-submit-btn"
                  type="submit"
                  className="flex-1 py-2.5 bg-indigo-700 hover:bg-indigo-800 text-white font-semibold text-xs rounded-xl shadow-xs transition-colors"
                >
                  {language === 'bn' ? 'সংরক্ষণ করুন' : 'Save'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
