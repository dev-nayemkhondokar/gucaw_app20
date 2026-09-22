import React from 'react';
import {
  LayoutDashboard,
  ReceiptText,
  PieChart,
  Wallet,
  HandCoins,
  Plus,
} from 'lucide-react';
import { GochaoAIIcon } from './GochaoLogo';
import { useLanguage } from '../contexts/LanguageContext';

interface BottomNavBarProps {
  activeTab: string;
  onSelectTab: (tab: string) => void;
  onOpenAddModal: () => void;
}

export const BottomNavBar: React.FC<BottomNavBarProps> = ({
  activeTab,
  onSelectTab,
  onOpenAddModal,
}) => {
  const { t } = useLanguage();

  const leftTabs = [
    { id: 'dashboard', label: t.nav.dashboard, icon: LayoutDashboard },
    { id: 'transactions', label: t.nav.transactions, icon: ReceiptText },
    { id: 'reports', label: t.nav.reports, icon: PieChart },
  ];

  const rightTabs = [
    { id: 'ai', label: t.nav.ai, icon: GochaoAIIcon },
    { id: 'debts', label: t.nav.debts, icon: HandCoins },
    { id: 'accounts', label: t.nav.accounts, icon: Wallet },
  ];

  return (
    <nav
      id="bottom-navigation-bar"
      aria-label={t.nav.dashboard}
      className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-slate-200/80 dark:border-slate-800 shadow-sm px-1.5 py-1 max-w-lg mx-auto"
    >
      <div className="grid grid-cols-7 items-center relative">
        {/* Left 3 Tabs: হোম, লেনদেন, রিপোর্ট */}
        {leftTabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              id={`nav-tab-${tab.id}`}
              onClick={() => onSelectTab(tab.id)}
              className={`flex flex-col items-center justify-center min-h-[50px] py-1 px-0.5 rounded-xl transition-colors relative touch-manipulation ${
                isActive
                  ? 'text-emerald-700 dark:text-emerald-400 font-bold'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 font-medium'
              }`}
            >
              <div
                className={`p-1 rounded-lg transition-all ${
                  isActive
                    ? 'bg-emerald-50 dark:bg-emerald-950/70'
                    : 'bg-transparent'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'stroke-[2.5]' : 'stroke-2'}`} />
              </div>
              <span className="text-[10px] font-semibold mt-0.5 whitespace-nowrap tracking-tight">
                {tab.label}
              </span>
            </button>
          );
        })}

        {/* Center Floating Add Button with Clean Ring */}
        <div className="flex flex-col items-center justify-center">
          <button
            id="floating-add-btn"
            onClick={onOpenAddModal}
            aria-label={t.nav.addNew}
            title={t.nav.addNew}
            className="w-12 h-12 -mt-5 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white flex items-center justify-center shadow-md shadow-emerald-700/25 ring-4 ring-slate-50 dark:ring-slate-950 active:scale-95 transition-all shrink-0 touch-manipulation"
          >
            <Plus className="w-5 h-5 stroke-[2.75]" />
          </button>
        </div>

        {/* Right 3 Tabs: AI সহকারী, দেনা-পাওনা, অ্যাকাউন্ট */}
        {rightTabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              id={`nav-tab-${tab.id}`}
              onClick={() => onSelectTab(tab.id)}
              className={`flex flex-col items-center justify-center min-h-[50px] py-1 px-0.5 rounded-xl transition-colors relative touch-manipulation ${
                isActive
                  ? 'text-emerald-700 dark:text-emerald-400 font-bold'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 font-medium'
              }`}
            >
              <div
                className={`p-1 rounded-lg transition-all ${
                  isActive
                    ? 'bg-emerald-50 dark:bg-emerald-950/70'
                    : 'bg-transparent'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'stroke-[2.5]' : 'stroke-2'}`} />
              </div>
              <span className="text-[10px] font-semibold mt-0.5 whitespace-nowrap tracking-tight">
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};

