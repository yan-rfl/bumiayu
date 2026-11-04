'use client';

import { useMemo } from 'react';
import { ChevronDown } from 'lucide-react';

interface DateDropdownPickerProps {
  value: string; // YYYY-MM-DD
  onChange: (newValue: string) => void;
  className?: string;
  minYear?: number;
  maxYear?: number;
  compact?: boolean;
}

const MONTHS = [
  { value: '01', label: 'Jan' },
  { value: '02', label: 'Feb' },
  { value: '03', label: 'Mar' },
  { value: '04', label: 'Apr' },
  { value: '05', label: 'Mei' },
  { value: '06', label: 'Jun' },
  { value: '07', label: 'Jul' },
  { value: '08', label: 'Agu' },
  { value: '09', label: 'Sep' },
  { value: '10', label: 'Okt' },
  { value: '11', label: 'Nov' },
  { value: '12', label: 'Des' },
];

export default function DateDropdownPicker({
  value,
  onChange,
  className = '',
  minYear = 2024,
  maxYear = 2028,
  compact = false,
}: DateDropdownPickerProps) {
  // Parse current value
  const [yearStr, monthStr, dayStr] = useMemo(() => {
    if (!value || !value.includes('-')) {
      const now = new Date();
      return [
        String(now.getFullYear()),
        String(now.getMonth() + 1).padStart(2, '0'),
        String(now.getDate()).padStart(2, '0'),
      ];
    }
    const parts = value.split('-');
    return [parts[0], parts[1], parts[2]];
  }, [value]);

  const yearNum = parseInt(yearStr, 10) || 2026;
  const monthNum = parseInt(monthStr, 10) || 11;
  const dayNum = parseInt(dayStr, 10) || 1;

  // Hitung jumlah hari dalam bulan terpilih
  const daysInMonth = useMemo(() => {
    return new Date(yearNum, monthNum, 0).getDate();
  }, [yearNum, monthNum]);

  // Handle pergantian
  const updateDate = (newYear: number, newMonth: number, newDay: number) => {
    const maxDays = new Date(newYear, newMonth, 0).getDate();
    const clampedDay = Math.min(newDay, maxDays);
    const y = String(newYear);
    const m = String(newMonth).padStart(2, '0');
    const d = String(clampedDay).padStart(2, '0');
    onChange(`${y}-${m}-${d}`);
  };

  const years = useMemo(() => {
    const list: number[] = [];
    for (let y = minYear; y <= maxYear; y++) {
      list.push(y);
    }
    return list;
  }, [minYear, maxYear]);

  const selectBaseClass = compact
    ? 'appearance-none text-[11px] font-bold pl-2.5 pr-7 py-1 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-500 shadow-2xs cursor-pointer'
    : 'appearance-none text-xs font-bold pl-3 pr-8 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-2xs cursor-pointer';

  return (
    <div className={`inline-flex items-center gap-1.5 flex-wrap ${className}`}>
      {/* Dropdown Tanggal (1..31) */}
      <div className="relative inline-flex items-center">
        <select
          value={String(dayNum).padStart(2, '0')}
          onChange={(e) => updateDate(yearNum, monthNum, parseInt(e.target.value, 10))}
          className={selectBaseClass}
        >
          {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((d) => {
            const dVal = String(d).padStart(2, '0');
            return (
              <option key={dVal} value={dVal}>
                {d}
              </option>
            );
          })}
        </select>
        <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 pointer-events-none" />
      </div>

      {/* Dropdown Bulan */}
      <div className="relative inline-flex items-center">
        <select
          value={String(monthNum).padStart(2, '0')}
          onChange={(e) => updateDate(yearNum, parseInt(e.target.value, 10), dayNum)}
          className={selectBaseClass}
        >
          {MONTHS.map((m) => (
            <option key={m.value} value={m.value}>
              {m.label}
            </option>
          ))}
        </select>
        <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 pointer-events-none" />
      </div>

      {/* Dropdown Tahun */}
      <div className="relative inline-flex items-center">
        <select
          value={String(yearNum)}
          onChange={(e) => updateDate(parseInt(e.target.value, 10), monthNum, dayNum)}
          className={selectBaseClass}
        >
          {years.map((y) => (
            <option key={y} value={String(y)}>
              {y}
            </option>
          ))}
        </select>
        <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 pointer-events-none" />
      </div>
    </div>
  );
}
