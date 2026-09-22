import { Transaction, Account, Category, FinancialSummary, DebtRecord } from '../types';
import { formatTaka, formatBanglaDate, getMonthYearBangla } from './formatters';
import { BRAND } from '../config/brand';

/**
 * Generates and triggers download of CSV file with UTF-8 BOM for Bangla font compatibility
 */
export function downloadTransactionsCSV(
  transactions: Transaction[],
  accounts: Account[],
  categories: Category[],
  filterTitle: string = 'সব লেনদেন'
): void {
  const accountMap = new Map<string, Account>(accounts.map((a) => [a.id, a]));
  const categoryMap = new Map<string, Category>(categories.map((c) => [c.id, c]));

  const headers = [
    'ক্রমিক নং',
    'তারিখ',
    'সময়',
    'লেনদেনের ধরন',
    'ক্যাটাগরি',
    'উৎস অ্যাকাউন্ট',
    'গন্তব্য অ্যাকাউন্ট',
    'টাকার পরিমাণ (৳)',
    'ট্রান্সফার চার্জ (৳)',
    'বিবরণ / নোট',
  ];

  const escapeCSV = (str: string | number | undefined | null): string => {
    if (str === undefined || str === null) return '""';
    const s = String(str).replace(/"/g, '""');
    return `"${s}"`;
  };

  const rows = transactions.map((tx, idx) => {
    const cat = tx.category_id ? categoryMap.get(tx.category_id)?.name : '';
    const srcAcc = accountMap.get(tx.account_id)?.name || 'অ্যাকাউন্ট';
    const dstAcc = tx.to_account_id ? accountMap.get(tx.to_account_id)?.name || '' : '';

    let typeBangla = 'ব্যয়';
    if (tx.type === 'INCOME') typeBangla = 'আয়';
    else if (tx.type === 'TRANSFER') typeBangla = 'ট্রান্সফার';

    return [
      escapeCSV(idx + 1),
      escapeCSV(tx.date),
      escapeCSV(tx.time || ''),
      escapeCSV(typeBangla),
      escapeCSV(cat || '-'),
      escapeCSV(srcAcc),
      escapeCSV(dstAcc || '-'),
      escapeCSV((tx.amount_poisha / 100).toFixed(2)),
      escapeCSV(tx.transfer_fee_poisha ? (tx.transfer_fee_poisha / 100).toFixed(2) : '0.00'),
      escapeCSV(tx.note || ''),
    ].join(',');
  });

  // UTF-8 BOM (\uFEFF) ensures Excel and spreadsheets correctly display Bangla scripts
  const csvContent = '\uFEFF' + [headers.join(','), ...rows].join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  const dateStr = new Date().toISOString().split('T')[0];
  link.href = url;
  link.download = `personal-life-manager-${filterTitle.replace(/\s+/g, '_')}-${dateStr}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

/**
 * Triggers PDF export via a clean print-friendly window
 */
export function printFinancialReportPDF(
  summary: FinancialSummary,
  accounts: Account[],
  categories: Category[],
  transactions: Transaction[],
  debts: DebtRecord[],
  periodLabel: string
): void {
  const accountMap = new Map<string, Account>(accounts.map((a) => [a.id, a]));
  const categoryMap = new Map<string, Category>(categories.map((c) => [c.id, c]));

  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    alert('প্রিন্ট উইন্ডো খুলতে ব্যর্থ হয়েছে। অনুগ্রহ করে পপ-আপ ব্লকার চেক করুন।');
    return;
  }

  const generatedDate = new Date().toLocaleDateString('bn-BD', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const txRows = transactions.slice(0, 100).map((tx, idx) => {
    const cat = tx.category_id ? categoryMap.get(tx.category_id)?.name : '-';
    const acc = accountMap.get(tx.account_id)?.name || 'অ্যাকাউন্ট';
    const toAcc = tx.to_account_id ? accountMap.get(tx.to_account_id)?.name : '';
    
    let typeName = 'ব্যয়';
    let typeColor = '#dc2626';
    let sign = '-';
    if (tx.type === 'INCOME') {
      typeName = 'আয়';
      typeColor = '#16a34a';
      sign = '+';
    } else if (tx.type === 'TRANSFER') {
      typeName = 'ট্রান্সফার';
      typeColor = '#2563eb';
      sign = '';
    }

    return `
      <tr>
        <td style="padding: 8px; border-bottom: 1px solid #e5e7eb; text-align: center;">${idx + 1}</td>
        <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${tx.date}</td>
        <td style="padding: 8px; border-bottom: 1px solid #e5e7eb; font-weight: bold; color: ${typeColor};">${typeName}</td>
        <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${cat}</td>
        <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${acc}${toAcc ? ` ➔ ${toAcc}` : ''}</td>
        <td style="padding: 8px; border-bottom: 1px solid #e5e7eb; color: #4b5563;">${tx.note || '-'}</td>
        <td style="padding: 8px; border-bottom: 1px solid #e5e7eb; text-align: right; font-weight: bold; color: ${typeColor};">
          ${sign}৳${(tx.amount_poisha / 100).toLocaleString('bn-BD', { minimumFractionDigits: 2 })}
        </td>
      </tr>
    `;
  }).join('');

  const accountsRows = accounts.map((acc) => `
    <div style="display: inline-block; background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 8px 12px; margin-right: 8px; margin-bottom: 8px;">
      <span style="font-size: 11px; color: #6b7280; display: block;">${acc.name}</span>
      <span style="font-size: 14px; font-weight: bold; color: #111827;">${formatTaka(acc.opening_balance_poisha)}</span>
    </div>
  `).join('');

  const html = `
    <!DOCTYPE html>
    <html lang="bn">
    <head>
      <meta charset="UTF-8">
      <title>${BRAND.name} (${BRAND.banglaName}) - রিপোর্ট (${periodLabel})</title>
      <style>
        @page { size: A4; margin: 15mm; }
        body { font-family: 'SolaimanLipi', 'Noto Sans Bengali', system-ui, -apple-system, sans-serif; color: #1f2937; margin: 0; padding: 20px; }
        h1, h2, h3, p { margin: 0; }
        .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #16a34a; padding-bottom: 12px; margin-bottom: 20px; }
        .title { font-size: 20px; font-weight: 800; color: #15803d; }
        .subtitle { font-size: 12px; color: #6b7280; margin-top: 4px; }
        .meta { text-align: right; font-size: 11px; color: #4b5563; }
        .summary-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 20px; }
        .summary-card { background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 10px; padding: 12px; }
        .card-label { font-size: 11px; color: #6b7280; margin-bottom: 4px; font-weight: 600; }
        .card-value { font-size: 16px; font-weight: 800; color: #111827; }
        .card-income { color: #16a34a; }
        .card-expense { color: #dc2626; }
        .card-net { color: #15803d; }
        table { width: 100%; border-collapse: collapse; font-size: 12px; margin-top: 10px; }
        th { background: #f3f4f6; padding: 8px; text-align: left; font-weight: 700; color: #374151; border-bottom: 2px solid #e5e7eb; }
        .print-btn { background: #16a34a; color: white; border: none; padding: 10px 20px; border-radius: 8px; font-size: 14px; font-weight: bold; cursor: pointer; margin-bottom: 16px; }
        @media print {
          .no-print { display: none !important; }
          body { padding: 0; }
        }
      </style>
    </head>
    <body>
      <div class="no-print" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; background: #ecfdf5; padding: 12px 16px; border-radius: 10px; border: 1px solid #a7f3d0;">
        <span style="font-size: 13px; font-weight: 600; color: #15803d;">রিপোর্ট তৈরি হয়েছে। প্রিন্ট বা PDF হিসেবে সংরক্ষণ করতে নিচের বাটনে চাপ দিন:</span>
        <button class="print-btn" onclick="window.print()">🖨️ PDF হিসেবে সেভ বা প্রিন্ট করুন</button>
      </div>

      <div class="header">
        <div>
          <div class="title">${BRAND.name} (${BRAND.banglaName})</div>
          <div class="subtitle">${BRAND.tagline} • আর্থিক বিবরণী ও লেনদেন রিপোর্ট</div>
        </div>
        <div class="meta">
          <div><strong>সময়কাল:</strong> ${periodLabel}</div>
          <div><strong>প্রিন্টের তারিখ:</strong> ${generatedDate}</div>
        </div>
      </div>

      <div class="summary-grid">
        <div class="summary-card">
          <div class="card-label">মোট নগদ স্থিতি</div>
          <div class="card-value">${formatTaka(summary.totalLiquidBalancePoisha)}</div>
        </div>
        <div class="summary-card">
          <div class="card-label">মোট আয়</div>
          <div class="card-value card-income">+${formatTaka(summary.monthlyIncomePoisha)}</div>
        </div>
        <div class="summary-card">
          <div class="card-label">মোট ব্যয়</div>
          <div class="card-value card-expense">-${formatTaka(summary.monthlyExpensePoisha)}</div>
        </div>
        <div class="summary-card">
          <div class="card-label">প্রকৃত সম্পদ (Net Worth)</div>
          <div class="card-value card-net">${formatTaka(summary.trueNetWorthPoisha)}</div>
        </div>
      </div>

      <div style="display: flex; gap: 12px; margin-bottom: 20px;">
        <div style="flex: 1; background: #ecfdf5; border: 1px solid #d1fae5; border-radius: 10px; padding: 10px 14px;">
          <span style="font-size: 11px; color: #065f46; font-weight: 600;">মোট পাওনা (অন্যরা দেবে):</span>
          <span style="font-size: 14px; font-weight: 800; color: #047857; margin-left: 8px;">${formatTaka(summary.totalReceivablesPoisha)}</span>
        </div>
        <div style="flex: 1; background: #fff1f2; border: 1px solid #ffe4e6; border-radius: 10px; padding: 10px 14px;">
          <span style="font-size: 11px; color: #9f1239; font-weight: 600;">মোট দেনা (দিতে হবে):</span>
          <span style="font-size: 14px; font-weight: 800; color: #e11d48; margin-left: 8px;">${formatTaka(summary.totalPayablesPoisha)}</span>
        </div>
      </div>

      <h3 style="font-size: 14px; font-weight: 700; color: #111827; margin-top: 16px; margin-bottom: 8px;">
        লেনদেনের বিবরণী (${transactions.length}টি লেনদেন):
      </h3>

      <table>
        <thead>
          <tr>
            <th style="text-align: center; width: 40px;">#</th>
            <th style="width: 85px;">তারিখ</th>
            <th style="width: 75px;">ধরন</th>
            <th style="width: 100px;">ক্যাটাগরি</th>
            <th style="width: 130px;">অ্যাকাউন্ট</th>
            <th>বিবরণ/নোট</th>
            <th style="text-align: right; width: 110px;">পরিমাণ</th>
          </tr>
        </thead>
        <tbody>
          ${txRows || '<tr><td colspan="7" style="text-align:center; padding: 20px; color: #9ca3af;">কোনো লেনদেন পাওয়া যায়নি</td></tr>'}
        </tbody>
      </table>

      <div style="margin-top: 24px; padding-top: 12px; border-top: 1px solid #e5e7eb; font-size: 10px; color: #9ca3af; text-align: center;">
        ${BRAND.name} (${BRAND.banglaName}) • ${BRAND.tagline} • ১০০% অফলাইন ও নিরাপদ
      </div>
    </body>
    </html>
  `;

  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();
}
