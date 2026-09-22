import React, { useState } from 'react';
import { Calendar, ChevronDown, Check, X } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';

export type DateFilterType = 'MONTH' | 'CUSTOM' | 'ALL_TIME';

export interface DateFilterSelection {
  type: DateFilterType;
  selectedMonth: string; // YYYY-MM
  startDate?: string; // YYYY-MM-DD
  endDate?: string; // YYYY-MM-DD
  label: string;
}

interface DateRangePickerProps {
  currentFilter: DateFilterSelection;
  onChangeFilter: (filter: DateFilterSelection) => void;
}

export const DateRangePicker: React.FC<DateRangePickerProps> = ({
  currentFilter,
  onChangeFilter,
}) => {
  const { language, t, formatMonthYear } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<DateFilterType>(currentFilter.type);
  const [tempMonth, setTempMonth] = useState(currentFilter.selectedMonth);
  const [tempStart, setTempStart] = useState(currentFilter.startDate || '');
  const [tempEnd, setTempEnd] = useState(currentFilter.endDate || '');

  // Generate last 12 months for quick selection
  const recentMonths = React.useMemo(() => {
    const list: { key: string; label: string }[] = [];
    const date = new Date();
    for (let i = 0; i < 12; i++) {
      const d = new Date(date.getFullYear(), date.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      list.push({ key, label: formatMonthYear(key) });
    }
    return list;
  }, [formatMonthYear, language]);

  const handleApplyMonth = (monthKey: string) => {
    onChangeFilter({
      type: 'MONTH',
      selectedMonth: monthKey,
      label: formatMonthYear(monthKey),
    });
    setIsOpen(false);
  };

  const handleApplyCustomRange = (e: React.FormEvent) => {
    e.preventDefault();
    if (!tempStart && !tempEnd) return;

    let label = language === 'bn' ? 'কাস্টম সময়কাল' : 'Custom Period';
    if (tempStart && tempEnd) {
      label = language === 'bn' ? `${tempStart} থেকে ${tempEnd}` : `${tempStart} to ${tempEnd}`;
    } else if (tempStart) {
      label = language === 'bn' ? `${tempStart} হতে আজ পর্যন্ত` : `From ${tempStart} to today`;
    } else if (tempEnd) {
      label = language === 'bn' ? `${tempEnd} পর্যন্ত` : `Until ${tempEnd}`;
    }

    onChangeFilter({
      type: 'CUSTOM',
      selectedMonth: tempStart ? tempStart.slice(0, 7) : tempMonth,
      startDate: tempStart || undefined,
      endDate: tempEnd || undefined,
      label,
    });
    setIsOpen(false);
  };

  const handleApplyAllTime = () => {
    onChangeFilter({
      type: 'ALL_TIME',
      selectedMonth: tempMonth,
      label: t.datePicker.allTimeTitle,
    });
    setIsOpen(false);
  };

  return (
    <div className="relative">
      {/* Trigger Button */}
      <button
        id="open-date-picker-trigger"
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1.5 bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300 px-3 py-1.5 rounded-xl border border-emerald-200/80 dark:border-emerald-800 transition-all text-xs font-bold shadow-2xs"
      >
        <Calendar className="w-3.5 h-3.5 text-emerald-700 dark:text-emerald-400 shrink-0" />
        <span className="max-w-[140px] truncate">{currentFilter.label}</span>
        <ChevronDown className="w-3 h-3 text-emerald-600 dark:text-emerald-400 shrink-0" />
      </button>

      {/* Popover / Modal */}
      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-72 sm:w-80 bg-white dark:bg-slate-900 rounded-2xl p-4 shadow-lg border border-slate-200/90 dark:border-slate-800 z-50 animate-in fade-in zoom-in-98 duration-150">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2.5 mb-3">
            <span className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              {t.datePicker.title}
            </span>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-lg"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Mode Tabs */}
          <div className="flex bg-slate-100 dark:bg-slate-800/80 p-1 rounded-xl gap-1 text-[11px] font-semibold mb-3">
            <button
              type="button"
              onClick={() => setActiveTab('MONTH')}
              className={`flex-1 py-1.5 rounded-lg transition-all ${
                activeTab === 'MONTH'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-2xs font-bold'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              {t.datePicker.monthlyTab}
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('CUSTOM')}
              className={`flex-1 py-1.5 rounded-lg transition-all ${
                activeTab === 'CUSTOM'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-2xs font-bold'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              {t.datePicker.customRangeTab}
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('ALL_TIME')}
              className={`flex-1 py-1.5 rounded-lg transition-all ${
                activeTab === 'ALL_TIME'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-2xs font-bold'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              {t.datePicker.allTimeTab}
            </button>
          </div>

          {/* Tab 1: Monthly Quick Selection */}
          {activeTab === 'MONTH' && (
            <div className="space-y-1 max-h-56 overflow-y-auto pr-1">
              <p className="text-[10px] font-medium text-slate-400 dark:text-slate-500 px-1 mb-1">
                {t.datePicker.monthlyHint}
              </p>
              {recentMonths.map((m) => {
                const isSelected =
                  currentFilter.type === 'MONTH' && currentFilter.selectedMonth === m.key;
                return (
                  <button
                    key={m.key}
                    type="button"
                    onClick={() => handleApplyMonth(m.key)}
                    className={`w-full px-3 py-2 text-xs rounded-xl flex items-center justify-between font-semibold transition-colors ${
                      isSelected
                        ? 'bg-emerald-600 text-white shadow-2xs'
                        : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/60'
                    }`}
                  >
                    <span>{m.label}</span>
                    {isSelected && <Check className="w-3.5 h-3.5" />}
                  </button>
                );
              })}
            </div>
          )}

          {/* Tab 2: Custom Date Range */}
          {activeTab === 'CUSTOM' && (
            <form onSubmit={handleApplyCustomRange} className="space-y-3">
              <div className="space-y-2">
                <div>
                  <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1">
                    {t.datePicker.startDate}
                  </label>
                  <input
                    id="date-picker-start"
                    type="date"
                    value={tempStart}
                    onChange={(e) => setTempStart(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-emerald-500 text-slate-900 dark:text-slate-100"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1">
                    {t.datePicker.endDate}
                  </label>
                  <input
                    id="date-picker-end"
                    type="date"
                    value={tempEnd}
                    onChange={(e) => setTempEnd(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-emerald-500 text-slate-900 dark:text-slate-100"
                    required
                  />
                </div>
              </div>

              {/* Quick shortcut buttons */}
              <div className="grid grid-cols-3 gap-1.5 text-[10px]">
                <button
                  type="button"
                  onClick={() => {
                    const now = new Date();
                    const dStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
                    setTempStart(dStr);
                    setTempEnd(dStr);
                  }}
                  className="px-2 py-1 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg text-slate-700 dark:text-slate-300 font-medium text-center transition-colors"
                >
                  {t.datePicker.today}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const now = new Date();
                    const past7 = new Date(now);
                    past7.setDate(now.getDate() - 6);
                    const toD = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
                    setTempStart(toD(past7));
                    setTempEnd(toD(now));
                  }}
                  className="px-2 py-1 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg text-slate-700 dark:text-slate-300 font-medium text-center transition-colors"
                >
                  {t.datePicker.last7Days}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const now = new Date();
                    const past30 = new Date(now);
                    past30.setDate(now.getDate() - 29);
                    const toD = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
                    setTempStart(toD(past30));
                    setTempEnd(toD(now));
                  }}
                  className="px-2 py-1 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg text-slate-700 dark:text-slate-300 font-medium text-center transition-colors"
                >
                  {t.datePicker.last30Days}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const now = new Date();
                    const first = new Date(now.getFullYear(), now.getMonth(), 1);
                    const last = new Date(now.getFullYear(), now.getMonth() + 1, 0);
                    setTempStart(`${first.getFullYear()}-${String(first.getMonth() + 1).padStart(2, '0')}-01`);
                    setTempEnd(`${last.getFullYear()}-${String(last.getMonth() + 1).padStart(2, '0')}-${String(last.getDate()).padStart(2, '0')}`);
                  }}
                  className="px-2 py-1 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg text-slate-700 dark:text-slate-300 font-medium text-center transition-colors"
                >
                  {t.datePicker.thisMonth}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const now = new Date();
                    const first = new Date(now.getFullYear(), now.getMonth() - 1, 1);
                    const last = new Date(now.getFullYear(), now.getMonth(), 0);
                    setTempStart(`${first.getFullYear()}-${String(first.getMonth() + 1).padStart(2, '0')}-01`);
                    setTempEnd(`${last.getFullYear()}-${String(last.getMonth() + 1).padStart(2, '0')}-${String(last.getDate()).padStart(2, '0')}`);
                  }}
                  className="px-2 py-1 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg text-slate-700 dark:text-slate-300 font-medium text-center transition-colors"
                >
                  {t.datePicker.lastMonth}
                </button>
              </div>

              <div className="flex gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-semibold text-xs rounded-xl transition-colors"
                >
                  {t.common.cancel}
                </button>
                <button
                  id="submit-custom-date-range-btn"
                  type="submit"
                  className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] text-white font-semibold text-xs rounded-xl shadow-xs transition-colors"
                >
                  {t.datePicker.apply}
                </button>
              </div>
            </form>
          )}

          {/* Tab 3: All Time */}
          {activeTab === 'ALL_TIME' && (
            <div className="py-3 text-center space-y-3">
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                {t.datePicker.allTimeDesc}
              </p>
              <button
                id="apply-all-time-btn"
                type="button"
                onClick={handleApplyAllTime}
                className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] text-white text-xs font-bold rounded-xl shadow-xs transition-colors"
              >
                {t.datePicker.allTimeTitle}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
