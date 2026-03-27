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
  { value: 'last7days', label: 'Últimos 7 dias' },
  { value: 'last30days', label: 'Últimos 30 dias' },
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
    <div className="flex flex-wrap items-center gap-3">
      <div className="flex items-center bg-gray-100 rounded-lg p-1 dark:bg-slate-700">
        {ranges.map((range) => (
          <button
            key={range.value}
            onClick={() => onRangeChange(range.value)}
            className={`px-3 py-1.5 text-sm rounded-md transition-all ${
              selectedRange === range.value
                ? 'bg-white text-primary-600 shadow-sm font-medium dark:bg-slate-600'
                : 'text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white'
            }`}
          >
            {range.label}
          </button>
        ))}
      </div>
      
      {selectedRange === 'custom' && onCustomDateRangeChange && (
        <div className="flex items-center gap-2">
          <Calendar className="text-gray-400" size={18} />
          <input
            type="date"
            value={customDateRange?.start?.split('T')[0] || ''}
            onChange={(e) => onCustomDateRangeChange({ 
              ...customDateRange!, 
              start: dayjs(e.target.value).startOf('day').toISOString() 
            })}
            className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm dark:bg-slate-700 dark:border-slate-600 dark:text-white"
          />
          <span className="text-gray-400">até</span>
          <input
            type="date"
            value={customDateRange?.end?.split('T')[0] || ''}
            onChange={(e) => onCustomDateRangeChange({ 
              ...customDateRange!, 
              end: dayjs(e.target.value).endOf('day').toISOString() 
            })}
            className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm dark:bg-slate-700 dark:border-slate-600 dark:text-white"
          />
        </div>
      )}
    </div>
  );
}
