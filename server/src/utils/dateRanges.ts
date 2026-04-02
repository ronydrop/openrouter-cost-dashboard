import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc.js';
import timezone from 'dayjs/plugin/timezone.js';

dayjs.extend(utc);
dayjs.extend(timezone);

// Timezone configuration
const TIMEZONE = process.env.TIMEZONE || 'America/Sao_Paulo';

// Predefined range types
export type PredefinedRange = 'today' | 'yesterday' | 'last7days' | 'last30days' | 'last90days' | 'currentMonth' | 'previousMonth';

export interface TimeRange {
  start: string;  // ISO string
  end: string;    // ISO string
  label: string;
}

export interface CustomRange {
  startDate: string;  // YYYY-MM-DD
  endDate: string;    // YYYY-MM-DD
}

/**
 * Parse a range string into a TimeRange object
 * Supports predefined ranges and custom ranges (startISO,endISO)
 */
export function parseRange(range: string, tz: string = TIMEZONE): TimeRange {
  const now = dayjs().tz(tz);
  
  switch (range) {
    case 'today':
      return {
        start: now.startOf('day').toISOString(),
        end: now.endOf('day').toISOString(),
        label: 'Hoje',
      };
    
    case 'yesterday':
      return {
        start: now.subtract(1, 'day').startOf('day').toISOString(),
        end: now.subtract(1, 'day').endOf('day').toISOString(),
        label: 'Ontem',
      };
    
    case 'last7days':
      return {
        start: now.subtract(7, 'day').startOf('day').toISOString(),
        end: now.endOf('day').toISOString(),
        label: 'Últimos 7 dias',
      };
    
    case 'last30days':
      return {
        start: now.subtract(30, 'day').startOf('day').toISOString(),
        end: now.endOf('day').toISOString(),
        label: 'Últimos 30 dias',
      };
    
    case 'last90days':
      return {
        start: now.subtract(90, 'day').startOf('day').toISOString(),
        end: now.endOf('day').toISOString(),
        label: 'Últimos 90 dias',
      };
    
    case 'currentMonth':
      return {
        start: now.startOf('month').toISOString(),
        end: now.endOf('day').toISOString(),
        label: 'Mês atual',
      };
    
    case 'previousMonth': {
      const prevMonth = now.subtract(1, 'month');
      return {
        start: prevMonth.startOf('month').toISOString(),
        end: prevMonth.endOf('month').toISOString(),
        label: 'Mês anterior',
      };
    }
    
    default:
      // Try to parse custom range (YYYY-MM-DD,YYYY-MM-DD)
      if (range.includes(',')) {
        const [startStr, endStr] = range.split(',');
        const start = dayjs(startStr).tz(tz).startOf('day');
        const end = dayjs(endStr).tz(tz).endOf('day');
        return {
          start: start.toISOString(),
          end: end.toISOString(),
          label: `${start.format('DD/MM/YYYY')} - ${end.format('DD/MM/YYYY')}`,
        };
      }
      // Default to last 30 days
      return {
        start: now.subtract(30, 'day').startOf('day').toISOString(),
        end: now.endOf('day').toISOString(),
        label: 'Últimos 30 dias',
      };
  }
}

/**
 * Get the previous period for comparison
 */
export function getPreviousPeriod(range: TimeRange, tz: string = TIMEZONE): TimeRange {
  const start = dayjs(range.start).tz(tz);
  const end = dayjs(range.end).tz(tz);
  const duration = end.diff(start, 'day') + 1;  // +1 to include both ends
  
  const prevEnd = start.subtract(1, 'day').endOf('day');
  const prevStart = prevEnd.subtract(duration - 1, 'day').startOf('day');
  
  return {
    start: prevStart.toISOString(),
    end: prevEnd.toISOString(),
    label: `Período anterior`,
  };
}

/**
 * Get available range options
 */
export function getAvailableRanges(): { value: string; label: string }[] {
  return [
    { value: 'today', label: 'Hoje' },
    { value: 'yesterday', label: 'Ontem' },
    { value: 'last7days', label: 'Últimos 7 dias' },
    { value: 'last30days', label: 'Últimos 30 dias' },
    { value: 'last90days', label: 'Últimos 90 dias' },
    { value: 'currentMonth', label: 'Mês atual' },
    { value: 'previousMonth', label: 'Mês anterior' },
  ];
}

/**
 * Format a date for display
 */
export function formatDate(date: string, format: string = 'DD/MM/YYYY'): string {
  return dayjs(date).format(format);
}

/**
 * Check if a date is within a range
 */
export function isInRange(date: string, range: TimeRange): boolean {
  const d = dayjs(date);
  return d.isAfter(dayjs(range.start).subtract(1, 'day')) && d.isBefore(dayjs(range.end).add(1, 'day'));
}
