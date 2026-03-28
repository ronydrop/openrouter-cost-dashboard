import { Calendar } from 'lucide-react';
import dayjs from 'dayjs';
import type { DateRange } from '../types';

interface DateRangeFilterProps {
  selectedRange: DateRange;
  onRangeChange: (range: DateRange) => void;
  customDateRange?: { start: string; end: string };
  onCustomDateRangeChange?: (range: { start: string; end: string }) => void;
}

const ranges: { value: DateRange; label: string }[] = [
  { value: 'today', label: 'Hoje' },
  { value: 'yesterday', label: 'Ontem' },
  { value: 'last7days', label: '7 dias' },
  { value: 'last30days', label: '30 dias' },
  { value: 'currentMonth', label: 'Mês atual' },
  { value: 'previousMonth', label: 'Mês anterior' },
  { value: 'custom', label: 'Personalizado' },
];

export function DateRangeFilter({ 
  selectedRange, 
  onRangeChange, 
  customDateRange,
  onCustomDateRangeChange 
}: DateRangeFilterProps) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="flex items-center bg-gray-100 dark:bg-[#1c1c1e] rounded-xl p-1 border border-gray-200 dark:border-[#2a2a2a]">
        {ranges.map((range) => (
          <button
            key={range.value}
            onClick={() => onRangeChange(range.value)}
            className={`px-3 py-1.5 text-sm rounded-lg transition-all duration-200 font-medium ${
              selectedRange === range.value
                ? 'bg-white dark:bg-[#262628] text-slate-900 dark:text-white shadow-sm'
                : 'text-slate-500 dark:text-gray-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            {range.label}
          </button>
        ))}
      </div>
      
      {selectedRange === 'custom' && onCustomDateRangeChange && (
        <div className="flex items-center gap-2">
          <Calendar className="text-slate-400 dark:text-gray-500" size={16} />
          <input
            type="date"
            value={customDateRange?.start?.split('T')[0] || ''}
            onChange={(e) => onCustomDateRangeChange({ 
              ...customDateRange!, 
              start: dayjs(e.target.value).startOf('day').toISOString() 
            })}
            className="px-3 py-1.5 bg-white dark:bg-[#1c1c1e] border border-gray-200 dark:border-[#2a2a2a] rounded-lg text-sm text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 dark:focus:border-[#3b82f6] transition-colors"
          />
          <span className="text-slate-400 dark:text-gray-500">até</span>
          <input
            type="date"
            value={customDateRange?.end?.split('T')[0] || ''}
            onChange={(e) => onCustomDateRangeChange({ 
              ...customDateRange!, 
              end: dayjs(e.target.value).endOf('day').toISOString() 
            })}
            className="px-3 py-1.5 bg-white dark:bg-[#1c1c1e] border border-gray-200 dark:border-[#2a2a2a] rounded-lg text-sm text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 dark:focus:border-[#3b82f6] transition-colors"
          />
        </div>
      )}
    </div>
  );
}